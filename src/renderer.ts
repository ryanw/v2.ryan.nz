import { Size2 } from './math';
import { GBuffer, Pipeline, Program, Scene } from './lib';
import { QuadProgram } from './programs/quad';

export class Renderer {
	private _gl: WebGL2RenderingContext;
	private _colorAttachment: WebGLTexture;
	private _quadProgram: QuadProgram;
	private _framebuffer: WebGLFramebuffer;
	private _vertexBuffer: WebGLBuffer;
	private _antialias: boolean = false;
	private _size: Size2 = [0, 0];

	constructor(context: WebGL2RenderingContext) {
		this._gl = context;
		this._init();
	}

	get gl(): WebGL2RenderingContext {
		return this._gl;
	}

	get antialias(): boolean {
		return this._antialias || false;
	}

	set antialias(enabled: boolean) {
		this._antialias = enabled || false;
	}

	resize(width: number, height: number) {
		const gl = this.gl;
		this._size = [width, height];
		gl.viewport(0, 0, width, height);
		gl.bindTexture(gl.TEXTURE_2D, this._colorAttachment);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	}

	draw(buffer: GBuffer) {
		this._gl.viewport(0, 0, this._size[0], this._size[1]);

		//this._drawScene();
		//this._drawToScreen();
	}

	private _init() {
		const gl = this.gl;
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);

		this._colorAttachment = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this._colorAttachment);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		this._framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._colorAttachment, 0);
	}

	private _drawToScreen() {
		console.debug("Drawing to screen");
		const gl = this.gl;

		// Render to the screen
		this._quadProgram.use();
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		const positionAttr = 0;
		gl.clearColor(1.0, 0.0, 0.0, 0.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		gl.enableVertexAttribArray(positionAttr);
		gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}

}
