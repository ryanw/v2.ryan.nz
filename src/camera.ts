import { Matrix4, Plane, Point3, Vector3 } from "./math";
import { inverse, multiply, perspective, rotation, scaling, translation } from "./math/transform";
import { add, cross, reflect, } from "./math/vectors";

/**
 * A camera in 3D space
 */
export class Camera {
	position: Point3 = [0.0, 0.0, 0.0];
	forward: Vector3 = [0.0, 0.0, -1.0];
	up: Vector3 = [0.0, 1.0, 0.0];
	scale: Vector3 = [1.0, 1.0, 1.0];

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
		reflection.scale = [-1.0, -1.0, 1.0];
		return reflection;
	}

	/**
	 * Move the camera relative to its current position
	 * @param direction Direction and amount to move the camera
	 */
	translate(direction: Vector3) {
		this.position = add(this.position, direction);
	}

	/**
	 * Return the camera's rotation in Euler angles
	 * @returns number[] Values for [pitch, yaw, roll]
	 */
	eulerRotation(): [number, number, number] {
		const { up, forward } = this;
		const right = cross(up, forward);
		const pitch = Math.asin(forward[1])
		const yaw = Math.atan2(forward[0], forward[2])
		const roll = Math.atan2(right[1], up[1])
		return [pitch, yaw, roll];
	}

	view(): Matrix4 {
		const rot = rotation(...this.eulerRotation());
		const tra = translation(...this.position);
		const sca = scaling(...this.scale);
		const view = multiply(sca, multiply(rot, tra));
		return inverse(view)!;
	}

	projection(aspect: number = 1.0): Matrix4 {
		return perspective(aspect, 45.0, 1.0, 1000.0);
	}
}
