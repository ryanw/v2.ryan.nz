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
				//wireColor: [Math.random(), Math.random(), Math.random(), 1.0],
				faceColor: [0.1, 0.2, 0.4, 1.0],
			})
		);

		const r = 16;
		for (let y = -r; y < r; y++) {
			for (let x = -r; x < r; x++) {
				this.addChunk(x, y);
			}
		}

		const icoVertices = buildIcosahedron((position: Point3): WireVertex => ({
			position,
			normal: normalize([0.5, 0.5, 0]),
			wireColor: [1.0, 0.1, 0.1, 1.0],
			faceColor: [0.3, 0.1, 0.1, 1.0],
		}));
		calculateNormals(icoVertices);
		const icoMesh = new WireMesh(ctx, icoVertices);
		this.addEntity({ 
			mesh: icoMesh, 
			material: Material.Shape,
			transform: multiply(
				translation(0.0, 4.0, -5.0),
			),
		});

		this.camera.position[0] += 0.0;
		this.camera.position[1] += 3.0;
		this.camera.position[2] += 0.0;
		this.buffer = new GBuffer(ctx);
		this.composePipeline = new ComposePipeline(ctx);
		this.terrainRenderPipeline = new TerrainRenderPipeline(ctx, 'rgba16float');
		this.shapeRenderPipeline = new ShapeRenderPipeline(ctx, 'rgba16float');
		this.wireRenderPipeline = new WirePipeline(ctx, 'rgba16float');
	}

	drawWires(encoder: GPUCommandEncoder, camera: Camera = this.camera) {
		const terrains = filterMaterial(this.entities.values(), Material.Terrain);
		const shapes = filterMaterial(this.entities.values(), Material.Shape);

		this.terrainRenderPipeline.drawEntities(encoder, this.buffer, terrains, camera);
		this.shapeRenderPipeline.drawEntities(encoder, this.buffer, shapes, camera);
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

	async drawScene(encoder: GPUCommandEncoder, camera: Camera = this.camera) {
		this.clear(encoder);
		this.drawWires(encoder, camera);
		this.composePipeline.compose(encoder, this.ctx.currentTexture, this.buffer);
	}

	async drawFrame() {
		const { ctx, camera } = this;
		const [w, h] = ctx.size;
		this.buffer.resize(w, h);
		camera.aspect = w / h;
		ctx.encode(encoder => this.drawScene(encoder, camera));
	}

	clear(encoder: GPUCommandEncoder) {
		const clearValue = { r: 0.4, g: 0.1, b: 0.5, a: 1.0 };
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
