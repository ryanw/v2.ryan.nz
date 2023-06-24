import { Camera, Color, Context, WireMesh, Pipeline } from 'engine';
import { Matrix4, Point3, Vector2 } from 'engine/math';
import SHADER_SOURCE from './wire.wgsl';
import { GBuffer } from '../gbuffer';
import { Entity } from '..';

export class WirePipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private transformBuffers: Map<Entity, GPUBuffer>;
	private cameraBuffer: GPUBuffer;

	constructor(ctx: Context, format?: GPUTextureFormat) {
		super(ctx);

		const { device } = ctx;
		const module = device.createShaderModule({
			label: 'Wire Shader Module',
			code: SHADER_SOURCE,
		});

		this.pipeline = device.createRenderPipeline({
			label: 'Wire Pipeline',
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main', buffers: [] },
			fragment: {
				module,
				entryPoint: 'fs_main',
				targets: [{
					format: format || ctx.format,
					blend: {
						color: {
							operation: 'add',
							srcFactor: 'src-alpha',
							dstFactor: 'one-minus-src-alpha',
						},
						alpha: {
							operation: 'add',
							srcFactor: 'one',
							dstFactor: 'one',
						},
					}
				}]
			},
			primitive: { topology: 'triangle-strip' },
			depthStencil: {
				format: 'depth32float',
				depthWriteEnabled: true,
				// Wires should ge priority when z-fighting with faces
				depthCompare: 'less-equal',
			},
		});

		this.cameraBuffer = device.createBuffer({
			label: 'WirePipeline Camera Buffer',
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			size: 256,
			mappedAtCreation: false,
		});

		this.transformBuffers = new Map();
	}

	getTransformBuffer(entity: Entity): GPUBuffer {
		let buffer = this.transformBuffers.get(entity);
		if (!buffer) {
			buffer = this.ctx.device.createBuffer({
				label: 'WirePipeline WireMesh Transform Buffer',
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
				size: 64, // mat4x4<f32>
				mappedAtCreation: false,
			});
			this.transformBuffers.set(entity, buffer);
		}
		this.ctx.device.queue.writeBuffer(buffer, 0, new Float32Array(entity.transform));
		return buffer;
	}

	drawEntities(encoder: GPUCommandEncoder, buffer: GBuffer, entities: IterableIterator<Entity>, camera: Camera) {
		const { device } = this.ctx;

		const depthView = buffer.depth.createView();
		const albedo = buffer.albedo.createView();


		device.queue.writeBuffer(this.cameraBuffer, 0, new Float32Array([
			...camera.model,
			...camera.projection,
			...buffer.size,
		]));

		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{
					view: albedo,
					loadOp: 'load',
					storeOp: 'store',
				},
			],
			depthStencilAttachment: {
				view: depthView,
				depthLoadOp: 'load',
				depthStoreOp: 'store',
			}
		};

		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipeline);
		for (const entity of entities) {
			const { mesh } = entity;
			const transformBuffer = this.getTransformBuffer(entity);

			const cameraBindGroup = device.createBindGroup({
				label: 'WirePipeline Camera Bind Group',
				layout: this.pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 0, resource: { buffer: this.cameraBuffer } },
					{ binding: 1, resource: { buffer: transformBuffer } },
				],
			});

			const wireBindGroup = device.createBindGroup({
				label: 'WirePipeline Wire Bind Group',
				layout: this.pipeline.getBindGroupLayout(1),
				entries: [{ binding: 0, resource: { buffer: mesh.wireBuffer } }],
			});


			pass.setBindGroup(0, cameraBindGroup);
			pass.setBindGroup(1, wireBindGroup);
			pass.draw(4, mesh.wireCount);
		}
		pass.end();
	}
}
