import { GBuffer, Mesh, Program } from '../lib';
import vertSource from '../shaders/grid.vert.glsl';
import fragSource from '../shaders/grid.frag.glsl';
import { PHI, Point, Point2, Point3, Size2, transform } from '../math';
import * as vectors from '../math/vectors';
import { multiply, rotation, scaling, translation } from '../math/transform';
import { normalize } from '../math/vectors';

export interface GridVertex {
	position: Point3;
	barycentric: Point3;
	uv: Point2;
}

export class GridProgram extends Program {
	private size: Size2;
	private positionBuffer!: WebGLBuffer;
	private barycentricBuffer!: WebGLBuffer;
	private uvBuffer!: WebGLBuffer;
	private mesh: Mesh<GridVertex>;
	private subdivisions: number = 0;

	constructor(gl: WebGL2RenderingContext, width: number, height: number) {
		super(gl);
		this.size = [width, height];

		this.addVertexShader(vertSource);
		this.addFragmentShader(fragSource);

		this.addAttribute('position', gl.FLOAT_VEC3);
		this.addAttribute('barycentric', gl.FLOAT_VEC3);
		this.addAttribute('uv', gl.FLOAT_VEC2);

		this.addUniform('camera.model', gl.FLOAT_MAT4);
		this.addUniform('camera.view', gl.FLOAT_MAT4);
		this.addUniform('camera.projection', gl.FLOAT_MAT4);

		const baseTriangle = [
			{ position: [0.0, 0.0, 0.0], barycentric: [1.0, 0.0, 0.0], uv: [0.0, 0.0] },
			{ position: [0.0, 0.0, 0.0], barycentric: [0.0, 1.0, 0.0], uv: [0.0, 1.0] },
			{ position: [0.0, 0.0, 0.0], barycentric: [0.0, 0.0, 1.0], uv: [1.0, 1.0] },
		];

		const vertices = ICOSAHEDRON_TRIS.map((tri) =>
			tri.map((v, i) => ({
				position: normalize(ICOSAHEDRON_VERTICES[v]),
				barycentric: baseTriangle[i % 3].barycentric,
				uv: baseTriangle[i % 3].uv,
			} as GridVertex))
		).flat();
		this.mesh = new Mesh<GridVertex>(vertices);
		this.compile();
		this.rebuildMesh();
	}

	rebuildMesh() {
		const gl = this.gl;
		this.subdivisions += 1;
		subdivideMesh(this.mesh, 1);
		const { position, barycentric, uv } = this.mesh.toTypedArrays();

		this.positionBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, position, gl.STATIC_DRAW);

		this.barycentricBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.barycentricBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, barycentric, gl.STATIC_DRAW);

		this.uvBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
	}

	draw(target: GBuffer) {
		const gl = this.gl;
		this.use();

		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);

		this.bindAttribute('position', this.positionBuffer);
		this.bindAttribute('barycentric', this.barycentricBuffer);
		this.bindAttribute('uv', this.uvBuffer);

		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, target.framebuffer);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.clearBufferfv(gl.COLOR, 0, [0.1, 0.0, 0.0, 0.0]);
		gl.clearBufferfv(gl.COLOR, 1, [0.1, 0.1, 0.0, 0.0]);
		gl.clearBufferfv(gl.COLOR, 2, [0.0, 0.1, 0.0, 0.0]);
		gl.clearBufferfv(gl.COLOR, 3, [0.0, 0.1, 0.1, 0.0]);

		gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);

		const t = performance.now() / 1000.0;
		const projection = transform.perspective(target.aspect, 45.0, 1.0, 1000.0);
		this.bindUniform('camera.view', transform.identity());
		const s = Math.min(8.0, t);
		if (t < 5.0 && t > this.subdivisions) {
			this.rebuildMesh();
		}
		this.bindUniform('camera.model',
			multiply(
				translation(0.0, -s, -4.0),
				rotation(0.0, t / 4.0, 0.0),
				scaling(s),
			)
		);
		this.bindUniform('camera.projection', projection);

		gl.drawArrays(gl.TRIANGLES, 0, this.mesh.vertices.length);
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


type Triangle = [GridVertex, GridVertex, GridVertex];
type SubdividedTriangles = [Triangle, Triangle, Triangle, Triangle];

function subdivideMesh({ vertices }: Mesh<GridVertex>, count: number = 1) {
	for (let i = 0; i < count; i++) {
		const vertexCount = vertices.length;
		for (let j = 0; j < vertexCount; j += 3) {
			const v0 = vertices[j];
			const v1 = vertices[j + 1];
			const v2 = vertices[j + 2];
			const [t0, ...tris] = subdivideTriangle([v0, v1, v2]);

			// Replace current tri with the first one
			vertices.splice(j, 3, ...t0);

			// Append the last 3 to the mesh
			vertices.push(...tris.flat());
		}
	}
}


function subdivideTriangle(tri: Triangle): SubdividedTriangles {
	const vertices = tri.map(({ position }) => [...position]);
	const indexes = [
		[0, 3, 5],
		[3, 1, 4],
		[5, 3, 4],
		[5, 4, 2]
	];

	for (let i = 0; i < 3; i++) {
		const v0 = [...tri[i].position] as Point3;
		const v1 = [...tri[(i + 1) % 3].position] as Point3;
		vertices.push(midway(v0, v1));
	}

	return indexes.map(([v0, v1, v2]) => [
		{ position: vertices[v0], barycentric: [1.0, 0.0, 0.0], uv: [0.0, 0.0] },
		{ position: vertices[v1], barycentric: [0.0, 1.0, 0.0], uv: [0.0, 1.0] },
		{ position: vertices[v2], barycentric: [0.0, 0.0, 1.0], uv: [1.0, 1.0] },
	]) as SubdividedTriangles;
}

function midway(p0: Point3, p1: Point3): Point3 {
	return normalize(vectors.scale(vectors.add(p0, p1), 0.5));
}
