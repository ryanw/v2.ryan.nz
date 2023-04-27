import vertexShaderSource from '../shaders/quad.vert.glsl';
import fragmentShaderSource from '../shaders/quad.frag.glsl';
import { Program } from '../lib';

export class QuadProgram extends Program {
	constructor(gl: WebGL2RenderingContext) {
		super(gl);
		this.addVertexShader(vertexShaderSource);
		this.addFragmentShader(fragmentShaderSource);

		this.addAttribute('position', gl.FLOAT_VEC2);
		this.compile();
	}
}
