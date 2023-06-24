import { Context, createTexture } from 'engine';

export const DEPTH_FORMAT: GPUTextureFormat = 'depth16unorm';

export class GBuffer {
	ctx: Context;
	size: [number, number] = [0, 0];
	albedo!: GPUTexture;
	depth!: GPUTexture;

	constructor(ctx: Context) {
		this.ctx = ctx;
		const [width, height] = ctx.size;
		this.resize(width, height);
	}

	resize(width: number, height: number) {
		if (this.size[0] === width && this.size[1] === height) {
			return;
		}
		this.size = [width, height];
		this.albedo = createTexture(this.ctx, 'rgba16float', this.size, 'Line GBuffer Albedo Texture');
		this.depth = createTexture(this.ctx, 'depth32float', this.size, 'Line GBuffer Depth Texture');

	}
}
