import { Matrix4, Plane, Point3, Vector3, Vector4 } from './math';
import { transformPoint } from './math/transform';
import { inverse, multiply, multiplyVector, perspective, rotation, scaling, translation } from './math/transform';
import { add, cross, reflect, } from './math/vectors';

/**
 * A camera in 3D space
 */
export class Camera {
	position: Point3 = [0.0, 1.0, 0.0];
	rotation: Vector3 = [0.0, 0.0, 0.0];
	scaling: Vector3 = [1.0, 1.0, 1.0];

	/**
	 * Move the camera relative to its current position
	 * @param direction Direction and amount to move the camera
	 */
	translate(direction: Vector3) {
		const trans = translation(...direction);
		const rot = multiply(
			rotation(0, 0, this.rotation[2]),
			rotation(0, this.rotation[1], 0),
		);
		const invRot = inverse(rot)!;
		let pos = transformPoint(multiply(trans, invRot), this.position);
		this.position = transformPoint(rot, pos);
	}

	/**
	 * Rotate the camera
	 * @param pitch Pitch in radians
	 * @param yaw Yaw in radians
	 * @param roll Roll in radians
	 */
	rotate(pitch: number, yaw: number) {
		this.rotation[0] += Math.PI * pitch;
		this.rotation[1] += Math.PI * yaw;

		const pad = 0.01;

		if (this.rotation[0] < -Math.PI / 2 + pad) {
			this.rotation[0] = -Math.PI / 2 + pad;
		}
		if (this.rotation[0] > Math.PI / 2 - pad) {
			this.rotation[0] = Math.PI / 2 - pad;
		}
	}

	rotationVector(): Vector3 {
		const model = this.model();
		const vec = multiplyVector(model, [0.0, 0.0, 1.0, 0.0]);
		return [vec[0], vec[1], vec[2]];
	}

	rotationMatrix(): Matrix4 {
		return multiply(
			rotation(0, 0, this.rotation[2]),
			rotation(0, this.rotation[1], 0),
			rotation(this.rotation[0], 0, 0),
		);
	}

	model(): Matrix4 {
		const rot = this.rotationMatrix();
		const tra = translation(...this.position);
		const sca = scaling(...this.scaling);
		const view = multiply(sca, multiply(tra, rot));
		return inverse(view)!;
	}

	projection(aspect: number = 1.0): Matrix4 {
		return perspective(aspect, 45.0, 1.0, 1000.0);
	}
}
