@include 'engine/noise.wgsl';

struct Camera {
	view: mat4x4<f32>,
	projection: mat4x4<f32>,
}

struct Entity {
	model: mat4x4<f32>,
}

struct Uniforms {
	camera: Camera,
	t: f32,
}

struct WireVertex {
	@location(0) position: vec3<f32>,
	@location(1) barycentric: vec3<f32>,
	@location(2) normal: vec3<f32>,
	@location(3) wireColor: vec4<f32>,
	@location(4) faceColor: vec4<f32>,
}

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) worldPosition: vec3<f32>,
	@location(1) barycentric: vec3<f32>,
	@location(2) normal: vec3<f32>,
	@location(3) wireColor: vec4<f32>,
	@location(4) faceColor: vec4<f32>,
	@location(5) depth: f32,
}

struct FragmentOut {
	@location(0) color: vec4<f32>,
	@location(1) bloom: vec4<f32>,
	@location(2) mirror: vec4<f32>,
}

@group(0) @binding(0)
var<uniform> entity: Entity;

@group(1) @binding(0)
var<uniform> u: Uniforms;

var<private> lightPosition = vec3(0.0, 64.0, 0.0);

@vertex
fn vs_main(in: WireVertex) -> VertexOut {
	var out: VertexOut;
	let mv = u.camera.view * entity.model;
	let mvp = u.camera.projection * mv;

	let worldPosition = entity.model * vec4(in.position, 1.0);
	let position = mvp * vec4(in.position, 1.0);
	let normal = normalize((entity.model * vec4(in.normal, 0.0)).xyz);
	out.position = position;
	out.worldPosition = worldPosition.xyz / worldPosition.w;
	out.normal = normal;
	out.barycentric = in.barycentric;
	out.wireColor = in.wireColor;
	out.faceColor = in.faceColor;
	let relPos = u.camera.view * worldPosition;
	out.depth = abs(length(relPos.xyz / relPos.w)) / 256.0;
	return out;
}


@fragment
fn fs_main(in: VertexOut) -> FragmentOut {
	var out: FragmentOut;
	var color = vec4(0.0, 0.0, 0.0, 1.0);

	let lightDir = normalize(lightPosition - in.worldPosition);
	let shade = clamp(dot(in.normal, lightDir), 0.0, 1.0);

	let lineColor = vec4(0.9, 0.8, 0.01, 1.0);
	let edgeColor = vec4(0.9, 0.01, 0.8, 1.0);

	let seg = 10.0;

	let linePos = (sin(in.worldPosition.z / 1.5));
	var center = smoothstep(0.0, 1.0 / 100.0, linePos);

	center *= 1.0 - smoothstep(0.1, 0.12, abs(in.worldPosition.x));
	color = mix(color, lineColor, center);

	var edge = smoothstep(0.1, 0.12, abs(in.worldPosition.x) - 1.75);
	color = mix(color, edgeColor, edge);

	//var gx = step(0.5, fract(in.worldPosition.x / 10.0));
	//var gy = step(0.5, fract(in.worldPosition.z / 10.0));
	//var q = abs(gy - gx);
	// Flag as mirror
	out.mirror.a = 1.0 - center - edge;


	var q = fractalNoise(in.worldPosition, 20.0, 5);
	q = smoothstep(-0.4, 1.0, q);

	// Magic numbers change type of reflection
	out.mirror.r = q;
	out.bloom = vec4(lineColor.rgb * min(1.0, center), 1.0);
	out.bloom.a = center - edge;

	out.color = color;
	return out;
}

fn edgeDistance(barycentric: vec3<f32>, thickness: f32, s: f32) -> f32 {
	let dx = dpdx(barycentric);
	let dy = dpdy(barycentric);
	let d = sqrt(dx * dx + dy * dy) * thickness;
	let a = smoothstep(d * s, d, barycentric);
	return min(min(a.x, a.y), a.z);
}
