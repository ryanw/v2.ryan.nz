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
	@location(5) seed: f32,
}

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(1) worldPosition: vec3<f32>,
	@location(2) barycentric: vec3<f32>,
	@location(3) normal: vec3<f32>,
	@location(4) wireColor: vec4<f32>,
	@location(5) faceColor: vec4<f32>,
	@location(6) depth: f32,
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

@group(1) @binding(1)
var heightmap: texture_2d<f32>;

var<private> lightPosition = vec3(0.0, 64.0, 0.0);

fn getDisplacement(p: vec2<f32>, multisample: bool) -> f32 {
	let texSize = vec2<f32>(textureDimensions(heightmap)) - vec2(1.0);

	let uv = p * texSize;

	let uvFloor = max(vec2(0.0), floor(uv));
	let uvFract = fract(uv);

	let t0 = textureLoad(heightmap, vec2<i32>(uvFloor), 0).r;
	if multisample {
		let t1 = textureLoad(heightmap, vec2<i32>(uvFloor) + vec2(1, 0), 0).r;
		let t2 = textureLoad(heightmap, vec2<i32>(uvFloor) + vec2(0, 1), 0).r;
		let t3 = textureLoad(heightmap, vec2<i32>(uvFloor) + vec2(1, 1), 0).r;

		let t4 = mix(t0, t1, uvFract.x);
		let t5 = mix(t2, t3, uvFract.x);

		let t6 = mix(t4, t5, uvFract.y);

		return t6;
	} else {
		return t0;
	}
}

@vertex
fn vs_main(in: WireVertex) -> VertexOut {
	var out: VertexOut;
	let mv = u.camera.view * entity.model;
	let mvp = u.camera.projection * mv;

	let worldPosition = entity.model * vec4(in.position, 1.0);

	var p = in.position.xz;

	let displacement = getDisplacement(p, true);
	var displaceAmount = 1.0 / 48.0;
	if (displaceAmount > 0.0) {
		// Flatten around road
		displaceAmount *= smoothstep(0.2, 2.0, abs(worldPosition.x / worldPosition.w) / 8.0);
	}

	let vp = mv * vec4(in.position, 1.0);
	let viewPosition = vp.xyz / vp.w;
	let dist = length(viewPosition.xz);

	var offset = vec3(0.0, displacement * displaceAmount, 0.0);
	let dir = vec3(
		rnd3(vec3(in.seed, 0.0, 0.0)) - 0.5,
		rnd3(vec3(0.0, in.seed, 0.0)) - 0.5,
		rnd3(vec3(0.0, 0.0, in.seed)) - 0.5
	);

	//offset.y += abs(dir.y) * (in.seed / 1.0) * max(0.0, ((dir.x * 100.0) - (u.t * 4.0)) * 1.0);

	let n0 = rnd3(vec3(in.seed)) * 1.0 + sin(u.t * 2.0 + (fract(in.seed * 10.0) * 13.0)) / 20.0;
	let n1 = rnd3(vec3(in.seed * -10.0)) - 0.5;
	let n2 = rnd3(vec3(in.seed * 10.0)) - 0.5;
	let am = n1 * 1000.0;
	var f = smoothstep(0.0, 1.0, dist);
	f = clamp(pow(f/80.0, 4.0), 0.0, 1.0);
	offset.y -= n0 * f;

	let position = mvp * vec4(in.position + offset, 1.0);
	let normal = normalize((entity.model * vec4(in.normal, 0.0)).xyz);
	out.position = position;
	out.worldPosition = worldPosition.xyz / worldPosition.w;
	out.normal = normal;
	out.barycentric = in.barycentric;
	out.wireColor = mix(vec4(0.1, 0.9, 0.4, 1.0), vec4(0.5, 0.7, 0.1, 1.0), displacement);
	out.faceColor = in.faceColor;
	let relPos = u.camera.view * worldPosition;
	out.depth = abs(length(relPos.xyz / relPos.w)) / 256.0;
	return out;
}


@fragment
fn fs_main(in: VertexOut) -> FragmentOut {
	var out: FragmentOut;
	var color = vec4(1.0);

	let lightDir = normalize(lightPosition - in.worldPosition);
	let shade = clamp(dot(in.normal, lightDir), 0.0, 1.0);


	color = vec4(0.0);


	let g = edgeDistance(in.barycentric, 1.2, 0.2);

	let wire = in.wireColor;
	let face = in.faceColor;
	//let face = vec4(vec3(length(in.viewPosition / 50.0)), 1.0);

	let n = 0.01;
	out.color = mix(wire, face, g);
	out.bloom = mix(vec4(0.0), wire, (1.0 - g) / 5.0);
	out.mirror = vec4(0.0);

	return out;
}

fn edgeDistance(barycentric: vec3<f32>, thickness: f32, s: f32) -> f32 {
	let dx = dpdx(barycentric);
	let dy = dpdy(barycentric);
	let d = sqrt(dx * dx + dy * dy) * thickness;
	let a = smoothstep(d * s, d, barycentric);
	return min(min(a.x, a.y), a.z);
}
