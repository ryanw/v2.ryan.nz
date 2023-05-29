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
		this.mousePosition = [e.clientX, e.clientY];
		this.mouseButtons.add(e.button);
	};

	onMouseUp = (e: MouseEvent) => {
		this.mousePosition = [e.clientX, e.clientY];
		this.mouseButtons.delete(e.button);
	};

	onMouseMove = (e: MouseEvent) => {
		this.mousePosition = [e.clientX, e.clientY];
	};

	listen() {
		// FIXME type hacks
		const target = this.target as HTMLElement;
		target.addEventListener('keydown', this.onKeyDown);
		target.addEventListener('keyup', this.onKeyUp);
		target.addEventListener('mousedown', this.onMouseDown);
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
	}

	unlisten() {
		const target = this.target as HTMLElement;
		target.removeEventListener('keydown', this.onKeyDown);
		target.removeEventListener('keyup', this.onKeyUp);
		target.addEventListener('mouseup', this.onMouseUp);
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
	}
}
