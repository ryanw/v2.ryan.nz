import { Camera, Context, Scene, LineMesh, Mesh, WireMesh, Color } from 'engine';
import { identity, multiply, rotation, scaling, translation } from 'engine/math/transform';
import { buildIcosahedron, buildQuad, calculateNormals } from 'engine/models';
import { ComposePipeline } from './pipelines/compose';
import { GBuffer } from './gbuffer';
import { TerrainRenderPipeline } from './pipelines/terrain_render';
import { normalize } from 'engine/math/vectors';
import { WireVertex } from 'engine/wire_mesh';
import { WirePipeline } from './pipelines/wire';
import { Chunk, Terrain } from './terrain';
import { Matrix4, Point3 } from 'engine/math';
import { ShapeRenderPipeline } from './pipelines/shape_render';
import { RoadRenderPipeline } from './pipelines/road_render';
import { CarMesh } from './car_mesh';
import { SkyRenderPipeline } from './pipelines/sky_render';

type EntityId = number;

export enum Material {
	Terrain = 0,
	Shape = 1,
}

export interface Entity {
	mesh: WireMesh;
	transform: Matrix4;
	material: Material
	heightmap?: GPUTexture;
	offset?: [number, number];
}

interface TerrainChunk extends Chunk {
	id: EntityId;
}

let NEXT_ENTITY_ID = 1;
function nextEndityId(): number {
	return NEXT_ENTITY_ID++;
}

export class LineScene extends Scene {
	camera = new Camera();
	composePipeline: ComposePipeline;
	terrainRenderPipeline: TerrainRenderPipeline;
	shapeRenderPipeline: ShapeRenderPipeline;
	roadRenderPipeline: RoadRenderPipeline;
	skyRenderPipeline: SkyRenderPipeline;
	wireRenderPipeline: WirePipeline;
	buffer: GBuffer;
	scale: number = 1.0;
	entities: Map<EntityId, Entity> = new Map();
	chunks: Map<String, TerrainChunk> = new Map();
	terrain: Terrain;

	constructor(ctx: Context) {
		super(ctx);

		this.scale = 64;
		this.terrain = new Terrain(
			ctx,
			this.scale,
			(position: Point3): WireVertex => ({
				position,
				normal: normalize([0.5, 0.5, 0]),
				//wireColor: [14.0, 1.4, 11.0, 1.0],
				wireColor: [0.9, 0.3, 0.9, 1.0],
				faceColor: [0.1, 0.2, 0.4, 1.0],
			})
		);

		const rx = 4;
		const ry = 16;
		for (let y = 0; y < ry; y++) {
			for (let x = -rx; x < rx; x++) {
				this.addChunk(x, -y);
			}
		}

		const car = new CarMesh(ctx);
		this.addEntity({ 
			mesh: car, 
			material: Material.Shape,
			transform: multiply(
				translation(-2.0, 4.0, -8.0),
			),
		});

		this.camera.position[0] += 0.0;
		this.camera.position[1] += 4.0;
		this.camera.position[2] += 0.0;
		this.buffer = new GBuffer(ctx);
		this.composePipeline = new ComposePipeline(ctx);
		this.terrainRenderPipeline = new TerrainRenderPipeline(ctx, 'rgba16float');
		this.shapeRenderPipeline = new ShapeRenderPipeline(ctx, 'rgba16float');
		this.roadRenderPipeline = new RoadRenderPipeline(ctx, 'rgba16float');
		this.skyRenderPipeline = new SkyRenderPipeline(ctx, 'rgba16float');
		this.wireRenderPipeline = new WirePipeline(ctx, 'rgba16float');
	}

	addEntity(entity: Entity): EntityId {
		const id = nextEndityId();
		this.entities.set(id, entity);
		return id;
	}

	removeEntity(id: EntityId): Entity | undefined {
		const entity = this.entities.get(id);
		this.entities.delete(id);
		return entity;
	}

	addChunk(x: number, y: number) {
		const chunk = this.terrain.generateChunk(x, y) as TerrainChunk;
		const id = this.addEntity({
			mesh: chunk.mesh,
			material: Material.Terrain,
			heightmap: chunk.heightmap,
			offset: chunk.offset,
			transform: multiply(
				scaling(this.scale),
				translation(x, 0, y),
			),
		});
		chunk.id = id;
		this.chunks.set([x, y].join(','), chunk);
	}

	removeChunk(x: number, y: number) {
		const chunk = this.chunks.get([x, y].join(','));
		if (!chunk) return;
		this.removeEntity(chunk.id);
	}

	updateEntities() {
		const shapes = filterMaterial(this.entities.values(), Material.Shape);
		for (const shape of shapes) {
			shape.transform = multiply(
				translation(-2.0, 2.5, -5.0),
				//rotation(0.0, performance.now() / 1000.0, 0.0),
			);
		}
	}

	async drawScene(encoder: GPUCommandEncoder, camera: Camera = this.camera) {
		this.clear(encoder);

		// Draw Sky
		this.skyRenderPipeline.drawSky(encoder, this.buffer, camera);

		// Draw terrain
		const terrains = filterMaterial(this.entities.values(), Material.Terrain);
		this.terrainRenderPipeline.drawEntities(encoder, this.buffer, terrains, camera);

		// Draw shapes
		const shapes = filterMaterial(this.entities.values(), Material.Shape);
		this.shapeRenderPipeline.drawEntities(encoder, this.buffer, shapes, camera);

		// Draw Road
		this.roadRenderPipeline.drawRoad(encoder, this.buffer, camera);

		// Post process + draw to screen
		this.composePipeline.compose(encoder, this.ctx.currentTexture, this.buffer);
	}

	async drawFrame() {
		this.updateEntities();
		const { ctx, camera } = this;
		const [w, h] = ctx.size;
		this.buffer.resize(w, h);
		camera.aspect = w / h;
		ctx.encode(encoder => this.drawScene(encoder, camera));
	}

	clear(encoder: GPUCommandEncoder) {
		const clearValue = { r: 0.4, g: 0.1, b: 0.5, a: 0.0 };
		const albedoView = this.buffer.albedo.createView();
		const depthView = this.buffer.depth.createView();

		encoder.beginRenderPass({
			colorAttachments: [{
				view: albedoView,
				clearValue,
				loadOp: 'clear',
				storeOp: 'store',
			}],
			depthStencilAttachment: {
				view: depthView,
				depthClearValue: 1.0,
				depthLoadOp: 'clear',
				depthStoreOp: 'store',
			}
		}).end();
	}
}

function *filterMaterial(entities: IterableIterator<Entity>, material: Material) {
	for (const entity of entities) {
		if (entity.material === material) {
			yield entity;
		}
	}
}
