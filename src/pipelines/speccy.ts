import { Camera } from '../camera';
import { Context } from '../context';
import { GBuffer } from '../gbuffer';
import { Matrix4, Point3, Vector3, Vector4 } from '../math';
import { Mesh } from '../mesh';
import { Pipeline } from '../pipeline';
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
	private uniformBuffers: Array<GPUBuffer> = [];

	constructor(ctx: Context) {
		super(ctx);
		const { device } = ctx;
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
			vertex: { module, entryPoint: 'vs_main', buffers: vertexBuffers },
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
			vertex: { module, entryPoint: 'vs_main', buffers: vertexBuffers },
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
		const uniformSize = 3 * 4 * 4 * 4; // 3x 4x4 matrix of 4 byte floats
		while (this.uniformBuffers.length < count) {
			this.uniformBuffers.push(this.ctx.device.createBuffer({
				label: `Speccy Render Uniform Buffer ${this.uniformBuffers.length}`,
				size: uniformSize,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
				mappedAtCreation: false,
			}));
		}
	}

	drawEntities(gbuffer: GBuffer, camera: Camera, entities: Array<Entity>) {
		const { device, size } = this.ctx;
		this.allocateUniforms(entities.length);

		// Update camera uniform
		camera.aspect = size[0] / size[1];
		const cam = camera.model;
		const proj = camera.projection;

		const inkDepthView = gbuffer.inkDepth.createView();
		const paperDepthView = gbuffer.paperDepth.createView();
		const clearValue = { r: 0.0, g: 0.0, b: 0.0, a: 0.0 };
		const skyFg = { r: 0.5, g: 0.5, b: 0.7, a: 0.0 };
		const skyBg = { r: 0.3, g: 0.3, b: 0.6, a: 0.5 };
		const encoder = device.createCommandEncoder();

		let loadOp: GPULoadOp = 'clear';
		for (let i = 0; i < entities.length; i++) {
			const { transform, mesh } = entities[i];

			device.queue.writeBuffer(this.uniformBuffers[i], 0, new Float32Array([...transform, ...cam, ...proj]));
			const inkBindGroup = device.createBindGroup({
				label: 'Speccy Render Ink Bind Group',
				layout: this.inkPipeline.getBindGroupLayout(0),
				entries: [{
					binding: 0,
					resource: {
						buffer: this.uniformBuffers[i],
					}
				}]
			});

			const paperBindGroup = device.createBindGroup({
				label: 'Speccy Render Paper Bind Group',
				layout: this.paperPipeline.getBindGroupLayout(0),
				entries: [{
					binding: 0,
					resource: {
						buffer: this.uniformBuffers[i],
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
				renderPass.setVertexBuffer(0, mesh.buffers.position);
				renderPass.setVertexBuffer(1, mesh.buffers.normal);
				renderPass.setVertexBuffer(2, mesh.buffers.fgColor);
				renderPass.setVertexBuffer(3, mesh.buffers.bgColor);
				renderPass.draw(mesh.vertices.length);
				renderPass.end()
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
				renderPass.setVertexBuffer(0, mesh.buffers.position);
				renderPass.setVertexBuffer(1, mesh.buffers.normal);
				renderPass.setVertexBuffer(2, mesh.buffers.fgColor);
				renderPass.setVertexBuffer(3, mesh.buffers.bgColor);
				renderPass.draw(mesh.vertices.length);
				renderPass.end()
			}

			loadOp = 'load';
		}
		device.queue.submit([encoder.finish()]);
	}
}
