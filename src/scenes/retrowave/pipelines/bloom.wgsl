struct Uniforms {
	radius: f32,
	amount: f32,
}

@group(0) @binding(0)
var inColor: texture_2d<f32>;

@group(0) @binding(1)
var outColor: texture_storage_2d<rgba8unorm, write>;

@group(0) @binding(2)
var<uniform> u: Uniforms;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
	let size = vec2<i32>(textureDimensions(inColor));
	var coord = vec2<i32>(global_id.xy);

	let kernel = i32(u.radius);

	var color = vec4(0.0);

	for (var y = -kernel; y <= kernel; y += 1) {
		for (var x = -kernel; x <= kernel; x += 1) {
			let offset = vec2(x, y);
			color += textureLoad(inColor, coord + offset, 0);
		}
	}

	let k = (2.0 - u.amount) * f32(kernel) + 1.0;
	color = color / (k * k);

	textureStore(outColor, coord, color);
}
