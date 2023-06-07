export { Scene } from './scene';
export { Camera } from './camera';
export { Mesh, Vertex, VertexArrays } from './mesh';
export { Context } from './context';
export { Pipeline } from './pipeline';
export { InputHandler } from './input';

import * as math from './math';
import { Context } from './context';
export { math };

type Color = math.Vector4;
export { Color };


export function createTexture({ device }: Context, format: GPUTextureFormat, size: GPUExtent3DStrict = [1, 1], label?: string): GPUTexture {
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

