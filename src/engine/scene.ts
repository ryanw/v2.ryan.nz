import { Context } from './context';

export abstract class Scene {
	readonly ctx: Context;

	constructor(ctx: Context) {
		this.ctx = ctx;
	}

	abstract draw(): Promise<void | unknown>;
}
