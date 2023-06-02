import { Context } from '../context';
import { GBuffer } from '../gbuffer';
import { Pipeline } from '../pipeline';
import SHADER_SOURCE from './compose.wgsl';

export enum Shading {
	None = 0,
	Solid = 1,
	Dithered = 2,
}

export interface Options {
	pixelated: boolean;
	shading: Shading;
}

export class ComposePipeline extends Pipeline {
	pipeline: GPURenderPipeline;
	uniformBuffer: GPUBuffer;
	options: Options = {
		pixelated: true,
		shading: Shading.Dithered
	};

	constructor(ctx: Context) {
		super(ctx);
		const { device, format } = ctx;

		this.uniformBuffer = device.createBuffer({
			size: 8,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

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
		device.queue.writeBuffer(this.uniformBuffer, 0, new Uint32Array([
			// Uniforms.pixelated
			this.options.pixelated ? 1 : 0,
			// Uniforms.shading
			this.options.shading,
		]));

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
				{ binding: 4, resource: { buffer: this.uniformBuffer } },
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
