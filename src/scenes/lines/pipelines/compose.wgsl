@include 'engine/noise.wgsl';
@include 'engine/color.wgsl';

const STAR_CELL_SIZE: f32 = 92.0;

struct Uniforms {
	t: f32
}

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

@group(0) @binding(1)
var albedo: texture_2d<f32>;

@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> VertexOut {
	var out: VertexOut;

	let points = array<vec2<f32>, 4>(
		vec2(-1.0, -1.0),
		vec2(1.0, -1.0),
		vec2(-1.0, 1.0),
		vec2(1.0, 1.0)
	);

	out.position = vec4(points[i], 0.0, 1.0);
	out.uv = points[i] * 0.5;

	return out;
}


fn toneMap(color: vec3<f32>) -> vec3<f32> {
	let a = 2.51;
	let b = 0.03;
	let c = 2.43;
	let d = 0.59;
	let e = 0.14;
    return (color * (a * color + b)) / (color * (c * color + d) + e);
}

fn starPosition(id: vec2<f32>) -> vec2<f32> {
	let n0 = rnd3(vec3(id, 10.0));
	let n1 = rnd3(vec3(id, 20.0));
	let n2 = rnd3(vec3(id, 30.0));
	let t = 314.0 + u.t * n2 / 2.0;

	return sin(vec2(n0, n1) * t) * 0.3;
}

fn sdfLine(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
	let pa = p - a;
	let ba = b - a;
	let t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
	return length(pa - ba * t);
}

fn drawStar(uv: vec2<f32>) -> vec4<f32> {
	let d = length(uv);
	var m = 1.0 / 64.0 / d;//smoothstep(0.2, 0.05, d);
	var rays = max(0.0, 1.0 - abs(uv.x * uv.y * 200.0));
	m += smoothstep(0.05, 0.8, rays / 5.0);
	m = pow(m, 1.8);

	return vec4(vec3(m), 1.0);
}

fn drawLine(ouv: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> vec4<f32> {
	let uv = ouv - 0.5;
	var n = sdfLine(uv, a, b);
	let da = length(uv - a);
	let db = length(uv - b);
	
	var d = min(da, db);
	let f = 256.0;

	// Thickness
	n = smoothstep(1.0 / (f * d), 0.0, n);

	// Distance
	let l = length(b - a);
	n *= smoothstep(0.9, 0.5, l);

	return mix(vec4(0.0), vec4(0.7, 0.9, 0.1, 1.0), n);
}

fn drawStarField(ouv: vec2<f32>) -> vec4<f32> {
	let box = STAR_CELL_SIZE;
	let size = vec2(1.0) / vec2<f32>(textureDimensions(albedo));
	let uv = ouv / (size * box);

	let gv = fract(uv) - 0.5;
	let id = floor(uv);

	var color = vec4(0.0);
	var p: array<vec2<f32>, 9>;
	var i = 0;
	for (var y = -1; y <= 1; y++) {
		for (var x = -1; x <= 1; x++) {
			let tile = vec2(f32(x), f32(y));
			let offset = starPosition(id - tile);
			p[i] = id - tile - offset;
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

fn drawDebugSky(ouv: vec2<f32>) -> vec4<f32> {
	let box = STAR_CELL_SIZE;
	let size = vec2(1.0) / vec2<f32>(textureDimensions(albedo));
	let uv = ouv / (size * box);
	let gv = fract(uv) - 0.5;
	let id = floor(uv);

	let n0 = rnd3(vec3(id, 100.0));

	return hsl(n0, 1.0, 0.5);
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
	let coord = vec2<u32>(in.position.xy);
	var albedo = textureLoad(albedo, coord, 0);

	var color = vec4(0.0);
	let skyTopColor = vec4(0.3, 0.1, 0.7, 1.0);
	let skyMidColor = vec4(0.8, 0.1, 0.9, 1.0);
	let skyBotColor = vec4(0.9, 0.7, 0.1, 1.0);
	let sky = smoothstep(-0.1, 0.5, in.uv.y);
	let haze = smoothstep(-0.2, 0.4, in.uv.y);
	let stars = smoothstep(0.0, 0.5, in.uv.y);
	var skyColor = mix(skyMidColor, skyTopColor, sky);
	skyColor = mix(skyBotColor, skyColor, haze);


	var starColor = drawStarField(in.uv);
	//starColor *= drawDebugSky(in.uv);
	skyColor += starColor * starColor.a * stars;
	//skyColor = starColor;
	//skyColor += drawDebugSky(in.uv) / 5.0;

	color = albedo;

	var rgb = vec3(0.0);
	rgb = color.rgb;
	rgb = pow(rgb, vec3(2.2));
	//rgb = toneMap(rgb);
	//rgb += color.rgb - vec3(1.0);
	color = vec4(rgb * color.a, color.a);

	color = mix(skyColor, color, color.a);

	return color;
}
