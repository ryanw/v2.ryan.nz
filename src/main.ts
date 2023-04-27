import { Renderer } from './lib';
import { Cubic } from './scenes/cubic';

/**
 * Application entry point
 */
async function main() {
	console.debug("Starting ryan.nz v2");
	const el = document.querySelector('main > canvas');
	if (!(el instanceof HTMLCanvasElement)) {
		throw new Error("Couldn't find canvas");
	}

	const scene = new Cubic(el.getContext('webgl2'));

	while (true) {
		await scene.draw();
	}
}

window.addEventListener('DOMContentLoaded', main);
