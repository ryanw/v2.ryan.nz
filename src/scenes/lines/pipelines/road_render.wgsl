@include 'engine/noise.wgsl';

struct Camera {
	view: mat4x4<f32>,
	projection: mat4x4<f32>,
	resolution: vec2<f32>,
	t: f32,
}

struct Entity {
	model: mat4x4<f32>,
}

@group(0) @binding(0)
var<uniform> camera: Camera;
@group(0) @binding(1)
var<uniform> entity: Entity;

var<private> lightPosition = vec3(0.0, 64.0, 0.0);

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) worldPosition: vec3<f32>,
	@location(1) barycentric: vec3<f32>,
	@location(2) dist: f32,
}

const quad = array<vec3<f32>, 4>(
	vec3(-1.0, 0.0, -1.0),
	vec3( 1.0, 0.0, -1.0),
	vec3(-1.0, 0.0,  1.0),
	vec3( 1.0, 0.0,  1.0)
);

const barycentrics = array<vec3<f32>, 3>(
	vec3(1.0, 0.0, 0.0),
	vec3(0.0, 1.0, 0.0),
	vec3(0.0, 0.0, 1.0),
);

@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> VertexOut {
	var out: VertexOut;

	let p = quad[i];

	let mv = camera.view * entity.model;
	let mvp = camera.projection * mv;

	let position = mvp * vec4(p, 1.0);
	let worldPosition = entity.model * vec4(p, 1.0);

	out.position = position;
	out.worldPosition = worldPosition.xyz / worldPosition.w;
	out.barycentric = barycentrics[i % 3];

	let viewPosition = mv * vec4(p, 1.0);
	var tt = abs(viewPosition.z) / 100.0;
	out.dist = tt;

	return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
	var color = vec4(0.0, 0.0, 0.0, 1.0);

	let normal = vec3(0.0, 1.0, 0.0);
	let lightDir = normalize(lightPosition - in.worldPosition);
	let shade = clamp(dot(normal, lightDir), 0.0, 1.0);

	let lineColor = vec4(1.0, 1.0, 0.1, 1.0);

	let linePos = (sin(in.worldPosition.z / 0.5));
	var center = smoothstep(0.0, 1.0 / 100.0, linePos);

	center *= 1.0 - smoothstep(0.1, 0.12, abs(in.worldPosition.x));
	color = mix(color, lineColor, center);

	var edge = smoothstep(2.9, 2.9, abs(in.worldPosition.x));

	let nearColor = vec4(1.0, 0.1, 1.0, 1.0);
	let farColor = vec4(0.1, 0.8, 1.0, 1.0);
	//let edgeColor = vec4(0.9, 0.1, 0.9, 1.0);
	let edgeColor = mix(nearColor, farColor, smoothstep(0.0, 1.0, in.dist));

	color = mix(color, edgeColor, edge);

	return color;
}
