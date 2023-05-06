import vertSource from '../shaders/plane.vert.glsl';
import fragSource from '../shaders/plane.frag.glsl';
import { Camera, Framebuffer, Program } from '../lib';
import { Plane } from '../math';
import { identity, matrixFromVector as vectorToRotation, multiply, rotation, scaling, translation, inverse } from '../math/transform';

const QUAD_VERTS = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);

export class PlaneProgram extends Program {
	private vertexBuffer: WebGLBuffer;

	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.addVertexShader(vertSource);
		this.addFragmentShader(fragSource);

		this.addAttribute('position', gl.FLOAT_VEC2);
		this.addUniform('camera.model', gl.FLOAT_MAT4);
		this.addUniform('camera.view', gl.FLOAT_MAT4);
		this.addUniform('camera.projection', gl.FLOAT_MAT4);

		this.vertexBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTS, gl.STATIC_DRAW);

		this.compile();
	}

	drawPlane(plane: Plane, camera: Camera, framebuffer?: Framebuffer) {
		const gl = this.gl;
		this.use();

		const [w, h] = framebuffer?.size || [1, 1];
		const aspect = w / h;

		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer?.framebuffer || null);
		gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		this.bindUniform('camera.view', camera.view());
		this.bindUniform('camera.projection', camera.projection(aspect));

		const t = performance.now() / 1000.0;
		this.bindUniform('camera.model',
			multiply(
				translation(...plane[0]),
				vectorToRotation(plane[1]),
				scaling(5.0),
			)
		);

		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}
}
