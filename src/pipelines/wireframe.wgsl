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
	@location(3) normal: vec3<f32>,
	@location(4) color: vec4<f32>,
}

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) worldPosition: vec3<f32>,
	@location(1) barycentric: vec3<f32>,
	@location(2) uv: vec2<f32>,
	@location(3) normal: vec3<f32>,
	@location(4) color: vec4<f32>,
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
	let normal = (u.camera.model * vec4(in.normal, 0.0)).xyz;
	out.barycentric = in.barycentric;
	out.position = mvp * vec4(in.position, 1.0);
	out.uv = in.barycentric.xy * 0.5 + 0.5;
	out.normal = normal;
	out.color = in.color;
	return out;
}


@fragment
fn fs_main(in: VertexOut) -> FragmentOut {
	var out: FragmentOut;

	let p = in.position.xyz / in.position.w;
	let lightPosition = vec3(10.0, 10.0, 10.0);
	let lightDir = normalize(lightPosition - in.worldPosition);
	let shade = 0.06 + clamp(dot(in.normal, lightDir), 0.0, 1.0);

	let lineColor = vec4(0.0, 0.0, 0.0, 1.0);
	let vertColor = vec4(1.0, 0.2, 0.1, 1.0);
	//let faceColor = vec4(0.2, 0.7, 0.6, 1.0);
	let faceColor = vec4(0.6, 0.01, 0.3, 1.0);
	let edge = edgeDistance(in.barycentric, 1.0, 1.0);

	let color = mix(lineColor, in.color, edge);

	out.color = vec4(color.rgb * shade, 1.0);
	return out;
}

fn edgeDistance(barycentric: vec3<f32>, thickness: f32, s: f32) -> f32 {
	let dx = dpdx(barycentric);
	let dy = dpdy(barycentric);
	let d = sqrt(dx * dx + dy * dy) * thickness;
	let a = smoothstep(d * s, d, barycentric);
	return min(min(a.x, a.y), a.z);
}
