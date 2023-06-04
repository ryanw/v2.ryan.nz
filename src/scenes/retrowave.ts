import { Camera } from '../camera';
import { Context } from '../context';
import { GBuffer } from './retrowave/gbuffer';
import { WireVertex, WireframePipeline } from './retrowave/pipelines/wireframe';
import { ComposePipeline } from './retrowave/pipelines/compose';
import { Scene } from '../scene';
import { buildIcosahedron } from '../models/icosahedron';
import { Mesh } from '../mesh';
import { translation } from '../math/transform';

export class Retrowave extends Scene {
	camera = new Camera();
	wireframePipeline: WireframePipeline;
	composePipeline: ComposePipeline;
	gbuffer: GBuffer;
	mesh: Mesh<WireVertex>;

	constructor(ctx: Context) {
		super(ctx);
		this.wireframePipeline = new WireframePipeline(ctx);
		this.composePipeline = new ComposePipeline(ctx);
		this.gbuffer = new GBuffer(ctx);

		const vertices = buildIcosahedron((position) => ({
			position,
			normal: [0.0, 1.0, 0.0],
			color: [1.0, 0.0, 1.0, 1.0],
		} as WireVertex));
		this.mesh = new Mesh(ctx, vertices);
	}

	drawFrame(camera: Camera = this.camera) {
		const { ctx } = this;
		const [w, h] = ctx.size;
		camera.aspect = w/h;
		this.gbuffer.resize(w, h);
		ctx.encode(encoder => {
			const entity = {
				transform: translation(0, 0, -4),
				mesh: this.mesh,
			};
			this.wireframePipeline.draw(encoder, this.gbuffer, entity, camera);

			const view = this.ctx.currentTexture.createView();
			this.composePipeline.compose(encoder, view, this.gbuffer);
		});
	}

	async draw(camera?: Camera) {
		return new Promise(resolve =>
			requestAnimationFrame(() => {
				this.drawFrame(camera);
				resolve(void 0);
			}));
	}
}
