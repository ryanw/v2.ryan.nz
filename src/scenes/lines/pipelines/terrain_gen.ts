import { Context, Pipeline } from 'engine';
import SHADER_SOURCE from './terrain_gen.wgsl';
import { Point2 } from 'engine/math';

export class TerrainGenPipeline extends Pipeline {
	pipeline: GPUComputePipeline;

	constructor(ctx: Context) {
		super(ctx);
		const { device } = ctx;

		const module = device.createShaderModule({
			label: 'Terrain Generation Shader Module',
			code: SHADER_SOURCE,
		});
		this.pipeline = device.createComputePipeline({
			label: 'Terrain Generation GBuffer Pipeline',
			layout: 'auto',
			compute: { module, entryPoint: 'main' },
		});
	}

	run(encoder: GPUCommandEncoder, offset: Point2, heightmap: GPUTexture) {
		if (!this.pipeline) return;
		const { device } = this.ctx;
		const { width, height } = heightmap;

		const uniformBuffer = device.createBuffer({
			size: 32,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});



		const t = performance.now() / 1000.0;
		device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([
			offset[0], 0.0, offset[1],
			0.0,
			t
		]));

		const passDescriptor: GPUComputePassDescriptor = {};

		const terrainView = heightmap.createView();
		const bindGroup = device.createBindGroup({
			label: 'Terrain Generation Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: terrainView },
				{ binding: 1, resource: { buffer: uniformBuffer } },
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

		setTimeout(() => uniformBuffer.destroy(), 1);
	}
}

