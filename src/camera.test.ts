import { Camera } from "./camera";
import { Plane } from "./math";

describe('Camera', () => {
	test('reflects its position', () => {
		const camera = new Camera();
		camera.position = [0, 3.45, 0];
		const plane: Plane = [
			// At origin
			[0, 0, 0],
			// Facing up
			[0, 1, 0],
		];
		const reflection = camera.reflect(plane);
		const expected = {
			position: [0, -3.45, 0],
		};
		for (let i = 0; i < 3; i++) {
			expect(reflection.position[i]).toBeCloseTo(expected.position[i], 0.0001);
		}
	});
});
