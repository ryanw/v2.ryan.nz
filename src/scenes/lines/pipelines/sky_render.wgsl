@include 'engine/noise.wgsl';
@include 'engine/color.wgsl';

const PI: f32 = 3.14159265359;

const STAR_CELL_SIZE: f32 = 32.0;

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


	let lat = asin(rd.y);
	let lon = atan2(rd.x, rd.z);

	var line = abs(fract(lat * 4.0) * 2.0 - 1.0);
	line = max(line, abs(fract(lon * 6.0) * 2.0 - 1.0));

	let cell = vec2(lon / PI, lat / PI);

	let starColor = drawStarField(cell) / 2.0;


	let skyTopColor = vec4(0.57, 0.3, 0.85, 1.0);
	let skyMidColor = vec4(0.9, 0.3, 0.95, 1.0);
	let skyBotColor = vec4(0.95, 0.85, 0.3, 1.0);
	let sky = smoothstep(-0.2, 0.4, lat);
	let haze = smoothstep(-0.2, 0.5, lat);
	let stars = smoothstep(0.0, 0.9, lat);
	var skyColor = mix(skyMidColor, skyTopColor, sky);
	skyColor = mix(skyBotColor, skyColor, haze);
	skyColor += starColor * starColor.a * stars;

	color = skyColor;
	return color;
}

fn drawStarField(ouv: vec2<f32>) -> vec4<f32> {
	let uv = ouv * STAR_CELL_SIZE;

	let gv = fract(uv) - 0.5;
	let id = floor(uv);

	var color = vec4(0.0);
	var p: array<vec2<f32>, 9>;
	var i = 0;
	for (var y = -1; y <= 1; y++) {
		for (var x = -1; x <= 1; x++) {
			let tile = vec2(f32(x), f32(y));
			var nid = id - tile;
			var offset = vec2(0.0);
			if nid.x < -STAR_CELL_SIZE {
				offset = starPosition(nid + vec2(STAR_CELL_SIZE * 2.0, 0.0));
				p[i] = nid - offset;
			}
			else if nid.x == STAR_CELL_SIZE {
				offset = starPosition(nid - vec2(STAR_CELL_SIZE * 2.0, 0.0));
				p[i] = nid - offset;
			}
			else {
				offset = starPosition(nid);
				p[i] = nid - offset;
			}
			i += 1;

			let pos = gv + tile + offset;
			color = max(color, drawStar(pos));
		}
	}

	for (i = 0; i < 9; i++) {
		if i != 4 {
			color = max(color, drawLine(uv, p[4], p[i]));
		}
	}
	color = max(color, drawLine(uv, p[1], p[3]));
	color = max(color, drawLine(uv, p[1], p[5]));
	color = max(color, drawLine(uv, p[5], p[7]));
	color = max(color, drawLine(uv, p[7], p[3]));


	return color;
}

fn drawStar(uv: vec2<f32>) -> vec4<f32> {
	let d = length(uv);
	var m = 1.0 / 32.0 / d;
	var rays = max(0.1, 1.0 - abs(uv.x * uv.y * 200.0));
	m += smoothstep(0.1, 0.8, rays / 3.0);

	return vec4(vec3(m), 1.0);
}

fn starPosition(id: vec2<f32>) -> vec2<f32> {
	let n0 = rnd3(vec3(id, 10.0));
	let n1 = rnd3(vec3(id, 20.0));
	let n2 = rnd3(vec3(id, 30.0));
	let t = 314.0 + camera.t * n2 / 2.0;

	return sin(vec2(n0, n1) * t) * 0.3;
}

fn drawLine(ouv: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> vec4<f32> {
	let uv = ouv - 0.5;
	var n = sdfLine(uv, a, b);

	// Thickness
	n = smoothstep(1.0 / 20.0, 0.0, n);

	// Distance
	let l = length(b - a);
	n *= smoothstep(1.3, 0.1, l);

	return mix(vec4(0.0), vec4(1.0), n);
}

fn sdfLine(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
	let pa = p - a;
	let ba = b - a;
	let t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
	return length(pa - ba * t);
}
