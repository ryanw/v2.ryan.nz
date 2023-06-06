import { GBuffer } from '../gbuffer';
import { Context } from '../../../context';
import { Pipeline } from '../../../pipeline';
import SHADER_SOURCE from './compose.wgsl';
import { createTexture } from '../../../lib';

export interface Options {
	fog: number;
}

export class ComposePipeline extends Pipeline {
	pipeline: GPURenderPipeline;
	uniformBuffer: GPUBuffer;
	dummy: GPUTexture;

	constructor(ctx: Context, format?: GPUTextureFormat) {
		super(ctx);
		const { device } = ctx;

		this.uniformBuffer = device.createBuffer({
			size: 16,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		this.dummy = createTexture(ctx, 'rgba8unorm');

		const module = device.createShaderModule({
			label: 'RetroCompose Shader Module',
			code: SHADER_SOURCE,
		});
		this.pipeline = device.createRenderPipeline({
			label: 'RetroCompose GBuffer Pipeline',
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main' },
			fragment: { module, entryPoint: 'fs_main', targets: [{ format: format || ctx.format }] },
			primitive: { topology: 'triangle-strip' },
		});
	}

	compose(encoder: GPUCommandEncoder, view: GPUTextureView, buffer: GBuffer, reflection?: GPUTexture) {
		const { device } = this.ctx;

		device.queue.writeBuffer(this.uniformBuffer, 0, new Uint32Array([
			// Uniforms.fog
			reflection ? 1 : 0
		]));

		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{
					view,
					clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
					loadOp: 'clear',
					storeOp: 'store',
				},
			],
		};

		const bindGroup = device.createBindGroup({
			label: 'RetroCompose Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: buffer.albedo.createView() },
				{ binding: 1, resource: buffer.bloom.createView() },
				{ binding: 2, resource: buffer.mirror.createView() },
				{ binding: 3, resource: (reflection || this.dummy).createView() },
				{ binding: 4, resource: buffer.depth.createView() },
				{ binding: 5, resource: { buffer: this.uniformBuffer } },
			],
		});


		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.draw(4, 1, 0, 0);
		pass.end();
	}
}

