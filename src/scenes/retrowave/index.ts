import { Camera, Context, Scene, Mesh, Color, createTexture  } from 'engine';
import { identity, multiply, reflectY, rotation, translation } from 'engine/math/transform';
import { buildIcosahedron } from 'engine/models/icosahedron';
import { calculateNormals, buildQuad } from 'engine/models';
import { Matrix4, Point3, Vector2, Vector3 } from 'engine/math';
import { normalize, scale } from 'engine/math/vectors';

import { Entity, WireVertex } from './pipelines/wireframe';
import { GBuffer } from './gbuffer';
import { BloomPipeline, WireframePipeline, ComposePipeline } from './pipelines';
import { RoadPipeline } from './pipelines/road';

export type EntityProps = Partial<SceneEntity> & { mesh: SceneEntity['mesh'] };

export enum Material {
	Wire,
	Road,
}

class SceneEntity implements Entity {
	material: Material = Material.Wire;
	showInMirror: boolean = true;
	transform: Matrix4 = identity();
	seed: number = 0;
	rotation: Vector3 = [0, 0, 0];
	mesh: Mesh<WireVertex>;

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
	bloomPipeline: BloomPipeline;
	rgbComposePipeline: ComposePipeline;
	bgrComposePipeline: ComposePipeline;
	buffer: GBuffer;
	reflectBuffer: GBuffer;
	mainOutput: GPUTexture;
	reflectOutput: GPUTexture;

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
		this.camera.position[1] += 5.0;
		this.camera.position[2] += 128.0;

		const barycentric: Array<Point3> = [
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1],
		];

		const baseVertices = buildIcosahedron((position, i) => ({
			position,
			barycentric: barycentric[i % 3],
			normal: [0.0, 1.0, 0.0],
			wireColor: [0.8, 1.0, 0.0, 1.0],
			faceColor: [0.3, 0.1, 0.5, 1.0],
		} as WireVertex));
		calculateNormals(baseVertices);

		const rn = Math.random;
		const randomColor = () => [rn() * 0.7, rn() * 0.7, rn() * 0.7, 0.1] as Color;

		const wireColor = randomColor();
		const faceColor = randomColor();
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

		const divisions = 128;
		const scale = 320.0;
		const terrainVertices = subdividedPlane(divisions, scale, [0, 0]);
		const terrainMesh = new Mesh(ctx, terrainVertices);
		const x = 0;
		const y = 0;
		this.entities.push(new SceneEntity({
			mesh: terrainMesh,
			showInMirror: false,
			material: Material.Wire,
			rotation: [0, 0, 0],
			transform: translation(x * scale * 2 + 2.5, 0, y * scale * 2 + 2.5),
			seed: 0,
		}));

		const roadVertices = buildQuad<WireVertex>((position, i) => ({
			position: [position[0] * 9.99, position[2], position[1] * 310.0],
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
			transform: translation(0, 0.0, -10),
		}));
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
		}
	}

	drawScene(encoder: GPUCommandEncoder, camera: Camera = this.camera) {
		// Draw scene
		this.wirePipeline.clear(encoder, this.buffer);
		for (let i = 0; i < this.entities.length; i++) {
			this.drawEntity(i, encoder, this.buffer, camera);
		}

		// Draw reflections
		this.wirePipeline.clear(encoder, this.reflectBuffer)
		for (let i = 0; i < this.entities.length; i++) {
			this.drawEntity(i, encoder, this.reflectBuffer, camera, true);
		}

		this.bloomPipeline.run(encoder, this.buffer, 2, 3, 1.4);
		this.bloomPipeline.run(encoder, this.reflectBuffer, 2, 3, 1.4);

		// Compose reflection onto a texture
		const reflectView = this.reflectOutput.createView();
		this.rgbComposePipeline.compose(encoder, reflectView, this.reflectBuffer);

		// Draw main view using reflection texture for the mirror
		const view = this.ctx.currentTexture.createView();
		this.bgrComposePipeline.compose(encoder, view, this.buffer, this.reflectOutput);
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

function subdividedPlane(divisions: number = 1, scale: number = 1.0, offset: Vector2 = [0, 0], template?: Partial<WireVertex>): Array<WireVertex> {
	const vertices: Array<WireVertex> = [];

	const baseTriangle = {
		position: [0.0, 0.0, 0.0],
		normal: [0.0, 0.0, 0.0],
		//faceColor: [1.0, 0.1, 0.4, 0.0],
		faceColor: [0.2, 0.1, 0.4, 1.0],
		wireColor: [0.2, 0.4, 0.1, 0.5],
		...template
	};

	const d = divisions / 2;
	const s = 1.0 / divisions;
	for (let y = -d; y < d; y++) {
		for (let x = -d; x < d; x++) {
			// Skip where road is drawn
			if (x >= -2 && x < 2) continue;

			const g = 0.0;
			const sx = (s * 2 + g) * x + (offset[0] * 2);
			const sy = (s * 2 + g) * y + (offset[1] * 2);
			vertices.push(
				{ ...baseTriangle, barycentric: [1, 0, 1], position: [sx + -s, 0, sy + s] } as WireVertex,
				{ ...baseTriangle, barycentric: [0, 1, 0], position: [sx + s, 0, sy + -s] } as WireVertex,
				{ ...baseTriangle, barycentric: [0, 0, 1], position: [sx + -s, 0, sy + -s] } as WireVertex,

				{ ...baseTriangle, barycentric: [1, 0, 0], position: [sx + s, 0, sy + s] } as WireVertex,
				{ ...baseTriangle, barycentric: [0, 1, 0], position: [sx + s, 0, sy + -s] } as WireVertex,
				{ ...baseTriangle, barycentric: [1, 0, 1], position: [sx + -s, 0, sy + s] } as WireVertex,
			);
		}
	}

	for (const v of vertices) {
		v.position[0] *= scale;
		v.position[2] *= scale;
		//v.position[1] = noise2d(v.position[0], v.position[2]);
	}
	calculateNormals(vertices);
	return vertices;
}
