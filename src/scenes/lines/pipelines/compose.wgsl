struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
}

@group(0) @binding(0)
var albedo: texture_2d<f32>;

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


fn toneMap(color: vec3<f32>) -> vec3<f32> {
	let a = 2.51;
	let b = 0.03;
	let c = 2.43;
	let d = 0.59;
	let e = 0.14;
    return (color * (a * color + b)) / (color * (c * color + d) + e);
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
	let coord = vec2<u32>(in.position.xy);
	var albedo = textureLoad(albedo, coord, 0);

	var color = vec4(0.0);

	color = albedo;

	var rgb = vec3(0.0);
	rgb = color.rgb;
	rgb = pow(rgb, vec3(2.2));
	//rgb = toneMap(rgb);
	//rgb += color.rgb - vec3(1.0);
	return vec4(rgb * color.a, color.a);
}
