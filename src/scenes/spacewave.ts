import { Camera } from '../camera';
import { Framebuffer, GBuffer, Mesh, Scene } from '../lib';
import { Matrix4, PHI, Plane, Point3, Size2, Vector3 } from '../math';
import { identity, multiply, multiplyVector, rotation, scaling, translation } from '../math/transform';
import * as vectors from '../math/vectors';
import { normalize } from '../math/vectors';
import { BlurProgram, WireProgram, QuadProgram, SkyProgram, WireVertex, IcosphereProgram } from '../programs';
import { PlaneProgram } from '../programs/plane';

function resizeTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, width: number, height: number, internalFormat: GLenum = gl.RGBA) {
	let bytes: Uint8Array | Float32Array;
	let dataType: GLenum = gl.UNSIGNED_BYTE;
	let format: GLenum = gl.RGBA;

	switch (internalFormat) {
		case gl.RGBA32F:
			dataType = gl.FLOAT;
			bytes = new Float32Array(width * height * 4);
			break;

		case gl.RGBA:
			bytes = new Uint8Array(width * height * 4);
			break;

		default:
			console.error("Unhandled format", format);
			bytes = new Uint8Array();
	}

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, dataType, bytes);
	if (internalFormat === gl.RGBA) {
		gl.generateMipmap(gl.TEXTURE_2D);
	}
}

interface Entity {
	transform: Matrix4;
	mesh: Mesh<WireVertex>;
};

export class Spacewave extends Scene {
	camera = new Camera();
	private entities: Array<Entity>;
	private backbuffer: Framebuffer;
	private gbuffer: GBuffer;
	private skyOutput: WebGLTexture;
	private mainOutput: WebGLTexture;
	private mirrorOutput: WebGLTexture;
	private mirrorMask: WebGLTexture;
	private size: Size2 = [0, 0];
	private skyProg: SkyProgram;
	private wireProg: WireProgram;
	private icoProg: IcosphereProgram;
	private quadProg: QuadProgram;
	private blurProg: BlurProgram;
	private planeProg: PlaneProgram;

	constructor(gl: WebGL2RenderingContext) {
		super(gl);

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
		this.entities = [
			{
				transform: translation(2.0, 1.0, 2.0),
				mesh: new Mesh(vertices),
			},
			{
				transform: translation(0.0, 0.0, 0.0),
				mesh: new Mesh(vertices),
			}
		];
		this.camera.position = [0.0, 0.5, 7.0];
		this.backbuffer = new Framebuffer(gl);
		this.gbuffer = new GBuffer(gl);

		this.skyProg = new SkyProgram(gl);
		this.wireProg = new WireProgram(gl);
		this.icoProg = new IcosphereProgram(gl);
		this.quadProg = new QuadProgram(gl);
		this.blurProg = new BlurProgram(gl);
		this.planeProg = new PlaneProgram(gl);

		this.skyOutput = gl.createTexture()!;
		this.mainOutput = gl.createTexture()!;
		this.mirrorOutput = gl.createTexture()!;
		this.mirrorMask = gl.createTexture()!;
		resizeTexture(gl, this.skyOutput, 32, 32);
		resizeTexture(gl, this.mainOutput, 32, 32);
		resizeTexture(gl, this.mirrorOutput, 32, 32);

		this.updateViewport();
	}

	updateViewport() {
		const { drawingBufferWidth: width, drawingBufferHeight: height } = this.gl;
		if (width !== this.size[0] || height !== this.size[1]) {
			this.resize(width, height);
		}
	}

	resize(width: number, height: number) {
		if (width === this.size[0] && height === this.size[1]) {
			return;
		}

		const gl = this.gl;
		this.size = [width, height];
		resizeTexture(gl, this.mirrorMask, width, height);
		resizeTexture(gl, this.mainOutput, width, height);
		resizeTexture(gl, this.skyOutput, width, height);
		resizeTexture(gl, this.mirrorOutput, width, height);
		gl.viewport(0, 0, width, height);
		this.gbuffer.resize(width, height);
		this.backbuffer.resize(width, height);
	}

	drawSky(buffer: GBuffer, camera: Camera) {
		this.skyProg.draw(buffer, camera);
	}

	drawAtmosphere(buffer: GBuffer, camera: Camera) {
	}

	drawGeometry(buffer: GBuffer, camera: Camera) {
		for (const { transform, mesh } of this.entities) {
			this.wireProg.draw(buffer, camera, transform, mesh);
		}
		//this.icoProg.draw(buffer, camera);
	}

	drawLights(output: WebGLTexture, buffer: GBuffer, camera: Camera) {
	}

	drawPlane(output: WebGLTexture, plane: Plane, camera: Camera) {
		const gl = this.gl;
		this.backbuffer.bind();
		gl.bindTexture(gl.TEXTURE_2D, output);
		gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, output, 0);
		this.planeProg.drawPlane(plane, camera, this.backbuffer);
	}

	drawScene(output: WebGLTexture, camera: Camera) {
		const gbuffer = this.gbuffer;
		this.drawAtmosphere(gbuffer, camera);
		this.drawGeometry(gbuffer, camera);
		this.composeGBuffer(output, gbuffer);
		this.drawLights(output, gbuffer, camera);
	}

	drawFrame() {
		const t = performance.now() / 1000.0;
		const normal = normalize(
			multiplyVector(
				rotation(0, 0, t / 4),
				[1.0, 0.0, 0.0, 0.0]
			).slice(0, 3) as Vector3
		);
		const mirrorPlane: Plane = [
			[0.0, -1.0, 0.0],
			[0.0, 1.0, 0.0]
		];
		const { camera, mainOutput, mirrorOutput, mirrorMask } = this;
		const mirrorCamera = camera.reflect(mirrorPlane);
		this.gbuffer.clear();
		this.drawScene(mainOutput, camera);

		// Draw sky to a separate texture
		this.gbuffer.bind();
		this.gbuffer.clear();
		this.drawSky(this.gbuffer, camera);
		this.composeGBuffer(this.skyOutput, this.gbuffer);

		// Leave sky in gbuffer to reuse it for the mirror reflection
		this.drawScene(mirrorOutput, mirrorCamera);

		this.drawPlane(mirrorMask, mirrorPlane, camera)
	}

	composeGBuffer(output: WebGLTexture, buffer: GBuffer) {
		const gl = this.gl;
		this.backbuffer.bind();
		gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, output, 0);
		this.composeProgram.compose(buffer, this.backbuffer.framebuffer);
	}

	async draw() {
		return new Promise(resolve => {
			requestAnimationFrame(() => {
				this.updateViewport();
				this.drawFrame();
				this.quadProg.drawTexture(this.skyOutput);
				this.quadProg.drawTexture(this.mirrorMask);
				this.blurProg.drawTexture(this.mirrorOutput, this.mirrorMask);
				this.quadProg.drawTexture(this.mainOutput);
				resolve(void 0);
			});
		});
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


type Triangle = [WireVertex, WireVertex, WireVertex];
type SubdividedTriangles = [Triangle, Triangle, Triangle, Triangle];

function subdivideMesh({ vertices }: Mesh<WireVertex>, count: number = 1) {
	for (let i = 0; i < count; i++) {
		const vertexCount = vertices.length;
		for (let j = 0; j < vertexCount; j += 3) {
			const v0 = vertices[j];
			const v1 = vertices[j + 1];
			const v2 = vertices[j + 2];
			const [t0, ...tris] = subdivideTriangle([v0, v1, v2]);

			// Replace current tri with the first one
			vertices.splice(j, 3, ...t0);

			// Append the last 3 to the mesh
			vertices.push(...tris.flat());
		}
	}
}


function subdivideTriangle(tri: Triangle): SubdividedTriangles {
	const vertices = tri.map(({ position }) => [...position]);
	const indexes = [
		[0, 3, 5],
		[3, 1, 4],
		[5, 3, 4],
		[5, 4, 2]
	];

	for (let i = 0; i < 3; i++) {
		const v0 = [...tri[i].position] as Point3;
		const v1 = [...tri[(i + 1) % 3].position] as Point3;
		vertices.push(midway(v0, v1));
	}

	return indexes.map(([v0, v1, v2]) => [
		{ position: vertices[v0], barycentric: [1.0, 0.0, 0.0], uv: [0.0, 0.0], id: [0] },
		{ position: vertices[v1], barycentric: [0.0, 1.0, 0.0], uv: [0.0, 1.0], id: [0] },
		{ position: vertices[v2], barycentric: [0.0, 0.0, 1.0], uv: [1.0, 1.0], id: [0] },
	]) as SubdividedTriangles;
}

function midway(p0: Point3, p1: Point3): Point3 {
	return normalize(vectors.scale(vectors.add(p0, p1), 0.5));
}
