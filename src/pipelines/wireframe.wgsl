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
}

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) worldPosition: vec3<f32>,
	@location(1) barycentric: vec3<f32>,
	@location(2) uv: vec2<f32>,
	@location(3) normal: vec3<f32>,
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

	let worldPosition = u.camera.model * vec4(in.position, 1.0);
	let position = mvp * vec4(in.position, 1.0);
	let normal = normalize((u.camera.model * vec4(in.normal, 0.0)).xyz);
	out.barycentric = in.barycentric;
	out.position = position;
	out.worldPosition = worldPosition.xyz / worldPosition.w;
	out.uv = in.barycentric.xy * 0.5 + 0.5;
	out.normal = normal;
	return out;
}


@fragment
fn fs_main(in: VertexOut) -> FragmentOut {
	var out: FragmentOut;
	var color = vec4(1.0);

	let p = in.position.xyz / in.position.w;
	let lightPosition = vec3(10.0, 10.0, 10.0);
	let lightDir = normalize(lightPosition - in.worldPosition);

	let lineColor = vec4(0.0, 0.0, 0.0, 0.66);
	let vertColor = vec4(1.0, 0.2, 0.1, 1.0);
	//let faceColor = vec4(0.2, 0.7, 0.6, 1.0);
	//let faceColor = vec4(0.6, 0.01, 0.3, 1.0);
	let faceColor = vec4(1.0);
	let ditherColor = vec4(0.0, 0.0, 0.0, 1.0);
	let edge = edgeDistance(in.barycentric, 0.66, 1.0);

	if edge == 0.0 {
		color = lineColor;
	}
	else {
		color = vec4(0.0);
		//color = vec4(in.normal, 1.0);
		let shade = 0.06 + clamp(dot(in.normal, lightDir), 0.0, 1.0);

		let s = 1.0;
		let div = 1.0;

		var ditherMatrix = mat4x4(
			vec4(0.0000, 0.5000, 0.1250, 0.6250),
			vec4(0.7500, 0.2500, 0.8750, 0.3750),
			vec4(0.1875, 0.6875, 0.0625, 0.5625),
			vec4(0.9375, 0.4375, 0.8125, 0.3125)
		);

		let ditherCoord = vec2(i32(in.position.x / div) % 4, i32(in.position.y / div) % 4);
		let ditherVal = ditherMatrix[ditherCoord.x][ditherCoord.y];
		let g = floor(shade * s + ditherVal) / s;

		color = vec4(lineColor.rgb, lineColor.a - g * lineColor.a);
	}

	// Premultiply the alpha
	out.color = vec4(color.rgb * color.a, color.a);
	return out;
}

fn edgeDistance(barycentric: vec3<f32>, thickness: f32, s: f32) -> f32 {
	let dx = dpdx(barycentric);
	let dy = dpdy(barycentric);
	let d = sqrt(dx * dx + dy * dy) * thickness;
	let a = smoothstep(d * s, d, barycentric);
	return min(min(a.x, a.y), a.z);
}
