import { GBuffer, Scene } from "../lib";
import { Size2, transform } from "../math";
import { multiply, rotation, translation } from "../math/transform";
import { Cube, CubeProgram } from "../programs/cube";
import { GridProgram } from "../programs/grid";

export class Cubic extends Scene {
	cubes: Array<Cube> = [];
	private program: CubeProgram;
	private gridProgram: GridProgram;
	private gbuffer: GBuffer;
	private size: Size2 = [1, 1];

	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.program = new CubeProgram(gl);
		this.gridProgram = new GridProgram(gl, 64, 64);
		this.gbuffer = new GBuffer(gl);
		this.updateViewport();

	}

	updateViewport() {
		const { drawingBufferWidth: width, drawingBufferHeight: height } = this.gl;
		if (width !== this.size[0] || height !== this.size[1]) {
			this.resize(width, height);
		}
	}

	updateCubes() {
		const t = performance.now() / 1000;
		this.cubes = [
			{
				transform: multiply(
					translation(Math.sin(t), 0.0, -2.0),
					rotation(0.0, t, 0.0),
				),
				color: [1.0, 0.0, 1.0, 1.0],
			},
			{
				transform: multiply(
					translation(Math.sin(t), 4.0, -6.0),
					rotation(0.0, t, 0.0),
				),
				color: [1.0, 0.0, 1.0, 1.0],
			}
		]
	}

	resize(width: number, height: number) {
		this.size = [width, height];
		this.gl.viewport(0, 0, width, height);
		this.gbuffer.resize(width, height)
	}

	async draw() {
		return new Promise(resolve => {
			// Wait for vsync -- TODO flip double buffers
			requestAnimationFrame(() => {
				this.updateCubes();
				this.updateViewport();
				this.program.draw(this.gbuffer, this.cubes);
				//this.gridProgram.draw(this.gbuffer);
				//this.drawToScreen(this.gbuffer);
				resolve(void 0);
			})
		});
	}
}
