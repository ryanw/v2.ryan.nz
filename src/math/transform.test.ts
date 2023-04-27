import { Matrix4, Point3, Vector4 } from '.';
import { transformPoint, multiply, rotation, multiplyVector, inverse } from './transform';

describe('transform matrix', () => {
	test('multiplying matrices together', () => {
		// prettier-ignore
		const mat1: Matrix4 = [
			1, 0, 4, 0,
			0, 1, 0, 2,
			2, 0, 3, 0,
			0, 7, 1, 2,
		];
		// prettier-ignore
		const mat2: Matrix4 = [
			3, 3, 5, 8,
			7, 1, 4, 5,
			2, 3, 2, 1,
			3, 5, 0, 1
		];

		const result = multiply(mat1, mat2);
		// prettier-ignore
		const expected: Matrix4 = [
			13, 59, 35, 22,
			15, 36, 45, 12,
			 6, 10, 15,  8,
			 3, 12, 13, 12,
		];

		expect(result).toEqual(expected);
	});

	test('transforming a point', () => {
		// prettier-ignore
		const mat: Matrix4 = [
			1, 0, 4, 0,
			0, 1, 0, 2,
			2, 0, 3, 0,
			0, 7, 1, 2
		];
		const point: Point3 = [4, 5, 6];
		const result = transformPoint(mat, point);
		const expected = [1.3333, 1.0, 2.917];

		for (let i = 0; i < 3; i++) {
			expect(result[i]).toBeCloseTo(expected[i], 0.0001);
		}
	});

	test('transforming a vector', () => {
		// prettier-ignore
		const mat: Matrix4 = [
			1, 0, 4, 0,
			0, 1, 0, 2,
			2, 0, 3, 0,
			0, 7, 1, 2
		];
		const v: Vector4 = [4, 5, 6, 1];
		const result = multiplyVector(mat, v);
		expect(result).toEqual([16.0, 12.0, 35.0, 12.0]);
	});

	test('rotating a point', () => {
		const point: Point3 = [4, 5, 6];
		const mat: Matrix4 = rotation(0.0, Math.PI * 0.25, 0.0);
		const result = transformPoint(mat, point);
		const expected: Point3 = [7.071, 5.0, 1.414];

		for (let i = 0; i < 3; i++) {
			expect(result[i]).toBeCloseTo(expected[i], 0.0001);
		}
	});

	test('inverting a matrix', () => {
		// prettier-ignore
		const mat: Matrix4 = [
			3, 7, 2, 3,
			3, 1, 3, 5,
			5, 4, 2, 0,
			8, 5, 1, 1,
		]
		// prettier-ignore
		const expected: Matrix4 = [
			-0.2564, 0.0769, -0.0512, 0.3846,
			0.4102, -0.2371, -0.0320, -0.0448,
			-0.1794, 0.2820, 1.3333, -0.8717,
			0.1794, 0.2884, -0.7628, 0.3012,
		]

		const result = inverse(mat);
		for (let i = 0; i < 16; i++) {
			expect(result[i]).toBeCloseTo(expected[i], 0.0001);
		}
	});
});
