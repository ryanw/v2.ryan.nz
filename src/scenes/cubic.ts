import { GBuffer, Scene } from "../lib";
import { Size2, transform } from "../math";
import { Cube, CubeProgram } from "../programs/cube";

export class Cubic extends Scene {
	cubes: Array<Cube> = [];
	private program: CubeProgram;
	private gbuffer: GBuffer;
	private size: Size2 = [1, 1];

	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.program = new CubeProgram(gl);
		this.gbuffer = new GBuffer(gl);
		this.updateViewport();
	}

	updateViewport() {
		const { drawingBufferWidth: width, drawingBufferHeight: height } = this.gl;
		if (width !== this.size[0] || height !== this.size[1]) {
			this.resize(width, height);
		}
	}

	resize(width: number, height: number) {
		this.size = [width, height];
		this.gl.viewport(0, 0, width, height);
		this.gbuffer.resize(width, height)
	}

	async draw() {
		this.updateViewport();
		this.program.draw(this.gbuffer, this.cubes);
		this.drawToScreen(this.gbuffer);

		// Wait for vsync -- TODO flip double buffers
		return new Promise(resolve => requestAnimationFrame(resolve));
	}
}
