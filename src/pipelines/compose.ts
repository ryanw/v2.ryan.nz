import { Context } from '../context';
import { GBuffer } from '../gbuffer';
import { Pipeline } from '../pipeline';
import SHADER_SOURCE from './compose.wgsl';

export class ComposePipeline extends Pipeline {
	pipeline: GPURenderPipeline;

	constructor(ctx: Context) {
		super(ctx);
		const { device, format } = ctx;

		const module = device.createShaderModule({ code: SHADER_SOURCE });
		this.pipeline = device.createRenderPipeline({
			label: 'Compose GBuffer Pipeline',
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main' },
			fragment: { module, entryPoint: 'fs_main', targets: [{ format }] },
			primitive: { topology: 'triangle-strip' },
		});
	}

	compose(view: GPUTextureView, buffer: GBuffer) {
		const { device } = this.ctx;

		const commandEncoder = device.createCommandEncoder();

		const renderPassDescriptor: GPURenderPassDescriptor = {
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
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: buffer.albedo.createView() },
				{ binding: 1, resource: buffer.pixelatedAlbedo.createView() },
				{ binding: 2, resource: buffer.pixel.createView() },
				{ binding: 3, resource: buffer.normal.createView() },
			],
		});


		const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.draw(4, 1, 0, 0);
		pass.end();

		device.queue.submit([commandEncoder.finish()]);
	}
}
