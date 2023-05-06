import { Framebuffer } from './framebuffer';
import { Size2 } from './math';

function generateTexture(gl: WebGL2RenderingContext, unit: number, format: GLenum = gl.RGBA): WebGLTexture {
	console.debug("Generating texture", unit, format);
	const texture = gl.createTexture()!;
	resizeTexture(gl, texture, unit, 1, 1, format);
	return texture;
}

function resizeTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, unit: number, width: number, height: number, internalFormat: GLenum = gl.RGBA) {
	let bytes: Uint8Array | Float32Array;
	let dataType: GLenum = gl.UNSIGNED_BYTE;
	let format: GLenum = gl.RGBA;

	switch (internalFormat) {
		case gl.RGBA32F:
			dataType = gl.FLOAT;
			bytes = new Float32Array(width * height * 4);
			break;

		case gl.RGBA:
			bytes = new Uint8Array(width * height * 4);
			break;

		default:
			console.error("Unhandled format", format);
			bytes = new Uint8Array();
	}

	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, dataType, bytes);
	if (internalFormat === gl.RGBA) {
		gl.generateMipmap(gl.TEXTURE_2D);
	}
	gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + unit, gl.TEXTURE_2D, texture, 0);
}

/**
 * Geometry Buffer. Contains multiple render textures, each storing different information about the rendered scene.
 * The GBuffer is combined by the {@link programs.ComposeProgram} to form the final displayed image
 */
export class GBuffer {
	gl: WebGL2RenderingContext;
	size: Size2 = [1, 1];
	framebuffer: Framebuffer;
	albedo: WebGLTexture;
	position: WebGLTexture;
	normal: WebGLTexture;
	specular: WebGLTexture;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;

		this.framebuffer = new Framebuffer(gl);
		this.albedo = generateTexture(gl, 0);
		this.position = generateTexture(gl, 1);
		this.normal = generateTexture(gl, 2);
		this.specular = generateTexture(gl, 3);
	}

	get aspect(): number {
		return this.size[0] / this.size[1];
	}

	bind() {
		const gl = this.gl;
		this.framebuffer.bind();
		gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);
	}

	resize(width: number, height: number) {
		const gl = this.gl;
		if (width !== this.size[0] || height !== this.size[1]) {
			console.debug('Resize GBuffer', width, height);
			this.size = [width, height];

			this.framebuffer.resize(width, height);

			// Resize all the gbuffer textures
			resizeTexture(gl, this.albedo, 0, width, height);
			resizeTexture(gl, this.position, 1, width, height);
			resizeTexture(gl, this.normal, 2, width, height);
			resizeTexture(gl, this.specular, 3, width, height);
		}
	}

	clear() {
		this.bind();
		const gl = this.gl;
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.clearBufferfv(gl.COLOR, 0, [0.1, 0.0, 0.0, 0.0]);
		gl.clearBufferfv(gl.COLOR, 1, [0.1, 0.1, 0.0, 0.0]);
		gl.clearBufferfv(gl.COLOR, 2, [0.0, 0.1, 0.0, 0.0]);
		gl.clearBufferfv(gl.COLOR, 3, [0.0, 0.1, 0.1, 0.0]);
		gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);
	}
}
