import { GBuffer, Program } from "../lib";
import vertSource from '../shaders/grid.vert.glsl';
import fragSource from '../shaders/grid.frag.glsl';
import { Point2, Point3, Size2, transform } from "../math";
import { multiply, rotation, translation } from "../math/transform";

export interface GridVertex {
	position: Point3;
	barycentric: Point3;
	uv: Point2;
}

export class GridProgram extends Program {
	private positionBuffer: WebGLBuffer;
	private barycentricBuffer: WebGLBuffer;
	private uvBuffer: WebGLBuffer;

	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.addVertexShader(vertSource);
		this.addFragmentShader(fragSource);

		this.addAttribute('position', gl.FLOAT_VEC3);
		this.addAttribute('barycentric', gl.FLOAT_VEC3);
		this.addAttribute('uv', gl.FLOAT_VEC2);

		this.addUniform('camera.model', gl.FLOAT_MAT4);
		this.addUniform('camera.view', gl.FLOAT_MAT4);
		this.addUniform('camera.projection', gl.FLOAT_MAT4);

		const grid: Array<GridVertex> = [
			{ position: [-0.5, -0.5, 0.5], barycentric: [1.0, 0.0, 0.0], uv: [0.0, 0.0] },
			{ position: [0.5, -0.5, 0.5], barycentric: [0.0, 1.0, 0.0], uv: [0.0, 1.0] },
			{ position: [0.5, 0.5, 0.5], barycentric: [0.0, 0.0, 1.0], uv: [1.0, 1.0] },

			{ position: [0.5, 0.5, 0.5], barycentric: [1.0, 0.0, 0.0], uv: [1.0, 1.0] },
			{ position: [-0.5, 0.5, 0.5], barycentric: [0.0, 1.0, 0.0], uv: [0.0, 1.0] },
			{ position: [-0.5, -0.5, 0.5], barycentric: [0.0, 0.0, 1.0], uv: [1.0, 1.0] },

			{ position: [-0.5, -0.5, -0.5], barycentric: [1.0, 0.0, 0.0], uv: [0.0, 0.0] },
			{ position: [0.5, -0.5, -0.5], barycentric: [0.0, 1.0, 0.0], uv: [0.0, 1.0] },
			{ position: [0.5, 0.5, -0.5], barycentric: [0.0, 0.0, 1.0], uv: [1.0, 1.0] },

			{ position: [0.5, 0.5, -0.5], barycentric: [1.0, 0.0, 0.0], uv: [1.0, 1.0] },
			{ position: [-0.5, 0.5, -0.5], barycentric: [0.0, 1.0, 0.0], uv: [0.0, 1.0] },
			{ position: [-0.5, -0.5, -0.5], barycentric: [0.0, 0.0, 1.0], uv: [1.0, 1.0] },
		];

		this.positionBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		const positions = grid.reduce<number[]>((a, { position }) => a.concat(position), []);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		this.barycentricBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.barycentricBuffer);
		const barycentrics = grid.reduce<number[]>((a, { barycentric }) => a.concat(barycentric), []);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(barycentrics), gl.STATIC_DRAW);

		this.uvBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		const uvs = grid.reduce<number[]>((a, { uv }) => a.concat(uv), []);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

		this.compile();
	}

	draw(target: GBuffer) {
		const gl = this.gl;
		this.use();

		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);

		this.bindAttribute('position', this.positionBuffer);
		this.bindAttribute('barycentric', this.barycentricBuffer);
		this.bindAttribute('uv', this.uvBuffer);

		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, target.framebuffer);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.clearBufferfv(gl.COLOR, 0, [0.1, 0.0, 0.0, 0.0]);
		gl.clearBufferfv(gl.COLOR, 1, [0.1, 0.1, 0.0, 0.0]);
		gl.clearBufferfv(gl.COLOR, 2, [0.0, 0.1, 0.0, 0.0]);
		gl.clearBufferfv(gl.COLOR, 3, [0.0, 0.1, 0.1, 0.0]);

		gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);

		const t = performance.now() / 1000.0;
		const projection = transform.perspective(target.aspect, 45.0, 1.0, 1000.0);
		this.bindUniform('camera.view', transform.identity());
		this.bindUniform('camera.model',
			multiply(
				translation(0.0, 0.0, -2.0),
				rotation(0.0, t, 0.0),
			)
		);
		this.bindUniform('camera.projection', projection);

		gl.drawArrays(gl.TRIANGLES, 0, 12);
	}
}
