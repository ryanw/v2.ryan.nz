import { Context } from './context';

export const DEPTH_FORMAT: GPUTextureFormat = 'depth16unorm';

export class GBuffer {
	static DEPTH_FORMAT: GPUTextureFormat = DEPTH_FORMAT;
	ctx: Context;
	size: [number, number];

	clashSize = [8, 8];

	ink: GPUTexture;
	paper: GPUTexture;
	inkClash: GPUTexture;
	paperClash: GPUTexture;

	shade: GPUTexture;
	inkDepth: GPUTexture;
	paperDepth: GPUTexture;

	constructor(ctx: Context) {
		this.ctx = ctx;

		this.size = [1, 1];

		// RGBA Colors
		this.ink = createTexture(ctx, 'rgba8unorm');
		this.paper = createTexture(ctx, 'rgba8unorm');
		this.inkClash = createTexture(ctx, 'rgba8unorm');
		this.paperClash = createTexture(ctx, 'rgba8unorm');
		// Amount of ink
		this.shade = createTexture(ctx, 'r8unorm');
		// Depth buffer
		this.inkDepth = createTexture(ctx, DEPTH_FORMAT);
		this.paperDepth = createTexture(ctx, DEPTH_FORMAT);
	}

	resize(width: number, height: number) {
		if (this.size[0] === width && this.size[1] === height) {
			return;
		}
		this.size = [width, height];
		const clashSize = [width / this.clashSize[0], height / this.clashSize[1]];
		this.ink = createTexture(this.ctx, 'rgba8unorm', this.size, "Ink Texture");
		this.paper = createTexture(this.ctx, 'rgba8unorm', this.size, "Paper Texture");
		this.inkClash = createTexture(this.ctx, 'rgba8unorm', clashSize, "Ink Clash Texture");
		this.paperClash = createTexture(this.ctx, 'rgba8unorm', clashSize, "Paper Clash Texture");
		this.shade = createTexture(this.ctx, 'r8unorm', this.size, "Shade Texture");
		this.inkDepth = createTexture(this.ctx, DEPTH_FORMAT, this.size, "Ink Depth Texture");
		this.paperDepth = createTexture(this.ctx, DEPTH_FORMAT, this.size, "Paper Depth Texture");
	}
}

function createTexture({ device }: Context, format: GPUTextureFormat, size: GPUExtent3DStrict = [1, 1], label?: string): GPUTexture {
	let usage = 
		GPUTextureUsage.RENDER_ATTACHMENT |
		GPUTextureUsage.TEXTURE_BINDING |
		GPUTextureUsage.COPY_DST;

	if (format === 'rgba8unorm' || format === 'rgba8uint') {
		usage |= GPUTextureUsage.STORAGE_BINDING;
	}
	return device.createTexture({
		label,
		format,
		size,
		usage
	});
}
