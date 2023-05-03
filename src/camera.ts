import { Matrix4, Plane, Point3, Vector3 } from "./math";
import { inverse, perspective, translation } from "./math/transform";
import { add, dot, normalize, reflect, scale, subtract } from "./math/vectors";

/**
 * A camera in 3D space */
export class Camera {
	position: Point3 = [0.0, 0.0, 0.0];
	forward: Vector3 = [0.0, 0.0, -1.0];
	up: Vector3 = [0.0, 1.0, 0.0];

	/**
	 * Reflect the camera in a mirror
	 * @param plane Plane of the mirror to be reflected in
	 * @returns Camera A new {@link Camera} positioned as if it was the reflection in a mirror
	 */
	reflect(plane: Plane): Camera {
		const reflection = new Camera();
		reflection.position = reflect(this.position, plane);
		reflection.forward = reflect(this.forward, [[0, 0, 0], plane[1]]);
		reflection.up = reflect(this.up, [[0, 0, 0], plane[1]]);
		return reflection;
	}

	/**
	 * Move the camera relative to its current position
	 * @param direction Direction and amount to move the camera
	 */
	translate(direction: Vector3) {
		this.position = add(this.position, direction);
	}

	view(): Matrix4 {
		return inverse(translation(...this.position))!;
	}

	projection(aspect: number = 1.0): Matrix4 {
		return perspective(aspect, 45.0, 1.0, 1000.0);
	}
}
