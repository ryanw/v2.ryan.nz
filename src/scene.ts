import { Context } from './lib';
import { ComposePipeline } from './pipelines/compose';

export abstract class Scene {
	protected ctx: Context;
	protected composePipeline: ComposePipeline;

	constructor(ctx: Context) {
		this.ctx = ctx;
		this.composePipeline = new ComposePipeline(ctx);
	}

	abstract draw(): Promise<void | unknown>;
}
