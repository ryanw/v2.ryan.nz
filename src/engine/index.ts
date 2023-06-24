export { Scene } from './scene';
export { Camera } from './camera';
export { Mesh, Vertex, VertexArrays } from './mesh';
export { LineMesh, Line } from './line_mesh';
export { WireMesh } from './wire_mesh';
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
		GPUTextureUsage.TEXTURE_BINDING |
		GPUTextureUsage.COPY_DST;

	switch (format) {
		case 'rgba8unorm':
		case 'rgba8uint':
		case 'r32float': {
			usage |= GPUTextureUsage.STORAGE_BINDING;
			break;
		}

		case 'rgba8unorm':
		case 'rgba8snorm':
		case 'rgba16float':
		case 'rgba32float':
		case 'depth32float':
			usage |= GPUTextureUsage.RENDER_ATTACHMENT;
			break;
	}

	return device.createTexture({
		label,
		format,
		size,
		usage
	});
}

