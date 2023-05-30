import { Matrix4, PHI, Plane, Point2, Point3, Size2, Vector3 } from '../math';
import { Camera } from '../camera';
import { Context } from '../context';
import { Scene } from '../scene';
import { cross, normalize, subtract } from '../math/vectors';
import { Mesh } from '../mesh';
import { multiply, rotation, translation } from '../math/transform';
import { Entity, WireVertex, WireframePipeline } from '../pipelines/wireframe';
import { Color } from '../lib';

function calculateNormals(vertices: Array<WireVertex>) {
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

export class Spacewave extends Scene {
	private entities: Array<Entity>;
	camera = new Camera();
	wireframePipeline: WireframePipeline;
	lastUpdateAt = performance.now();

	constructor(ctx: Context) {
		super(ctx);
		this.wireframePipeline = new WireframePipeline(ctx);

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
				color: [0.0, 1.0, 1.0, 0.5],
			} as WireVertex))
		).flat();

		calculateNormals(icosahedron);

		this.entities = [];

		const rn = Math.random;

		for (let i = 0; i < 500; i++) {
			const dist = 50.0;
			const color: Color = [rn() * 0.7, rn() * 0.7, rn() * 0.7, 1.0];
			const position: Point3 = [(rn() - 0.5) * dist, (rn() - 0.5) * dist, (rn() - 0.5) * dist];
			const rotation: Point3 = [(rn() - 0.5), (rn() - 0.5), (rn() - 0.5)];
			const vertices = icosahedron.map(v => ({ ...v, color }));
			this.entities.push({
				transform: translation(...position),
				rotation,
				mesh: new Mesh(ctx, vertices),
			});
		}

		this.camera.position = [0.0, 0.5, 5.0];
	}

	updateModels() {
		const now = performance.now();
		const dt = (now - this.lastUpdateAt) / 1000.0;
		for (const entity of this.entities) {
			entity.transform = multiply(
				entity.transform,
				rotation(
					entity.rotation[0] * dt,
					entity.rotation[1] * dt,
					entity.rotation[2] * dt,
				),
			);
		}
		this.lastUpdateAt = now;
	}

	drawFrame(camera?: Camera): number {
		const { ctx } = this;
		const t = performance.now();

		const view = ctx.currentTexture.createView();
		this.wireframePipeline.drawEntities(view, camera || this.camera, this.entities);
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

const ICOSAHEDRON_VERTICES: Array<Point3> = [
	[-1, PHI, 0],
	[1, PHI, 0],
	[-1, -PHI, 0],
	[1, -PHI, 0],
	[0, -1, PHI],
	[0, 1, PHI],
	[0, -1, -PHI],
	[0, 1, -PHI],
	[PHI, 0, -1],
	[PHI, 0, 1],
	[-PHI, 0, -1],
	[-PHI, 0, 1]
];

const ICOSAHEDRON_TRIS: Array<[number, number, number]> = [
	[0, 11, 5],
	[0, 5, 1],
	[0, 1, 7],
	[0, 7, 10],
	[0, 10, 11],
	[1, 5, 9],
	[5, 11, 4],
	[11, 10, 2],
	[10, 7, 6],
	[7, 1, 8],
	[3, 9, 4],
	[3, 4, 2],
	[3, 2, 6],
	[3, 6, 8],
	[3, 8, 9],
	[4, 9, 5],
	[2, 4, 11],
	[6, 2, 10],
	[8, 6, 7],
	[9, 8, 1]
];

const QUAD_VERTS = [
	[-0.5, -0.5, 0.0],
	[0.5, -0.5, 0.0],
	[-0.5, 0.5, 0.0],
	[0.5, 0.5, 0.0],
];
