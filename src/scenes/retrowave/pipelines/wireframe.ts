import { GBuffer } from '../gbuffer';
import { Camera } from '../../../camera';
import { Context } from '../../../context';
import { Matrix4, Point3, Vector3, Vector4 } from '../../../math';
import { Mesh } from '../../../mesh';
import { Pipeline } from '../../../pipeline';
import SHADER_SOURCE from './wireframe.wgsl';

export interface Entity {
	transform: Matrix4;
	mesh: Mesh<WireVertex>;
}

export interface WireVertex {
	position: Point3;
	barycentric: Point3;
	normal: Vector3;
	wireColor: Vector4;
	faceColor: Vector4;
}

export class WireframePipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private entityBuffers: Record<number, GPUBuffer>;
	private entityBindGroups: Record<number, GPUBindGroup>;
	private uniformBuffer: GPUBuffer;
	private uniformBindGroup: GPUBindGroup;

	constructor(ctx: Context) {
		super(ctx);

		const { device } = ctx;

		const module = device.createShaderModule({
			label: 'Wireframe Shader Module',
			code: SHADER_SOURCE,
		});

		this.entityBuffers = {};
		this.uniformBuffer = device.createBuffer({
			label: 'Wireframe Render Uniform Buffer',
			size: 256,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			mappedAtCreation: false,
		});
		this.pipeline = device.createRenderPipeline({
			label: 'Wireframe Render Pipeline',
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main', buffers: VERTEX_BUFFER_LAYOUT },
			fragment: {
				module, entryPoint: 'fs_main', targets: [
					// Albedo
					{ format: 'rgba8unorm' },
					// Bloom
					{ format: 'rgba8unorm' },
				]
			},
			primitive: { topology: 'triangle-list' },
			depthStencil: {
				format: 'depth16unorm',
				depthWriteEnabled: true,
				depthCompare: 'less',
			},
		});
		this.entityBindGroups = {};
		this.uniformBindGroup = device.createBindGroup({
			label: 'Wireframe Render Uniform Bind Group',
			layout: this.pipeline.getBindGroupLayout(1),
			entries: [{
				binding: 0,
				resource: {
					buffer: this.uniformBuffer,
				}
			}]
		});
	}

	clear(encoder: GPUCommandEncoder, gbuffer: GBuffer) {
		const clearValue = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };
		const albedoView = gbuffer.albedo.createView();
		const bloomView = gbuffer.bloom.createView();
		const depthView = gbuffer.depth.createView();
		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{ view: albedoView, clearValue, loadOp: 'clear', storeOp: 'store' },
				{ view: bloomView, clearValue, loadOp: 'clear', storeOp: 'store' },
			],
			depthStencilAttachment: {
				view: depthView,
				depthClearValue: 1.0,
				depthLoadOp: 'clear',
				depthStoreOp: 'store',
			}
		};

		const pass = encoder.beginRenderPass(passDescriptor);
		pass.end();
	}

	draw(encoder: GPUCommandEncoder, id: number, gbuffer: GBuffer, entity: Entity, camera: Camera) {
		const { device } = this.ctx;
		const { mesh, transform } = entity;

		const albedoView = gbuffer.albedo.createView();
		const bloomView = gbuffer.bloom.createView();
		const depthView = gbuffer.depth.createView();

		// Update camera uniform
		const t = performance.now() / 1000.0;
		device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([...camera.model, ...camera.projection, t]));

		// Update entity uniform
		if (!this.entityBuffers[id]) {
			this.entityBuffers[id] = device.createBuffer({
				label: 'Wireframe Render Entity Buffer',
				size: 256,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
				mappedAtCreation: false,
			});
			this.entityBindGroups[id] = device.createBindGroup({
				label: 'Wireframe Render Entity Bind Group',
				layout: this.pipeline.getBindGroupLayout(0),
				entries: [{
					binding: 0,
					resource: {
						buffer: this.entityBuffers[id],
					}
				}]
			});
		}
		device.queue.writeBuffer(this.entityBuffers[id], 0, new Float32Array(transform));

		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{ view: albedoView, loadOp: 'load', storeOp: 'store' },
				{ view: bloomView, loadOp: 'load', storeOp: 'store' },
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
		pass.setBindGroup(0, this.entityBindGroups[id]);
		pass.setBindGroup(1, this.uniformBindGroup);
		pass.setVertexBuffer(0, mesh.buffers.position);
		pass.setVertexBuffer(1, mesh.buffers.barycentric);
		pass.setVertexBuffer(2, mesh.buffers.normal);
		pass.setVertexBuffer(3, mesh.buffers.wireColor);
		pass.setVertexBuffer(4, mesh.buffers.faceColor);
		pass.draw(mesh.vertices.length);
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
			shaderLocation: 1, // barycentric
			offset: 0,
			format: 'float32x3',
		}],
		arrayStride: 12,
	},
	{
		attributes: [{
			shaderLocation: 2, // normal
			offset: 0,
			format: 'float32x3',
		}],
		arrayStride: 12,
	},
	{
		attributes: [{
			shaderLocation: 3, // wire color
			offset: 0,
			format: 'float32x4',
		}],
		arrayStride: 16,
	},
	{
		attributes: [{
			shaderLocation: 4, // face color
			offset: 0,
			format: 'float32x4',
		}],
		arrayStride: 16,
	},
];
