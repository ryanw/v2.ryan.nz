import { Context } from '../context';
import { GBuffer } from '../gbuffer';
import { Pipeline } from '../pipeline';
import SHADER_SOURCE from './compose.wgsl';

export enum Shading {
	None = 0,
	Flat,
	Dithered,
	Shade,
	Ink,
	Paper,
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
		shading: Shading.Dithered,
	};

	constructor(ctx: Context) {
		super(ctx);
		const { device, format } = ctx;

		this.uniformBuffer = device.createBuffer({
			size: 16,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		const module = device.createShaderModule({
			label: 'Compose Shader Module',
			code: SHADER_SOURCE,
		});
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
			// Uniforms.shading
			this.options.shading,
			// Alignment
			0,
			// Uniforms.pixelated
			...(this.options.pixelated ? buffer.clashSize : [1, 1]),
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

		const inkBuffer = this.options.pixelated ? buffer.inkClash : buffer.ink;
		const paperBuffer = this.options.pixelated ? buffer.paperClash : buffer.paper;
		const bindGroup = device.createBindGroup({
			label: 'Compose Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: inkBuffer.createView() },
				{ binding: 1, resource: paperBuffer.createView() },
				{ binding: 2, resource: buffer.shade.createView() },
				{ binding: 3, resource: { buffer: this.uniformBuffer } },
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
