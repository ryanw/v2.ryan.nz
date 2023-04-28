import { Program } from '../program';
import { GBuffer } from '../gbuffer';
import vertSource from '../shaders/quad.vert.glsl';
import fragSource from '../shaders/compose.frag.glsl';

const QUAD_VERTS = new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0]);

export class ComposeProgram extends Program {
	private vertexBuffer: WebGLBuffer;

	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.addVertexShader(vertSource);
		this.addFragmentShader(fragSource);
		this.addAttribute('position', gl.FLOAT_VEC2);
		this.addTexture('g_albedo');
		this.addTexture('g_position');

		this.vertexBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTS, gl.STATIC_DRAW);

		this.compile();
	}

	compose(buffer: GBuffer, framebuffer: WebGLFramebuffer = 0) {
		const gl = this.gl;
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		this.use();

		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer || null);

		this.bindAttribute('position', this.vertexBuffer);
		this.bindTexture('g_albedo', buffer.albedo);
		this.bindTexture('g_position', buffer.position);

		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}
}

