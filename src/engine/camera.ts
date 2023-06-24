import { Matrix4, Point3, Vector3 } from './math';
import { identity, transformPoint, inverse, multiply, multiplyVector, perspective, rotation, scaling, translation } from './math/transform';

/**
 * A camera in 3D space
 */
export class Camera {
	private _model: Matrix4 = identity();
	private _projection: Matrix4 = identity();
	private _aspect: number = 1.0;
	position: Point3 = [0.0, 1.0, 0.0];
	rotation: Vector3 = [0.0, 0.0, 0.0];
	scaling: Vector3 = [1.0, 1.0, 1.0];

	get model(): Matrix4 {
		return [...this._model];
	}

	get projection(): Matrix4 {
		return [...this._projection];
	}

	get aspect(): number {
		return this._aspect;
	}

	set aspect(a: number) {
		this._aspect = a;
		this._projection = perspective(a, 45.0, 1.0, 500.0);
	}

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
		const pos = transformPoint(multiply(trans, invRot), this.position);
		this.position = transformPoint(rot, pos);
		this.updateModel();
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
		this.updateModel();
	}

	rotationVector(): Vector3 {
		const vec = multiplyVector(this._model, [0.0, 0.0, 1.0, 0.0]);
		return [vec[0], vec[1], vec[2]];
	}

	rotationMatrix(): Matrix4 {
		return multiply(
			rotation(0, 0, this.rotation[2]),
			rotation(0, this.rotation[1], 0),
			rotation(this.rotation[0], 0, 0),
		);
	}

	updateModel() {
		const rot = this.rotationMatrix();
		const tra = translation(...this.position);
		const sca = scaling(...this.scaling);
		const view = multiply(sca, multiply(tra, rot));
		this._model = inverse(view)!;
	}
}
