import { Context } from '../context';
import template from './template.html';
import styles from './styles.css';
import { Spacewave } from '../scenes/spacewave';
import { Options } from '../pipelines/compose';

export function attachUi(scene: Spacewave) {
	const { ctx } = scene;
	const el = ctx.canvas.parentElement!;

	function update() {
		updateInputs(el, scene.composePipeline.options);
	}

	const styleTag = document.createElement('style');
	styleTag.innerHTML = styles;
	document.querySelector('head')!.appendChild(styleTag);

	el.insertAdjacentHTML('beforeend', template);


	const flat = el.querySelector<HTMLInputElement>('input#flat')!;
	flat.addEventListener('click', (e: MouseEvent) => {
		if ((e.target as HTMLInputElement).checked) {
			scene.composePipeline.options.shading = 1;
		}
		else {
			scene.composePipeline.options.shading = 0;
		}
		update();
	});
	const dither = el.querySelector<HTMLInputElement>('input#dither')!;
	dither.addEventListener('click', (e: MouseEvent) => {
		if ((e.target as HTMLInputElement).checked) {
			scene.composePipeline.options.shading = 2;
		}
		else {
			scene.composePipeline.options.shading = 0;
		}
		update();
	});
	const clash = el.querySelector<HTMLInputElement>('input#clash')!;
	clash.addEventListener('click', (e: MouseEvent) => {
		scene.composePipeline.options.pixelated = (e.target as HTMLInputElement).checked;
		update();
	});

	update();
}

function updateInputs(el: HTMLElement, state: Options) {
	const flat = el.querySelector<HTMLInputElement>('input#flat')!;
	flat.checked = state.shading === 1;

	const dither = el.querySelector<HTMLInputElement>('input#dither')!;
	dither.checked = state.shading === 2;

	const clash = el.querySelector<HTMLInputElement>('input#clash')!;
	clash.checked = state.pixelated;
}
