import { Camera, Color, Context, Pipeline } from 'engine';
import { Point3 } from 'engine/math';
import { inverse } from 'engine/math/transform';
import { GBuffer } from '../gbuffer';
import SHADER_SOURCE from './sky_render.wgsl';
import { multiply, scaling, translation } from 'engine/math/transform';

export interface Vertex {
	position: Point3,
	normal: Point3,
	barycentric: Point3,
	color: Color,
}

export class SkyRenderPipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private entityBuffer: GPUBuffer;
	private cameraBuffer: GPUBuffer;

	constructor(ctx: Context, format?: GPUTextureFormat) {
		super(ctx);

		const { device } = ctx;
		const module = device.createShaderModule({
			label: 'SkyRenderPipeline Shader Module',
			code: SHADER_SOURCE,
		});

		this.pipeline = device.createRenderPipeline({
			label: 'SkyRenderPipeline',
			layout: 'auto',
			primitive: { topology: 'triangle-strip' },
			vertex: {
				module,
				entryPoint: 'vs_main',
				buffers: [],
			},
			fragment: {
				module,
				entryPoint: 'fs_main',
				targets: [{ format: format || ctx.format }]
			},
		});

		this.cameraBuffer = device.createBuffer({
			label: 'SkyRenderPipeline Camera Buffer',
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			size: 256,
			mappedAtCreation: false,
		});

		this.entityBuffer = device.createBuffer({
			label: 'SkyRenderPipeline Entity Buffer',
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			size: 64,
			mappedAtCreation: false,
		});
	}

	drawSky(encoder: GPUCommandEncoder, buffer: GBuffer, camera: Camera) {
		const { device } = this.ctx;

		const albedo = buffer.albedo.createView();


		device.queue.writeBuffer(this.cameraBuffer, 0, new Float32Array([
			...camera.model,
			...inverse(camera.model)!,
			...camera.projection,
			...buffer.size,
			// t: f32
			performance.now() / 1000.0,
		]));

		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{
					view: albedo,
					loadOp: 'load',
					storeOp: 'store',
				},
			],
		};

		const uniformBindGroup = device.createBindGroup({
			label: 'ShapeRenderPipeline Uniform Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.cameraBuffer } },
			],
		});

		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, uniformBindGroup);
		pass.draw(4);
		pass.end();
	}
}
