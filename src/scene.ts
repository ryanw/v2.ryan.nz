import { Camera, GBuffer, Renderer } from "./lib";
import { ComposeProgram } from "./programs/compose";

export abstract class Scene {
	/**
	 * Camera we look at the scene with
	 */
	camera: Camera;

	private gl: WebGL2RenderingContext;
	private composeProgram: ComposeProgram;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;
		this.buildCamera();
		this.composeProgram = new ComposeProgram(gl);
	}

	buildCamera() {
		this.camera = new Camera();
	}

	drawToScreen(buffer: GBuffer) {
		this.composeProgram.compose(buffer);
	}

	abstract draw(): Promise<void | unknown>;
}
