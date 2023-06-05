import { Camera } from '../camera';
import { Context } from '../context';
import { GBuffer } from './retrowave/gbuffer';
import { Entity, WireVertex } from './retrowave/pipelines/wireframe';
import { Scene } from '../scene';
import { buildIcosahedron } from '../models/icosahedron';
import { Mesh } from '../mesh';
import { multiply, reflectY, rotation, translation } from '../math/transform';
import { BloomPipeline, WireframePipeline, ComposePipeline } from './retrowave/pipelines';
import { calculateNormals } from '../models';
import { Point3, Vector2, Vector3 } from '../math';
import { Color, createTexture } from '../lib';
import { normalize, scale } from '../math/vectors';

export interface SceneEntity extends Entity {
	seed: number;
	rotation: Vector3;
}

export class Retrowave extends Scene {
	private entities: Array<SceneEntity>;
	camera = new Camera();
	wireframePipeline: WireframePipeline;
	bloomPipeline: BloomPipeline;
	rgbComposePipeline: ComposePipeline;
	bgrComposePipeline: ComposePipeline;
	buffer: GBuffer;
	reflectBuffer: GBuffer;
	mainOutput: GPUTexture;
	reflectOutput: GPUTexture;

	constructor(ctx: Context) {
		super(ctx);
		this.wireframePipeline = new WireframePipeline(ctx);
		this.bloomPipeline = new BloomPipeline(ctx);
		this.rgbComposePipeline = new ComposePipeline(ctx, 'rgba8unorm');
		this.bgrComposePipeline = new ComposePipeline(ctx);
		this.buffer = new GBuffer(ctx);
		this.reflectBuffer = new GBuffer(ctx);
		this.mainOutput = createTexture(ctx, 'rgba8unorm');
		this.reflectOutput = createTexture(ctx, 'rgba8unorm');
		this.entities = [];
		this.camera.position[1] += 5.0;

		const barycentric = [
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
		for (let i = 0; i < 100; i++) {
			const dist = 200.0;
			const position: Point3 = [(rn() - 0.5) * dist, (rn() + 0.77) * 10.0, (rn() - 0.5) * dist];
			const wireColor = randomColor();
			const faceColor = randomColor();

			const vertices = baseVertices.map(v => ({
				...v,
				wireColor,
				faceColor,
			}));

			this.entities.push({
				hasReflection: true,
				rotation: normalize([rn(), rn(), rn()]),
				transform: translation(...position),
				mesh: new Mesh(ctx, vertices),
				seed: Math.random(),
			});
		}

		const divisions = 1;
		const scale = 256.0;
		const terrainVertices = subdividedPlane(divisions, scale, [0, 0]);
		const terrainMesh = new Mesh(ctx, terrainVertices);
		const r = 2;
		for (let y = -r; y < r; y++) {
			for (let x = -r; x < r; x++) {
				this.entities.push({
					hasReflection: false,
					rotation: [0, 0, 0],
					transform: translation(x * scale * 2, 0, y * scale * 2),
					mesh: terrainMesh,
					seed: 0,
				});
			}
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

	drawFrame(camera: Camera = this.camera) {
		const { ctx } = this;
		const [w, h] = ctx.size;
		camera.aspect = w / h;
		this.buffer.resize(w, h);
		this.reflectBuffer.resize(w, h);

		this.resizeTextures(w, h);

		ctx.encode(encoder => {

			// Draw scene
			this.wireframePipeline.clear(encoder, this.buffer);
			for (let i = 0; i < this.entities.length; i++) {
				const entity = this.entities[i];
				this.wireframePipeline.draw(encoder, i, this.buffer, entity, camera);
			}

			// Draw reflections
			this.wireframePipeline.clear(encoder, this.reflectBuffer)
			for (let i = 0; i < this.entities.length; i++) {
				const entity = this.entities[i];
				if (entity.hasReflection) {
					const reflectedEntity = {
						...entity,
						transform: reflectY(entity.transform),
					};
					// Draw the reflected object
					this.wireframePipeline.draw(encoder, i + this.entities.length, this.reflectBuffer, reflectedEntity, camera);
				}
			}

			this.bloomPipeline.run(encoder, this.buffer, 1, 1.7);
			this.bloomPipeline.run(encoder, this.reflectBuffer, 1, 1.7);

			// Compose reflection onto a texture
			const reflectView = this.reflectOutput.createView();
			this.rgbComposePipeline.compose(encoder, reflectView, this.reflectBuffer);

			// Draw main view using reflection texture for the mirror
			const view = this.ctx.currentTexture.createView();
			this.bgrComposePipeline.compose(encoder, view, this.buffer, this.reflectOutput);

		});
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
		faceColor: [1.0, 0.1, 0.4, 0.0],
		//faceColor: [0.2, 0.1, 0.4, 1.0],
		wireColor: [0.2, 0.4, 0.1, 0.5],
		...template
	};

	const d = divisions / 2;
	const s = 1.0 / divisions;
	for (let y = -d; y < d; y++) {
		for (let x = -d; x < d; x++) {
			const g = 0.0;
			const sx = (s * 2 + g) * x + (offset[0] * 2);
			const sy = (s * 2 + g) * y + (offset[1] * 2);
			vertices.push(
				{ ...baseTriangle, barycentric: [1, 0, 0], position: [sx + -s, 0, sy + s] } as WireVertex,
				{ ...baseTriangle, barycentric: [0, 1, 0], position: [sx + s, 0, sy + -s] } as WireVertex,
				{ ...baseTriangle, barycentric: [0, 0, 1], position: [sx + -s, 0, sy + -s] } as WireVertex,

				{ ...baseTriangle, barycentric: [1, 0, 0], position: [sx + s, 0, sy + s] } as WireVertex,
				{ ...baseTriangle, barycentric: [0, 1, 0], position: [sx + s, 0, sy + -s] } as WireVertex,
				{ ...baseTriangle, barycentric: [0, 0, 1], position: [sx + -s, 0, sy + s] } as WireVertex,
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