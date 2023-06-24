@include 'engine/noise.wgsl';

struct Uniforms {
	offset: vec3<f32>,
	t: f32,
}

@group(0) @binding(0)
var heightmap: texture_storage_2d<r32float, write>;

@group(0) @binding(1)
var<uniform> u: Uniforms;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
	let size = vec2<i32>(textureDimensions(heightmap));
	var coord = vec2<i32>(global_id.xy);

	var offset = u.offset.xz;

	var samplePos = vec2<i32>(global_id.xy);
	samplePos += vec2<i32>(floor(offset));

	//var h = rnd4(vec4(vec2<f32>(samplePos), 0.0, 0.0));
	let p = vec3(vec2<f32>(samplePos), 0.0);
	var h = fractalNoise(p * 2.0, 1.0, 4);

	textureStore(heightmap, coord, vec4(h));
}
