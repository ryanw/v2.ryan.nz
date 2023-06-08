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
	@location(0) terrainPosition: vec2<f32>,
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
	var displaceAmount = 1.0 / 24.0;
	if (displaceAmount > 0.0) {
		displaceAmount *= smoothstep(0.2, 2.0, abs(worldPosition.x / worldPosition.w) / 8.0);
	}

	out.terrainPosition = p;


	let position = mvp * vec4(in.position + vec3(0.0, displacement * displaceAmount, 0.0), 1.0);
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

	let displacement = getDisplacement(in.terrainPosition, true);
	let wire = in.wireColor;
	let face = in.faceColor;
	//let face = vec4(vec3(displacement), 1.0);
	//let face = vec4(vec3(in.terrainPosition, 0.0), 1.0);
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
