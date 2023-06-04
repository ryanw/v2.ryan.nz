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
	const shade = el.querySelector<HTMLInputElement>('input#shade')!;
	shade.addEventListener('click', (e: MouseEvent) => {
		if ((e.target as HTMLInputElement).checked) {
			scene.composePipeline.options.shading = Shading.Shade;
		}
		else {
			scene.composePipeline.options.shading = 0;
		}
		update();
	});
	const ink = el.querySelector<HTMLInputElement>('input#ink')!;
	ink.addEventListener('click', (e: MouseEvent) => {
		if ((e.target as HTMLInputElement).checked) {
			scene.composePipeline.options.shading = Shading.Ink;
		}
		else {
			scene.composePipeline.options.shading = 0;
		}
		update();
	});
	const paper = el.querySelector<HTMLInputElement>('input#paper')!;
	paper.addEventListener('click', (e: MouseEvent) => {
		if ((e.target as HTMLInputElement).checked) {
			scene.composePipeline.options.shading = Shading.Paper;
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

	const shade = el.querySelector<HTMLInputElement>('input#shade')!;
	shade.checked = state.shading === Shading.Shade;

	const ink = el.querySelector<HTMLInputElement>('input#ink')!;
	ink.checked = state.shading === Shading.Ink;

	const paper = el.querySelector<HTMLInputElement>('input#paper')!;
	paper.checked = state.shading === Shading.Paper

	const clash = el.querySelector<HTMLInputElement>('input#clash')!;
	clash.checked = state.pixelated;
}
