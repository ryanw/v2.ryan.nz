@include 'engine/noise.wgsl';
@include 'engine/color.wgsl';

const PI: f32 = 3.14159265359;

struct Camera {
	view: mat4x4<f32>,
	invView: mat4x4<f32>,
	projection: mat4x4<f32>,
	resolution: vec2<f32>,
	t: f32,
}

@group(0) @binding(0)
var<uniform> camera: Camera;

var<private> lightPosition = vec3(0.0, 64.0, 0.0);

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
}

const quad = array<vec3<f32>, 4>(
	vec3(-1.0, 0.0, -1.0),
	vec3( 1.0, 0.0, -1.0),
	vec3(-1.0, 0.0,  1.0),
	vec3( 1.0, 0.0,  1.0)
);

@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> VertexOut {
	var out: VertexOut;

	let p = quad[i];

	let mv = camera.view;
	let mvp = camera.projection * mv;

	//let position = mvp * vec4(p, 1.0);
	let position = vec4(p.xz, 0.0, 1.0);

	out.position = position;
	out.uv = (p.xz * camera.resolution) / camera.resolution.y;

	return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
	var color = vec4(0.0, 0.0, 0.0, 1.0);

	// FIXME calculate from projection matrix
	let zoom = 1.222222;

	let hlookAt = camera.invView * vec4(0.0, 0.0, -1.0, 1.0);
	let lookAt = hlookAt.xyz / hlookAt.w;

	let hro = camera.invView * vec4(0.0, 0.0, 0.0, -1.0);
	let ro = hro.xyz / hro.w;
	let f = normalize(lookAt - ro);
	let r = normalize(cross(vec3<f32>(0.0, -1.0, 0.0), f));

	let rd = normalize((camera.invView * vec4(in.uv, -zoom, 0.0)).xyz);
	let nrd = rd * 0.5 + 0.5;


/*

	let gv = fract(nrd * 8.0);
	let id = floor(nrd * 8.0);

	let t0 = smoothNoise(nrd * 128.0);
	let t1 = rnd3(id);

	let n0 = fractalNoise(nrd + vec3(0.0, 0.0, camera.t / 100.0), 1024.0, 3);
	let n1 = smoothstep(-0.3, -0.2, n0);
	let n2 = n1 - smoothstep(-0.2, -0.1, n0);

	color = vec4(vec3(n2), 1.0);
	*/

	let lat = asin(rd.y);
	let lon = atan2(rd.x, rd.z);

	var line = abs(fract(lat * 4.0) * 2.0 - 1.0);
	line = max(line, abs(fract(lon * 6.0) * 2.0 - 1.0));
	//line = smoothstep(0.4, 0.6, line);

	let cell = vec2(lon / PI, lat / PI) * 32.0;
	let gv = fract(cell);
	let id = floor(cell);

	let x = abs(gv.x * 2.0 - 1.0);
	let y = abs(gv.y * 2.0 - 1.0);
	let n0 = smoothstep(0.9333, 1.0, max(x, y));
	let n1 = rnd3(vec3(id, 0.0));
	let c0 = hsl(n1, 0.6, 0.2222);
	color = mix(c0, vec4(0.8, 0.9, 0.3, 1.0), n0);
	return color;
}

fn drawStar(uv: vec2<f32>) -> vec4<f32> {
	let d = length(uv);
	var m = 1.0 / 64.0 / d;//smoothstep(0.2, 0.05, d);
	var rays = max(0.0, 1.0 - abs(uv.x * uv.y * 200.0));
	m += smoothstep(0.05, 0.8, rays / 5.0);
	m = pow(m, 1.8);

	return vec4(vec3(m), 1.0);
}
