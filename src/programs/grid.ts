import { GBuffer, Program } from "../lib";
import vertSource from '../shaders/grid.vert.glsl';
import fragSource from '../shaders/grid.frag.glsl';
import { Point2, Point3, Size2, transform } from "../math";
import { multiply, rotation, translation } from "../math/transform";

export interface GridVertex {
	position: Point3;
	barycentric: Point3;
	uv: Point2;
}

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

		const [positions, barycentrics, uvs] = generateGrid(width, height);

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
				translation(0.0, 0.0, -40.0 + Math.sin(t) * 2.5),
				rotation(0.0, t, t / 3.0),
			)
		);
		this.bindUniform('camera.projection', projection);

		const vertexCount = this.size[0] * this.size[1] * 6;
		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
	}
}

type GridResult = [Float32Array, Float32Array, Float32Array];

function generateGrid(width: number, height: number): GridResult {
	const positions = new Float32Array(width * height * 3 * 6);
	const barycentrics = new Float32Array(width * height * 3 * 6);
	const uvs = new Float32Array(width * height * 2 * 6);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = x + y * width;
			insertQuad(i, x - width / 2, y - height  / 2, positions, barycentrics, uvs);
		}
	}

	return [positions, barycentrics, uvs];
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
