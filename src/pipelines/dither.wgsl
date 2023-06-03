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
	@location(4) fgColor: vec4<f32>,
	@location(5) bgColor: vec4<f32>,
}

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) worldPosition: vec3<f32>,
	@location(1) barycentric: vec3<f32>,
	@location(2) uv: vec2<f32>,
	@location(3) normal: vec3<f32>,
	@location(4) fgColor: vec4<f32>,
	@location(5) bgColor: vec4<f32>,
}

struct FragmentOut {
	// color is 2x 4bit colours
	@location(0) color: vec4<u32>,
	@location(1) position: vec4<f32>,
	@location(2) normal: vec4<f32>,
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
	out.barycentric = in.barycentric;
	out.position = position;
	out.worldPosition = worldPosition.xyz / worldPosition.w;
	out.uv = in.barycentric.xy * 0.5 + 0.5;
	out.normal = normal;
	out.fgColor = in.fgColor;
	out.bgColor = in.bgColor;
	return out;
}


@fragment
fn fs_main(in: VertexOut) -> FragmentOut {
	var out: FragmentOut;
	var color = vec4(1.0);

	let lightPosition = vec3(0.0, 8.0, 40.0);
	let lightDir = normalize(lightPosition - in.worldPosition);

	color = vec4(0.0);
	let shade = 0.07 + clamp(dot(in.normal, lightDir), 0.0, 1.0);

	// Premultiply the alpha
	//out.color = vec4(color.rgb * color.a, color.a);
	//out.color = faceColor;


	var fgC = in.fgColor;
	var bgC = in.bgColor;
	// FIXME Fix weird noise
	fgC = ceil(fgC * 1000.0) / 1000.0;
	bgC = ceil(bgC * 1000.0) / 1000.0;

	let fg = (vec4<u32>(fgC * 15.0) & vec4(0x0f));
	let bg = (vec4<u32>(bgC * 15.0) & vec4(0x0f)) << vec4(4u);
	out.color = fg | bg;
	out.normal = vec4(in.normal, 0.0);
	out.position = vec4(in.worldPosition, 1.0);
	return out;
}
