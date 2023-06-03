import { Point2, Vector2 } from "./math";

export class InputHandler {
	target: HTMLElement | Window;
	heldKeys = new Set<string>();
	mouseButtons = new Set<number>();
	mousePosition: Point2 = [0, 0];
	mouseDelta: Vector2 = [0, 0];

	constructor(target: HTMLElement | Window) {
		this.target = target;
		this.listen();
	}

	held(key: string): boolean {
		return this.heldKeys.has(key);
	}

	onKeyDown = (e: KeyboardEvent) => {
		this.heldKeys.add(e.key);
	};

	onKeyUp = (e: KeyboardEvent) => {
		this.heldKeys.delete(e.key);
	};

	onMouseDown = (e: MouseEvent) => {
		this.mouseButtons.add(e.button);
	};

	onWindowMouseUp = (e: MouseEvent) => {
		this.mouseButtons.delete(e.button);
	};

	onWindowMouseMove = (e: MouseEvent) => {
		this.mousePosition[0] += e.movementX;
		this.mousePosition[1] += e.movementY;
	};

	listen() {
		// FIXME type hacks
		const target = this.target as HTMLElement;
		target.addEventListener('keydown', this.onKeyDown);
		target.addEventListener('keyup', this.onKeyUp);
		target.addEventListener('mousedown', this.onMouseDown);
		window.addEventListener('mouseup', this.onWindowMouseUp);
		window.addEventListener('mousemove', this.onWindowMouseMove);
	}

	unlisten() {
		const target = this.target as HTMLElement;
		target.removeEventListener('keydown', this.onKeyDown);
		target.removeEventListener('keyup', this.onKeyUp);
		target.removeEventListener('mousedown', this.onMouseDown);
		window.removeEventListener('mouseup', this.onWindowMouseUp);
		window.removeEventListener('mousemove', this.onWindowMouseMove);
	}
}
