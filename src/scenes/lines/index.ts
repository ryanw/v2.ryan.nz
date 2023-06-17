import { Camera, Context, Scene } from 'engine';
import { ComposePipeline } from './pipelines/compose';
import { GBuffer } from './gbuffer';
import { Line, PrimitivePipeline } from './pipelines/primitive';
import { ICOSAHEDRON_LINES, ICOSAHEDRON_VERTICES } from 'engine/models/icosahedron';
import { identity, rotation, translation } from 'engine/math/transform';

export class LineScene extends Scene {
	camera = new Camera();
	composePipeline: ComposePipeline;
	primitivePipeline: PrimitivePipeline;
	buffer: GBuffer;
	lines: Array<Line> = [];

	constructor(ctx: Context) {
		super(ctx);

		for (const [id0, id1] of ICOSAHEDRON_LINES) {
			const p0 = ICOSAHEDRON_VERTICES[id0];
			const p1 = ICOSAHEDRON_VERTICES[id1];
			this.lines.push([p0, p1]);
		}

		this.camera.position[0] += 0.0;
		this.camera.position[1] -= 1.0;
		this.camera.position[2] += 6.0;
		this.buffer = new GBuffer(ctx);
		this.composePipeline = new ComposePipeline(ctx);
		this.primitivePipeline = new PrimitivePipeline(ctx);
	}

	async drawScene(encoder: GPUCommandEncoder, camera: Camera = this.camera) {
		//const transform = rotation(0.0, performance.now() / 1000.0, 0.0);
		const transform = rotation(0.0, performance.now() / 1000.0, 0.0);
		this.primitivePipeline.drawLines(encoder, this.ctx.currentTexture, this.lines.slice(6, 21), transform, camera);
	}

	async drawFrame() {
		const { ctx, camera } = this;
		const [w, h] = ctx.size;
		camera.aspect = w / h;
		ctx.encode(encoder => this.drawScene(encoder, camera));
	}
}

