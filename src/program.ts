export interface ProgramAttribute {
	location?: GLenum;
	count: number;
	type: number;
}

export interface ProgramInstanceAttribute {
	location?: GLenum;
	count: number;
	type: number;
	divisor: number;
}

export interface ProgramUniform {
	location?: WebGLUniformLocation;
	type: number;
}

export interface ProgramTexture {
	location?: WebGLUniformLocation;
	unit: GLenum;
}

export type UniformMap = Record<string, ProgramUniform>;
export type AttributeMap = Record<string, ProgramAttribute>;
export type InstanceAttributeMap = Record<string, ProgramInstanceAttribute>;
export type TextureMap = Record<string, ProgramTexture>;
export type ShaderMap = Record<GLenum, string>;

export class Program {
	protected gl: WebGL2RenderingContext;
	protected program: WebGLProgram | null = null;
	protected shaders: ShaderMap = {};

	protected attributes: AttributeMap = {};
	protected instanceAttributes: InstanceAttributeMap = {};
	protected uniforms: UniformMap = {};
	protected textures: TextureMap = {};

	constructor(gl: WebGL2RenderingContext) {
		console.debug('Creating WebGL Program');
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
			if (attrib.location == null) {
				continue;
			}
			gl.enableVertexAttribArray(attrib.location);
			gl.vertexAttribPointer(attrib.location, attrib.count, attrib.type, false, 0, 0);
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
		const program = gl.createProgram()!;
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
			if (!location) {
				console.error("Couldn't find uniform in shader", this.constructor, name, this.uniforms[name]);
			} else {
				this.uniforms[name].location = location;
			}
		}

		for (const name in this.textures) {
			const location = gl.getUniformLocation(program, name);
			if (!location) {
				console.error("Couldn't find sampler in shader", this.constructor, name, this.textures[name]);
			} else {
				this.textures[name].location = location;
			}
		}

		// Attribute locations
		for (const name in this.attributes) {
			const location = gl.getAttribLocation(program, name);
			if (location < 0) {
				console.error("Couldn't find vertex attribute", this.constructor, name, this.attributes[name]);
			} else {
				this.attributes[name].location = location;
			}
		}

		for (const name in this.instanceAttributes) {
			const location = gl.getAttribLocation(program, name);
			if (location < 0) {
				console.error("Couldn't find instance attribute", this.constructor, name, this.attributes[name]);
			} else {
				this.instanceAttributes[name].location = location;
			}
		}
	}

	addAttribute(name: string, type: GLenum) {
		console.debug('Adding attribute', name, type);
		this.attributes[name] = toAttribute(type);
	}

	removeAttribute(name: string) {
		console.debug('Removing attribute', name);
		delete this.attributes[name];
	}

	bindAttribute(name: string, buffer: WebGLBuffer) {
		const attrib = this.attributes[name];
		if (!attrib) {
			throw `Unknown attribute: ${name}`;
		}
		if (attrib.location == null) {
			throw `Couldn't bind attribute: ${name}`;
		}
		const gl = this.gl;
		gl.enableVertexAttribArray(attrib.location);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.vertexAttribPointer(attrib.location, attrib.count, attrib.type, false, 0, 0);
		gl.vertexAttribDivisor(attrib.location, 0);
	}

	addInstanceAttribute(name: string, type: GLenum, divisor: number = 1) {
		console.debug('Adding instance attribute', name, type, divisor);
		this.instanceAttributes[name] = toAttribute(type, divisor);
	}

	removeInstanceAttribute(name: string) {
		console.debug('Removing instance attribute', name);
		delete this.instanceAttributes[name];
	}

	bindInstanceAttribute(name: string, buffer: WebGLBuffer) {
		const attrib = this.instanceAttributes[name];
		if (!attrib) {
			throw `Unknown instance attribute: ${name}`;
		}
		if (attrib.location == null) {
			throw `Couldn't bind instance attribute: ${name}`;
		}
		const gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		// FIXME hacky detect a mat4
		let offset = 0;
		if (attrib.type === gl.FLOAT && attrib.count === 16) {
			const slotCount = 4;
			const byteSize = 4 * attrib.count;
			for (let i = 0; i < slotCount; i++) {
				const loc = attrib.location + i;
				gl.enableVertexAttribArray(loc);
				gl.vertexAttribPointer(loc, attrib.count / slotCount, attrib.type, false, byteSize, offset);
				gl.vertexAttribDivisor(loc, attrib.divisor);
				offset += 4 * 4; // 4 bytes x 4 floats
			}
		}
		else {
			console.error('Instance attribute not handled', name, attrib);
		}
	}

	addUniform(name: string, type: GLenum) {
		console.debug('Adding uniform', name, type);
		this.uniforms[name] = { type };
	}

	bindUniform<V>(name: string, value: V) {
		const uniform = this.uniforms[name];
		if (!uniform) {
			throw `Unknown uniform: ${name}`;
		}
		if (uniform.location == null) {
			throw `Couldn't bind uniform: ${name}`;
		}
		const gl = this.gl;
		switch (uniform.type) {
		case gl.FLOAT_MAT4:
			if (value instanceof Array) {
				gl.uniformMatrix4fv(uniform.location, false, new Float32Array(value));
			}
			break;
		default:
			console.error('Unhandled uniform', name, uniform);
		}
	}

	removeUniform(name: string) {
		console.debug('Removing uniform', name);
		delete this.uniforms[name];
	}

	addTexture(name: string, unit?: number) {
		unit ??= this.nextTextureUnit();
		console.debug('Adding texture', name, unit);
		this.textures[name] = { unit };
	}

	removeTexture(name: string) {
		console.debug('Removing texture', name);
		delete this.textures[name];
	}

	nextTextureUnit() {
		// FIXME find a gap if one has been removed
		const textures = Object.values(this.textures);
		if (textures.length === 0) return 0;
		return textures.reduce((a, { unit }) => Math.max(a, unit), 0) + 1;
	}

	bindTexture(name: string, buffer: WebGLBuffer) {
		const texture = this.textures[name];
		if (!texture) {
			console.error(`Texture not defined: ${name}`);
			return;
		}
		if (texture.location == null) {
			console.warn(`Texture not found in shader: ${name}`);
			return;
		}

		const gl = this.gl;
		gl.activeTexture(gl.TEXTURE0 + texture.unit);
		gl.bindTexture(gl.TEXTURE_2D, buffer);
		gl.uniform1i(texture.location, texture.unit);
	}

	addShader(type: GLenum, source: string) {
		console.debug('Adding shader', { type, source });
		this.shaders[type] = source;
	}

	addVertexShader(source: string) {
		this.addShader(this.gl.VERTEX_SHADER, source);
	}

	addFragmentShader(source: string) {
		this.addShader(this.gl.FRAGMENT_SHADER, source);
	}

	compileShader(glType: GLenum): WebGLShader {
		if (!this.program) {
			throw "Can't compile shader without a program";
		}
		const gl = this.gl;
		const shader = gl.createShader(glType)!;
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

function toAttribute(glType: GLenum, divisor: number | null = null): typeof divisor extends null ? ProgramAttribute : ProgramInstanceAttribute {
	const gl = WebGL2RenderingContext;
	let splitType = glType;
	let count = 1;
	switch (glType) {
	case gl.FLOAT_VEC2:
	case gl.FLOAT_VEC3:
	case gl.FLOAT_VEC4:
	case gl.FLOAT_MAT2:
	case gl.FLOAT_MAT3:
	case gl.FLOAT_MAT4:
		splitType = gl.FLOAT;
		break;

	case gl.INT_VEC2:
	case gl.INT_VEC3:
	case gl.INT_VEC4:
		splitType = gl.INT;
		break;

	case gl.UNSIGNED_INT_VEC2:
	case gl.UNSIGNED_INT_VEC3:
	case gl.UNSIGNED_INT_VEC4:
		splitType = gl.UNSIGNED_INT;
		break;
	}
	switch (glType) {
	case gl.FLOAT_VEC2:
	case gl.INT_VEC2:
	case gl.UNSIGNED_INT_VEC2:
	case gl.BOOL_VEC2:
		count = 2;
		break;

	case gl.FLOAT_VEC3:
	case gl.INT_VEC3:
	case gl.UNSIGNED_INT_VEC3:
	case gl.BOOL_VEC3:
		count = 3;
		break;

	case gl.FLOAT_VEC4:
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

	if (divisor == null) {
		// FIXME type validation is wonky
		return { type: splitType, count } as ProgramAttribute as any;
	} else {
		return { type: splitType, count, divisor } as ProgramInstanceAttribute;
	}
}
