import { Camera } from '../camera';
import { Context } from '../context';
import { Matrix4, Point2, Point3, Size2, Vector3 } from '../math';
import { identity, perspective, rotation, translation } from '../math/transform';
import { Mesh } from '../mesh';
import { Pipeline } from '../pipeline';
import SHADER_SOURCE from './wireframe.wgsl';

export interface WireVertex {
	position: Point3;
	barycentric: Point3;
	normal: Vector3;
	uv: Point2;
}


export class WireframePipeline extends Pipeline {
	private size: Size2 = [0, 0];
	private pipeline: GPURenderPipeline;
	private uniformBuffer: GPUBuffer;
	private depthTexture: GPUTexture;

	constructor(ctx: Context) {
		super(ctx);
		const { device, format } = ctx;
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
			}
		];

		const uniformSize = 3 * 4 * 4 * 4; // 3x 4x4 matrix of 4 byte floats
		this.uniformBuffer = device.createBuffer({
			label: 'Wireframe Render Uniform Buffer',
			size: uniformSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			mappedAtCreation: false,
		});

		this.depthTexture = device.createTexture({
			size: this.ctx.size,
			format: 'depth32float',
			usage: GPUTextureUsage.RENDER_ATTACHMENT,
		});


		const module = device.createShaderModule({ code: SHADER_SOURCE });
		this.pipeline = device.createRenderPipeline({
			label: 'Wireframe Render Pipeline',
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main', buffers: vertexBuffers },
			fragment: { module, entryPoint: 'fs_main', targets: [{ format }] },
			primitive: { topology: 'triangle-list' },
			depthStencil: {
				format: 'depth32float',
				depthWriteEnabled: true,
				depthCompare: 'less',
			},
		});
	}

	draw(view: GPUTextureView, camera: Camera, transform: Matrix4, mesh: Mesh<WireVertex>, clear: boolean = false) {
		this.updateSize();
		const { device, size } = this.ctx;

		const depthView = this.depthTexture.createView();
		const clearValue = { r: 0.0, g: 0.0, b: 0.0, a: 0.0 };
		const encoder = device.createCommandEncoder();
		const renderPass = encoder.beginRenderPass({
			colorAttachments: [
				{ view, clearValue, loadOp: clear ? 'clear' : 'load', storeOp: 'store' }
			],
			depthStencilAttachment: {
				view: depthView,
				depthClearValue: 1.0,
				depthLoadOp: clear ? 'clear' : 'load',
				depthStoreOp: 'store',
			}
		});

		// Update camera uniform
		const cam = camera.model();
		const proj = camera.projection(size[0] / size[1]);
		device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([...transform, ...cam, ...proj]));

		const bindGroup = device.createBindGroup({
			label: 'Wireframe Render Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [{
				binding: 0,
				resource: {
					buffer: this.uniformBuffer,
				}
			}]
		});

		renderPass.setPipeline(this.pipeline);
		renderPass.setBindGroup(0, bindGroup);
		renderPass.setVertexBuffer(0, mesh.buffers.position);
		renderPass.setVertexBuffer(1, mesh.buffers.barycentric);
		renderPass.setVertexBuffer(2, mesh.buffers.uv);
		renderPass.setVertexBuffer(3, mesh.buffers.normal);
		renderPass.draw(mesh.vertices.length);
		renderPass.end();
		device.queue.submit([encoder.finish()]);
	}

	updateSize() {
		const { ctx: { device, size } } = this;

		if (this.size[0] === size[0] && this.size[1] === size[1]) {
			return;
		}
		this.size = [size[0], size[1]];
		this.depthTexture = device.createTexture({
			size: this.ctx.size,
			format: 'depth32float',
			usage: GPUTextureUsage.RENDER_ATTACHMENT,
		});
	}
}
