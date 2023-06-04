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
var<uniform> entity: Entity;

@group(1) @binding(0)
var<uniform> u: Uniforms;

var<private> lightPosition = vec3(0.0, 64.0, 0.0);

fn noise(pp: vec2<f32>) -> f32 {
	let d = 16.0;
	let m = 32.0;
	let p = pp / d;

	return ((sin(p.x) * sin(p.y)) * 0.5 + 0.5) * m;
}

@vertex
fn vs_entity_main(in: WireVertex) -> VertexOut {
	return entity_main(in);
}
fn entity_main(in: WireVertex) -> VertexOut {
	var out: VertexOut;
	let mv = u.camera.view * entity.model;
	let mvp = u.camera.projection * mv;

	let worldPosition = entity.model * vec4(in.position, 1.0);
	let position = mvp * vec4(in.position, 1.0);
	let normal = normalize((entity.model * vec4(in.normal, 0.0)).xyz);
	out.position = position;
	out.worldPosition = worldPosition.xyz / worldPosition.w;
	out.normal = normal;
	out.fgColor = in.fgColor;
	out.bgColor = in.bgColor;
	return out;
}

@vertex
fn vs_chunk_main(in: WireVertex) -> VertexOut {
	var out = entity_main(in);
	let center = vec2(out.worldPosition.x, out.worldPosition.z);
	let e = 1.0;
	let y = noise(center);
	let sx0 = noise(center + vec2(-e, 0.0));
	let sx1 = noise(center + vec2(e, 0.0));
	let sy0 = noise(center + vec2(0.0, -e));
	let sy1 = noise(center + vec2(0.0, e));

	let slopex = sx0 - sx1;
	let slopey = sy0 - sy1;
	let sx = vec3(0.0, slopex, 1.0);
	let sy = vec3(1.0, slopey, 0.0);
	let n = cross(sx, sy);
	out.normal = normalize(n);

	let offset = vec4(0.0, y, 0.0, 0.0);
	out.position += offset;
	return out;
}


@fragment
fn fs_ink_main(in: VertexOut) -> InkFragmentOut {
	var out: InkFragmentOut;
	var color = vec4(1.0);

	let lightDir = normalize(lightPosition - in.worldPosition);
	let shade = clamp(dot(in.normal, lightDir), 0.0, 1.0);


	color = vec4(0.0);


	var a = in.fgColor.a;
	out.ink = in.fgColor;
	//out.ink = vec4(in.normal, 1.0);
	out.shade = shade;
	out.depth = in.position.z / a;
	return out;
}

@fragment
fn fs_paper_main(in: VertexOut) -> PaperFragmentOut {
	var out: PaperFragmentOut;
	var color = vec4(1.0);

	let lightDir = normalize(lightPosition - in.worldPosition);
	let shade = clamp(dot(in.normal, lightDir), 0.0, 1.0);


	color = vec4(0.0);


	var a = in.bgColor.a;
	out.paper = in.bgColor;
	//out.paper = vec4(in.normal, 1.0);
	out.depth = in.position.z / a;
	return out;
}
