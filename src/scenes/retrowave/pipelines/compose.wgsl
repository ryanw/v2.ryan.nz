struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
}

struct Uniforms {
	reflection: u32,
}

@group(0) @binding(0)
var inAlbedo: texture_2d<f32>;
@group(0) @binding(1)
var inBloom: texture_2d<f32>;
@group(0) @binding(2)
var inMirror: texture_2d<f32>;
@group(0) @binding(3)
var inReflection: texture_2d<f32>;
@group(0) @binding(4)
var<uniform> u: Uniforms;

@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> VertexOut {
	var out: VertexOut;

	let points = array<vec2<f32>, 4>(
		vec2(-1.0, -1.0),
		vec2(1.0, -1.0),
		vec2(-1.0, 1.0),
		vec2(1.0, 1.0)
	);

	out.position = vec4(points[i], 0.0, 1.0);
	out.uv = points[i] * 0.5 + 0.5;

	return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
	let coord = vec2<u32>(in.position.xy);

	var albedo = textureLoad(inAlbedo, coord, 0);
	var bloom = textureLoad(inBloom, coord, 0);
	var mirror = textureLoad(inMirror, coord, 0);
	var reflection = textureLoad(inReflection, coord, 0);

	if u.reflection > 0 && mirror.a > 0.0 {
		albedo = mix(vec4(0.1, 0.05, 0.3, 1.0), reflection, 0.2);
	}

	return albedo + bloom;
}
