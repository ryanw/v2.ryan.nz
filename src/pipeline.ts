import { Context } from './context';

export class Pipeline {
	readonly ctx: Context;

	constructor(ctx: Context) {
		this.ctx = ctx;
	}
}
