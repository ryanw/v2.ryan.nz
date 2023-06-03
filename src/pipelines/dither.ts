import { Camera } from '../camera';
import { Context } from '../context';
import { GBuffer } from '../gbuffer';
import { Matrix4, Point2, Point3, Size2, Vector3, Vector4 } from '../math';
import { Mesh } from '../mesh';
import { Pipeline } from '../pipeline';
import SHADER_SOURCE from './dither.wgsl';

export interface Entity {
	transform: Matrix4;
	rotation: Vector3;
	mesh: Mesh<Vertex>;
}

export interface Vertex {
	position: Point3;
	barycentric: Point3;
	normal: Vector3;
	uv: Point2;
	fgColor: Vector4; bgColor: Vector4;
}


export class DitherPipeline extends Pipeline {
	private size: Size2 = [0, 0];
	private pipeline: GPURenderPipeline;
	private uniformBuffer: GPUBuffer;
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
					shaderLocation: 1, // barycentric
					offset: 0,
					format: 'float32x3',
				}],
				arrayStride: 12,
			},
			{
				attributes: [{
					shaderLocation: 2, // uv
					offset: 0,
					format: 'float32x2',
				}],
				arrayStride: 8,
			},
			{
				attributes: [{
					shaderLocation: 3, // normal
					offset: 0,
					format: 'float32x3',
				}],
				arrayStride: 12,
			},
			{
				attributes: [{
					shaderLocation: 4, // fg color
					offset: 0,
					format: 'float32x4',
				}],
				arrayStride: 16,
			},
			{
				attributes: [{
					shaderLocation: 5, // bg color
					offset: 0,
					format: 'float32x4',
				}],
				arrayStride: 16,
			},
		];

		const uniformSize = 3 * 4 * 4 * 4; // 3x 4x4 matrix of 4 byte floats
		this.uniformBuffer = device.createBuffer({
			label: 'Dither Render Uniform Buffer',
			size: uniformSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			mappedAtCreation: false,
		});

		const targets: Array<GPUColorTargetState> = [
			// Colour
			{ format: 'rgba8uint' },
			// Position
			{ format: 'rgba32float' },
			// Normal
			{ format: 'rgba16float' },
		];
		const module = device.createShaderModule({ code: SHADER_SOURCE });
		this.pipeline = device.createRenderPipeline({
			label: 'Dither Render Pipeline',
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main', buffers: vertexBuffers },
			fragment: { module, entryPoint: 'fs_main', targets },
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
				label: `Dither Render Uniform Buffer ${this.uniformBuffers.length}`,
				size: uniformSize,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
				mappedAtCreation: false,
			}));
		}
	}

	drawEntities(gbuffer: GBuffer, camera: Camera, entities: Array<Entity>) {
		this.updateSize();
		const { device, size } = this.ctx;
		this.allocateUniforms(entities.length);

		// Update camera uniform
		camera.aspect = size[0] / size[1];
		const cam = camera.model;
		const proj = camera.projection;

		const depthView = gbuffer.depth.createView();
		const clearValue = { r: 0.0, g: 0.0, b: 0.0, a: 0.0 };
		const skyColor = { r: 0x44, g: 0x66, b: 0xaa, a: 0x0f };
		const encoder = device.createCommandEncoder();

		let loadOp: 'clear' | 'load' = 'clear';
		for (let i = 0; i < entities.length; i++) {
			const { transform, mesh } = entities[i];
			const renderPass = encoder.beginRenderPass({
				colorAttachments: [
					{ view: gbuffer.albedo.createView(), clearValue: skyColor, loadOp, storeOp: 'store' },
					{ view: gbuffer.position.createView(), clearValue, loadOp, storeOp: 'store' },
					{ view: gbuffer.normal.createView(), clearValue, loadOp, storeOp: 'store' },
				],
				depthStencilAttachment: {
					view: depthView,
					depthClearValue: 1.0,
					depthLoadOp: loadOp,
					depthStoreOp: 'store',
				}
			});
			loadOp = 'load';

			device.queue.writeBuffer(this.uniformBuffers[i], 0, new Float32Array([...transform, ...cam, ...proj]));


			const bindGroup = device.createBindGroup({
				label: 'Dither Render Bind Group',
				layout: this.pipeline.getBindGroupLayout(0),
				entries: [{
					binding: 0,
					resource: {
						buffer: this.uniformBuffers[i],
					}
				}]
			});

			renderPass.setPipeline(this.pipeline);
			renderPass.setBindGroup(0, bindGroup);
			renderPass.setVertexBuffer(0, mesh.buffers.position);
			renderPass.setVertexBuffer(1, mesh.buffers.barycentric);
			renderPass.setVertexBuffer(2, mesh.buffers.uv);
			renderPass.setVertexBuffer(3, mesh.buffers.normal);
			renderPass.setVertexBuffer(4, mesh.buffers.fgColor);
			renderPass.setVertexBuffer(5, mesh.buffers.bgColor);
			renderPass.draw(mesh.vertices.length);
			renderPass.end();
		}
		device.queue.submit([encoder.finish()]);
	}

	updateSize() {
		const { ctx: { device, size } } = this;

		if (this.size[0] === size[0] && this.size[1] === size[1]) {
			return;
		}
		this.size = [size[0], size[1]];
	}
}
