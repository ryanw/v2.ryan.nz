import vertSource from '../shaders/quad.vert.glsl';
import fragSource from '../shaders/blur.frag.glsl';
import { Program } from '../lib';

const QUAD_VERTS = new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0]);

export class BlurProgram extends Program {
	private vertexBuffer: WebGLBuffer;

	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.addVertexShader(vertSource);
		this.addFragmentShader(fragSource);

		this.addAttribute('position', gl.FLOAT_VEC2);
		this.addUniform('radius', gl.FLOAT);
		this.addTexture('frame');

		this.vertexBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTS, gl.STATIC_DRAW);

		this.compile();
	}

	clear(framebuffer: WebGLFramebuffer = 0) {
		const gl = this.gl;
		this.use();
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer || null);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	drawTexture(texture: WebGLTexture, framebuffer: WebGLFramebuffer = 0) {
		const gl = this.gl;
		this.use();

		this.bindUniform('radius', 25.0);

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer || null);
		this.bindTexture('frame', texture);

		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}
}
