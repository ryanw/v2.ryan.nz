import { Camera, Context, Scene, Mesh, Color, createTexture } from 'engine';
import { identity, multiply, reflectY, rotation, scaling, translation } from 'engine/math/transform';
import { buildIcosahedron } from 'engine/models/icosahedron';
import { calculateNormals, buildQuad } from 'engine/models';
import { Matrix4, Point3, Vector3 } from 'engine/math';
import { normalize, scale } from 'engine/math/vectors';
import { Entity, WireVertex } from './pipelines/wireframe';
import { GBuffer } from './gbuffer';
import { BloomPipeline, WireframePipeline, ComposePipeline } from './pipelines';
import { RoadPipeline } from './pipelines/road';
import { Chunk, Terrain } from './terrain';
import { TerrainEntity, TerrainPipeline } from './pipelines/terrain';

export type ChunkId = string;

export type EntityProps = Partial<SceneEntity> & { mesh: SceneEntity['mesh'] };

export enum Material {
	Wire,
	Road,
	Terrain,
}

class SceneEntity implements Entity {
	material: Material = Material.Wire;
	showInMirror: boolean = true;
	transform: Matrix4 = identity();
	seed: number = 0;
	rotation: Vector3 = [0, 0, 0];
	mesh: Mesh<WireVertex>;
	chunk?: Chunk<WireVertex>;

	constructor(props: EntityProps) {
		this.mesh = props.mesh;
		Object.assign(this, props);
	}
}

export class Retrowave extends Scene {
	private entities: Array<SceneEntity>;
	camera = new Camera();
	wirePipeline: WireframePipeline;
	roadPipeline: RoadPipeline;
	terrainRenderPipeline: TerrainPipeline;
	bloomPipeline: BloomPipeline;
	rgbComposePipeline: ComposePipeline;
	bgrComposePipeline: ComposePipeline;
	buffer: GBuffer;
	reflectBuffer: GBuffer;
	mainOutput: GPUTexture;
	reflectOutput: GPUTexture;
	playerLocation: Point3 = [0, 0, 0];
	terrain: Terrain<WireVertex>;
	chunks: Record<ChunkId, Chunk<WireVertex>> = {};

	constructor(ctx: Context) {
		super(ctx);
		this.wirePipeline = new WireframePipeline(ctx);
		this.roadPipeline = new RoadPipeline(ctx);
		this.bloomPipeline = new BloomPipeline(ctx);
		this.rgbComposePipeline = new ComposePipeline(ctx, 'rgba8unorm');
		this.bgrComposePipeline = new ComposePipeline(ctx);
		this.buffer = new GBuffer(ctx);
		this.reflectBuffer = new GBuffer(ctx);
		this.mainOutput = createTexture(ctx, 'rgba8unorm');
		this.reflectOutput = createTexture(ctx, 'rgba8unorm');
		this.entities = [];
		this.camera.position[2] += 0.0;
		this.camera.position[1] += 4.0;

		const barycentric: Array<Point3> = [
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1],
		];

		const vertexBuilder = (wireColor: Color, faceColor: Color) =>
			(position: Point3, i: number): WireVertex => ({
				position,
				barycentric: barycentric[i % 3],
				normal: [0.0, 1.0, 0.0],
				wireColor,
				faceColor,
			} as WireVertex);

		this.terrain = new Terrain(ctx, 32, vertexBuilder([0.5, 0.8, 0.1, 1.0], [0.2, 0.05, 0.3, 1.0]));

		const baseVertices = buildIcosahedron(vertexBuilder([0.8, 1.0, 0.0, 1.0], [0.3, 0.1, 0.5, 1.0]));
		calculateNormals(baseVertices);

		const rn = Math.random;

		const wireColor: Color = [0.8, 1.0, 0.0, 1.0];
		const faceColor: Color = [0.1, 0.01, 0.4, 1.0];
		const icosVertices = baseVertices.map(v => ({
			...v,
			wireColor,
			faceColor,
		}));
		const icosMesh = new Mesh(ctx, icosVertices);
		for (let i = 0; i < 100; i++) {
			const dist = 200.0;

			this.entities.push(new SceneEntity({
				mesh: icosMesh,
				showInMirror: true,
				material: Material.Wire,
				rotation: normalize([rn(), rn(), rn()] as Vector3),
				transform: translation((rn() - 0.5) * dist, (rn() + 0.77) * 10.0, (rn() - 0.5) * dist),
				seed: Math.random(),
			}));
		}

		const roadVertices = buildQuad<WireVertex>((position, i) => ({
			position: [position[0] * 2.99, position[2], position[1] * 256.0],
			barycentric: barycentric[i % 3],
			normal: [0.0, 1.0, 0.0],
			wireColor: [1.0, 1.0, 0.0, 0.0],
			faceColor: [1.0, 1.0, 0.0, 0.0],
		}));
		const roadMesh = new Mesh(ctx, roadVertices);
		this.entities.push(new SceneEntity({
			mesh: roadMesh,
			material: Material.Road,
			showInMirror: false,
			rotation: [0, 0, 0],
			transform: translation(0, 0.1, -10),
		}));

		const r = 12;
		for (let y = -r; y < 0; y++) {
			for (let x = -r; x < r; x++) {
				this.addChunk(x, y);
			}
		}

		this.terrainRenderPipeline = new TerrainPipeline(ctx);
	}

	addChunk(x: number, y: number) {
		const id: ChunkId = [x, y].join(',');
		if (this.chunks[id]) return;

		const chunk = this.terrain.generateChunk(x, y);
		this.chunks[id] = chunk;

		this.entities.push(new SceneEntity({
			mesh: chunk.mesh,
			chunk,
			material: Material.Terrain,
			showInMirror: false,
			rotation: [0, 0, 0],
			transform: multiply(
				scaling(32.0),
				translation(chunk.offset[0], 0.0, chunk.offset[1]),
			),
		}));
	}

	removeChunk(x: number, y: number) {
		const id: ChunkId = [x, y].join(',');
		if (this.chunks[id]) {
			// FIXME remove entity
			delete this.chunks[id];
		}
	}

	updateEntities(dt: number) {
		for (const entity of this.entities) {
			const rot = scale(entity.rotation, dt);
			entity.transform = multiply(entity.transform, rotation(...rot));
			if (entity.seed > 0) {
				entity.transform =
					multiply(
						translation(
							Math.cos(
								performance.now()
								/ (500 - entity.seed * 44)
								+ entity.seed * 10,
							) / 10,
							Math.sin(
								performance.now()
								/ (800 - entity.seed * 100)
								+ entity.seed * 10,
							) / 20,
							Math.sin(
								performance.now()
								/ (400 - entity.seed * 123)
								+ entity.seed * 10,
							) / 30,
						),
						entity.transform,
					);
			}
		}
	}

	resizeTextures(w: number, h: number) {
		if (w !== this.mainOutput.width || h !== this.mainOutput.height) {
			this.mainOutput = createTexture(this.ctx, 'rgba8unorm', [w, h], 'Main Render Output');
		}
		if (w !== this.reflectOutput.width || h !== this.reflectOutput.height) {
			this.reflectOutput = createTexture(this.ctx, 'rgba8unorm', [w, h], 'Reflection Render Output');
		}
	}

	drawEntity(i: number, encoder: GPUCommandEncoder, buffer: GBuffer, camera: Camera, mirror: boolean = false) {
		let entity = this.entities[i];
		if (mirror) {
			if (!entity.showInMirror) return;
			entity = { ...entity, transform: reflectY(entity.transform) };
		}
		const id = i + (mirror ? 0 : this.entities.length);

		switch (entity.material) {
		case Material.Wire: {
			this.wirePipeline.draw(encoder, id, buffer, entity, camera);
			break;
		}

		case Material.Road: {
			this.roadPipeline.draw(encoder, id, buffer, entity, camera);
			break;
		}

		case Material.Terrain: {
			if (!entity.chunk) throw new Error('Entity is missing Chunk data');
			this.terrainRenderPipeline.draw(encoder, id, buffer, entity as TerrainEntity, camera);
			break;
		}
		}
	}

	drawScene(encoder: GPUCommandEncoder, camera: Camera = this.camera) {
		// Draw scene
		this.wirePipeline.clear(encoder, this.buffer);
		for (let i = 0; i < this.entities.length; i++) {
			this.drawEntity(i, encoder, this.buffer, camera);
		}

		// Draw reflections
		this.wirePipeline.clear(encoder, this.reflectBuffer);
		for (let i = 0; i < this.entities.length; i++) {
			this.drawEntity(i, encoder, this.reflectBuffer, camera, true);
		}

		//this.bloomPipeline.run(encoder, this.buffer, 2, 3, 1.4);
		//this.bloomPipeline.run(encoder, this.reflectBuffer, 2, 3, 1.4);

		// Compose reflection onto a texture
		const reflectView = this.reflectOutput.createView();
		this.rgbComposePipeline.compose(encoder, reflectView, this.reflectBuffer);

		// Draw main view using reflection texture for the mirror
		const view = this.ctx.currentTexture.createView();
		this.bgrComposePipeline.compose(encoder, view, this.buffer, this.reflectOutput);
		//this.bgrComposePipeline.compose(encoder, view, this.reflectBuffer);
	}

	drawFrame(camera?: Camera) {
		if (!camera) camera = this.camera;
		const { ctx } = this;
		const [w, h] = ctx.size;
		camera.aspect = w / h;
		this.buffer.resize(w, h);
		this.reflectBuffer.resize(w, h);

		this.resizeTextures(w, h);

		ctx.encode(encoder => this.drawScene(encoder, camera));
	}

	async draw(camera?: Camera) {
		return new Promise(resolve =>
			requestAnimationFrame(() => {
				this.updateEntities(1 / 60);
				this.drawFrame(camera);
				resolve(void 0);
			}));
	}
}
