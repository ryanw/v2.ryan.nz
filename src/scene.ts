import { Context, GBuffer } from './lib';
import { ComposePipeline } from './pipelines/compose';

export abstract class Scene {
	protected ctx: Context;
	protected composePipeline: ComposePipeline;

	constructor(ctx: Context) {
		this.ctx = ctx;
		this.composePipeline = new ComposePipeline(ctx);
	}

	drawToScreen(buffer: GBuffer) {
	}

	abstract draw(): Promise<void | unknown>;
}
