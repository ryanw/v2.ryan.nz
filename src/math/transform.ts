import { Matrix4, Point3, Point4, Vector3, Vector4 } from '.';
import * as vec from './vectors';
import { cross, dot, normalize } from './vectors';

export type Columns = [Vector4, Vector4, Vector4, Vector4];
export type Rows = [Vector4, Vector4, Vector4, Vector4];

export function identity(): Matrix4 {
	return [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1,
	];
}

export function columns(m: Matrix4): Columns {
	return [
		m.slice(0, 4),
		m.slice(4, 8),
		m.slice(8, 12),
		m.slice(12, 16),
	] as Columns;
}

export function matrixToRows(m: Matrix4): Rows {
	const cols = columns(m);
	const rows = [...cols];
	for (let i = 0; i < rows.length; i++) {
		rows[i] = [
			cols[0][i],
			cols[1][i],
			cols[2][i],
			cols[3][i],
		]
	}

	return rows as Rows;
}

export function translation(x: number, y: number, z: number): Matrix4 {
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

	const rotx: Matrix4 = [
		1, 0, 0, 0,
		0, cx, sx, 0,
		0, -sx, cx, 0,
		0, 0, 0, 1,
	];

	const roty: Matrix4 = [
		cy, 0, -sy, 0,
		0, 1, 0, 0,
		sy, 0, cy, 0,
		0, 0, 0, 1,
	];

	const rotz: Matrix4 = [
		cz, sz, 0, 0,
		-sz, cz, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1,
	];

	return multiply(rotz, roty, rotx);
}

export function scaling(x: number, y: number = x, z: number = x): Matrix4 {
	return [
		x, 0, 0, 0,
		0, y, 0, 0,
		0, 0, z, 0,
		0, 0, 0, 1,
	];
}

export function perspective(aspect: number, fovDegrees: number, near: number, far: number): Matrix4 {
	const fov = fovDegrees * (Math.PI / 180);
	const f = 1.0 / Math.tan(fov / 2.0);
	const range = 1.0 / (near - far);

	const x = f / aspect;
	const y = f;
	const z = (near + far) * range;
	const w = near * far * range * 2;
	return [
		x, 0, 0, 0,
		0, y, 0, 0,
		0, 0, z, w,
		0, 0, -1, 0,
	];
}

export function addMatrix(...mats: Array<Matrix4>): Matrix4 {
	let result: Matrix4 = [...mats[0]];
	for (let i = 1; i < mats.length; i++) {
		for (let j = 0; j < 16; j++) {
			result[j] += mats[i][j];
		}
	}
	return result;
}

export function multiply(...mats: Array<Matrix4>): Matrix4 {
	let result = mats[0];
	for (let i = 1; i < mats.length; i++) {
		const cols = columns(mats[i]);
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

export function determinant(m: Matrix4): number {
	const [
		m00, m01, m02, m03,
		m10, m11, m12, m13,
		m20, m21, m22, m23,
		m30, m31, m32, m33,
	] = m;

	const det =
		(m00 * m11 * m22 * m33) -
		(m00 * m11 * m23 * m32) +
		(m00 * m12 * m23 * m31) -
		(m00 * m12 * m21 * m33) +

		(m00 * m13 * m21 * m32) -
		(m00 * m13 * m22 * m31) -
		(m01 * m12 * m23 * m30) +
		(m01 * m12 * m20 * m33) -

		(m01 * m13 * m20 * m32) +
		(m01 * m13 * m22 * m30) -
		(m01 * m10 * m22 * m33) +
		(m01 * m10 * m23 * m32) +

		(m02 * m13 * m20 * m31) -
		(m02 * m13 * m21 * m30) +
		(m02 * m10 * m21 * m33) -
		(m02 * m10 * m23 * m31) +

		(m02 * m11 * m23 * m30) -
		(m02 * m11 * m20 * m33) -
		(m03 * m10 * m21 * m32) +
		(m03 * m10 * m22 * m31) -

		(m03 * m11 * m22 * m30) +
		(m03 * m11 * m20 * m32) -
		(m03 * m12 * m20 * m31) +
		(m03 * m12 * m21 * m30);

	return det;
}

export function inverse(m: Matrix4): Matrix4 | null {
	// ¯\_(ツ)_/¯

	const inv = identity();
	const det = determinant(m);
	if (det === 0) return null;

	const d = 1.0 / det;

	const b0 = (m[2] * m[7]) - (m[6] * m[3]);
	const b1 = (m[2] * m[11]) - (m[10] * m[3]);
	const b2 = (m[14] * m[3]) - (m[2] * m[15]);
	const b3 = (m[6] * m[11]) - (m[10] * m[7]);
	const b4 = (m[14] * m[7]) - (m[6] * m[15]);
	const b5 = (m[10] * m[15]) - (m[14] * m[11]);

	const a0 = (m[0] * m[5]) - (m[4] * m[1]);
	const a1 = (m[0] * m[9]) - (m[8] * m[1]);
	const a2 = (m[12] * m[1]) - (m[0] * m[13]);
	const a3 = (m[4] * m[9]) - (m[8] * m[5]);
	const a4 = (m[12] * m[5]) - (m[4] * m[13]);
	const a5 = (m[8] * m[13]) - (m[12] * m[9]);

	const d11 = (m[5] * b5) + (m[9] * b4) + (m[13] * b3);
	const d12 = (m[1] * b5) + (m[9] * b2) + (m[13] * b1);
	const d13 = (m[1] * -b4) + (m[5] * b2) + (m[13] * b0);
	const d14 = (m[1] * b3) + (m[5] * -b1) + (m[9] * b0);

	const d21 = (m[4] * b5) + (m[8] * b4) + (m[12] * b3);
	const d22 = (m[0] * b5) + (m[8] * b2) + (m[12] * b1);
	const d23 = (m[0] * -b4) + (m[4] * b2) + (m[12] * b0);
	const d24 = (m[0] * b3) + (m[4] * -b1) + (m[8] * b0);

	const d31 = (m[7] * a5) + (m[11] * a4) + (m[15] * a3);
	const d32 = (m[3] * a5) + (m[11] * a2) + (m[15] * a1);
	const d33 = (m[3] * -a4) + (m[7] * a2) + (m[15] * a0);
	const d34 = (m[3] * a3) + (m[7] * -a1) + (m[11] * a0);

	const d41 = (m[6] * a5) + (m[10] * a4) + (m[14] * a3);
	const d42 = (m[2] * a5) + (m[10] * a2) + (m[14] * a1);
	const d43 = (m[2] * -a4) + (m[6] * a2) + (m[14] * a0);
	const d44 = (m[2] * a3) + (m[6] * -a1) + (m[10] * a0);

	inv[0] = d11 * d;
	inv[4] = -(d21 * d);
	inv[8] = d31 * d;
	inv[12] = -(d41 * d);

	inv[1] = -(d12 * d);
	inv[5] = d22 * d;
	inv[9] = -(d32 * d);
	inv[13] = d42 * d;

	inv[2] = d13 * d;
	inv[6] = -(d23 * d);
	inv[10] = d33 * d;
	inv[14] = -(d43 * d);

	inv[3] = -(d14 * d);
	inv[7] = d24 * d;
	inv[11] = -(d34 * d);
	inv[15] = d44 * d;

	return inv;
}

export function matrixFromVector(vec: Vector3): Matrix4 {
	const unit: Vector3 = [0, 0, 1];
	const angle = Math.acos(dot(unit, vec));
	const c = Math.cos(angle);
	const s = Math.sin(angle);
	const t = 1 - c;

	const [x, y, z] = cross(unit, vec);
	return [
		t * x * x + c,
		t * x * y - z * s,
		t * x * z + y * s,
		0,

		t * x * y + z * s,
		t * y * y + c,
		t * y * z - x * s,
		0,

		t * x * z - y * s,
		t * y * z + x * s,
		t * z * z + c,
		0,

		0,
		0,
		0,
		1
	]
}
