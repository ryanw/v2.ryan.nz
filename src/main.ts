import { InputHandler, Context } from 'engine';
import { Vector2, Vector3 } from 'engine/math';
import { LineScene as DemoScene } from './scenes/lines';

/**
 * Application entry point
 */
async function main() {
	console.debug('Starting ryan.nz v2');
	const el = document.querySelector('main > canvas');
	if (!(el instanceof HTMLCanvasElement)) {
		throw new Error("Couldn't find canvas");
	}
	el.tabIndex = -1;

	let ctx: Context;
	try {
		ctx = await Context.attach(el);
	} catch (e) {
		alert("Your browser doesn't support WebGPU. How embarassing for you. 😳");
		return;
	}

	function updateCanvasSize() {
		if (!(el instanceof HTMLCanvasElement)) return;
		if (!el?.parentElement) return;
		const { clientWidth, clientHeight } = el.parentElement;
		const dpr = window.devicePixelRatio;

		const div = 1;
		const w = clientWidth / div | 0;
		const h = clientHeight / div | 0;

		el.style.width = `${w * div}px`;
		el.style.height = `${h * div}px`;

		ctx.resize(w * dpr, h * dpr);
	}
	updateCanvasSize();

	// FIXME use ResizeObserver on the <canvas>
	window.addEventListener('resize', updateCanvasSize);

	window.addEventListener('keypress', (e: KeyboardEvent) => {
		if (e.key === ' ' && !e.repeat) {
			e.preventDefault();
			if (document.pointerLockElement === el) {
				// @ts-ignore FIXME TS doesn't know about unadjustedMovement
				document.exitPointerLock({
					unadjustedMovement: true,
				});
			} else {
				el.focus();
				el.requestPointerLock();
			}
		}
	});


	const inputHandler = new InputHandler(window);
	const scene = new DemoScene(ctx);

	if (el.parentNode) {
		//attachUi(scene);
	}


	let mouse = [0, 0];
	let now = performance.now();
	let prevFrame = performance.now();
	let dt = 0.1;
	while (true) {
		now = performance.now();
		dt = (now - prevFrame) / 1000.0;
		prevFrame = now;

		const rotation: Vector2 = [0.0, 0.0];
		const velocity: Vector3 = [0.0, 0.0, 0.0];
		const speed = 16.0 * dt;
		const rotSpeed = 1.0 / 1000.0;

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

		if (document.pointerLockElement) {
			rotation[1] = (mouse[0] - inputHandler.mousePosition[0]) * rotSpeed;
			rotation[0] = (mouse[1] - inputHandler.mousePosition[1]) * rotSpeed;
		}
		mouse = [...inputHandler.mousePosition];

		scene.camera.translate(velocity);
		scene.camera.rotate(...rotation);

		await scene.draw();
	}
}

window.addEventListener('DOMContentLoaded', main);
