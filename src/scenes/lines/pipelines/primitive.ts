import { Camera, Color, Context, LineMesh, Pipeline } from 'engine';
import { Matrix4, Point2, Point3, Vector2 } from 'engine/math';
import SHADER_SOURCE from './primitive.wgsl';
import { GBuffer } from '../gbuffer';

export enum LineStyle {
	Solid = 0,
}

export interface LineInstance {
	start: Point3,
	end: Point3,
	color: Color,
	style: LineStyle,
	size: Vector2,
}

export interface LineVertex {
	position: Point3,
	uv: Point2,
}

export interface Entity {
	mesh: LineMesh,
	transform: Matrix4,
}


export class PrimitivePipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private transformBuffers: Map<LineMesh, GPUBuffer>;
	private cameraBuffer: GPUBuffer;

	constructor(ctx: Context, format?: GPUTextureFormat) {
		super(ctx);

		const { device } = ctx;
		const module = device.createShaderModule({
			label: 'Line Primitive Shader Module',
			code: SHADER_SOURCE,
		});

		this.pipeline = device.createRenderPipeline({
			label: 'Line Primitive Pipeline',
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
				// Lines should ge priority when z-fighting with faces
				depthCompare: 'less-equal',
			},
		});

		this.cameraBuffer = device.createBuffer({
			label: 'PrimitivePipeline Camera Buffer',
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			size: 256,
			mappedAtCreation: false,
		});

		this.transformBuffers = new Map();
	}

	getTransformBuffer({ mesh, transform }: Entity): GPUBuffer {
		let buffer = this.transformBuffers.get(mesh);
		if (!buffer) {
			buffer = this.ctx.device.createBuffer({
				label: 'PrimitivePipeline LineMesh Transform Buffer',
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
				size: 64, // mat4x4<f32>
				mappedAtCreation: false,
			});
			this.transformBuffers.set(mesh, buffer);
		}
		this.ctx.device.queue.writeBuffer(buffer, 0, new Float32Array(transform));
		return buffer;
	}

	drawEntities(encoder: GPUCommandEncoder, buffer: GBuffer, entities: Array<Entity>, camera: Camera) {
		if (entities.length === 0) return;
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
					clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
					loadOp: 'load',
					storeOp: 'store',
				},
			],
			depthStencilAttachment: {
				view: depthView,
				depthClearValue: 1.0,
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
				label: 'PrimitivePipeline Camera Bind Group',
				layout: this.pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 0, resource: { buffer: this.cameraBuffer } },
					{ binding: 1, resource: { buffer: transformBuffer } },
				],
			});

			const lineBindGroup = device.createBindGroup({
				label: 'PrimitivePipeline LineMesh Bind Group',
				layout: this.pipeline.getBindGroupLayout(1),
				entries: [{ binding: 0, resource: { buffer: mesh.buffer } }],
			});


			pass.setBindGroup(0, cameraBindGroup);
			pass.setBindGroup(1, lineBindGroup);
			pass.draw(4, mesh.lineCount);
		}
		pass.end();
	}
}
