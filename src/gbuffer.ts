import { Context } from './context';

export class GBuffer {
	ctx: Context;
	size: [number, number];
	pixel: GPUTexture;
	albedo: GPUTexture;
	pixelatedAlbedo: GPUTexture;
	normal: GPUTexture;
	depth: GPUTexture;

	constructor(ctx: Context) {
		this.ctx = ctx;

		this.size = [1, 1];

		// 1 bit pixels
		this.pixel = createTexture(ctx, 'r8uint');
		// RGBA colour
		this.albedo = createTexture(ctx, 'rgba8unorm');
		// RGBA colour
		this.pixelatedAlbedo = createTexture(ctx, 'rgba8unorm');
		// Normal vector
		this.normal = createTexture(ctx, 'rgba16float');
		// Depth buffer
		this.depth = createTexture(ctx, 'depth32float');
	}

	resize(width: number, height: number) {
		if (this.size[0] === width && this.size[1] === height) {
			return;
		}
		this.size = [width, height];
		this.pixel = createTexture(this.ctx, 'r8uint', [width, height], "Pixel Texture");
		this.albedo = createTexture(this.ctx, 'rgba8unorm', [width, height], "Albedo Texture");
		this.pixelatedAlbedo = createTexture(this.ctx, 'rgba8unorm', [width, height], "Pixelated Albedo Texture");
		this.normal = createTexture(this.ctx, 'rgba16float', [width, height], "Normal Texture");
		this.depth = createTexture(this.ctx, 'depth32float', [width, height], "Depth Texture");
	}
}

function createTexture({ device }: Context, format: GPUTextureFormat, size: GPUExtent3DStrict = [1, 1], label?: string): GPUTexture {
	let usage = 
		GPUTextureUsage.RENDER_ATTACHMENT |
		GPUTextureUsage.TEXTURE_BINDING |
		GPUTextureUsage.COPY_DST;

	if (format === 'rgba8unorm') {
		usage |= GPUTextureUsage.STORAGE_BINDING;
	}
	return device.createTexture({
		label,
		format,
		size,
		usage
	});
}
