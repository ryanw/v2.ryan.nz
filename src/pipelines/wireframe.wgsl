struct Camera {
	model: mat4x4<f32>,
	view: mat4x4<f32>,
	projection: mat4x4<f32>,
}

struct Uniforms {
	camera: Camera,
}

struct WireVertex {
	@location(0) position: vec3<f32>,
	@location(1) barycentric: vec3<f32>,
	@location(2) uv: vec2<f32>,
}

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
}

struct FragmentOut {
	@location(0) color: vec4<f32>,
}


@group(0) @binding(0)
var<uniform> u: Uniforms;

@vertex
fn vs_main(in: WireVertex) -> VertexOut {
	var out: VertexOut;
	let mv = u.camera.view * u.camera.model;
	let mvp = u.camera.projection * mv;
	out.position = mvp * vec4(in.position, 1.0);
	out.uv = in.barycentric.xy * 0.5 + 0.5;
	return out;
}


@fragment
fn fs_main(in: VertexOut) -> FragmentOut {
	var out: FragmentOut;
	out.color = vec4(in.uv, 1.0, 1.0);
	return out;
}
