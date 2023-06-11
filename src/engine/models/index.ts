import { Vertex } from 'engine/mesh';
import { Point3, Vector3 } from '../math';
import { cross, normalize, subtract } from '../math/vectors';
export { buildQuad } from './quad';
export { buildIcosahedron } from './icosahedron';

export interface BaseVertex {
	position: Point3;
	normal: Vector3;
}
export function calculateNormals<T extends Vertex<T>>(vertices: Array<T>): Array<T & BaseVertex> {
	const verts = vertices as Array<T & BaseVertex>;
	for (let i = 0; i < verts.length; i += 3) {
		const { position: p0 } = verts[i + 0];
		const { position: p1 } = verts[i + 1];
		const { position: p2 } = verts[i + 2];

		const a = subtract(p1, p0);
		const b = subtract(p2, p0);

		const normal = normalize(cross(a, b));
		verts[i + 0].normal = [...normal];
		verts[i + 1].normal = [...normal];
		verts[i + 2].normal = [...normal];
	}

	return verts;
}
