import { Context, Mesh, Vertex } from 'engine';
import { Point3 } from 'engine/math';

export interface Chunk<V extends Vertex<V>> {
	mesh: Mesh<V>;
}

export class Terrain<V extends Vertex<V>> {
	ctx: Context;
	builder: (position: Point3, i: number) => V;
	chunkSize: number;

	constructor(ctx: Context, chunkSize: number, builder: (position: Point3, i: number) => V) {
		this.ctx = ctx;
		this.chunkSize = chunkSize;
		this.builder = builder;
	}

	generateChunk(x: number, y: number): Chunk<V> {
		const c = this.chunkSize * 2 + 2;
		const offset = [x * c, y * c];
		const divisions = this.chunkSize;
		const d = divisions / 2;
		const s = 1.0;//1.0 / divisions;

		const vertices: Array<V> = [];

		for (let y = -d; y <= d; y++) {
			for (let x = -d; x <= d; x++) {
				const sx = (s * 2) * x + offset[0] * s;
				const sy = (s * 2) * y + offset[1] * s;

				const quad: Array<Point3> = [
					[sx + -s, 0, sy + s],
					[sx + s, 0, sy + -s],
					[sx + -s, 0, sy + -s],

					[sx + s, 0, sy + s],
					[sx + s, 0, sy + -s],
					[sx + -s, 0, sy + s],
				];

				vertices.push(...quad.map(this.builder));
			}
		}
		return {
			mesh: new Mesh(this.ctx, vertices),
		}
	}
}

