import { Context } from './context';

type EveryKey<V> = {
	[K in keyof V]: K;
}[keyof V];

/**
 * Enforces all properties on a Vertex to be `number` or `Array<number>`
 */
export type Vertex<T> = {
	[K in keyof T]: T[K] extends (Array<number> | number) ? T[K] : never;
}

/**
 * Converts all `Array<number>` properties on `T` into `Float32Array`
 */
export type VertexArrays<T> = {
	[K in keyof T]: T[K] extends Array<number> ? Float32Array : never;
};

/**
 * Convert the Verticies into a map of `Float32Array`. One for each vertex attribute.
 * @return `Float32Array` for each property on `V`
 */
function toTypedArrays<V>(vertices: Array<Vertex<V>>): VertexArrays<V> {
	const vertexCount = vertices.length;
	const proto = vertices[0];
	const fields = Object.keys(proto) as Array<keyof V>;

	const result = {} as VertexArrays<V>;

	// Create empty arrays
	for (const key of fields) {
		const prop = proto[key];
		if (!prop) continue;
		const attribSize = prop instanceof Array ? prop.length : 1;
		const data = new Float32Array(attribSize * vertexCount);
		result[key] = data as any;
	}

	// Copy data into arrays
	for (let i = 0; i < vertices.length; i++) {
		const vertex = vertices[i];
		for (const key of fields) {
			const prop = vertex[key];
			if (!prop) continue;
			const data = result[key];
			if (prop instanceof Array) {
				const attribSize = prop.length;
				data.set(new Float32Array(prop), i * attribSize);
			} else if (typeof prop === 'number') {
				data.set([prop], i);
			}
		}
	}

	return result;
}

/**
 * Convert the Mesh into a single `ArrayBuffer`, each vertex attribute is interleaved.
 * Assumes all numbers are floats
 * @return ArrayBuffer Vertex attribute data as bytes
 */
function toArrayBuffer<V extends Vertex<V>>(vertices: Array<V>, attributes: Array<keyof V>): Float32Array {
	if (vertices.length === 0) return new Float32Array();

	let vertexSize = 0;
	const proto = vertices[0];
	for (const key of attributes) {
		const prop = proto[key];
		if (prop instanceof Array) {
			vertexSize += prop.length;
		}
		else {
			vertexSize += 1;
		}
	}
	const size = vertexSize * vertices.length;
	const data = new Float32Array(size);

	// Copy data into array
	let offset = 0;
	for (let i = 0; i < vertices.length; i++) {
		const vertex = vertices[i];
		for (const key of attributes) {
			const prop = vertex[key];
			if (!prop) continue;

			if (prop instanceof Array) {
				data.set(prop, offset);
				offset += prop.length;
			} else if (typeof prop === 'number') {
				data.set([prop], offset);
				offset += 1;
			}

		}
	}

	return data;
}


/**
 * Collection of Vertices representing some kind of 3D geometry.
 * @typeParm V - Type of the vertices in this mesh
 */
export class Mesh<V extends Vertex<V>> {
	ctx: Context;
	vertices: Array<V>;
	buffers: Record<keyof V, GPUBuffer>;

	/**
	 * @param vertices Array of Vertices
	 * @param attributes Array of the attributes on each Vertex, in the order they appear in the vertex shader
	 */
	constructor(ctx: Context, vertices: Array<V>) {
		this.ctx = ctx;
		const { device } = ctx;
		if (vertices.length < 1) {
			throw new Error('Mesh must have at least 1 vertex');
		}
		const keys = Object.keys(vertices[0]).sort() as Array<keyof V>;
		const data = toTypedArrays(vertices);
		const buffers = keys.reduce((acc, key) => {
			const attrData = data[key];
			const buffer = device.createBuffer({
				label: `Attribute Buffer '${key.toString()}'`,
				size: attrData.byteLength,
				usage: GPUBufferUsage.VERTEX,
				mappedAtCreation: true
			});
			new Float32Array(buffer.getMappedRange()).set(attrData);
			buffer.unmap();
			acc[key] = buffer;
			return acc;
		}, {} as Record<keyof V, GPUBuffer>);


		this.vertices = vertices;
		this.buffers = buffers;
	}

	/**
	 * Convert the Mesh into a map of `Float32Array`. One for each vertex attribute.
	 * @return `Float32Array` for each property on `V`
	 */
	toTypedArrays(): VertexArrays<V> {
		return toTypedArrays(this.vertices);
	}
}
