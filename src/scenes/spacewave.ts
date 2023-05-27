import { Camera } from '../camera';
import { Context } from '../context';
import { Pipeline } from '../pipeline';
import { Scene } from '../scene';
import SHADER_SOURCE from './test_shader.wgsl';

export class Spacewave extends Scene {
	camera = new Camera();
	testPipeline: TestPipeline;

	constructor(ctx: Context) {
		super(ctx);
		this.testPipeline = new TestPipeline(ctx);
	}

	async draw() {
		const { ctx } = this;
		return new Promise(resolve => {
			requestAnimationFrame(() => {
				const t = performance.now();
				// Draw stuff
				const view = ctx.currentTexture.createView();
				this.testPipeline.draw(view);
				const dt = performance.now() - t;
				resolve(dt / 1000.0);
			});
		});
	}

	updateViewport() {
	}

	resize(width: number, height: number) {
		const { ctx: { size } } = this;

		if (width === size[0] && height === size[1]) {
			return;
		}
	}
}

class TestPipeline extends Pipeline {
	private pipeline: GPURenderPipeline;

	constructor(ctx: Context) {
		super(ctx);
		const { device, format } = ctx;
		const module = device.createShaderModule({ code: SHADER_SOURCE });
		this.pipeline = device.createRenderPipeline({
			layout: 'auto',
			vertex: { module, entryPoint: 'vs_main' },
			fragment: { module, entryPoint: 'fs_main', targets: [{ format }] },
			primitive: { topology: 'triangle-list' }
		});
	}

	draw(view: GPUTextureView) {
		const { device } = this.ctx;

		const clearValue =  { r: 0.8, g: 0.0, b: 0.4, a: 1.0 };
		const encoder = device.createCommandEncoder();
		const renderPass = encoder.beginRenderPass({
			colorAttachments: [
				{ view, clearValue, loadOp: 'clear', storeOp: 'store' }
			]
		});
		
		renderPass.setPipeline(this.pipeline);
		renderPass.draw(3, 1, 0 ,0);
		renderPass.end();
		device.queue.submit([encoder.finish()]);
	}
}
