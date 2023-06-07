import { Context, createTexture } from 'engine';

export const DEPTH_FORMAT: GPUTextureFormat = 'depth16unorm';

export class GBuffer {
	static DEPTH_FORMAT: GPUTextureFormat = DEPTH_FORMAT;
	ctx: Context;
	size: [number, number];

	albedo: GPUTexture;
	bloom: GPUTexture;
	mirror: GPUTexture;
	depth: GPUTexture;

	constructor(ctx: Context) {
		this.ctx = ctx;

		this.size = [1, 1];

		// RGBA Colors
		this.albedo = createTexture(ctx, 'rgba8unorm');
		this.bloom = createTexture(ctx, 'rgba8unorm');
		this.mirror = createTexture(ctx, 'rgba8unorm');
		this.depth = createTexture(ctx, DEPTH_FORMAT);
	}

	resize(width: number, height: number) {
		if (this.size[0] === width && this.size[1] === height) {
			return;
		}
		this.size = [width, height];
		this.albedo = createTexture(this.ctx, 'rgba8unorm', this.size, 'Retrowave GBuffer Albedo Texture');
		this.bloom = createTexture(this.ctx, 'rgba8unorm', this.size, 'Retrowave GBuffer Bloom Texture');
		this.mirror = createTexture(this.ctx, 'rgba8unorm', this.size, 'Retrowave GBuffer Mirror Texture');
		this.depth = createTexture(this.ctx, DEPTH_FORMAT, this.size, 'Retrowave GBuffer Depth Texture');
	}
}

