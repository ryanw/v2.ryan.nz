import { Camera } from '../camera';
import { Framebuffer, GBuffer, Scene } from '../lib';
import { Plane, Size2, Vector3 } from '../math';
import { multiplyVector, rotation } from '../math/transform';
import { normalize } from '../math/vectors';
import { BlurProgram, WireProgram, QuadProgram, SkyProgram } from '../programs';
import { PlaneProgram } from '../programs/plane';

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
	private skyOutput: WebGLTexture;
	private mainOutput: WebGLTexture;
	private mirrorOutput: WebGLTexture;
	private mirrorMask: WebGLTexture;
	private size: Size2 = [0, 0];
	private skyProg: SkyProgram;
	private wireProg: WireProgram;
	private quadProg: QuadProgram;
	private blurProg: BlurProgram;
	private planeProg: PlaneProgram;

	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.camera.position = [0.0, 0.5, 7.0];
		this.backbuffer = new Framebuffer(gl);
		this.gbuffer = new GBuffer(gl);

		this.skyProg = new SkyProgram(gl);
		this.wireProg = new WireProgram(gl);
		this.quadProg = new QuadProgram(gl);
		this.blurProg = new BlurProgram(gl);
		this.planeProg = new PlaneProgram(gl);

		this.skyOutput = gl.createTexture()!;
		this.mainOutput = gl.createTexture()!;
		this.mirrorOutput = gl.createTexture()!;
		this.mirrorMask = gl.createTexture()!;
		resizeTexture(gl, this.skyOutput, 32, 32);
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
		resizeTexture(gl, this.mirrorMask, width, height);
		resizeTexture(gl, this.mainOutput, width, height);
		resizeTexture(gl, this.skyOutput, width, height);
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
		this.wireProg.draw(buffer, camera, true);
	}

	drawLights(output: WebGLTexture, buffer: GBuffer, camera: Camera) {
	}

	drawPlane(output: WebGLTexture, plane: Plane, camera: Camera) {
		const gl = this.gl;
		this.backbuffer.bind();
		gl.bindTexture(gl.TEXTURE_2D, output);
		gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, output, 0);
		this.planeProg.drawPlane(plane, camera, this.backbuffer);
	}

	drawScene(output: WebGLTexture, camera: Camera) {
		const gbuffer = this.gbuffer;
		this.drawAtmosphere(gbuffer, camera);
		this.drawGeometry(gbuffer, camera);
		this.composeGBuffer(output, gbuffer);
		this.drawLights(output, gbuffer, camera);
	}

	drawFrame() {
		const t = performance.now() / 1000.0;
		const normal = normalize(
			multiplyVector(
				rotation(0, 0, t / 4),
				[1.0, 0.0, 0.0, 0.0]
			).slice(0, 3) as Vector3
		);
		const mirrorPlane: Plane = [
			[0.0, -1.0, 0.0],
			[0.0, 1.0, 0.0]
		];
		const { camera, mainOutput, mirrorOutput, mirrorMask } = this;
		const mirrorCamera = camera.reflect(mirrorPlane);
		this.gbuffer.clear();
		this.drawScene(mainOutput, camera);

		// Draw sky to a separate texture
		this.gbuffer.bind();
		this.gbuffer.clear();
		this.drawSky(this.gbuffer, camera);
		this.composeGBuffer(this.skyOutput, this.gbuffer);

		// Leave sky in gbuffer to reuse it for the mirror reflection
		this.drawScene(mirrorOutput, mirrorCamera);

		this.drawPlane(mirrorMask, mirrorPlane, camera)
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
				this.quadProg.drawTexture(this.skyOutput);
				this.quadProg.drawTexture(this.mirrorMask);
				this.blurProg.drawTexture(this.mirrorOutput, this.mirrorMask);
				this.quadProg.drawTexture(this.mainOutput);
				resolve(void 0);
			});
		});
	}
}
