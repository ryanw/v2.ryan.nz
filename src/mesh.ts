export type Vertex<T> = {
	[K in keyof T]: T[K] extends Array<number> ? Array<number> : never;
}

export type VertexArrays<T> = {
	[K in keyof T]: T[K] extends Array<number> ? Float32Array : never;
};

export class Mesh<V extends Vertex<V>> {
	vertices: Array<V>;

	constructor(vertices: Array<V>) {
		if (vertices.length < 1) {
			throw 'Mesh must have at least 1 vertex';
		}
		this.vertices = vertices;
	}

	toTypedArrays(): VertexArrays<V> {
		const vertexCount = this.vertices.length;
		const proto: Vertex<V> = this.vertices[0];
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
