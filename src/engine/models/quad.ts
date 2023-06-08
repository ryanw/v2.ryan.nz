import { Point3 } from '../math';

const QUAD_VERTS: Array<Point3> = [
	[-1.0, -1.0, 0.0],
	[1.0, -1.0, 0.0],
	[-1.0, 1.0, 0.0],

	[1.0, -1.0, 0.0],
	[1.0, 1.0, 0.0],
	[-1.0, 1.0, 0.0],
];

export function buildQuad<T>(callback: (position: Point3, index: number) => T): Array<T> {
	return QUAD_VERTS.map(callback);
}
