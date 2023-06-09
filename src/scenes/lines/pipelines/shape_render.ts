import { Camera, Color, Context, Line, LineMesh, Mesh, Pipeline, WireMesh, createTexture } from 'engine';
import { Matrix4, Point2, Point3, Vector2 } from 'engine/math';
import SHADER_SOURCE from './shape_render.wgsl';
import { GBuffer } from '../gbuffer';
import { Entity } from '..';

export interface Vertex {
	position: Point3,
	normal: Point3,
	barycentric: Point3,
	color: Color,
}

export class ShapeRenderPipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private entityBuffers: Map<Entity, GPUBuffer>;
	private cameraBuffer: GPUBuffer;

	constructor(ctx: Context, format?: GPUTextureFormat) {
		super(ctx);

		const { device } = ctx;
		const module = device.createShaderModule({
			label: 'ShapeRenderPipeline Shader Module',
			code: SHADER_SOURCE,
		});

		this.pipeline = device.createRenderPipeline({
			label: 'ShapeRenderPipeline',
			layout: 'auto',
			primitive: { topology: 'triangle-list' },
			vertex: {
				module,
				entryPoint: 'vs_main',
				buffers: VERTEX_BUFFER_LAYOUT,
			},
			fragment: {
				module,
				entryPoint: 'fs_main',
				targets: [{
					format: format || ctx.format,
				}]
			},
			depthStencil: {
				format: 'depth32float',
				depthWriteEnabled: true,
				depthCompare: 'less',
			},
		});

		this.cameraBuffer = device.createBuffer({
			label: 'ShapeRenderPipeline Camera Buffer',
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			size: 256,
			mappedAtCreation: false,
		});

		this.entityBuffers = new Map();
	}

	getEntityBuffer(entity: Entity): GPUBuffer {
		let buffer = this.entityBuffers.get(entity);
		if (!buffer) {
			buffer = this.ctx.device.createBuffer({
				label: 'ShapeRenderPipeline Entity Buffer',
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
				size: 80, // mat4x4<f32> + f32 + alignment
				mappedAtCreation: false,
			});
			this.entityBuffers.set(entity, buffer);
		}
		this.ctx.device.queue.writeBuffer(buffer, 0, new Float32Array([
			// entity.model
			...entity.transform,
			// entity.thickness
			entity.mesh.wireThickness,

		]));
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
			const entityBuffer = this.getEntityBuffer(entity);
			const uniformBindGroup = device.createBindGroup({
				label: 'ShapeRenderPipeline Uniform Bind Group',
				layout: this.pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 0, resource: { buffer: this.cameraBuffer } },
					{ binding: 1, resource: { buffer: entityBuffer } },
				],
			});


			pass.setBindGroup(0, uniformBindGroup);
			pass.setVertexBuffer(0, mesh.buffers.position);
			pass.setVertexBuffer(1, mesh.buffers.normal);
			pass.setVertexBuffer(2, mesh.buffers.faceColor);
			pass.setVertexBuffer(3, mesh.buffers.wireColor);
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
			shaderLocation: 2, // faceColor
			offset: 0,
			format: 'float32x4',
		}],
		arrayStride: 16,
	},
	{
		attributes: [{
			shaderLocation: 3, // wireColor
			offset: 0,
			format: 'float32x4',
		}],
		arrayStride: 16,
	},
];
