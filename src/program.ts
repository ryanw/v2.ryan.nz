export interface ProgramAttribute {
	location?: GLenum;
	count: number;
	type: number;
}

export interface ProgramUniform {
	location?: WebGLUniformLocation;
	type: number;
}

export type UniformMap = Record<string, ProgramUniform>;
export type AttributeMap = Record<string, ProgramAttribute>;
export type ShaderMap = Record<GLenum, string>;

export class Program {
	protected gl: WebGL2RenderingContext;
	protected program: WebGLProgram;
	protected shaders: ShaderMap = {};

	protected attributes: AttributeMap = {};
	protected uniforms: UniformMap = {};
	protected attributeBuffers: Record<string, WebGLBuffer> = {};

	constructor(gl: WebGL2RenderingContext) {
		console.debug("Creating WebGL Program");
		this.gl = gl;
	}

	get name() {
		return this.constructor.name;
	}

	use() {
		if (!this.program) {
			this.compile();
		}
		this.gl.useProgram(this.program);

		this.enableVertexAttributes();
	}

	enableVertexAttributes() {
		const gl = this.gl;
		for (const attrib of Object.values(this.attributes)) {
			gl.enableVertexAttribArray(attrib.location);
			gl.vertexAttribPointer(attrib.location, attrib.count, attrib.type, false, 0 ,0);
		}
	}

	free() {
		if (this.program) {
			this.gl.deleteProgram(this.program);
			this.program = null;
		}
	}

	compile() {
		this.free();
		const gl = this.gl;
		const program = gl.createProgram();
		this.program = program;

		this.compileShader(gl.VERTEX_SHADER);
		this.compileShader(gl.FRAGMENT_SHADER);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			const info = gl.getProgramInfoLog(program);
			throw `Could not link WebGL program (${this.name}): ${info}`;
		}

		// Uniform locations
		for (const name in this.uniforms) {
			const location = gl.getUniformLocation(program, name);
			if (!location){ 
				console.error("Couldn't find uniform in shader", this.constructor, name, this.uniforms[name]);
			} else {
				this.uniforms[name].location = location;
			}
		}

		// Attribute locations
		for (const name in this.attributes) {
			const location = gl.getAttribLocation(program, name);
			if (location < 0) {
				console.error("Couldn't find vertex attribute", this.constructor, name, this.attributes[name]);
			} else {
				this.attributes[name].location = location;
				this.attributeBuffers[name] = gl.createBuffer();
			}
		}
	}

	addAttribute(name: string, type: GLenum) {
		const gl = this.gl;
		let count = 1;
		let glType = type;
		switch (type) {
			case gl.FLOAT_VEC2:
			case gl.FLOAT_VEC3:
			case gl.FLOAT_VEC4:
			case gl.FLOAT_MAT2:
			case gl.FLOAT_MAT3:
			case gl.FLOAT_MAT4:
				glType = gl.FLOAT;
				break

			case gl.INT_VEC2:
			case gl.INT_VEC3:
			case gl.INT_VEC4:
				glType = gl.INT;
				break

			case gl.UNSIGNED_INT_VEC2:
			case gl.UNSIGNED_INT_VEC3:
			case gl.UNSIGNED_INT_VEC4:
				glType = gl.UNSIGNED_INT;
				break
		}
		switch (type) {
			case gl.FLOAT_VEC2:
			case gl.FLOAT_MAT2:
			case gl.INT_VEC2:
			case gl.UNSIGNED_INT_VEC2:
			case gl.BOOL_VEC2:
				count = 2;
				break

			case gl.FLOAT_VEC3:
			case gl.FLOAT_MAT3:
			case gl.INT_VEC3:
			case gl.UNSIGNED_INT_VEC3:
			case gl.BOOL_VEC3:
				count = 3;
				break;

			case gl.FLOAT_VEC4:
			case gl.FLOAT_MAT4:
			case gl.INT_VEC4:
			case gl.UNSIGNED_INT_VEC4:
			case gl.BOOL_VEC4:
				count = 4;
				break;

			case gl.FLOAT_MAT2:
				count = 2 * 2;
				break;

			case gl.FLOAT_MAT3:
				count = 3 * 3;
				break;

			case gl.FLOAT_MAT4:
				count = 4 * 4;
				break;
		}
		console.debug("Adding attribute", name, glType, count);
		this.attributes[name] = { type: glType, count };
	}

	removeAttribute(name: string) {
		console.debug("Removing attribute", name);
		delete this.attributes[name];
	}

	addUniform(name: string, type: GLenum) {
		console.debug("Adding uniform", name, type);
		this.uniforms[name] = { type };
	}

	removeUniform(name: string) {
		console.debug("Removing uniform", name);
		delete this.uniforms[name];
	}

	addShader(type: GLenum, source: string) {
		console.debug("Adding shader", { type, source });
		this.shaders[type] = source;
	}

	addVertexShader(source: string) {
		this.addShader(this.gl.VERTEX_SHADER, source);
	}

	addFragmentShader(source: string) {
		this.addShader(this.gl.FRAGMENT_SHADER, source);
	}

	compileShader(glType: GLenum): WebGLShader {
		const gl = this.gl;
		const shader = gl.createShader(glType);
		const source = this.shaders[glType];
		if (!source) {
			throw `No shader defined for ${glType}`;
		}
		gl.shaderSource(shader, source);
		gl.attachShader(this.program, shader);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const info = gl.getShaderInfoLog(shader);
			throw `Could not compile shader: ${info}`;
		}

		return shader;
	}
}
