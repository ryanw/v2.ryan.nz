import { Matrix4, PHI, Plane, Point2, Point3, Size2, Vector3 } from '../math';
import { Camera } from '../camera';
import { Context } from '../context';
import { Scene } from '../scene';
import { cross, normalize, subtract } from '../math/vectors';
import { Mesh } from '../mesh';
import { multiply, rotation, translation } from '../math/transform';
import { WireVertex, WireframePipeline } from '../pipelines/wireframe';

interface Entity {
	transform: Matrix4;
	mesh: Mesh<WireVertex>;
}

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

	constructor(ctx: Context) {
		super(ctx);
		this.wireframePipeline = new WireframePipeline(ctx);

		const baseTriangle = [
			{ position: [0.0, 0.0, 0.0], barycentric: [1.0, 0.0, 0.0], uv: [0.0, 0.0], normal: [1.0, 0.0, 0.0] },
			{ position: [0.0, 0.0, 0.0], barycentric: [0.0, 1.0, 0.0], uv: [0.0, 1.0], normal: [1.0, 0.0, 0.0] },
			{ position: [0.0, 0.0, 0.0], barycentric: [0.0, 0.0, 1.0], uv: [1.0, 1.0], normal: [1.0, 0.0, 0.0] },
		];
		const vertices = ICOSAHEDRON_TRIS.map((tri) =>
			tri.map((v, i) => ({
				position: normalize(ICOSAHEDRON_VERTICES[v]),
				barycentric: baseTriangle[i % 3].barycentric,
				uv: baseTriangle[i % 3].uv,
				normal: baseTriangle[i % 3].normal,
			} as WireVertex))
		).flat();

		calculateNormals(vertices);

		this.entities = [
			{
				transform: translation(2.0, 1.0, 2.0),
				mesh: new Mesh(ctx, vertices),
			},
			{
				transform: translation(0.0, 0.0, 0.0),
				mesh: new Mesh(ctx, vertices),
			}
		];

		this.camera.position = [0.0, 0.5, 5.0];
	}

	drawFrame(camera?: Camera): number {
		const { ctx } = this;
		const t = performance.now();
		const view = ctx.currentTexture.createView();
		let cleared = false;
		for (let i = 0; i < this.entities.length; i++) {
			const { transform, mesh } = this.entities[i];
			const model = i === 1 ? transform : multiply(rotation(0, performance.now() / 1000.0, 0), transform);
			this.wireframePipeline.draw(view, camera || this.camera, model, mesh, !cleared);
			cleared = true;
		}
		return (performance.now() - t) / 1000;
	}

	async draw(camera?: Camera) {
		return new Promise(resolve =>
			requestAnimationFrame(() =>
				resolve(this.drawFrame(camera))
			));
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
