import { Context } from './context';

export abstract class Scene {
	readonly ctx: Context;

	constructor(ctx: Context) {
		this.ctx = ctx;
	}

	async draw() {
		return new Promise(resolve =>
			requestAnimationFrame(async () =>
				resolve(await this.drawFrame())));
	}

	abstract drawFrame(): Promise<void | unknown>;
}
