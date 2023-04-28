import { Color, GBuffer, Program } from "../lib";
import vertSource from '../shaders/cube.vert.glsl';
import fragSource from '../shaders/cube.frag.glsl';
import { Matrix4, Point3 } from "../math";

export interface Cube {
	transform: Matrix4,
	color: Color
};

export class CubeProgram extends Program {
	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.addVertexShader(vertSource);
		this.addFragmentShader(fragSource);

		this.addAttribute('position', gl.FLOAT_VEC3);
		this.addAttribute('uv', gl.FLOAT_VEC2);

		this.addUniform('camera.view', gl.FLOAT_MAT4);
		this.addUniform('camera.model', gl.FLOAT_MAT4);
		this.addUniform('camera.projection', gl.FLOAT_MAT4);

		this.compile();
	}

	updateTexture(texture: WebGLTexture) {
		const gl = this.gl;
		const width = gl.drawingBufferWidth;
		const height = gl.drawingBufferHeight;

		const pixels = new Uint32Array(width * height);
		for (let i = 0; i < pixels.length; i++) {
			// Colour is 0xAABBGGRR
			pixels[i] = 0xff000000 + (Math.random() * 0xffffff) | 0;
		}
		const bytes = new Uint8Array(pixels.buffer);


		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
		gl.generateMipmap(gl.TEXTURE_2D);
	}

	draw(target: GBuffer, cubes: Array<Cube>) {
		this.updateTexture(target.albedo);
	}
}
