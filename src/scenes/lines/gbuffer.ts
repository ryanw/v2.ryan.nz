import { Context, createTexture } from 'engine';

export const DEPTH_FORMAT: GPUTextureFormat = 'depth16unorm';

export class GBuffer {
	ctx: Context;
	size: [number, number];
	albedo: GPUTexture;

	constructor(ctx: Context) {
		this.ctx = ctx;
		this.size = [1, 1];
		this.albedo = createTexture(ctx, 'rgba8unorm');
	}

	resize(width: number, height: number) {
		if (this.size[0] === width && this.size[1] === height) {
			return;
		}
		this.size = [width, height];
		this.albedo = createTexture(this.ctx, 'rgba8unorm', this.size, 'Line GBuffer Albedo Texture');
	}
}
