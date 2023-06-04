import { Context } from '../../context';

export const DEPTH_FORMAT: GPUTextureFormat = 'depth16unorm';

export class GBuffer {
	static DEPTH_FORMAT: GPUTextureFormat = DEPTH_FORMAT;
	ctx: Context;
	size: [number, number];

	albedo: GPUTexture;
	depth: GPUTexture;

	constructor(ctx: Context) {
		this.ctx = ctx;

		this.size = [1, 1];

		// RGBA Colors
		this.albedo = createTexture(ctx, 'rgba8unorm');
		this.depth = createTexture(ctx, DEPTH_FORMAT);
	}

	resize(width: number, height: number) {
		if (this.size[0] === width && this.size[1] === height) {
			return;
		}
		this.size = [width, height];
		this.albedo = createTexture(this.ctx, 'rgba8unorm', this.size, 'Retrowave GBuffer Albedo Texture');
		this.depth = createTexture(this.ctx, DEPTH_FORMAT, this.size, 'Retrowave GBuffer Depth Texture');
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

