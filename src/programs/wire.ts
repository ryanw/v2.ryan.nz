import { Camera, GBuffer, Mesh, Program } from '../lib';
import vertSource from '../shaders/grid.vert.glsl';
import fragSource from '../shaders/grid.frag.glsl';
import { Matrix4, PHI, Point2, Point3, transform } from '../math';
import * as vectors from '../math/vectors';
import { inverse, multiply, rotation, scaling, translation } from '../math/transform';
import { normalize } from '../math/vectors';

export interface WireVertex {
	position: Point3;
	barycentric: Point3;
	uv: Point2;
	id: [number];
}

export class WireProgram extends Program {
	private positionBuffer!: WebGLBuffer;
	private barycentricBuffer!: WebGLBuffer;
	private uvBuffer!: WebGLBuffer;
	private idBuffer!: WebGLBuffer;

	constructor(gl: WebGL2RenderingContext) {
		super(gl);

		this.addVertexShader(vertSource);
		this.addFragmentShader(fragSource);

		this.addAttribute('position', gl.FLOAT_VEC3);
		this.addAttribute('barycentric', gl.FLOAT_VEC3);
		this.addAttribute('uv', gl.FLOAT_VEC2);
		this.addAttribute('id', gl.FLOAT);

		this.addUniform('camera.model', gl.FLOAT_MAT4);
		this.addUniform('camera.view', gl.FLOAT_MAT4);
		this.addUniform('camera.projection', gl.FLOAT_MAT4);

		const baseTriangle = [
			{ position: [0.0, 0.0, 0.0], barycentric: [1.0, 0.0, 0.0], uv: [0.0, 0.0] },
			{ position: [0.0, 0.0, 0.0], barycentric: [0.0, 1.0, 0.0], uv: [0.0, 1.0] },
			{ position: [0.0, 0.0, 0.0], barycentric: [0.0, 0.0, 1.0], uv: [1.0, 1.0] },
		];

		const vertices = ICOSAHEDRON_TRIS.map((tri) =>
			tri.map((v, i) => ({
				position: normalize(ICOSAHEDRON_VERTICES[v]),
				barycentric: baseTriangle[i % 3].barycentric,
				uv: baseTriangle[i % 3].uv,
			} as WireVertex))
		).flat();
		this.compile();
	}

	uploadMesh(mesh: Mesh<WireVertex>) {
		const gl = this.gl;
		const { position, barycentric, uv } = mesh.toTypedArrays();

		const id = new Float32Array(mesh.vertices.length);
		for (let i = 0; i < id.length; i += 3) {
			const n = Math.random();
			id[i] = n
			id[i + 1] = n;
			id[i + 2] = n;
		}

		this.positionBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, position, gl.STATIC_DRAW);

		this.barycentricBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.barycentricBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, barycentric, gl.STATIC_DRAW);

		this.uvBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);

		this.idBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.idBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, id, gl.STATIC_DRAW);
	}

	draw(target: GBuffer, camera: Camera, transform: Matrix4, mesh: Mesh<WireVertex>) {
		const gl = this.gl;
		this.uploadMesh(mesh);

		gl.disable(gl.BLEND);
		this.use();

		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);

		this.bindAttribute('position', this.positionBuffer);
		this.bindAttribute('barycentric', this.barycentricBuffer);
		this.bindAttribute('uv', this.uvBuffer);
		this.bindAttribute('id', this.idBuffer);

		target.bind();

		this.bindUniform('camera.view', camera.view());
		this.bindUniform('camera.projection', camera.projection(target.aspect));
		this.bindUniform('camera.model', inverse(transform));

		gl.drawArrays(gl.TRIANGLES, 0, mesh.vertices.length);
	}
}

const ICOSAHEDRON_VERTICES: Array<Point3> = [
	[-1, PHI, 0],
	[1, PHI, 0],
	[-1, -PHI, 0],
	[1, -PHI, 0],
	[0, -1, PHI],
	[0, 1, PHI],
	[0, -1, -PHI],
	[0, 1, -PHI],
	[PHI, 0, -1],
	[PHI, 0, 1],
	[-PHI, 0, -1],
	[-PHI, 0, 1]
];

const ICOSAHEDRON_TRIS: Array<[number, number, number]> = [
	[0, 11, 5],
	[0, 5, 1],
	[0, 1, 7],
	[0, 7, 10],
	[0, 10, 11],
	[1, 5, 9],
	[5, 11, 4],
	[11, 10, 2],
	[10, 7, 6],
	[7, 1, 8],
	[3, 9, 4],
	[3, 4, 2],
	[3, 2, 6],
	[3, 6, 8],
	[3, 8, 9],
	[4, 9, 5],
	[2, 4, 11],
	[6, 2, 10],
	[8, 6, 7],
	[9, 8, 1]
];
