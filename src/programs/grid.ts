import { GBuffer, Program } from "../lib";
import vertSource from '../shaders/grid.vert.glsl';
import fragSource from '../shaders/grid.frag.glsl';
import { PHI, Point2, Point3, Size2, transform } from "../math";
import { multiply, rotation, translation } from "../math/transform";

export type Triangle = [Point3, Point3, Point3];

export interface Mesh {
	positions: Float32Array;
	barycentrics: Float32Array;
	uvs: Float32Array;
};

export class GridProgram extends Program {
	private size: [number, number];
	private positionBuffer: WebGLBuffer;
	private barycentricBuffer: WebGLBuffer;
	private uvBuffer: WebGLBuffer;

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

		//const { positions, barycentrics, uvs } = generateGrid(width, height);
		const { positions, barycentrics, uvs } = generateIcosahedron();

		this.positionBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

		this.barycentricBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.barycentricBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, barycentrics, gl.STATIC_DRAW);

		this.uvBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

		this.compile();
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
		this.bindUniform('camera.model',
			multiply(
				translation(0.0, 0.0, -4.0 + Math.sin(t) * 0.5),
				rotation(0.0, t, 0.0),
			)
		);
		this.bindUniform('camera.projection', projection);

		gl.drawArrays(gl.TRIANGLES, 0, 20 * 3);
	}
}

/**
 * An Icosahedron contains 20 equilateral triangles
 */
function generateIcosahedron(): Mesh {
	const triCount = ICOSAHEDRON_TRIS.length;
	const vertexCount = triCount * 3;
	const mesh: Mesh = {
		positions: new Float32Array(vertexCount * 3),
		barycentrics: new Float32Array(vertexCount * 3),
		uvs: new Float32Array(vertexCount * 2),
	};

	for (let i = 0; i < triCount; i++) {
		const [a, b, c] = ICOSAHEDRON_TRIS[i];

		const triangle = [
			ICOSAHEDRON_VERTICES[a],
			ICOSAHEDRON_VERTICES[b],
			ICOSAHEDRON_VERTICES[c],
		] as Triangle;
		insertTriangle(i, triangle, mesh);
	}

	return mesh;
}

function generateIcosphere(width: number, height: number): Mesh {
	const mesh: Mesh = {
		positions: new Float32Array(width * height * 3 * 6),
		barycentrics: new Float32Array(width * height * 3 * 6),
		uvs: new Float32Array(width * height * 2 * 6),
	};

	const triangle: Triangle = [
		[-0.5, -0.5, 0.5],
		[0.5, -0.5, 0.5],
		[0.5, 0.5, 0.5],
	];
	insertTriangle(0, triangle, mesh);

	return mesh;
}

function generateGrid(width: number, height: number): Mesh {
	const positions = new Float32Array(width * height * 3 * 6);
	const barycentrics = new Float32Array(width * height * 3 * 6);
	const uvs = new Float32Array(width * height * 2 * 6);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = x + y * width;
			insertQuad(i, x - width / 2, y - height / 2, positions, barycentrics, uvs);
		}
	}

	return { positions, barycentrics, uvs };
}

function insertTriangle(index: number, triangle: Triangle, mesh: Mesh) {
	const i3 = index * 3 * 3; // 3 floats x 3 vertices
	const i2 = index * 2 * 3; // 2 floats x 3 vertices

	mesh.positions.set(triangle.flat(), i3);
	mesh.barycentrics.set(TRI_BARYCENTRICS, i3);
	mesh.uvs.set(TRI_UVS, i2);
}

function insertQuad(index: number, x: number, y: number, positions: Float32Array, barycentrics: Float32Array, uvs: Float32Array) {
	const i3 = index * 3 * 6; // 3 floats x 6 vertices
	const i2 = index * 2 * 6; // 2 floats x 6 vertices

	positions.set(QUAD_POSITIONS.map((n, i) => {
		switch (i % 3) {
			case 0: // X
				return n + x;
			case 1: // Y
				return n + y;
			default: // Z
				return n;
		}
	}), i3);
	barycentrics.set(QUAD_BARYCENTRICS, i3);
	uvs.set(QUAD_UVS, i2);
}

const QUAD_POSITIONS = new Float32Array([
	-0.5, -0.5, 0.5,
	0.5, -0.5, 0.5,
	0.5, 0.5, 0.5,

	0.5, 0.5, 0.5,
	-0.5, 0.5, 0.5,
	-0.5, -0.5, 0.5,
]);

const QUAD_BARYCENTRICS = new Float32Array([
	1.0, 0.0, 0.0,
	0.0, 1.0, 0.0,
	0.0, 0.0, 1.0,

	1.0, 0.0, 0.0,
	0.0, 1.0, 0.0,
	0.0, 0.0, 1.0,
]);

const QUAD_UVS = new Float32Array([
	1.0, 0.0,
	0.0, 1.0,
	1.0, 1.0,

	1.0, 0.0,
	0.0, 1.0,
	1.0, 1.0,
]);

const TRI_POSITIONS = new Float32Array([
	-0.5, -0.5, 0.5,
	0.5, -0.5, 0.5,
	0.5, 0.5, 0.5,
]);

const TRI_BARYCENTRICS = new Float32Array([
	1.0, 0.0, 0.0,
	0.0, 1.0, 0.0,
	0.0, 0.0, 1.0,
]);

const TRI_UVS = new Float32Array([
	1.0, 0.0,
	0.0, 1.0,
	1.0, 1.0,
]);

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
]
