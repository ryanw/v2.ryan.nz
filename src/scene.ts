import { Camera, GBuffer } from "./lib";
import { ComposeProgram } from "./programs/compose";

export abstract class Scene {
	/**
	 * Camera we look at the scene with
	 */
	camera: Camera;

	protected gl: WebGL2RenderingContext;
	private composeProgram: ComposeProgram;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;
		this.camera = new Camera();
		this.composeProgram = new ComposeProgram(gl);
	}

	drawToScreen(buffer: GBuffer) {
		this.composeProgram.compose(buffer);
	}

	abstract draw(): Promise<void | unknown>;
}
