import { Matrix4, Point3, Point4, Vector4 } from '.';
import * as vec from './vectors';

export type Columns = [Vector4, Vector4, Vector4, Vector4];

export function identity(): Matrix4 {
	// prettier-ignore
	return [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1,
	];
}

export function columns(m: Matrix4): Columns {
	// prettier-ignore
	return [
		m.slice(0, 4),
		m.slice(4, 8),
		m.slice(8, 12),
		m.slice(12, 16),
	] as Columns;
}

export function translation(x: number, y: number, z: number): Matrix4 {
	// prettier-ignore
	return [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		x, y, z, 1,
	];
}

export function rotation(x: number, y: number, z: number): Matrix4 {
	const [cx, sx] = [Math.cos(x), Math.sin(x)];
	const [cy, sy] = [Math.cos(y), Math.sin(y)];
	const [cz, sz] = [Math.cos(z), Math.sin(z)];

	// prettier-ignore
	const rotx: Matrix4 = [
		1,  0,   0, 0,
		0,  cx, sx, 0,
		0, -sx, cx, 0,
		0,   0,  0, 1,
	];

	// prettier-ignore
	const roty: Matrix4 = [
		cy, 0, -sy, 0,
		 0, 1,   0, 0,
		sy, 0,  cy, 0,
		 0, 0,   0, 1,
	];

	// prettier-ignore
	const rotz: Matrix4 = [
		 cz, sz, 0, 0,
		-sz, cz, 0, 0,
		  0,  0, 1, 0,
		  0,  0, 0, 1,
	];

	return multiply(rotz, roty, rotx);
}

export function scaling(x: number, y: number, z: number): Matrix4 {
	// prettier-ignore
	return [
		x, 0, 0, 0,
		0, y, 0, 0,
		0, 0, z, 0,
		0, 0, 0, 1,
	];
}

export function multiply(...mats: Array<Matrix4>): Matrix4 {
	let result = mats[0];
	for (let i = 1; i < mats.length; i++) {
		const cols = columns(mats[i]);
		// prettier-ignore
		result = [
			...multiplyVector(result, cols[0]),
			...multiplyVector(result, cols[1]),
			...multiplyVector(result, cols[2]),
			...multiplyVector(result, cols[3]),
		];
	}
	return result;
}

export function multiplyVector(m: Matrix4, v: Vector4): Vector4 {
	const [x, y, z, w] = columns(m).map((c, i) => vec.scale(c, v[i]));

	// prettier-ignore
	return [
		x[0] + y[0] + z[0] + w[0],
		x[1] + y[1] + z[1] + w[1],
		x[2] + y[2] + z[2] + w[2],
		x[3] + y[3] + z[3] + w[3],
	];
}

export function transformPoint<P extends Point3 | Point4>(trans: Matrix4, p: P): P {
	const hp = multiplyVector(trans, [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] as Vector4);

	if (p.length > 3) {
		return hp as P;
	} else {
		return [hp[0] / hp[3], hp[1] / hp[3], hp[2] / hp[3]] as P;
	}
}

export function inverse(m: Matrix4): Matrix4 {
	// ¯\_(ツ)_/¯

	const inv = identity();

	inv[0] =
		m[5] * m[10] * m[15] -
		m[5] * m[14] * m[11] -
		m[6] * m[9] * m[15] +
		m[6] * m[13] * m[11] +
		m[7] * m[9] * m[14] -
		m[7] * m[13] * m[10];

	inv[1] =
		-m[1] * m[10] * m[15] +
		m[1] * m[14] * m[11] +
		m[2] * m[9] * m[15] -
		m[2] * m[13] * m[11] -
		m[3] * m[9] * m[14] +
		m[3] * m[13] * m[10];

	inv[2] =
		m[1] * m[6] * m[15] -
		m[1] * m[14] * m[7] -
		m[2] * m[5] * m[15] +
		m[2] * m[13] * m[7] +
		m[3] * m[5] * m[14] -
		m[3] * m[13] * m[6];

	inv[3] =
		-m[1] * m[6] * m[11] +
		m[1] * m[10] * m[7] +
		m[2] * m[5] * m[11] -
		m[2] * m[9] * m[7] -
		m[3] * m[5] * m[10] +
		m[3] * m[9] * m[6];

	inv[4] =
		-m[4] * m[10] * m[15] +
		m[4] * m[14] * m[11] +
		m[6] * m[8] * m[15] -
		m[6] * m[12] * m[11] -
		m[7] * m[8] * m[14] +
		m[7] * m[12] * m[10];

	inv[5] =
		m[0] * m[10] * m[15] -
		m[0] * m[14] * m[11] -
		m[2] * m[8] * m[15] +
		m[2] * m[12] * m[11] +
		m[3] * m[8] * m[14] -
		m[3] * m[12] * m[10];

	inv[6] =
		-m[0] * m[6] * m[15] +
		m[0] * m[14] * m[7] +
		m[2] * m[4] * m[15] -
		m[2] * m[12] * m[7] -
		m[3] * m[4] * m[14] +
		m[3] * m[12] * m[6];

	inv[7] =
		m[0] * m[6] * m[11] -
		m[0] * m[10] * m[7] -
		m[2] * m[4] * m[11] +
		m[2] * m[8] * m[7] +
		m[3] * m[4] * m[10] -
		m[3] * m[8] * m[6];

	inv[8] =
		m[4] * m[9] * m[15] -
		m[4] * m[13] * m[11] -
		m[5] * m[8] * m[15] +
		m[5] * m[12] * m[11] +
		m[7] * m[8] * m[13] -
		m[7] * m[12] * m[9];

	inv[9] =
		-m[0] * m[9] * m[15] +
		m[0] * m[13] * m[11] +
		m[1] * m[8] * m[15] -
		m[1] * m[12] * m[11] -
		m[3] * m[8] * m[13] +
		m[3] * m[12] * m[9];

	inv[10] =
		m[0] * m[5] * m[15] -
		m[0] * m[13] * m[7] -
		m[1] * m[4] * m[15] +
		m[1] * m[12] * m[7] +
		m[3] * m[4] * m[13] -
		m[3] * m[12] * m[5];

	inv[11] =
		-m[0] * m[5] * m[11] +
		m[0] * m[9] * m[7] +
		m[1] * m[4] * m[11] -
		m[1] * m[8] * m[7] -
		m[3] * m[4] * m[9] +
		m[3] * m[8] * m[5];

	inv[12] =
		-m[4] * m[9] * m[14] +
		m[4] * m[13] * m[10] +
		m[5] * m[8] * m[14] -
		m[5] * m[12] * m[10] -
		m[6] * m[8] * m[13] +
		m[6] * m[12] * m[9];

	inv[13] =
		m[0] * m[9] * m[14] -
		m[0] * m[13] * m[10] -
		m[1] * m[8] * m[14] +
		m[1] * m[12] * m[10] +
		m[2] * m[8] * m[13] -
		m[2] * m[12] * m[9];

	inv[14] =
		-m[0] * m[5] * m[14] +
		m[0] * m[13] * m[6] +
		m[1] * m[4] * m[14] -
		m[1] * m[12] * m[6] -
		m[2] * m[4] * m[13] +
		m[2] * m[12] * m[5];

	inv[15] =
		m[0] * m[5] * m[10] -
		m[0] * m[9] * m[6] -
		m[1] * m[4] * m[10] +
		m[1] * m[8] * m[6] +
		m[2] * m[4] * m[9] -
		m[2] * m[8] * m[5];

	let det = m[0] * inv[0] + m[4] * inv[4] + m[8] * inv[8] + m[12] * inv[12];
	if (det == 0) {
		throw new Error('Cannot invert matrix');
	}

	det = 1.0 / det;
	for (let i = 0; i < inv.length; i++) {
		inv[i] *= det;
	}
	return inv;
}
