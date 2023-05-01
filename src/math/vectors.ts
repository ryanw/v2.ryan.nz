import { Vector2, Vector3, Vector4 } from '.';

export function scale<T extends Vector2 | Vector3 | Vector4>(v: T, scale: number): T {
	return v.map((n: number) => n * scale) as T;
}

export function magnitude<T extends number[]>(v: T): number {
	let acc = 0;
	for (const n of v) {
		acc += Math.pow(n, 2);
	}
	return Math.sqrt(acc);
}

export function normalize<T extends number[]>(v: T): T {
	const mag = magnitude(v);
	return v.map(n => n / mag) as T;
}

export function subtract<T extends number[]>(a: T, b: T): T {
	return a.map((n, i) => n - (b[i] || 0)) as T;
}

export function add<T extends number[]>(a: T, b: T): T {
	return a.map((n, i) => n + (b[i] || 0)) as T;
}
