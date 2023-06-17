import { PHI, Point3 } from '../math';
import { cross, normalize, subtract } from '../math/vectors';

export const ICOSAHEDRON_VERTICES: Array<Point3> = [
	[-1, PHI, 0],
	[1, PHI, 0],
	[-1, -PHI, 0],
	[1, -PHI, 0],
	[0, -1, PHI],
	[0, 1, PHI],
	[0, -1, -PHI],
	[0, 1, -PHI],
	[PHI, 0, -1],
	[PHI, 0, 1],
	[-PHI, 0, -1],
	[-PHI, 0, 1]
];

export const ICOSAHEDRON_TRIS: Array<[number, number, number]> = [
	[0, 11, 5],
	[0, 5, 1],
	[0, 1, 7],
	[0, 7, 10],
	[0, 10, 11],
	[1, 5, 9],
	[5, 11, 4],
	[11, 10, 2],
	[10, 7, 6],
	[7, 1, 8],
	[3, 9, 4],
	[3, 4, 2],
	[3, 2, 6],
	[3, 6, 8],
	[3, 8, 9],
	[4, 9, 5],
	[2, 4, 11],
	[6, 2, 10],
	[8, 6, 7],
	[9, 8, 1],
];

export const ICOSAHEDRON_LINES: Array<[number, number]> = [
	// Top
	[0, 11],
	[0, 5],
	[0, 1],
	[0, 7],
	[0, 10],
	[1, 5],
	[5, 11],
	[11, 10],
	[10, 7],
	[7, 1],

	// Bottom
	[3, 9],
	[3, 4],
	[3, 2],
	[3, 6],
	[3, 8],
	[4, 9],
	[2, 4],
	[6, 2],
	[8, 6],
	[9, 8],

	// Mid
	[1, 9],
	[5, 9],
	[5, 4],
	[11, 4],
	[11, 2],
	[10, 2],
	[10, 6],
	[7, 6],
	[7, 8],
	[1, 8],
];

export function buildIcosahedron<T>(callback: (position: Point3, index: number) => T): Array<T> {
	return ICOSAHEDRON_TRIS.map(
		(tri) => tri.map(
			(v, i) =>
				callback(normalize(ICOSAHEDRON_VERTICES[v]), i)
		)
	).flat();
}
