import { Camera, Color, Context, Line, LineMesh, Mesh, Pipeline, WireMesh, createTexture } from 'engine';
import { Matrix4, Point2, Point3, Vector2 } from 'engine/math';
import { GBuffer } from '../gbuffer';
import { Entity } from '..';
import SHADER_SOURCE from './road_render.wgsl';
import { identity, multiply, scaling, translation } from 'engine/math/transform';

export interface Vertex {
	position: Point3,
	normal: Point3,
	barycentric: Point3,
	color: Color,
}

export class RoadRenderPipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private entityBuffer: GPUBuffer;
	private cameraBuffer: GPUBuffer;

	constructor(ctx: Context, format?: GPUTextureFormat) {
		super(ctx);

		const { device } = ctx;
		const module = device.createShaderModule({
			label: 'RoadRenderPipeline Shader Module',
			code: SHADER_SOURCE,
		});

		this.pipeline = device.createRenderPipeline({
			label: 'RoadRenderPipeline',
			layout: 'auto',
			primitive: { topology: 'triangle-strip' },
			vertex: {
				module,
				entryPoint: 'vs_main',
				buffers: [],
			},
			fragment: {
				module,
				entryPoint: 'fs_main',
				targets: [{ format: format || ctx.format }]
			},
			depthStencil: {
				format: 'depth32float',
				depthWriteEnabled: true,
				depthCompare: 'less',
			},
		});

		this.cameraBuffer = device.createBuffer({
			label: 'RoadRenderPipeline Camera Buffer',
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			size: 256,
			mappedAtCreation: false,
		});

		this.entityBuffer = device.createBuffer({
			label: 'RoadRenderPipeline Entity Buffer',
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			size: 64,
			mappedAtCreation: false,
		});
	}

	drawRoad(encoder: GPUCommandEncoder, buffer: GBuffer, camera: Camera) {
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

		const roadWidth = 3.0;
		const roadLength = 2048.0;
		const roadTransform = multiply(
			translation(0.0, 2.0, -roadLength + camera.position[2]),
			scaling(roadWidth, 1.0, roadLength),
		);
		this.ctx.device.queue.writeBuffer(this.entityBuffer, 0, new Float32Array(roadTransform));

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

		const uniformBindGroup = device.createBindGroup({
			label: 'ShapeRenderPipeline Uniform Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.cameraBuffer } },
				{ binding: 1, resource: { buffer: this.entityBuffer } },
			],
		});

		const pass = encoder.beginRenderPass(passDescriptor);
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, uniformBindGroup);
		pass.draw(4);
		pass.end();
	}
}
