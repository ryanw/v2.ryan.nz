import { Context, WireMesh, createTexture } from 'engine';
import { Point3, Vector2 } from 'engine/math';
import { TerrainGenPipeline } from './pipelines/terrain_gen';
import { WireVertex } from 'engine/wire_mesh';

export interface Chunk {
	mesh: WireMesh;
	offset: Vector2;
	heightmap: GPUTexture;
}

export class Terrain {
	ctx: Context;
	chunkSize: number;
	chunkMesh: WireMesh;
	terrainGenPipeline: TerrainGenPipeline;

	constructor(ctx: Context, chunkSize: number, builder: (position: Point3, i: number) => WireVertex) {
		this.ctx = ctx;
		this.chunkSize = chunkSize;
		this.terrainGenPipeline = new TerrainGenPipeline(ctx);

		const divisions = chunkSize;
		const s = 1.0 / divisions;


		const vertices: Array<WireVertex> = [];

		for (let y = 0; y < divisions; y++) {
			for (let x = 0; x < divisions; x++) {
				const sx = (s * 1) * x;
				const sy = (s * 1) * y;

				const quad: Array<Point3> = [
					[sx, 0, sy + s],
					[sx + s, 0, sy],
					[sx, 0, sy],

					[sx + s, 0, sy + s],
					[sx + s, 0, sy],
					[sx, 0, sy + s],
				];

				vertices.push(...quad.map(builder));
			}
		}
		this.chunkMesh = new WireMesh(ctx, vertices);
	}

	generateChunk(x: number, y: number, recycleTexture?: GPUTexture): Chunk {
		const offset: Vector2 = [x, y];
		const res = this.chunkSize;
		const heightmap = recycleTexture || createTexture(this.ctx, 'r32float', [res, res], `Heightmap [${x} x ${y}] Texture`);
		this.ctx.encode(async encoder => this.terrainGenPipeline.run(encoder, [x * (res - 1), y * (res - 1)], heightmap));

		return {
			offset,
			mesh: this.chunkMesh,
			heightmap,
		};
	}
}

