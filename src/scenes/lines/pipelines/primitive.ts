import { Camera, Color, Context, Pipeline, createTexture } from 'engine';
import { Matrix4, Point2, Point3, Vector2 } from 'engine/math';
import SHADER_SOURCE from './primitive.wgsl';

export type Line = [Point3, Point3];

export enum LineStyle {
	Solid = 0,
}

export interface LineInstance {
	start: Point3,
	end: Point3,
	color: Color,
	style: LineStyle,
	size: Vector2,
}

export interface LineVertex {
	position: Point3,
	uv: Point2,
}


export class PrimitivePipeline extends Pipeline {
	private pipeline: GPURenderPipeline;
	private cameraBuffer: GPUBuffer;
	private lineBuffer: GPUBuffer;
	private cameraBindGroup: GPUBindGroup;
	private lineBindGroup: GPUBindGroup;
	private depthBuffer: GPUTexture;

	constructor(ctx: Context, format?: GPUTextureFormat) {
		super(ctx);

		const { device } = ctx;
		const module = device.createShaderModule({
			label: 'Line Primitive Shader Module',
			code: SHADER_SOURCE,
		});

		this.pipeline = device.createRenderPipeline({
			label: 'Line Primitive Pipeline',
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main', buffers: [] },
			fragment: {
				module,
				entryPoint: 'fs_main',
				targets: [{
					format: format || ctx.format,
					blend: {
						color: {
							srcFactor: 'src-alpha',
							dstFactor: 'one-minus-src-alpha',
							operation: 'add',
						},
						alpha: {
							srcFactor: 'one',
							dstFactor: 'one',
							operation: 'add',
						},
					}
				}]
			},
			primitive: { topology: 'triangle-strip' },
			depthStencil: {
				format: 'depth16unorm',
				depthWriteEnabled: false,
				depthCompare: 'less',
			},
		});

		this.depthBuffer = createTexture(ctx, 'depth16unorm');

		this.cameraBuffer = device.createBuffer({
			label: 'PrimitivePipeline Camera Buffer',
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			size: 256,
			mappedAtCreation: false,
		});

		this.lineBuffer = device.createBuffer({
			label: 'PrimitivePipeline Line Buffer',
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			// FIXME make dynamic
			size: 134217728, // 128MB
			mappedAtCreation: false,
		});

		this.cameraBindGroup = device.createBindGroup({
			label: 'PrimitivePipeline Camera Bind Group',
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [{ binding: 0, resource: { buffer: this.cameraBuffer } }],
		});

		this.lineBindGroup = device.createBindGroup({
			label: 'PrimitivePipeline Line Bind Group',
			layout: this.pipeline.getBindGroupLayout(1),
			entries: [{ binding: 0, resource: { buffer: this.lineBuffer } }],
		});
	}

	drawLines(encoder: GPUCommandEncoder, texture: GPUTexture, lines: Array<Line>, transform: Matrix4, camera: Camera) {
		const { device } = this.ctx;
		if (lines.length === 0) {
			return;
		}

		const { width, height } = texture;

		if (width !== this.depthBuffer.width || height !== this.depthBuffer.height) {
			this.depthBuffer = createTexture(this.ctx, 'depth16unorm', [width, height], 'PrimitivePipeline Depth Buffer');
		}

		const depthView = this.depthBuffer.createView();

		const view = texture.createView();

		// Update camera uniform
		device.queue.writeBuffer(this.cameraBuffer, 0, new Float32Array([
			...transform,
			...camera.model,
			...camera.projection,
			width, height
		]));

		// FIXME invent something to store structs in typed arrays
		device.queue.writeBuffer(this.lineBuffer, 0, linesToBuffer(lines));

		const passDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{
					view,
					clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
					loadOp: 'clear',
					storeOp: 'store',
				},
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
		pass.setBindGroup(0, this.cameraBindGroup);
		pass.setBindGroup(1, this.lineBindGroup);
		pass.draw(4, lines.length);
		pass.end();
	}
}

function linesToBuffer(lines: Array<Line>): Float32Array {
	const stride = 4 * 5;  // Each field is aligned to 32 bytes (4x floats)
	const output = new Float32Array(lines.length * stride);

	const colors = [
		[14.0, 12.0, 0.0, 1.0],
		/*
		[1.0, 0.0, 0.0, 1.0],
		[1.0, 0.5, 0.0, 1.0],
		[1.0, 1.0, 0.0, 1.0],
		[0.5, 1.0, 0.0, 1.0],
		[0.0, 1.0, 0.0, 1.0],

		[0.0, 1.0, 0.5, 1.0],
		[0.0, 1.0, 1.0, 1.0],
		[0.0, 0.5, 1.0, 1.0],
		[0.0, 0.0, 1.0, 1.0],

		[0.5, 0.0, 1.0, 1.0],
		[1.0, 0.0, 0.5, 1.0],
		*/
	];

	const thickness = 16;
	for (let i = 0; i < lines.length; i++) {
		const [start, end] = lines[i];
		const offset = i * stride;
		output.set(new Float32Array([
			// start: vec3<f32>,
			...start, 0,

			// end: vec3<f32>,
			...end, 0,

			// size: vec2<f32>,
			thickness, thickness, 0, 0,

			// color: vec4<f32>,
			...colors[i % colors.length],

			// style: u32,
			1.0,   // FIXME this needs to be an integer
			//performance.now() / 1000.0,
		]), offset);
	}
	return output;
}
