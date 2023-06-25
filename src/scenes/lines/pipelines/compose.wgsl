@include 'engine/noise.wgsl';

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
	out.uv = points[i] * 0.5 + 0.5;

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
	let n0 = rnd3(vec3(id, 10.0)) * 1.0 * (100.0 + u.t);
	let n1 = rnd3(vec3(id, 20.0)) * 1.0 * (100.0 + u.t);
	return sin(vec2(n0, n1)) * 0.4;
}

fn drawStar(uv: vec2<f32>) -> vec4<f32> {
	var d = smoothstep(0.15, 0.0, length(uv));
	return vec4(vec3(d), 1.0);
}

fn drawStarField(ouv: vec2<f32>) -> vec4<f32> {
	let box = 24.0;
	let size = vec2(1.0) / vec2<f32>(textureDimensions(albedo));
	var uv = ouv / (size * box);

	let gv = fract(uv) - 0.5;
	let id = floor(uv);

	var color = vec4(0.0);
	for (var y = -1; y <= 1; y++) {
		for (var x = -1; x <= 1; x++) {
			let tile = vec2(f32(x), f32(y));
			let offset = starPosition(id + tile);
			color = max(color, drawStar(gv - tile - offset));
		}
	}
	return color;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
	let coord = vec2<u32>(in.position.xy);
	var albedo = textureLoad(albedo, coord, 0);

	var color = vec4(0.0);
	let skyTopColor = vec4(0.3, 0.1, 0.7, 1.0);
	let skyMidColor = vec4(0.8, 0.1, 0.9, 1.0);
	let skyBotColor = vec4(0.9, 0.7, 0.1, 1.0);
	let sky = smoothstep(0.4, 1.0, in.uv.y);
	let haze = smoothstep(0.2, 0.9, in.uv.y);
	let stars = smoothstep(0.6, 1.0, in.uv.y);
	var skyColor = mix(skyMidColor, skyTopColor, sky);
	skyColor = mix(skyBotColor, skyColor, haze);


	let starColor = drawStarField(in.uv);
	skyColor += starColor * starColor.a * stars;
	//skyColor = starColor;

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
