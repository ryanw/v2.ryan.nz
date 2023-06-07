struct Uniforms {
	amount: i32,
}

@group(0) @binding(0)
var inInk: texture_2d<f32>;
@group(0) @binding(1)
var inPaper: texture_2d<f32>;

@group(0) @binding(2)
var depth: texture_2d<f32>;

@group(0) @binding(3)
var outInk: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(4)
var outPaper: texture_storage_2d<rgba8unorm, write>;

@group(0) @binding(5)
var<uniform> u: Uniforms;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
	var fg = vec4(0.0);
	var bg = vec4(0.0);

	let size = vec2<i32>(textureDimensions(inInk));

	var fg_hit = 1.0;
	var bg_hit = 1.0;
	var next = false;
	var bigBreak = false;

	// Check all pixels to find nearest colour
	for (var y = 0; y < u.amount; y++) {
		for (var x = 0; x < u.amount; x++) {
			let coord = vec2<i32>(global_id.xy) * u.amount + vec2(x, y);

			let z = textureLoad(depth, coord, 0).r;
			if z == 1.0 {
				// Hit skybox
				/*
				fg = vec4<u32>((vec4(0.1, 0.4, 0.7, 1.0) * 15.0));
				bg = vec4<u32>((vec4(0.5, 0.7, 0.8, 0.1) * 15.0));
				fg_hit = z;
				bg_hit = z;
				bigBreak = true;
				break;
				*/
			}

			// if pixel is closer to the camera, use that colour
			let tmp_fg = textureLoad(inInk, coord, 0);
			if (z < fg_hit && tmp_fg.a == fg.a) || tmp_fg.a > fg.a {
				fg = tmp_fg;
				fg_hit = z;
			}
			let tmp_bg = textureLoad(inPaper, coord, 0);
			if (z < bg_hit && tmp_bg.a == bg.a) || tmp_bg.a > bg.a {
				bg = tmp_bg;
				bg_hit = z;
			}
		}
		if bigBreak {
			break;
		}
		if next {
			next = false;
			continue;
		}
	}

	let coord = vec2<i32>(global_id.xy);
	textureStore(outInk, coord, fg);
	textureStore(outPaper, coord, bg);
}
