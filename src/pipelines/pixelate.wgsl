struct Uniforms {
	amount: i32,
}

@group(0) @binding(0)
var texIn: texture_2d<u32>;

@group(0) @binding(1)
var depth: texture_2d<f32>;

@group(0) @binding(2)
var texOut: texture_storage_2d<rgba8uint, write>;

@group(0) @binding(3)
var<uniform> u: Uniforms;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
	var fg = vec4(0u);
	var bg = vec4(0u);

	let size = vec2<i32>(textureDimensions(texIn));

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
			let colorPair = textureLoad(texIn, coord, 0);
			let tmp_fg = (colorPair & vec4(0x0f));
			let tmp_bg = (colorPair & vec4(0xf0)) >> vec4(4u);

			if (z <= fg_hit && tmp_fg.a >= fg.a) || tmp_fg.a > fg.a {
				fg = tmp_fg;
				fg_hit = z;
			}
			if (z <= bg_hit && tmp_bg.a >= bg.a) || tmp_bg.a > bg.a {
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

	let color = fg | (bg << vec4(4u));

	next = false;
	// Write pixels using the nearest colour
	for (var y = 0; y < u.amount; y++) {
		for (var x = 0; x < u.amount; x++) {
			let coord = vec2<i32>(global_id.xy) * u.amount + vec2(x, y);
			textureStore(texOut, coord, color);
		}
		if next {
			next = false;
			continue;
		}
	}
}
