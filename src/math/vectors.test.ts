import { Plane, Point3 } from '.';
import { dot, reflect } from './vectors';

describe('vectors', () => {
	test('calculate the dot product', () => {
		const d = dot([4, 7, 2], [8, 3, 8]);
		expect(d).toBe(69);
	});

	test('reflects a point in front of plane', () => {
		const point: Point3 = [0, 3.45, 0];
		const plane: Plane = [
			// At origin
			[0, 0, 0],
			// Facing up
			[0, 1, 0],
		];
		const reflection = reflect(point, plane);
		const expected = [0, -3.45, 0];
		for (let i = 0; i < 3; i++) {
			expect(reflection[i]).toBeCloseTo(expected[i], 0.0001);
		}
	});

	test('reflects a point behind plane', () => {
		const point: Point3 = [0, -3.45, 0];
		const plane: Plane = [
			// At origin
			[0, 0, 0],
			// Facing up
			[0, 1, 0],
		];
		const reflection = reflect(point, plane);
		const expected = [0, 3.45, 0];
		for (let i = 0; i < 3; i++) {
			expect(reflection[i]).toBeCloseTo(expected[i], 0.0001);
		}
	});
});
