import { Context } from './context';
import { Point3 } from './math';

export type Line = [Point3, Point3];

export class LineMesh {
	ctx: Context;
	lines: Array<Line>;
	buffer: GPUBuffer;

	constructor(ctx: Context, lines: Array<Line>) {
		this.ctx = ctx;
		this.lines = [...lines];

		this.buffer = ctx.device.createBuffer({
			label: 'Line Buffer',
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			size: lines.length * this.stride * 4,
			mappedAtCreation: false,
		});
		this.writeAll();
	}

	get lineCount(): number {
		return this.lines.length;
	}

	get stride(): number {
		return 4 * 5;  // Each field is aligned to 32 bytes (4x floats)
	}

	writeAll() {
		const { lines, stride, ctx } = this;
		const data = new Float32Array(this.lines.length * stride);

		const colors = [
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
		];

		const thickness = 4;
		for (let i = 0; i < lines.length; i++) {
			const [start, end] = lines[i];
			const offset = i * stride;
			data.set(new Float32Array([
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
			]), offset);
		}

		ctx.device.queue.writeBuffer(this.buffer, 0, data);
	}
}
