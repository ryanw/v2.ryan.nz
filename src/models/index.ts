import { Point3, Vector3 } from '../math';
import { cross, normalize, subtract } from '../math/vectors';
export { buildQuad } from './quad';
export { buildIcosahedron } from './icosahedron';

export interface BaseVertex {
	position: Point3;
	normal: Vector3;
}
export function calculateNormals<T extends BaseVertex>(vertices: Array<T>) {
	for (let i = 0; i < vertices.length; i += 3) {
		const { position: p0 } = vertices[i + 0];
		const { position: p1 } = vertices[i + 1];
		const { position: p2 } = vertices[i + 2];

		const a = subtract(p1, p0);
		const b = subtract(p2, p0);

		const normal = normalize(cross(a, b));
		vertices[i + 0].normal = [...normal];
		vertices[i + 1].normal = [...normal];
		vertices[i + 2].normal = [...normal];
	}
}
