import { Line, Camera, Context, Scene, LineMesh, Mesh } from 'engine';
import { multiply, rotation, translation } from 'engine/math/transform';
import { ICOSAHEDRON_LINES, ICOSAHEDRON_VERTICES, buildIcosahedron } from 'engine/models/icosahedron';
import { ComposePipeline } from './pipelines/compose';
import { GBuffer } from './gbuffer';
import { PrimitivePipeline } from './pipelines/primitive';
import { FacePipeline, Vertex } from './pipelines/face';
import { normalize } from 'engine/math/vectors';

export class LineScene extends Scene {
	camera = new Camera();
	composePipeline: ComposePipeline;
	lineRenderPipeline: PrimitivePipeline;
	faceRenderPipeline: FacePipeline;
	buffer: GBuffer;
	lineMeshes: Array<LineMesh> = [];
	faceMeshes: Array<Mesh<Vertex>> = [];

	constructor(ctx: Context) {
		super(ctx);

		const lines: Array<Line> = [];
		for (const [id0, id1] of ICOSAHEDRON_LINES) {
			const p0 = ICOSAHEDRON_VERTICES[id0];
			const p1 = ICOSAHEDRON_VERTICES[id1];
			lines.push([p0, p1]);
		}

		this.lineMeshes.push(new LineMesh(ctx, lines));
		this.lineMeshes.push(new LineMesh(ctx, lines));
		this.lineMeshes.push(new LineMesh(ctx, lines));
		this.lineMeshes.push(new LineMesh(ctx, lines));


		const faces = buildIcosahedron((position, i) => ({
			position,
			normal: normalize([0.5, 0.5, 0]),
			barycentric: [
				Number(i % 3 == 0),
				Number(i % 3 == 1),
				Number(i % 3 == 2),
			],
			color: [0.1, 0.1, 0.3, 1],
		} as Vertex));

		this.faceMeshes.push(new Mesh(ctx, faces));
		this.faceMeshes.push(new Mesh(ctx, faces));
		this.faceMeshes.push(new Mesh(ctx, faces));
		this.faceMeshes.push(new Mesh(ctx, faces));

		this.camera.position[0] += 0.0;
		this.camera.position[1] -= 1.0;
		this.camera.position[2] += 6.0;
		this.buffer = new GBuffer(ctx);
		this.composePipeline = new ComposePipeline(ctx);
		this.lineRenderPipeline = new PrimitivePipeline(ctx, 'rgba8unorm');
		this.faceRenderPipeline = new FacePipeline(ctx, 'rgba8unorm');
	}

	drawFaces(encoder: GPUCommandEncoder, camera: Camera = this.camera) {
		const entities = this.faceMeshes.map((mesh, i) => {
			const transform = multiply(
				translation(
					-5 + i * 3.0,
					Math.sin(performance.now() / 1000 * (this.lineMeshes.length - i)),
					Math.cos(performance.now() / 800 * i),
				),
				rotation(
					performance.now() / 444.0 * i,
					performance.now() / 1000.0,
					0.0,
				),
			);
			return { mesh, transform };
		});
		this.faceRenderPipeline.drawEntities(encoder, this.buffer, entities, camera);
	}

	drawLines(encoder: GPUCommandEncoder, camera: Camera = this.camera) {
		const entities = this.lineMeshes.map((mesh, i) => {
			const transform = multiply(
				translation(
					-5 + i * 3.0,
					Math.sin(performance.now() / 1000 * (this.lineMeshes.length - i)),
					Math.cos(performance.now() / 800 * i),
				),
				rotation(
					performance.now() / 444.0 * i,
					performance.now() / 1000.0,
					0.0,
				),
			);
			return { mesh, transform };
		});
		this.lineRenderPipeline.drawEntities(encoder, this.buffer, entities, camera);
	}

	async drawScene(encoder: GPUCommandEncoder, camera: Camera = this.camera) {
		this.clear(encoder);
		this.drawFaces(encoder, camera);
		this.drawLines(encoder, camera);
		this.composePipeline.compose(encoder, this.ctx.currentTexture, this.buffer);
	}

	async drawFrame() {
		const { ctx, camera } = this;
		const [w, h] = ctx.size;
		this.buffer.resize(w, h);
		camera.aspect = w / h;
		ctx.encode(encoder => this.drawScene(encoder, camera));
	}

	clear(encoder: GPUCommandEncoder) {
		const clearValue = { r: 0.0, g: 0.0, b: 0.0, a: 0.0 };
		const albedoView = this.buffer.albedo.createView();
		const depthView = this.buffer.depth.createView();

		encoder.beginRenderPass({
			colorAttachments: [{
				view: albedoView,
				clearValue,
				loadOp: 'clear',
				storeOp: 'store',
			}],
			depthStencilAttachment: {
				view: depthView,
				depthClearValue: 1.0,
				depthLoadOp: 'clear',
				depthStoreOp: 'store',
			}
		}).end();
	}
}
