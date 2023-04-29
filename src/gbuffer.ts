import { Size2 } from "./math";

function generateTexture(gl: WebGL2RenderingContext, unit: number, width: number = 1, height: number = 1): WebGLTexture {
	console.debug("Generating texture", unit, width, height);
	const pixels = new Uint32Array(width * height);
	const bytes = new Uint8Array(pixels.buffer);
	const texture = gl.createTexture()!;

	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + unit, gl.TEXTURE_2D, texture, 0);

	return texture;
}

function resizeTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, unit: number, width: number, height: number) {
	const pixels = new Uint32Array(width * height);
	const bytes = new Uint8Array(pixels.buffer);
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
	gl.generateMipmap(gl.TEXTURE_2D);
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
		this.position = generateTexture(gl, 1);
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

			gl.deleteFramebuffer(this.framebuffer);
			gl.deleteRenderbuffer(this.depthbuffer);

			this.framebuffer = gl.createFramebuffer()!;
			this.depthbuffer = gl.createRenderbuffer()!;

			gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.framebuffer);
			gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthbuffer);

			gl.framebufferRenderbuffer(gl.DRAW_FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthbuffer);

			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
			resizeTexture(gl, this.albedo, 0, width, height);
			resizeTexture(gl, this.position, 1, width, height);
			resizeTexture(gl, this.normal, 2, width, height);
			resizeTexture(gl, this.specular, 3, width, height);
		}
	}
}
