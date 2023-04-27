import { Color, GBuffer, Program } from "../lib";
import vertSource from '../shaders/simple.vert.glsl';
import fragSource from '../shaders/render.frag.glsl';
import { Matrix4, Point3 } from "../math";

export interface Cube {
	transform: Matrix4,
	color: Color
};

export class CubeProgram extends Program {
	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.addVertexShader(vertSource);
		this.addFragmentShader(fragSource);

		this.addAttribute('position', gl.FLOAT_VEC3);
		this.addAttribute('uv', gl.FLOAT_VEC2);

		this.addUniform('camera.view', gl.FLOAT_MAT4);
		this.addUniform('camera.model', gl.FLOAT_MAT4);
		this.addUniform('camera.projection', gl.FLOAT_MAT4);

		this.compile();
	}

	drawCubes(target: GBuffer, cubes: Array<Cube>) {
	}
}
