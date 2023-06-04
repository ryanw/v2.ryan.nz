import { Context } from './lib';
import { ComposePipeline } from './pipelines/compose';

export abstract class Scene {
	readonly ctx: Context;

	constructor(ctx: Context) {
		this.ctx = ctx;
	}

	abstract draw(): Promise<void | unknown>;
}
