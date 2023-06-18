import { Camera, Color, Context, Line, LineMesh, Mesh, Pipeline, createTexture } from 'engine';
import { Matrix4, Point2, Point3, Vector2 } from 'engine/math';
import SHADER_SOURCE from './face.wgsl';
import { GBuffer } from '../gbuffer';

export interface Vertex {
	position: Point3,
	normal: Point3,
	barycentric: Point3,
	color: Color,
}

export interface Entity {
	mesh: Mesh<Vertex>,
	transform: Matrix4,
}


export class FacePipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private transformBuffers: Map<Mesh<Vertex>, GPUBuffer>;
	private cameraBuffer: GPUBuffer;

	constructor(ctx: Context, format?: GPUTextureFormat) {
		super(ctx);

		const { device } = ctx;
		const module = device.createShaderModule({
			label: 'FacePipeline Shader Module',
			code: SHADER_SOURCE,
		});

		this.pipeline = device.createRenderPipeline({
			label: 'FacePipeline',
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main', buffers: VERTEX_BUFFER_LAYOUT },
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
			primitive: { topology: 'triangle-list' },
			depthStencil: {
				format: 'depth32float',
				depthWriteEnabled: true,
				depthCompare: 'less',
			},
		});

		this.cameraBuffer = device.createBuffer({
			label: 'FacePipeline Camera Buffer',
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
				label: 'FacePipeline LineMesh Transform Buffer',
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

			const uniformBindGroup = device.createBindGroup({
				label: 'FacePipeline Uniform Bind Group',
				layout: this.pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 0, resource: { buffer: this.cameraBuffer } },
					{ binding: 1, resource: { buffer: transformBuffer } },
				],
			});


			pass.setBindGroup(0, uniformBindGroup);

			pass.setVertexBuffer(0, mesh.buffers.position);
			pass.setVertexBuffer(1, mesh.buffers.normal);
			pass.setVertexBuffer(2, mesh.buffers.barycentric);
			pass.setVertexBuffer(3, mesh.buffers.color);

			pass.draw(mesh.vertices.length);
		}
		pass.end();
	}
}

const VERTEX_BUFFER_LAYOUT: Array<GPUVertexBufferLayout> = [
	{
		attributes: [{
			shaderLocation: 0, // position
			offset: 0,
			format: 'float32x3',
		}],
		arrayStride: 12,
	},
	{
		attributes: [{
			shaderLocation: 1, // normal
			offset: 0,
			format: 'float32x3',
		}],
		arrayStride: 12,
	},
	{
		attributes: [{
			shaderLocation: 2, // barycentric
			offset: 0,
			format: 'float32x3',
		}],
		arrayStride: 12,
	},
	{
		attributes: [{
			shaderLocation: 3, // color
			offset: 0,
			format: 'float32x4',
		}],
		arrayStride: 16,
	},
];
