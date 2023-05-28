export class InputHandler {
	target: HTMLElement | Window;
	heldKeys = new Set<string>();

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

	listen() {
		// FIXME type hacks
		(this.target as HTMLElement).addEventListener('keydown', this.onKeyDown);
		(this.target as HTMLElement).addEventListener('keyup', this.onKeyUp);
	}

	unlisten() {
		(this.target as HTMLElement).removeEventListener('keydown', this.onKeyDown);
		(this.target as HTMLElement).removeEventListener('keyup', this.onKeyUp);
	}
}
