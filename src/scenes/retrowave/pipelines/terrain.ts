import { GBuffer } from '../gbuffer';
import { Camera, Context, Pipeline, createTexture } from 'engine';
import SHADER_SOURCE from './terrain.wgsl';
import { Entity, WireVertex } from './wireframe';
import { entry } from 'webpack.config';
import { Chunk } from '../terrain';

export type TerrainEntity = Entity & { chunk: Chunk<WireVertex>};

export class TerrainPipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private entityBuffers: Record<number, GPUBuffer>;
	private entityBindGroups: Record<number, GPUBindGroup>;
	private uniformBuffer: GPUBuffer;
	private dummy: GPUTexture;

	constructor(ctx: Context) {
		super(ctx);

		const { device } = ctx;

		const module = device.createShaderModule({
			label: 'Terrain Shader Module',
			code: SHADER_SOURCE,
		});

		this.entityBuffers = {};
		this.uniformBuffer = device.createBuffer({
			label: 'Terrain Render Uniform Buffer',
			size: 256,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			mappedAtCreation: false,
		});
		this.pipeline = device.createRenderPipeline({
			label: 'Terrain Render Pipeline',
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main', buffers: VERTEX_BUFFER_LAYOUT },
			fragment: {
				module, entryPoint: 'fs_main', targets: [
					// Albedo
					{ format: 'rgba8unorm' },
					// Bloom
					{ format: 'rgba8unorm' },
					// Mirror
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
		this.dummy = createTexture(ctx, 'r32float');
	}

	clear(encoder: GPUCommandEncoder, gbuffer: GBuffer) {
		const clearValue = { r: 0.0, g: 0.0, b: 0.0, a: 0.0 };
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

	clearDepth(encoder: GPUCommandEncoder, gbuffer: GBuffer) {
		const depthView = gbuffer.depth.createView();
		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [],
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

	draw(encoder: GPUCommandEncoder, id: number, gbuffer: GBuffer, entity: TerrainEntity, camera: Camera) {
		const { device } = this.ctx;
		const { mesh, transform } = entity;

		const albedoView = gbuffer.albedo.createView();
		const bloomView = gbuffer.bloom.createView();
		const mirrorView = gbuffer.mirror.createView();
		const depthView = gbuffer.depth.createView();

		// Update camera uniform
		const t = performance.now() / 1000.0;
		device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([...camera.model, ...camera.projection, t]));

		const uniformBindGroup = device.createBindGroup({
			label: 'Terrain Render Uniform Bind Group',
			layout: this.pipeline.getBindGroupLayout(1),
			entries: [
				{
					binding: 0,
					resource: {
						buffer: this.uniformBuffer,
					}
				},
				{
					binding: 1,
					resource: (entity.chunk ? entity.chunk.heightmap : this.dummy).createView(),
				},
			]
		});

		// Update entity uniform
		if (!this.entityBuffers[id]) {
			this.entityBuffers[id] = device.createBuffer({
				label: 'Terrain Render Entity Buffer',
				size: 256,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
				mappedAtCreation: false,
			});
			this.entityBindGroups[id] = device.createBindGroup({
				label: 'Terrain Render Entity Bind Group',
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
				{ view: mirrorView, loadOp: 'load', storeOp: 'store' },
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
		pass.setBindGroup(1, uniformBindGroup);
		pass.setVertexBuffer(0, mesh.buffers.position);
		pass.setVertexBuffer(1, mesh.buffers.barycentric);
		pass.setVertexBuffer(2, mesh.buffers.normal);
		pass.setVertexBuffer(3, mesh.buffers.wireColor);
		pass.setVertexBuffer(4, mesh.buffers.faceColor);
		pass.setVertexBuffer(5, mesh.buffers.seed);
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
	{
		attributes: [{
			shaderLocation: 5, // Seed
			offset: 0,
			format: 'float32',
		}],
		arrayStride: 4,
	},
];
