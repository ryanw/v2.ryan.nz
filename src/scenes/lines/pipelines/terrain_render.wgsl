@include 'engine/noise.wgsl';

struct Camera {
	view: mat4x4<f32>,
	projection: mat4x4<f32>,
	resolution: vec2<f32>,
	t: f32,
}

struct Entity {
	model: mat4x4<f32>,
	offset: vec2<f32>,
	thickness: f32,
}

@group(0) @binding(0)
var<uniform> camera: Camera;
@group(0) @binding(1)
var<uniform> entity: Entity;
@group(0) @binding(2)
var heightmap: texture_2d<f32>;

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
	@location(5) height: f32,
}

const quadBarycentrics = array<vec3<f32>, 6>(
	vec3(1.0, 0.0, 1.0),
	vec3(0.0, 1.0, 1.0),
	vec3(0.0, 0.0, 1.0),

	vec3(1.0, 0.0, 0.0),
	vec3(1.0, 1.0, 0.0),
	vec3(1.0, 0.0, 1.0),
);


fn getDisplacement(p: vec2<f32>) -> f32 {
	let size = vec2<i32>(textureDimensions(heightmap));
	let texSize = vec2<f32>(size) - vec2(1.0);

	let uv = p * texSize;

	let uvFloor = floor(uv);
	let uvFract = fract(uv);

	return textureLoad(heightmap, vec2<i32>(uvFloor), 0).r;
}

@vertex
fn vs_main(in: Vertex) -> VertexOut {
	var out: VertexOut;

	let p = in.position.xz;
	let displacement = getDisplacement(p);

	var waterP = vec3((p + entity.offset) * 128.0, 0.0);
	waterP += vec3(camera.t * 9.0, camera.t * 5.0, camera.t * 1.0);
	//let waterLevel = (fractalNoise(waterP, 1.0, 2) / 60.0);
	let waterLevel = sin(camera.t * 2.0) / 120.0;

	var h = displacement / 10.0;
	h = max(waterLevel, h);

	let mv = camera.view * entity.model;
	let mvp = camera.projection * mv;

	let position = mvp * vec4(in.position + vec3(0.0, h, 0.0), 1.0);
	let normal = normalize((entity.model * vec4(in.normal, 0.0)).xyz);

	out.position = position;
	out.normal = normal;
	out.barycentric = quadBarycentrics[in.vertexId % 6];
	out.faceColor = in.faceColor;
	out.wireColor = in.wireColor;
	out.height = displacement - waterLevel * 8.0;

	return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
	var faceColor = in.faceColor;
	var wireColor = in.wireColor;

	let w = 0.2;
	if in.height < w {
		wireColor = mix(wireColor, vec4(0.01, 1.0, 1.0, 1.0), smoothstep(0.0, 0.3, abs(in.height - w)));
	}

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
