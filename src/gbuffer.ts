export class GBuffer {
	gl: WebGL2RenderingContext
	position: WebGLTexture;
	normal: WebGLTexture;
	specular: WebGLTexture;
	albedo: WebGLTexture;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;
		this.position = gl.createTexture();
		this.normal = gl.createTexture();
		this.specular = gl.createTexture();
		this.albedo = gl.createTexture();
	}
}
