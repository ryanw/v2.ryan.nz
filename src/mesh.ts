/**
 * Enforces all properties on a Vertex to be `Array<number>`
 */
export type Vertex<T> = {
	[K in keyof T]: T[K] extends Array<number> ? Array<number> : never;
}

/**
 * Converts all `Array<number>` properties on `T` into `Float32Array`
 */
export type VertexArrays<T> = {
	[K in keyof T]: T[K] extends Array<number> ? Float32Array : never;
};

/**
 * Collection of Vertices representing some kind of 3D geometry.
 * @typeParm V - Type of the vertices in this mesh
 */
export class Mesh<V extends Vertex<V>> {
	vertices: Array<V>;

	/**
	 * @param vertices At least 1 vertex
	 */
	constructor(vertices: Array<V>) {
		if (vertices.length < 1) {
			throw 'Mesh must have at least 1 vertex';
		}
		this.vertices = vertices;
	}

	/**
	 * Convert the Mesh into a map of `Float32Array`. One for each vertex attribute.
	 * @return `Float32Array` for each property on `V`
	 */
	toTypedArrays(): VertexArrays<V> {
		const vertexCount = this.vertices.length;
		const proto = this.vertices[0];
		const fields = Object.keys(proto) as Array<keyof V>;

		const result = {} as VertexArrays<V>;

		// Create empty arrays
		for (const key of fields) {
			const prop = proto[key];
			if (!prop) continue;
			const attribSize = prop.length;
			const data = new Float32Array(attribSize * vertexCount);
			result[key] = data as any;
		}

		// Copy data into arrays
		for (let i = 0; i < this.vertices.length; i++) {
			const vertex = this.vertices[i];
			for (const key of fields) {
				const prop = vertex[key];
				if (!prop) continue;
				const attribSize = prop.length;
				const data = result[key];
				data.set(new Float32Array(prop), i * attribSize);
			}
		}

		return result;
	}
}
