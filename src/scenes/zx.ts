import { PHI, Point3, Vector2 } from '../math';
import { Camera } from '../camera';
import { Context } from '../context';
import { Scene } from '../scene';
import { cross, normalize, subtract } from '../math/vectors';
import { Mesh } from '../mesh';
import { multiply, rotation, scaling, translation } from '../math/transform';
import { Entity, Vertex, SpeccyPipeline } from '../pipelines/speccy';
import { Color } from '../lib';
import { ComposePipeline } from '../pipelines/compose';
import { GBuffer } from '../gbuffer';
import { PixelatePipeline } from '../pipelines/pixelate';
import { ICOSAHEDRON_TRIS, ICOSAHEDRON_VERTICES } from '../models/icosahedron';

export class ZXScene extends Scene {
	private entities: Array<Entity>;
	private chunks: Array<Entity>;
	camera = new Camera();
	composePipeline: ComposePipeline;
	terrainPipeline: SpeccyPipeline;
	entityPipeline: SpeccyPipeline;
	pixelatePipeline: PixelatePipeline;
	heightmap: GPUTexture;
	gbuffer: GBuffer;
	lastUpdateAt = performance.now();

	constructor(ctx: Context) {
		super(ctx);
		this.composePipeline = new ComposePipeline(ctx);
		this.terrainPipeline = new SpeccyPipeline(ctx, 'vs_chunk_main');
		this.entityPipeline = new SpeccyPipeline(ctx, 'vs_entity_main');
		this.composePipeline = new ComposePipeline(ctx);
		this.pixelatePipeline = new PixelatePipeline(ctx);
		this.heightmap = ctx.device.createTexture({
			label: 'Heightmap Texture',
			size: [1024, 1024],
			format: 'r8unorm',
			usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
		});
		this.gbuffer = new GBuffer(ctx);

		const baseTriangle = [
			{ position: [0.0, 0.0, 0.0], barycentric: [1.0, 0.0, 0.0], uv: [0.0, 0.0] },
			{ position: [0.0, 0.0, 0.0], barycentric: [0.0, 1.0, 0.0], uv: [0.0, 1.0] },
			{ position: [0.0, 0.0, 0.0], barycentric: [0.0, 0.0, 1.0], uv: [1.0, 1.0] },
		];

		const icosahedron = ICOSAHEDRON_TRIS.map((tri) =>
			tri.map((v, i) => ({
				position: normalize(ICOSAHEDRON_VERTICES[v]),
				barycentric: baseTriangle[i % 3].barycentric,
				uv: baseTriangle[i % 3].uv,
				normal: [0.0, 0.0, 0.0],
				fgColor: [0.0, 1.0, 1.0, 0.5],
				bgColor: [1.0, 1.0, 0.0, 0.5],
			} as Vertex))
		).flat();

		calculateNormals(icosahedron);

		this.entities = [];
		this.chunks = [];

		const rn = Math.random;
		const randomColor = () => [rn() * 0.7, rn() * 0.7, rn() * 0.7, 0.1] as Color;

		for (let i = 0; i < 200; i++) {
			const dist = 200.0;
			const position: Point3 = [(rn() - 0.5) * dist, (rn() - 0.3) * 30.0, (rn() - 0.5) * dist];
			const rotation: Point3 = [(rn() - 0.5), (rn() - 0.5), (rn() - 0.5)];
			const fgColor = randomColor();
			const bgColor = randomColor();
			fgColor[3] = 1; // Foreground is top priority
			bgColor[3] = 0; // Ignore background
			const vertices = icosahedron.map(v => ({ ...v, fgColor, bgColor }));
			this.entities.push({
				transform: translation(...position),
				rotation,
				mesh: new Mesh(ctx, vertices),
			});
		}

		// Bright one
		const fgColor = randomColor();
		const bgColor = randomColor();
		const vertices = icosahedron.map(v => ({ ...v, fgColor: [1, 0, 1, 1] as Color, bgColor: [0, 1, 1, 1] as Color }));
		this.entities.push({
			transform: translation(0, 7.6, 14),
			rotation: [0, 0, 0],
			mesh: new Mesh(ctx, vertices),
		});

		// Terrain
		{
			//const fgColor = randomColor();
			//const bgColor = randomColor();
			const fgColor = [0.1, 0.8, 0.2, 1.0] as Color;
			const bgColor = [0.2, 0.4, 0.0, 0.5] as Color;
			fgColor[3] = 1.0;
			bgColor[3] = 0.5;

			const divisions = 8.0;
			const scale = divisions * 2;

			// All chunks use the same mesh instance
			const terrainVertices = subdividedPlane(divisions, scale, [0, 0], { fgColor, bgColor });
			const terrainMesh = new Mesh(ctx, terrainVertices);

			const r = 4;
			for (let y = -r; y < r; y++) {
				for (let x = -r; x < r; x++) {
					this.chunks.push({
						transform: translation(x * scale * 2, 0, y * scale * 2),
						rotation: [0, 0, 0],
						mesh: terrainMesh,
					});
				}
			}
		}

		this.camera.position = [0.0, 10.0, 20.0];
	}

	updateModels() {
		const now = performance.now();
		const s = 5.0;
		const dt = (now - this.lastUpdateAt) / 1000.0;
		for (const entity of this.entities) {
			entity.transform = multiply(
				entity.transform,
				rotation(
					entity.rotation[0] * dt * s,
					entity.rotation[1] * dt * s,
					entity.rotation[2] * dt * s,
				),
			);
		}
		this.lastUpdateAt = now;
	}

	drawFrame(camera?: Camera): number {
		const { ctx } = this;
		const t = performance.now();
		const [w, h] = ctx.size;
		this.gbuffer.resize(w, h);

		ctx.encode(encoder => {
			this.terrainPipeline.drawBatch(this.gbuffer, camera || this.camera, this.chunks, true);
			this.entityPipeline.drawBatch(this.gbuffer, camera || this.camera, this.entities);
		});
		// FIXME FIXME this option should be moved
		if (this.composePipeline.options.pixelated) {
			this.pixelatePipeline.pixelateColor(this.gbuffer, 8);
		}

		const view = ctx.currentTexture.createView();
		this.composePipeline.compose(view, this.gbuffer);
		return (performance.now() - t) / 1000;
	}

	async draw(camera?: Camera) {
		return new Promise(resolve =>
			requestAnimationFrame(() => {
				this.updateModels();
				resolve(this.drawFrame(camera));
			}));
	}
}


const QUAD_VERTS = [
	[-1.0, -1.0, 0.0],
	[1.0, -1.0, 0.0],
	[-1.0, 1.0, 0.0],
	[1.0, 1.0, 0.0],
];

function noise2d(x: number, y: number): number {
	const d = 8.0;
	const m = 4.0;
	return (Math.sin(x / d) * Math.sin(y / d)) * m;
}

function calculateNormals(vertices: Array<Vertex>) {
	for (let i = 0; i < vertices.length; i += 3) {
		const { position: p0 } = vertices[i + 0];
		const { position: p1 } = vertices[i + 1];
		const { position: p2 } = vertices[i + 2];

		const a = subtract(p1, p0);
		const b = subtract(p2, p0);

		const normal = normalize(cross(a, b));
		vertices[i + 0].normal = [...normal];
		vertices[i + 1].normal = [...normal];
		vertices[i + 2].normal = [...normal];
	}
}

function subdividedPlane(divisions: number = 1, scale: number = 1.0, offset: Vector2 = [0, 0], template?: Partial<Vertex>): Array<Vertex> {
	const vertices: Array<Vertex> = [];

	const baseTriangle = {
		position: [0.0, 0.0, 0.0],
		normal: [0.0, 0.0, 0.0],
		fgColor: [0.8, 0.5, 0.1, 1.0],
		bgColor: [0.2, 0.4, 0.1, 0.5],
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
				{ ...baseTriangle, position: [sx + -s, 0, sy + s] } as Vertex,
				{ ...baseTriangle, position: [sx + s, 0, sy + -s] } as Vertex,
				{ ...baseTriangle, position: [sx + -s, 0, sy + -s] } as Vertex,

				{ ...baseTriangle, position: [sx + s, 0, sy + s] } as Vertex,
				{ ...baseTriangle, position: [sx + s, 0, sy + -s] } as Vertex,
				{ ...baseTriangle, position: [sx + -s, 0, sy + s] } as Vertex,
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
