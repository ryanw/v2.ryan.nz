import { Context, WireMesh } from 'engine';
import { Vector2, Vector3 } from 'engine/math';
import { multiply, rotation, transformPoint, translation } from 'engine/math/transform';
import { calculateNormals } from 'engine/models';
import { WireVertex } from 'engine/wire_mesh';

export class CarMesh extends WireMesh {
	constructor(ctx: Context) {
		const vertices = buildDividedCube([2, 3, 6], [2, 1, 4]);
		calculateNormals(vertices);

		super(ctx, vertices);
	}
}

function buildDividedCube([dx, dy, dz]: Vector3, scale: Vector3): Array<WireVertex> {
	const sx = (1.0 / dx) * scale[0];
	const sy = (1.0 / dy) * scale[1];
	const sz = (1.0 / dz) * scale[2];
	const ox = -dx / 2;
	const oy = -dy / 2;
	const oz = -dz / 2;

	let zVerts: Array<WireVertex> = [];
	for (let y = 0; y < dy; y++) {
		for (let x = 0; x < dx; x++) {
			zVerts = zVerts.concat(quad([sx, sy], [ox + x, oy + y]));
		}
	}

	let yVerts: Array<WireVertex> = [];
	for (let z = 0; z < dz; z++) {
		for (let x = 0; x < dx; x++) {
			yVerts = yVerts.concat(quad([sx, sz], [ox + x, oz + z]));
		}
	}

	let xVerts: Array<WireVertex> = [];
	for (let z = 0; z < dz; z++) {
		for (let y = 0; y < dy; y++) {
			xVerts = xVerts.concat(quad([sz, sy], [oz + z, oy + y]));
		}
	}


	let vertices: Array<WireVertex> = [];

	// Near
	for (const vertex of zVerts) {
		vertices.push({
			...vertex,
			position: transformPoint(
				multiply(
					//rotation(0.0, Math.PI, 0.0),
					translation(0.0, 0.0, scale[2] / 2),
				),
				vertex.position
			),
		});
	}

	// Far
	for (const vertex of zVerts) {
		vertices.push({
			...vertex,
			position: transformPoint(
				multiply(
					rotation(0.0, Math.PI, 0.0),
					translation(0.0, 0.0, scale[2] / 2),
				),
				vertex.position
			),
		});
	}

	// Top
	for (const vertex of yVerts) {
		vertices.push({
			...vertex,
			position: transformPoint(
				multiply(
					translation(0.0, scale[1] / 2, 0.0),
					rotation(Math.PI / -2, 0.0, 0.0),
				),
				vertex.position
			),
		});
	}

	// Top
	for (const vertex of yVerts) {
		vertices.push({
			...vertex,
			position: transformPoint(
				multiply(
					translation(0.0, scale[1] / -2, 0.0),
					rotation(Math.PI / -2, 0.0, 0.0),
				),
				vertex.position
			),
		});
	}

	// Right
	for (const vertex of xVerts) {
		vertices.push({
			...vertex,
			position: transformPoint(
				multiply(
					translation(scale[0] / 2, 0.0, 0.0),
					rotation(0.0, Math.PI / 2, 0.0),
				),
				vertex.position
			),
		});
	}

	// Left
	for (const vertex of xVerts) {
		vertices.push({
			...vertex,
			position: transformPoint(
				multiply(
					translation(-scale[0] / 2, 0.0, 0.0),
					rotation(0.0, Math.PI / -2, 0.0),
				),
				vertex.position
			),
		});
	}

	return vertices;
}

function quad(scale: Vector2 = [1, 1], offset: Vector2 = [0, 0]): Array<WireVertex> {
	const vertices: Array<WireVertex> = [];

	const baseTriangle: WireVertex = {
		position: [0.0, 0.0, 0.0],
		normal: [0.0, 0.0, 0.0],
		wireColor: [0.1, 0.9, 0.1, 1.0],
		faceColor: [0.2, 0.4, 0.1, 0.5],
	};

	const [sx, sy] = scale;
	const [ox, oy] = [offset[0] * scale[0], offset[1] * scale[1]];

	vertices.push(
		{ ...baseTriangle, position: [ox, oy + sy, 0.0] },
		{ ...baseTriangle, position: [ox + sx, oy, 0.0] },
		{ ...baseTriangle, position: [ox, oy, 0.0] },

		{ ...baseTriangle, position: [ox + sx, oy + sy, 0.0] },
		{ ...baseTriangle, position: [ox + sx, oy, 0.0] },
		{ ...baseTriangle, position: [ox, oy + sy, 0.0] },
	);

	calculateNormals(vertices);
	return vertices;
}
