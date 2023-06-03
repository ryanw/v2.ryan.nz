import { Context } from '../context';
import { GBuffer } from '../gbuffer';
import { Pipeline } from '../pipeline';
import SHADER_SOURCE from './pixelate.wgsl';

export class PixelatePipeline extends Pipeline {
	uniformBuffer: GPUBuffer;
	texture: GPUTexture;
	pipeline: GPUComputePipeline;

	constructor(ctx: Context) {
		super(ctx);
		const { device } = ctx;

		this.uniformBuffer = device.createBuffer({
			size: 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});

		this.texture = device.createTexture({
			format: 'rgba8uint',
			size: [1, 1],
			usage:
				GPUTextureUsage.RENDER_ATTACHMENT |
				GPUTextureUsage.TEXTURE_BINDING |
				GPUTextureUsage.COPY_DST |
				GPUTextureUsage.STORAGE_BINDING,
		});

		const module = device.createShaderModule({ code: SHADER_SOURCE });
		this.pipeline = device.createComputePipeline({
			label: 'Pixelate Compute Pipeline',
			layout: 'auto',
			compute: { module, entryPoint: 'main' },
		});
	}

	pixelateColor(gbuffer: GBuffer, amount: number) {
		const { device } = this.ctx;
		const { width, height } = gbuffer.albedo;
		if (width !== this.texture.width || height !== this.texture.height) {
			this.texture = device.createTexture({
				label: 'Pixelated Albedo Texture',
				format: 'rgba8uint',
				size: [width, height],
				usage:
					GPUTextureUsage.RENDER_ATTACHMENT |
					GPUTextureUsage.TEXTURE_BINDING |
					GPUTextureUsage.COPY_DST |
					GPUTextureUsage.STORAGE_BINDING,
			});
		}

		const depthView = gbuffer.depth.createView();
		const inView = gbuffer.albedo.createView();
		const outView = this.texture.createView();

		const commandEncoder = device.createCommandEncoder();

		const passDescriptor: GPUComputePassDescriptor = {};

		device.queue.writeBuffer(this.uniformBuffer, 0, new Uint32Array([amount]));


		const bindGroup = device.createBindGroup({
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: inView },
				{ binding: 1, resource: depthView },
				{ binding: 2, resource: outView },
				{ binding: 3, resource: { buffer: this.uniformBuffer } },
			],
		});


		const workgroupSize = [16, 16, 1];
		const workgroups: [number, number, number] = [
			Math.ceil((width / amount) / workgroupSize[0]),
			Math.ceil((height / amount) / workgroupSize[1]),
			1,
		];
		const pass = commandEncoder.beginComputePass(passDescriptor);
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(...workgroups);
		pass.end();

		device.queue.submit([commandEncoder.finish()]);

		const pixelated = this.texture;
		this.texture = gbuffer.albedo;
		gbuffer.albedo = pixelated;
	}
}

