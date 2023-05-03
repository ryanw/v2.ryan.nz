import { Camera } from '../camera';
import { Framebuffer, GBuffer, Scene } from '../lib';
import { Plane, Size2 } from '../math';
import { normalize } from '../math/vectors';
import { GridProgram, SkyProgram } from '../programs';

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

	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.backbuffer = new Framebuffer(gl);
		this.gbuffer = new GBuffer(gl);
		this.updateViewport();

		this.skyProg = new SkyProgram(gl);
		this.gridProg = new GridProgram(gl);

		this.mainOutput = gl.createTexture()!;
		this.mirrorOutput = gl.createTexture()!;
		this.mirrorMask = gl.createTexture()!;
	}

	updateViewport() {
		const { drawingBufferWidth: width, drawingBufferHeight: height } = this.gl;
		if (width !== this.size[0] || height !== this.size[1]) {
			this.resize(width, height);
		}
	}

	resize(width: number, height: number) {
		const gl = this.gl;
		this.size = [width, height];
		gl.viewport(0, 0, width, height);
		this.gbuffer.resize(width, height);
		this.backbuffer.resize(width, height);
	}

	drawSky(buffer: GBuffer) {
		this.skyProg.draw(buffer, this.camera);
	}

	drawAtmosphere(buffer: GBuffer) {
	}

	drawGeometry(buffer: GBuffer) {
		this.gridProg.draw(this.gbuffer, this.camera);
	}

	drawLights(output: WebGLTexture, buffer: GBuffer) {
	}

	drawPlane(output: WebGLTexture, plane: Plane) {
	}

	drawScene(output: WebGLTexture, camera: Camera) {
		const gbuffer = this.gbuffer;
		this.drawSky(gbuffer);
		this.drawAtmosphere(gbuffer);
		//this.drawGeometry(gbuffer);
		this.composeGBuffer(output, gbuffer);
		this.drawLights(output, gbuffer);
	}

	drawFrame() {
		const mirrorPlane: Plane = [
			// At the origin
			[0.0, 0.0, 0.0],
			// Facing up
			normalize([0.5, 1.0, 0.0]),
		];
		const { camera, mainOutput, mirrorOutput, mirrorMask } = this;
		const mirrorCamera = camera.reflect(mirrorPlane);
		this.drawScene(mainOutput, camera);
		this.gridProg.draw(this.gbuffer, mirrorCamera);

		this.drawScene(mirrorOutput, mirrorCamera);

		this.blurTexture(mirrorOutput);
		this.drawPlane(mirrorMask, mirrorPlane)
		this.blurTexture(mirrorMask);
		this.blendTextures(mirrorOutput, mainOutput, mirrorMask);
	}

	blurTexture(texture: WebGLTexture) {
	}

	blendTextures(back: WebGLTexture, front: WebGLTexture, mask: WebGLTexture) {
	}

	composeGBuffer(output: WebGLTexture, buffer: GBuffer) {
		// FIXME pass in a framebuffer
		this.composeProgram.compose(buffer);
	}

	async draw() {
		return new Promise(resolve => {
			requestAnimationFrame(() => {
				this.updateViewport();
				this.drawFrame();
				this.drawToScreen(this.gbuffer);
				resolve(void 0);
			});
		});
	}
}
