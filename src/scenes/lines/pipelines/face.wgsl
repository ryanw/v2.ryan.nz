struct Camera {
	view: mat4x4<f32>,
	projection: mat4x4<f32>,
	resolution: vec2<f32>,
}

struct Entity {
	model: mat4x4<f32>,
}

@group(0) @binding(0)
var<uniform> camera: Camera;
@group(0) @binding(1)
var<uniform> entity: Entity;

struct Vertex {
	@location(0) position: vec3<f32>,
	@location(1) normal: vec3<f32>,
	@location(2) barycentric: vec3<f32>,
	@location(3) color: vec4<f32>,
}

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
	@location(1) normal: vec3<f32>,
	@location(2) barycentric: vec3<f32>,
	@location(3) color: vec4<f32>,
}

@vertex
fn vs_main(in: Vertex) -> VertexOut {
	var out: VertexOut;

	let mv = camera.view * entity.model;
	let mvp = camera.projection * mv;

	let position = mvp * vec4(in.position, 1.0);
	let normal = normalize((entity.model * vec4(in.normal, 0.0)).xyz);

	out.position = position;
	out.normal = normal;
	out.barycentric = in.barycentric;
	out.color = in.color;

	return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
	var color = in.color;
	let g = 1.0 - edgeDistance(in.barycentric, 1.7, 0.5);
	if g >= 1.0 {
		discard;
	}
	return color;
}

fn edgeDistance(barycentric: vec3<f32>, thickness: f32, s: f32) -> f32 {
	let dx = dpdx(barycentric);
	let dy = dpdy(barycentric);
	let d = sqrt(dx * dx + dy * dy) * thickness;
	let a = smoothstep(d * s, d, barycentric);
	return min(min(a.x, a.y), a.z);
}
