import { Size2 } from "./math";

export class Framebuffer {
	gl: WebGL2RenderingContext;
	size: Size2 = [0, 0];
	framebuffer: WebGLFramebuffer;
	depthbuffer: WebGLRenderbuffer;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;

		this.framebuffer = gl.createFramebuffer()!;
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.framebuffer);
		this.depthbuffer = gl.createRenderbuffer()!;
		gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthbuffer);
		gl.framebufferRenderbuffer(gl.DRAW_FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthbuffer);
	}

	bind() {
		const gl = this.gl;
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.framebuffer);
	}

	resize(width: number, height: number) {
		if (width === this.size[0] && height === this.size[1]) {
			return;
		}

		const gl = this.gl;
		console.debug('Resize Framebuffer', width, height);
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
	}
}
