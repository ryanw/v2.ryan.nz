import { Size2 } from "./math";

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

export class GBuffer {
	gl: WebGL2RenderingContext
	size: Size2 = [1, 1];
	framebuffer: WebGLFramebuffer;
	depthbuffer: WebGLRenderbuffer;
	albedo: WebGLTexture;
	position: WebGLTexture;
	normal: WebGLTexture;
	specular: WebGLTexture;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;

		this.framebuffer = gl.createFramebuffer()!;
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.framebuffer);
		this.depthbuffer = gl.createRenderbuffer()!;
		gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthbuffer);
		gl.framebufferRenderbuffer(gl.DRAW_FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthbuffer);

		this.albedo = generateTexture(gl, 0)
		this.position = generateTexture(gl, 1, gl.RGBA32F);
		this.normal = generateTexture(gl, 2);
		this.specular = generateTexture(gl, 3);
	}

	get aspect(): number {
		return this.size[0] / this.size[1];
	}

	resize(width: number, height: number) {
		const gl = this.gl;
		if (width !== this.size[0] || height !== this.size[1]) {
			console.debug("Resize GBuffer", width, height);
			this.size = [width, height];

			// Delete and recreate the framebuffer + renderbuffer
			gl.deleteFramebuffer(this.framebuffer);
			gl.deleteRenderbuffer(this.depthbuffer);

			this.framebuffer = gl.createFramebuffer()!;
			this.depthbuffer = gl.createRenderbuffer()!;

			gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.framebuffer);
			gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthbuffer);

			// Reattach new renderbuffer to the new framebuffer
			gl.framebufferRenderbuffer(gl.DRAW_FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthbuffer);

			// Resize depth texture
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

			// Resize all the gbuffer textures
			resizeTexture(gl, this.albedo, 0, width, height);
			resizeTexture(gl, this.position, 1, width, height, gl.RGBA32F);
			resizeTexture(gl, this.normal, 2, width, height);
			resizeTexture(gl, this.specular, 3, width, height);
		}
	}
}
