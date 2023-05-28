import { Camera } from '../camera';
import { Context } from '../context';
import { Matrix4, Point2, Point3 } from '../math';
import { identity, perspective, rotation, translation } from '../math/transform';
import { Mesh } from '../mesh';
import { Pipeline } from '../pipeline';
import SHADER_SOURCE from './wireframe.wgsl';

export interface WireVertex {
	position: Point3;
	barycentric: Point3;
	uv: Point2;
}


export class WireframePipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private uniformBuffer: GPUBuffer;

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
			}
		];

		const uniformSize = 3 * 4 * 4 * 4; // 3x 4x4 matrix of 4 byte floats
		this.uniformBuffer = device.createBuffer({
			label: 'Wireframe Render Uniform Buffer',
			size: uniformSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			mappedAtCreation: false,
		});

		const module = device.createShaderModule({ code: SHADER_SOURCE });
		this.pipeline = device.createRenderPipeline({
			label: 'Wireframe Render Pipeline',
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main', buffers: vertexBuffers },
			fragment: { module, entryPoint: 'fs_main', targets: [{ format }] },
			primitive: { topology: 'triangle-strip' },
		});
	}

	draw(view: GPUTextureView, camera: Camera, transform: Matrix4, mesh: Mesh<WireVertex>, clear: boolean = false) {
		const { device, size } = this.ctx;

		const clearValue = { r: 0.7, g: 0.0, b: 0.3, a: 1.0 };
		const encoder = device.createCommandEncoder();
		const renderPass = encoder.beginRenderPass({
			colorAttachments: [
				{ view, clearValue, loadOp: clear ? 'clear' : 'load', storeOp: 'store' }
			]
		});

		// Update camera uniform
		const cam = camera.view();
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
		renderPass.draw(mesh.vertices.length);
		renderPass.end();
		device.queue.submit([encoder.finish()]);
	}
}
