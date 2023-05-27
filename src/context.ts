export class UnsupportedError extends Error {
	constructor() {
		super("Your browser doesn't support WebGPU");
	}
}

export interface ContextArguments {
	canvas: HTMLCanvasElement;
	adapter: GPUAdapter;
	device: GPUDevice;
}

export class Context {
	canvas: HTMLCanvasElement;
	canvasContext: GPUCanvasContext;
	adapter: GPUAdapter;
	device: GPUDevice;
	format: GPUTextureFormat;
	private _size = [0, 0];

	/**
	 * Create a new Context attached to a HTMLCanvasElement
	 */
	static async attach(canvas: HTMLCanvasElement): Promise<Context> {
		if (!navigator?.gpu) throw new UnsupportedError();

		let device, adapter, ctx;
		try {
			adapter = await navigator.gpu.requestAdapter()
		} catch (e) {
			console.error("Couldn't request WebGPU adapter", e);
		}
		if (!adapter) throw new UnsupportedError();
		device = await adapter.requestDevice();
		if (!device) throw new UnsupportedError();

		ctx = canvas.getContext('webgpu');
		if (!ctx) throw new UnsupportedError();

		const format = navigator.gpu.getPreferredCanvasFormat();
		const alphaMode = 'premultiplied';
		ctx.configure({ device, format, alphaMode });

		return new Context({ canvas, adapter, device });
	}

	constructor(args: ContextArguments) {
		this.format = navigator.gpu.getPreferredCanvasFormat();
		this.canvas = args.canvas;
		this.adapter = args.adapter;
		this.device = args.device;
		this.canvasContext = this.canvas.getContext('webgpu') as GPUCanvasContext;
	}

	get size(): [number, number] {
		return [...this._size] as [number, number];
	}

	get currentTexture(): GPUTexture {
		return this.canvasContext.getCurrentTexture();
	}

	resize(width: number, height: number) {
		this._size = [width, height];

		this.updateSize();
	}

	updateSize() {
		const [w, h] = this.size;
		this.canvas.setAttribute('width', w.toString());
		this.canvas.setAttribute('height', h.toString());
	}
}
