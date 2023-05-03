import { Camera } from "../camera";
import { GBuffer } from "../gbuffer";
import { Program } from "../program";

export class SkyProgram extends Program {
	constructor(gl: WebGL2RenderingContext) {
		super(gl);
	}

	draw(target: GBuffer, camera: Camera) {
	}
}
