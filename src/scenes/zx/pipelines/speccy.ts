import { Camera, Context, Mesh, Pipeline } from 'engine';
import { Matrix4, Point3, Vector3, Vector4 } from 'engine/math';
import { GBuffer } from '../gbuffer';
import SHADER_SOURCE from './speccy.wgsl';

export interface Entity {
	transform: Matrix4;
	rotation: Vector3;
	mesh: Mesh<Vertex>;
}

export interface Vertex {
	position: Point3;
	normal: Vector3;
	fgColor: Vector4;
	bgColor: Vector4;
}


export class SpeccyPipeline extends Pipeline {
	private inkPipeline: GPURenderPipeline;
	private paperPipeline: GPURenderPipeline;
	private uniformBuffer: GPUBuffer;
	private entityUniformBuffers: Array<GPUBuffer> = [];

	constructor(ctx: Context, vertexEntry: string = 'vs_main') {
		super(ctx);
		const { device } = ctx;

		// mat4 + mat4 + f32
		const uniformSize = 144;//4 * 4 * 4 * 2 + 4;
		this.uniformBuffer = device.createBuffer({
			label: 'Speccy Render Main Uniform Buffer',
			size: uniformSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			mappedAtCreation: false,
		});

		const vertexBuffers: Array<GPUVertexBufferLayout> = [
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
					shaderLocation: 2, // fg color
					offset: 0,
					format: 'float32x4',
				}],
				arrayStride: 16,
			},
			{
				attributes: [{
					shaderLocation: 3, // bg color
					offset: 0,
					format: 'float32x4',
				}],
				arrayStride: 16,
			},
		];

		const inkBlend: GPUBlendState = {
			color: { operation: 'add', srcFactor: 'one', dstFactor: 'zero' },
			alpha: { operation: 'add', srcFactor: 'zero', dstFactor: 'one' }
		};
		const paperBlend = inkBlend;
		//const writeMask = GPUColorWrite.RED | GPUColorWrite.BLUE | GPUColorWrite.GREEN;
		const writeMask = GPUColorWrite.ALL;

		const inkTargets: Array<GPUColorTargetState> = [
			// Ink
			{ format: 'rgba8unorm', writeMask, blend: inkBlend },
			// Shade
			{ format: 'r8unorm' },
		];
		const paperTargets: Array<GPUColorTargetState> = [
			// Paper
			{ format: 'rgba8unorm', writeMask, blend: paperBlend },
		];
		const module = device.createShaderModule({
			label: 'Speccy Shader Module',
			code: SHADER_SOURCE,
		});
		this.inkPipeline = device.createRenderPipeline({
			label: 'Speccy Render Pipeline',
			layout: 'auto',
			vertex: { module, entryPoint: vertexEntry, buffers: vertexBuffers },
			fragment: { module, entryPoint: 'fs_ink_main', targets: inkTargets },
			primitive: { topology: 'triangle-list' },
			depthStencil: {
				format: 'depth16unorm',
				depthWriteEnabled: true,
				depthCompare: 'less',
			},
		});
		this.paperPipeline = device.createRenderPipeline({
			label: 'Speccy Render Pipeline',
			layout: 'auto',
			vertex: { module, entryPoint: vertexEntry, buffers: vertexBuffers },
			fragment: { module, entryPoint: 'fs_paper_main', targets: paperTargets },
			primitive: { topology: 'triangle-list' },
			depthStencil: {
				format: 'depth16unorm',
				depthWriteEnabled: true,
				depthCompare: 'less',
			},

		});
	}

	private allocateUniforms(count: number) {
		const uniformSize = 4 * 4 * 4; // 4x4 matrix of 4 byte floats
		while (this.entityUniformBuffers.length < count) {
			this.entityUniformBuffers.push(this.ctx.device.createBuffer({
				label: `Speccy Render Entity Uniform Buffer ${this.entityUniformBuffers.length}`,
				size: uniformSize,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
				mappedAtCreation: false,
			}));
		}
	}

	drawBatch(gbuffer: GBuffer, camera: Camera, entities: Array<Entity>, clear: boolean = false) {
		const { device, size } = this.ctx;
		this.allocateUniforms(entities.length);

		// Update camera uniform
		camera.aspect = size[0] / size[1];
		const cam = camera.model;
		const proj = camera.projection;
		const t = performance.now() / 1000.0;

		// Write camera uniform
		device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([...cam, ...proj, t]));

		const inkUniformBindGroup = device.createBindGroup({
			label: 'Speccy Render Ink Uniform Bind Group',
			layout: this.inkPipeline.getBindGroupLayout(1),
			entries: [{
				binding: 0,
				resource: {
					buffer: this.uniformBuffer,
				}
			}]
		});

		const paperUniformBindGroup = device.createBindGroup({
			label: 'Speccy Render Paper Uniform Bind Group',
			layout: this.paperPipeline.getBindGroupLayout(1),
			entries: [{
				binding: 0,
				resource: {
					buffer: this.uniformBuffer,
				}
			}]
		});


		const inkDepthView = gbuffer.inkDepth.createView();
		const paperDepthView = gbuffer.paperDepth.createView();
		const clearValue = { r: 0.0, g: 0.0, b: 0.0, a: 0.0 };
		const skyFg = { r: 0.7, g: 0.8, b: 0.9, a: 0.5 };
		const skyBg = { r: 0.3, g: 0.6, b: 0.9, a: 0.5 };
		const encoder = device.createCommandEncoder();

		let loadOp: GPULoadOp = clear ? 'clear' : 'load';
		for (let i = 0; i < entities.length; i++) {
			const { transform, mesh } = entities[i];

			// Write entity uniform
			device.queue.writeBuffer(this.entityUniformBuffers[i], 0, new Float32Array(transform));

			const inkBindGroup = device.createBindGroup({
				label: 'Speccy Render Ink Bind Group',
				layout: this.inkPipeline.getBindGroupLayout(0),
				entries: [{
					binding: 0,
					resource: {
						buffer: this.entityUniformBuffers[i],
					}
				}]
			});

			const paperBindGroup = device.createBindGroup({
				label: 'Speccy Render Paper Bind Group',
				layout: this.paperPipeline.getBindGroupLayout(0),
				entries: [{
					binding: 0,
					resource: {
						buffer: this.entityUniformBuffers[i],
					}
				}]
			});




			// Draw Ink
			{
				const renderPass = encoder.beginRenderPass({
					colorAttachments: [
						{ view: gbuffer.ink.createView(), clearValue: skyFg, loadOp, storeOp: 'store' },
						{ view: gbuffer.shade.createView(), clearValue, loadOp, storeOp: 'store' },
					],
					depthStencilAttachment: {
						view: inkDepthView,
						depthClearValue: 1.0,
						depthLoadOp: loadOp,
						depthStoreOp: 'store',
					}
				});


				renderPass.setPipeline(this.inkPipeline);
				renderPass.setBindGroup(0, inkBindGroup);
				renderPass.setBindGroup(1, inkUniformBindGroup);
				renderPass.setVertexBuffer(0, mesh.buffers.position);
				renderPass.setVertexBuffer(1, mesh.buffers.normal);
				renderPass.setVertexBuffer(2, mesh.buffers.fgColor);
				renderPass.setVertexBuffer(3, mesh.buffers.bgColor);
				renderPass.draw(mesh.vertices.length);
				renderPass.end();
			}
			// Draw Paper
			{
				const renderPass = encoder.beginRenderPass({
					colorAttachments: [
						{ view: gbuffer.paper.createView(), clearValue: skyBg, loadOp, storeOp: 'store' },
					],
					depthStencilAttachment: {
						view: paperDepthView,
						depthClearValue: 1.0,
						depthLoadOp: loadOp,
						depthStoreOp: 'store',
					}
				});


				renderPass.setPipeline(this.paperPipeline);
				renderPass.setBindGroup(0, paperBindGroup);
				renderPass.setBindGroup(1, paperUniformBindGroup);
				renderPass.setVertexBuffer(0, mesh.buffers.position);
				renderPass.setVertexBuffer(1, mesh.buffers.normal);
				renderPass.setVertexBuffer(2, mesh.buffers.fgColor);
				renderPass.setVertexBuffer(3, mesh.buffers.bgColor);
				renderPass.draw(mesh.vertices.length);
				renderPass.end();
			}

			loadOp = 'load';
		}
		device.queue.submit([encoder.finish()]);
	}
}
