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
	var color = vec4(0u);
	let size = vec2<i32>(textureDimensions(texIn));

	var hit = 1.0;
	var next = false;

	// Check all pixels to find nearest colour
	for (var y = 0; y < u.amount; y++) {
		for (var x = 0; x < u.amount; x++) {
			let coord = vec2<i32>(global_id.xy) * u.amount + vec2(x, y);
			if (coord.x > size.x) {
				continue;
			}
			if (coord.y > size.y) {
				next = true;
				break;
			}

			let z = textureLoad(depth, coord, 0).r;
			// if pixel is closer to the camera, use that colour
			if z < hit {
				let pixel = textureLoad(texIn, coord, 0);
				if pixel.a > 0 {
					color = pixel;
					hit = z;
				}
			}
		}
		if next {
			next = false;
			continue;
		}
	}

	next = false;
	// Write pixels using the nearest colour
	for (var y = 0; y < u.amount; y++) {
		for (var x = 0; x < u.amount; x++) {
			let coord = vec2<i32>(global_id.xy) * u.amount + vec2(x, y);
			if (coord.x > size.x) {
				continue;
			}
			if (coord.y > size.y) {
				next = true;
				break;
			}

			textureStore(texOut, coord, color);
		}
		if next {
			next = false;
			continue;
		}
	}
}
