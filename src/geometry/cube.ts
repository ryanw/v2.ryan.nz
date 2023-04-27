import { Geometry } from "../lib";
import { Point3 } from "../math";

export type Vertex = {
	position: Point3,
}

export class Cube extends Geometry<Vertex> {
	constructor() {
		super();
		this.vertices = [
			{ position: [0, 0, 0] },
			{ position: [0, 1, 0] },
			{ position: [1, 1, 0] },
		];
	}
}
