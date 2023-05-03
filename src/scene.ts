import { GBuffer } from './lib';
import { ComposeProgram } from './programs/compose';

export abstract class Scene {
	protected gl: WebGL2RenderingContext;
	protected composeProgram: ComposeProgram;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;
		this.composeProgram = new ComposeProgram(gl);

	}

	drawToScreen(buffer: GBuffer) {
		this.composeProgram.compose(buffer);
	}

	abstract draw(): Promise<void | unknown>;
}
