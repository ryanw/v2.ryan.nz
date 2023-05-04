import { Camera } from '../camera';
import { Framebuffer, GBuffer, Scene } from '../lib';
import { Plane, Size2 } from '../math';
import { normalize } from '../math/vectors';
import { GridProgram, QuadProgram, SkyProgram } from '../programs';

function resizeTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, width: number, height: number, internalFormat: GLenum = gl.RGBA) {
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

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, dataType, bytes);
	if (internalFormat === gl.RGBA) {
		gl.generateMipmap(gl.TEXTURE_2D);
	}
}

export class Spacewave extends Scene {
	camera = new Camera();
	private backbuffer: Framebuffer;
	private gbuffer: GBuffer;
	private mainOutput: WebGLTexture;
	private mirrorOutput: WebGLTexture;
	private mirrorMask: WebGLTexture;
	private size: Size2 = [0, 0];
	private skyProg: SkyProgram;
	private gridProg: GridProgram;
	private quadProg: QuadProgram;

	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.backbuffer = new Framebuffer(gl);
		this.gbuffer = new GBuffer(gl);

		this.skyProg = new SkyProgram(gl);
		this.gridProg = new GridProgram(gl);
		this.quadProg = new QuadProgram(gl);

		this.mainOutput = gl.createTexture()!;
		this.mirrorOutput = gl.createTexture()!;
		this.mirrorMask = gl.createTexture()!;
		resizeTexture(gl, this.mainOutput, 32, 32);
		resizeTexture(gl, this.mirrorOutput, 32, 32);

		this.updateViewport();
	}

	updateViewport() {
		const { drawingBufferWidth: width, drawingBufferHeight: height } = this.gl;
		if (width !== this.size[0] || height !== this.size[1]) {
			this.resize(width, height);
		}
	}

	resize(width: number, height: number) {
		if (width === this.size[0] && height === this.size[1]) {
			return;
		}

		const gl = this.gl;
		this.size = [width, height];
		resizeTexture(gl, this.mainOutput, width, height);
		resizeTexture(gl, this.mirrorOutput, width, height);
		gl.viewport(0, 0, width, height);
		this.gbuffer.resize(width, height);
		this.backbuffer.resize(width, height);
	}

	drawSky(buffer: GBuffer, camera: Camera) {
		this.skyProg.draw(buffer, camera);
	}

	drawAtmosphere(buffer: GBuffer, camera: Camera) {
	}

	drawGeometry(buffer: GBuffer, camera: Camera) {
		this.gridProg.draw(this.gbuffer, camera, true);
	}

	drawLights(output: WebGLTexture, buffer: GBuffer, camera: Camera) {
	}

	drawPlane(output: WebGLTexture, plane: Plane, camera: Camera) {
	}

	drawScene(output: WebGLTexture, camera: Camera) {
		const gbuffer = this.gbuffer;
		this.drawSky(gbuffer, camera);
		this.drawAtmosphere(gbuffer, camera);
		this.drawGeometry(gbuffer, camera);
		this.composeGBuffer(output, gbuffer);
		this.drawLights(output, gbuffer, camera);
	}

	drawFrame() {
		const mirrorPlane: Plane = [
			// At the origin
			[0.0, 0.0, 0.0],
			// Facing up
			normalize([0.3, 1.0, 0.0]),
		];
		const { camera, mainOutput, mirrorOutput, mirrorMask } = this;
		const mirrorCamera = camera.reflect(mirrorPlane);
		this.drawScene(mainOutput, camera);
		this.drawScene(mirrorOutput, mirrorCamera);

		this.blurTexture(mirrorOutput);
		this.drawPlane(mirrorMask, mirrorPlane, camera)
		this.blurTexture(mirrorMask);
		this.blendTextures(mirrorOutput, mainOutput, mirrorMask);
	}

	blurTexture(texture: WebGLTexture) {
	}

	blendTextures(back: WebGLTexture, front: WebGLTexture, mask: WebGLTexture) {
	}

	composeGBuffer(output: WebGLTexture, buffer: GBuffer) {
		const gl = this.gl;
		this.backbuffer.bind();
		gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, output, 0);
		this.composeProgram.compose(buffer, this.backbuffer.framebuffer);
	}

	async draw() {
		return new Promise(resolve => {
			requestAnimationFrame(() => {
				this.updateViewport();
				this.drawFrame();
				this.quadProg.drawTexture(this.mirrorOutput);
				this.quadProg.drawTexture(this.mainOutput);
				resolve(void 0);
			});
		});
	}
}
