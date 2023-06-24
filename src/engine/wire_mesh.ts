import { Color, Mesh } from 'engine';
import { Context } from './context';
import { Point3, Vector3 } from './math';

export type Wire = [Point3, Point3];

export interface WireVertex {
	position: Point3;
	normal: Vector3;
	wireColor: Color;
	faceColor: Color;
}

export class WireMesh extends Mesh<WireVertex> {
	wireBuffer: GPUBuffer;
	wireThickness: number = 2;
	private _wireCount: number = 0;

	constructor(ctx: Context, vertices: Array<WireVertex>) {
		super(ctx, vertices);
		const wires = vertices.reduce((acc: Array<Wire>, vert, i) => {
			switch (i % 3) {
				case 0:
					acc.push([vert.position, vert.position]);
					break;
				case 1:
					acc[acc.length - 1][1] = vert.position;
					break;
				default:
					acc.push([acc[acc.length - 1][1], vert.position]);
					acc.push([vert.position, acc[acc.length - 2][0]]);
					break;
			}
			return acc;
		}, [] as Array<Wire>);

		this.wireBuffer = ctx.device.createBuffer({
			label: 'Wire Buffer',
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			size: wires.length * this.wireStride * 4,
			mappedAtCreation: false,
		});
		this.uploadWireBuffer(wires);
	}

	get wireCount() {
		return this._wireCount;
	}

	get wireStride(): number {
		return 4 * 5;
	}

	private uploadWireBuffer(wires: Array<Wire>) {
		const { wireStride, ctx } = this;
		this._wireCount = wires.length;
		const data = new Float32Array(wires.length * wireStride);

		const colors = [
			[0.5, 1.0, 0.0, 1.0],
			/*
			[0.0, 0.0, 0.0, 1.0],
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

		for (let i = 0; i < wires.length; i++) {
			const [start, end] = wires[i];
			const offset = i * wireStride;
			data.set(new Float32Array([
				// start: vec3<f32>,
				...start, 0,

				// end: vec3<f32>,
				...end, 0,

				// size: vec2<f32>,
				this.wireThickness, this.wireThickness, 0, 0,

				// color: vec4<f32>,
				...colors[i % colors.length],

				// style: u32,
				1.0,   // FIXME this needs to be an integer
			]), offset);
		}

		ctx.device.queue.writeBuffer(this.wireBuffer, 0, data);
	}
}
