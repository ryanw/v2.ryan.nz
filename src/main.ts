import { InputHandler } from './lib';
import { Vector3 } from './math';
import { Spacewave } from './scenes/spacewave';

/**
 * Application entry point
 */
async function main() {
	console.debug('Starting ryan.nz v2');
	const el = document.querySelector('main > canvas');
	if (!(el instanceof HTMLCanvasElement)) {
		throw new Error("Couldn't find canvas");
	}

	function updateCanvasSize() {
		el?.setAttribute('width', el.clientWidth.toString());
		el?.setAttribute('height', el.clientHeight.toString());
	}
	updateCanvasSize();

	// FIXME use ResizeObserver on the <canvas>
	window.addEventListener('resize', updateCanvasSize);


	const inputHandler = new InputHandler(window);
	const scene = new Spacewave(el.getContext('webgl2')!);

	let now = performance.now();
	let prevFrame = performance.now();
	let dt = 0.1;
	while (true) {
		now = performance.now();
		dt = (now - prevFrame) / 1000.0;
		prevFrame = now;

		const velocity: Vector3 = [0.0, 0.0, 0.0];
		const speed = 4.0 * dt;
		
		if (inputHandler.held('a')) {
			velocity[0] -= speed;
		}
		if (inputHandler.held('d')) {
			velocity[0] += speed;
		}
		if (inputHandler.held('q')) {
			velocity[1] -= speed;
		}
		if (inputHandler.held('e')) {
			velocity[1] += speed;
		}
		if (inputHandler.held('w')) {
			velocity[2] -= speed;
		}
		if (inputHandler.held('s')) {
			velocity[2] += speed;
		}

		scene.camera.translate(velocity);

		await scene.draw();
	}
}

window.addEventListener('DOMContentLoaded', main);
