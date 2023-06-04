import { Camera } from '../camera';
import { Context } from '../context';
import { GBuffer } from './retrowave/gbuffer';
import { Entity, WireVertex } from './retrowave/pipelines/wireframe';
import { Scene } from '../scene';
import { buildIcosahedron } from '../models/icosahedron';
import { Mesh } from '../mesh';
import { multiply, rotation, translation } from '../math/transform';
import { BloomPipeline, WireframePipeline, ComposePipeline } from './retrowave/pipelines';
import { calculateNormals } from '../models';
import { Point3 } from '../math';
import { Color } from '../lib';

export class Retrowave extends Scene {
	private entities: Array<Entity>;
	camera = new Camera();
	wireframePipeline: WireframePipeline;
	bloomPipeline: BloomPipeline;
	composePipeline: ComposePipeline;
	gbuffer: GBuffer;

	constructor(ctx: Context) {
		super(ctx);
		this.wireframePipeline = new WireframePipeline(ctx);
		this.bloomPipeline = new BloomPipeline(ctx);
		this.composePipeline = new ComposePipeline(ctx);
		this.gbuffer = new GBuffer(ctx);
		this.entities = [];

		const barycentric = [
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1],
		];

		const baseVertices = buildIcosahedron((position, i) => ({
			position,
			barycentric: barycentric[i % 3],
			normal: [0.0, 1.0, 0.0],
			wireColor: [0.8, 1.0, 0.0, 1.0],
			faceColor: [0.3, 0.1, 0.5, 1.0],
		} as WireVertex));
		calculateNormals(baseVertices);

		const rn = Math.random;
		const randomColor = () => [rn() * 0.7, rn() * 0.7, rn() * 0.7, 0.1] as Color;
		for (let i = 0; i < 200; i++) {
			const dist = 200.0;
			const position: Point3 = [(rn() - 0.5) * dist, (rn() - 0.3) * 30.0, (rn() - 0.5) * dist];
			const wireColor = randomColor();
			const faceColor = randomColor();

			const vertices = baseVertices.map(v => ({
				...v,
				wireColor,
				faceColor,
			}));

			this.entities.push({
				transform: translation(...position),
				mesh: new Mesh(ctx, vertices),
			});
		}
	}

	drawFrame(camera: Camera = this.camera) {
		const { ctx } = this;
		const [w, h] = ctx.size;
		camera.aspect = w/h;
		this.gbuffer.resize(w, h);
		ctx.encode(encoder => {
			this.wireframePipeline.clear(encoder, this.gbuffer);
			for (let i = 0; i < this.entities.length; i++) {
				const entity = this.entities[i];
				this.wireframePipeline.draw(encoder, i, this.gbuffer, entity, camera);
			}
			this.bloomPipeline.run(encoder, this.gbuffer, 4);
			this.bloomPipeline.run(encoder, this.gbuffer, 8);

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
