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
	normal: Vector3;
	color: Vector4;
}

export class WireframePipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private entityBuffer: GPUBuffer;
	private entityBindGroup: GPUBindGroup;
	private uniformBuffer: GPUBuffer;
	private uniformBindGroup: GPUBindGroup;

	constructor(ctx: Context) {
		super(ctx);

		const { device } = ctx;

		const module = device.createShaderModule({
			label: 'Speccy Shader Module',
			code: SHADER_SOURCE,
		});

		this.entityBuffer = device.createBuffer({
			label: 'Wireframe Render Entity Buffer',
			size: 256,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			mappedAtCreation: false,
		});
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
			fragment: { module, entryPoint: 'fs_main', targets: [{ format: 'rgba8unorm' }] },
			primitive: { topology: 'triangle-list' },
			depthStencil: {
				format: 'depth16unorm',
				depthWriteEnabled: true,
				depthCompare: 'less',
			},
		});
		this.entityBindGroup = device.createBindGroup({
			label: 'Wireframe Render Entity Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [{
				binding: 0,
				resource: {
					buffer: this.entityBuffer,
				}
			}]
		});
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

	draw(encoder: GPUCommandEncoder, gbuffer: GBuffer, entity: Entity, camera: Camera) {
		const { device } = this.ctx;
		const { mesh, transform } = entity;
		const clearValue = { r: 1.0, g: 1.0, b: 0.0, a: 1.0 };

		const albedoView = gbuffer.albedo.createView();
		const depthView = gbuffer.depth.createView();

		// Update camera uniform
		const t = performance.now() / 1000.0;
		device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([...camera.model, ...camera.projection, t]));

		// Update entity uniform
		device.queue.writeBuffer(this.entityBuffer, 0, new Float32Array(transform));

		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{ view: albedoView, clearValue, loadOp: 'clear', storeOp: 'store' },
			],
			depthStencilAttachment: {
				view: depthView,
				depthClearValue: 1.0,
				depthLoadOp: 'clear',
				depthStoreOp: 'store',
			}
		};

		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, this.entityBindGroup);
		pass.setBindGroup(1, this.uniformBindGroup);
		pass.setVertexBuffer(0, mesh.buffers.position);
		pass.setVertexBuffer(1, mesh.buffers.normal);
		pass.setVertexBuffer(2, mesh.buffers.color);
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
			shaderLocation: 1, // normal
			offset: 0,
			format: 'float32x3',
		}],
		arrayStride: 12,
	},
	{
		attributes: [{
			shaderLocation: 2, // color
			offset: 0,
			format: 'float32x4',
		}],
		arrayStride: 16,
	},
];
