struct Camera {
	view: mat4x4<f32>,
	projection: mat4x4<f32>,
	resolution: vec2<f32>,
}

struct Entity {
	model: mat4x4<f32>,
}

struct Wire {
	start: vec3<f32>,
	end: vec3<f32>,
	size: vec2<f32>,
	color: vec4<f32>,
	style: u32,
}

@group(0) @binding(0)
var<uniform> camera: Camera;

@group(0) @binding(1)
var<uniform> entity: Entity;

@group(1) @binding(0)
var<storage, read> lines: array<Wire>;

const offsets = array<vec2<f32>, 4>(
	vec2(1.0, 1.0),
	vec2(-1.0, 1.0),
	vec2(1.0, -1.0),
	vec2(-1.0, -1.0),
);

struct WireVertex {
	@builtin(instance_index) instanceId: u32,
	@builtin(vertex_index) vertexId: u32,
}
struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
	@location(1) @interpolate(flat) style: u32,
	@location(2) color: vec4<f32>,
	@location(3) size: vec2<f32>,
	@location(4) @interpolate(flat) instanceId: u32,
	@location(5) depth: f32,
	@location(6) t: f32,
}

fn rot2d(angle: f32) -> mat2x2<f32> {
	let c = cos(angle);
	let s = sin(angle);
	return mat2x2<f32>(c, s, -s, c);
}

fn scale2d(x: f32, y: f32) -> mat2x2<f32> {
	return mat2x2(
		x,   0.0,
		0.0, y
	);
}

fn scaling(x: f32, y: f32, z: f32, w: f32) -> mat4x4<f32> {
	return mat4x4(
		x, 0.0, 0.0, 0.0,
		0.0, y, 0.0, 0.0,
		0.0, 0.0, z, 0.0,
		0.0, 0.0, 0.0, w
	);
}

@vertex
fn vs_main(in: WireVertex) -> VertexOut {
	var out: VertexOut;

	let line = lines[in.instanceId];
	let vertexOffset = offsets[in.vertexId];

	let mvp = camera.projection * camera.view * entity.model;
	let vp = camera.projection * camera.view;
	let res = camera.resolution;
	let aspect = vec2(res.x / res.y, res.y / res.x);

	let start = line.start;
	let end = line.end;



	// Transform line end point positions in 3D world space
	let ps = mvp * vec4(start, 1.0);
	let pe = mvp * vec4(end, 1.0);
	// Discard lines that go behind the camera
	// FIXME clip lines instead
	if ps.z < 0.0 || pe.z < 0.0 {
		out.color = vec4(0.0);
		return out;
	}

	// Transform from 3D world space to 2D screen space
	let scale = scaling(aspect.x, 1.0, 1.0, 1.0);
	let pss = (scale * ps);
	let pes = (scale * pe);
	let p0 = pss.xy / pss.w;
	let p1 = pes.xy / pes.w;
	let d = dot(vec2(0.0, 1.0), normalize(p1 - p0));


	// How thick our line is
	let s = line.size / camera.resolution;
	let offset = vec2(s.y + length(p1 - p0) / 2.0, s.y) * vertexOffset;


	var ac = acos(d);
	if p0.x < p1.x {
		ac *= -1.0;
	}

	var p = (p0 + p1) / 2.0;
	p += rot2d(ac + (3.14 / 2.0)) * offset;
	p *= scale2d(aspect.y, 1.0);


	let hl = camera.view * entity.model * vec4(mix(start, end, vertexOffset.x * 0.5 + 0.5), 1.0);
	let l = (hl / hl.w).xyz;
	//let depth = abs(length(l)) / 1000.0;

	let depth = ((pes.z / pes.w) + (pss.z / pss.w)) / 2.0;


	out.position = vec4(p, depth, 1.0);
	out.uv = vertexOffset;
	out.size = line.size;
	out.style = line.style;
	out.instanceId = in.instanceId;
	out.depth = depth;
	out.color = line.color;

	return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
	let line = lines[in.instanceId];
	let edge = length(vec2(dpdx(in.uv.x), dpdy(in.uv.x)));
	let x = abs(in.uv.x);
	let d0 = edge * line.size.y / 2.0;
	let d1 = 1.0 - d0;
	let d2 = (x - d1) * (1.0 / d0);


	var alpha = 0.0;

	if x > d1 {
		// End cap
		let tx = abs(d2);
		let ty = abs(in.uv.y);
		let tuv = vec2(tx, ty);
		alpha = 1.0 - length(tuv);
	} else {
		// Middle
		alpha = 1.0 - abs(in.uv.y);
	}

	let aa = 0.0;
	let t = 1.0 / in.size.y;
	alpha = smoothstep(0.0, t * aa, alpha);

	var color = in.color;
	//color = mix(color, vec4(color.rgb * 0.01, color.a), smoothstep(0.0, 1.0 / 100.0, in.depth));
	//return vec4(in.uv * 0.5 + 0.5, 0.0, 1.0);
	if alpha == 0.0 {
		// Don't write to depth
		discard;
	}
	return vec4(color.rgb, color.a * alpha);
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
	return a * (1.0 - t) + b * t;
}

fn lsmoothstep(a: f32, b: f32, t: f32) -> f32 {
	return a + (b - a) * clamp(t, 0.0, 1.0);
}
