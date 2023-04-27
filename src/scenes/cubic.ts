import { GBuffer, Scene } from "../lib";
import { transform } from "../math";
import { Cube, CubeProgram } from "../programs/cube";

export class Cubic extends Scene {
	private program: CubeProgram;
	private gbuffer: GBuffer;
	private cubes: Array<Cube>;

	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.program = new CubeProgram(gl);
	}

	async draw() {
		this.program.drawCubes(
			this.gbuffer,
			[
				{ transform: transform.identity(), color: [1.0, 0.0, 1.0, 1.0] }
			],
		);
		this.drawToScreen(this.gbuffer);
		return new Promise(resolve => requestAnimationFrame(resolve));
	}
}
