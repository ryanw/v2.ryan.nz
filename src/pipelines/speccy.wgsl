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
	@location(1) normal: vec3<f32>,
	@location(2) fgColor: vec4<f32>,
	@location(3) bgColor: vec4<f32>,
}

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) worldPosition: vec3<f32>,
	@location(1) normal: vec3<f32>,
	@location(2) fgColor: vec4<f32>,
	@location(3) bgColor: vec4<f32>,
}

struct InkFragmentOut {
	@builtin(frag_depth) depth: f32,
	@location(0) ink: vec4<f32>,
	@location(1) shade: f32,
}
struct PaperFragmentOut {
	@builtin(frag_depth) depth: f32,
	@location(0) paper: vec4<f32>,
}


@group(0) @binding(0)
var<uniform> u: Uniforms;

@vertex
fn vs_main(in: WireVertex) -> VertexOut {
	var out: VertexOut;
	let mv = u.camera.view * u.camera.model;
	let mvp = u.camera.projection * mv;

	let worldPosition = u.camera.model * vec4(in.position, 1.0);
	let position = mvp * vec4(in.position, 1.0);
	let normal = normalize((u.camera.model * vec4(in.normal, 0.0)).xyz);
	out.position = position;
	out.worldPosition = worldPosition.xyz / worldPosition.w;
	out.normal = normal;
	out.fgColor = in.fgColor;
	out.bgColor = in.bgColor;
	return out;
}


@fragment
fn fs_ink_main(in: VertexOut) -> InkFragmentOut {
	var out: InkFragmentOut;
	var color = vec4(1.0);

	let lightPosition = vec3(0.0, 8.0, 40.0);
	let lightDir = normalize(lightPosition - in.worldPosition);
	let shade = clamp(dot(in.normal, lightDir), 0.0, 1.0);


	color = vec4(0.0);


	var a = in.fgColor.a;
	out.ink = in.fgColor;
	out.shade = shade;
	out.depth = in.position.z / a;
	return out;
}

@fragment
fn fs_paper_main(in: VertexOut) -> PaperFragmentOut {
	var out: PaperFragmentOut;
	var color = vec4(1.0);

	let lightPosition = vec3(0.0, 8.0, 40.0);
	let lightDir = normalize(lightPosition - in.worldPosition);
	let shade = clamp(dot(in.normal, lightDir), 0.0, 1.0);


	color = vec4(0.0);


	var a = in.bgColor.a;
	out.paper = in.bgColor;
	out.depth = in.position.z / a;
	return out;
}
