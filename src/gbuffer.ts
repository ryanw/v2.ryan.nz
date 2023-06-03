import { Context } from './context';

export class GBuffer {
	ctx: Context;
	size: [number, number];
	position: GPUTexture;
	albedo: GPUTexture;
	normal: GPUTexture;
	depth: GPUTexture;

	constructor(ctx: Context) {
		this.ctx = ctx;

		this.size = [1, 1];

		// World position Position
		this.position = createTexture(ctx, 'rgba32float');
		// 2x 16bit RGBA colours
		this.albedo = createTexture(ctx, 'rgba8uint');
		// Normal vector
		this.normal = createTexture(ctx, 'rgba16float');
		// Depth buffer
		this.depth = createTexture(ctx, 'depth16unorm');
	}

	resize(width: number, height: number) {
		if (this.size[0] === width && this.size[1] === height) {
			return;
		}
		this.size = [width, height];
		this.position = createTexture(this.ctx, 'rgba32float', [width, height], "Position Texture");
		this.albedo = createTexture(this.ctx, 'rgba8uint', [width, height], "Albedo Texture");
		this.normal = createTexture(this.ctx, 'rgba16float', [width, height], "Normal Texture");
		this.depth = createTexture(this.ctx, 'depth16unorm', [width, height], "Depth Texture");
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
