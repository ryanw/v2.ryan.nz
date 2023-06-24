@include 'engine/noise.wgsl';

struct Camera {
	view: mat4x4<f32>,
	projection: mat4x4<f32>,
	resolution: vec2<f32>,
	t: f32,
}

struct Entity {
	model: mat4x4<f32>,
	thickness: f32,
}

@group(0) @binding(0)
var<uniform> camera: Camera;
@group(0) @binding(1)
var<uniform> entity: Entity;

struct Vertex {
	@builtin(vertex_index) vertexId: u32,
	@location(0) position: vec3<f32>,
	@location(1) normal: vec3<f32>,
	@location(2) faceColor: vec4<f32>,
	@location(3) wireColor: vec4<f32>,
}

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
	@location(1) normal: vec3<f32>,
	@location(2) barycentric: vec3<f32>,
	@location(3) faceColor: vec4<f32>,
	@location(4) wireColor: vec4<f32>,
}

const barycentrics = array<vec3<f32>, 3>(
	vec3(1.0, 0.0, 0.0),
	vec3(0.0, 1.0, 0.0),
	vec3(0.0, 0.0, 1.0),
);

@vertex
fn vs_main(in: Vertex) -> VertexOut {
	var out: VertexOut;

	let p = in.position.xz;

	let mv = camera.view * entity.model;
	let mvp = camera.projection * mv;

	let position = mvp * vec4(in.position, 1.0);
	let normal = normalize((entity.model * vec4(in.normal, 0.0)).xyz);

	out.position = position;
	out.normal = normal;
	out.barycentric = barycentrics[in.vertexId % 3];
	out.faceColor = in.faceColor;
	out.wireColor = in.wireColor;

	return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
	var faceColor = in.faceColor;
	var wireColor = in.wireColor;

	let wireGap = entity.thickness - 0.5;
	let g = edgeDistance(in.barycentric, wireGap, 0.333);
	return mix(wireColor, faceColor, g);
}

fn edgeDistance(barycentric: vec3<f32>, thickness: f32, s: f32) -> f32 {
	let dx = dpdx(barycentric);
	let dy = dpdy(barycentric);
	let d = sqrt(dx * dx + dy * dy) * thickness;
	let a = smoothstep(d * s, d, barycentric);
	return min(min(a.x, a.y), a.z);
}
