import { Color, GBuffer, Program } from "../lib";
import vertSource from '../shaders/cube.vert.glsl';
import fragSource from '../shaders/cube.frag.glsl';
import { Matrix4, Point3, Size2, transform } from "../math";

export interface Cube {
	transform: Matrix4,
	color: Color
};

type Triangle = [number, number, number];

enum GBufferTarget {
	Albedo = 0,
	Position,
}

const CUBE_VERTICES = new Float32Array([
	-0.5, -0.5, 0.5,
	0.5, -0.5, 0.5,
	0.5, 0.5, 0.5,
	-0.5, 0.5, 0.5,
	-0.5, -0.5, -0.5,
	0.5, -0.5, -0.5,
	0.5, 0.5, -0.5,
	-0.5, 0.5, -0.5,
]);

const CUBE_UVS = new Float32Array([
	0, 0,
	1, 0,
	1, 1,
	0, 1,
	0, 0,
	1, 0,
	1, 1,
	0, 1,
]);

const CUBE_INDICES = new Uint16Array([
	// Front
	0, 1, 2,
	2, 3, 0,
	// Right
	1, 5, 6,
	6, 2, 1,
	// Back
	5, 4, 7,
	7, 6, 5,
	// Left
	4, 0, 3,
	3, 7, 4,
	// Top
	3, 2, 6,
	6, 7, 3,
	// Bottom
	0, 4, 5,
	5, 1, 0,
]);

export class CubeProgram extends Program {
	private size: Size2 = [1, 1];
	private positionBuffer: WebGLBuffer;
	private uvBuffer: WebGLBuffer;
	private indexBuffer: WebGLBuffer;

	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.addVertexShader(vertSource);
		this.addFragmentShader(fragSource);

		this.addAttribute('position', gl.FLOAT_VEC3);
		this.addAttribute('uv', gl.FLOAT_VEC2);
		//this.addInstanceAttribute('model', gl.FLOAT_MAT4);

		this.addUniform('camera.view', gl.FLOAT_MAT4);
		this.addUniform('camera.model', gl.FLOAT_MAT4);
		this.addUniform('camera.projection', gl.FLOAT_MAT4);

		this.positionBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, CUBE_VERTICES, gl.STATIC_DRAW);

		this.uvBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, CUBE_UVS, gl.STATIC_DRAW);

		this.indexBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, CUBE_INDICES, gl.STATIC_DRAW);

		this.compile();
	}

	draw(target: GBuffer, cubes: Array<Cube>) {
		const gl = this.gl;
		this.use();

		this.bindAttribute('position', this.positionBuffer);
		this.bindAttribute('uv', this.uvBuffer);
		this.bindUniform('camera.view', transform.identity());
		this.bindUniform('camera.model', transform.translation(Math.sin(performance.now() / 1000.0) / 4.0, 0.0, 0.0));
		this.bindUniform('camera.projection', transform.identity());

		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, target.framebuffer);
		gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 0.0]);
		gl.clearBufferfv(gl.COLOR, 1, [0.0, 0.0, 0.0, 0.0]);

		// FIXME use gl.getFragDataLocation to figure out which ones to use
		gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.drawElements(gl.TRIANGLES, CUBE_INDICES.length, gl.UNSIGNED_SHORT, 0);
	}
}
