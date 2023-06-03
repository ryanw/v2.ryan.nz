import { Context } from '../context';
import template from './template.html';
import styles from './styles.css';
import { Spacewave } from '../scenes/spacewave';
import { Options, Shading } from '../pipelines/compose';

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
			scene.composePipeline.options.shading = Shading.Flat;
		}
		else {
			scene.composePipeline.options.shading = 0;
		}
		update();
	});
	const dither = el.querySelector<HTMLInputElement>('input#dither')!;
	dither.addEventListener('click', (e: MouseEvent) => {
		if ((e.target as HTMLInputElement).checked) {
			scene.composePipeline.options.shading = Shading.Dithered;
		}
		else {
			scene.composePipeline.options.shading = 0;
		}
		update();
	});
	const position = el.querySelector<HTMLInputElement>('input#position')!;
	position.addEventListener('click', (e: MouseEvent) => {
		if ((e.target as HTMLInputElement).checked) {
			scene.composePipeline.options.shading = Shading.Position;
		}
		else {
			scene.composePipeline.options.shading = 0;
		}
		update();
	});
	const normal = el.querySelector<HTMLInputElement>('input#normal')!;
	normal.addEventListener('click', (e: MouseEvent) => {
		if ((e.target as HTMLInputElement).checked) {
			scene.composePipeline.options.shading = Shading.Normal;
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
	flat.checked = state.shading === Shading.Flat;

	const dither = el.querySelector<HTMLInputElement>('input#dither')!;
	dither.checked = state.shading === Shading.Dithered;

	const position = el.querySelector<HTMLInputElement>('input#position')!;
	position.checked = state.shading === Shading.Position;

	const normal = el.querySelector<HTMLInputElement>('input#normal')!;
	normal.checked = state.shading === Shading.Normal;

	const clash = el.querySelector<HTMLInputElement>('input#clash')!;
	clash.checked = state.pixelated;
}
