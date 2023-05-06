import { Camera } from "../camera";
import { Framebuffer } from "../framebuffer";
import { Program } from "../program";
import vertSource from '../shaders/sky.vert.glsl';
import fragSource from '../shaders/sky.frag.glsl';
import { GBuffer } from "../gbuffer";

const QUAD_VERTS = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);

export class SkyProgram extends Program {
	private vertexBuffer: WebGLBuffer;

	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.addVertexShader(vertSource);
		this.addFragmentShader(fragSource);

		this.addAttribute('position', gl.FLOAT_VEC2);
		this.vertexBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTS, gl.STATIC_DRAW);
		this.compile();
	}

	draw(buffer: GBuffer, camera: Camera) {
		const gl = this.gl;
		this.use();

		buffer.bind();
		this.bindAttribute('position', this.vertexBuffer);
		
		gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.clearColor(0.0, 1.0, 0.0, 1.0);
		gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

		gl.depthMask(false);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		gl.depthMask(true);
	}
}
