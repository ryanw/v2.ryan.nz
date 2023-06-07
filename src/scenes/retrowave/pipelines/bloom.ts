import { GBuffer } from '../gbuffer';
import { Context, Pipeline } from 'engine';
import SHADER_SOURCE from './bloom.wgsl';

export class BloomPipeline extends Pipeline {
	pipeline: GPUComputePipeline;
	texture: GPUTexture;
	uniformBuffer: GPUBuffer;

	constructor(ctx: Context) {
		super(ctx);
		const { device } = ctx;

		this.uniformBuffer = device.createBuffer({
			size: 16,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		this.texture = device.createTexture({
			label: 'Initial Bloom Texture',
			size: [1, 1],
			format: 'rgba8unorm',
			usage:
				GPUTextureUsage.RENDER_ATTACHMENT |
				GPUTextureUsage.TEXTURE_BINDING |
				GPUTextureUsage.STORAGE_BINDING |
				GPUTextureUsage.COPY_DST,
		});

		const module = device.createShaderModule({
			label: 'Bloom Shader Module',
			code: SHADER_SOURCE,
		});
		this.pipeline = device.createComputePipeline({
			label: 'Bloom GBuffer Pipeline',
			layout: 'auto',
			compute: { module, entryPoint: 'main' },
		});
	}

	resizeTexture(w: number, h: number) {
		const { width, height } = this.texture;
		if (w === width && h === height) return;

		this.texture = this.ctx.device.createTexture({
			label: 'Bloom Texture',
			size: [w, h],
			format: 'rgba8unorm',
			usage:
				GPUTextureUsage.RENDER_ATTACHMENT |
				GPUTextureUsage.TEXTURE_BINDING |
				GPUTextureUsage.STORAGE_BINDING |
				GPUTextureUsage.COPY_DST,
		});
	}

	run(encoder: GPUCommandEncoder, buffer: GBuffer, radius: number = 1, kernel: number = 3, amount: number = 2.0) {
		const { device } = this.ctx;
		const { width, height } = buffer.bloom;
		this.resizeTexture(width, height);

		const t = performance.now() / 1000.0;
		device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([
			// Uniforms.radius
			radius,
			// Uniforms.kernel
			kernel,
			// Uniforms.amount
			amount,
		]));

		const passDescriptor: GPUComputePassDescriptor = {};

		const bloomInput = buffer.bloom.createView();
		const bloomOutput = this.texture.createView();
		const bindGroup = device.createBindGroup({
			label: 'Bloom Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: bloomInput },
				{ binding: 1, resource: bloomOutput },
				{ binding: 2, resource: { buffer: this.uniformBuffer } },
			],
		});


		const workgroupSize = [16, 16, 1];
		const workgroups: [number, number, number] = [
			Math.ceil(width / workgroupSize[0]),
			Math.ceil(height / workgroupSize[1]),
			1,
		];
		const pass = encoder.beginComputePass(passDescriptor);
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(...workgroups);
		pass.end();


		// Swap textures
		const bloom = this.texture;
		this.texture = buffer.bloom;
		buffer.bloom = bloom;
	}
}

