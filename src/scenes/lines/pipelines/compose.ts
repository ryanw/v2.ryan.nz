import { Context, Pipeline } from 'engine';
import { GBuffer } from '../gbuffer';
import SHADER_SOURCE from './compose.wgsl';

export class ComposePipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private uniformBuffer: GPUBuffer;

	constructor(ctx: Context, format?: GPUTextureFormat) {
		super(ctx);

		const { device } = ctx;
		const module = device.createShaderModule({
			label: 'Line Compose Shader Module',
			code: SHADER_SOURCE,
		});

		this.pipeline = device.createRenderPipeline({
			label: 'Line Compose Pipeline',
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main' },
			fragment: { module, entryPoint: 'fs_main', targets: [{ format: format || ctx.format }] },
			primitive: { topology: 'triangle-strip' },
		});

		this.uniformBuffer = device.createBuffer({
			size: 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
	}

	compose(encoder: GPUCommandEncoder, texture: GPUTexture, buffer: GBuffer) {
		const { device } = this.ctx;

		const view = texture.createView();
		device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([performance.now() / 1000.0]));

		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{
					view,
					clearValue: { r: 1.0, g: 0.0, b: 0.0, a: 1.0 },
					loadOp: 'load',
					storeOp: 'store',
				},
			],
		};

		const bindGroup = device.createBindGroup({
			label: 'Line Compose Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.uniformBuffer } },
				{ binding: 1, resource: buffer.albedo.createView() },
			],
		});


		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.draw(4, 1, 0, 0);
		pass.end();
	}
}
