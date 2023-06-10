@include 'engine/noise.wgsl';

const ENABLE_REFLECTIONS: bool = true;

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
}

struct Uniforms {
	reflection: u32,
}

@group(0) @binding(0)
var inAlbedo: texture_2d<f32>;
@group(0) @binding(1)
var inBloom: texture_2d<f32>;
@group(0) @binding(2)
var inMirror: texture_2d<f32>;
@group(0) @binding(3)
var inReflection: texture_2d<f32>;
@group(0) @binding(4)
var inDepth: texture_2d<f32>;
@group(0) @binding(5)
var<uniform> u: Uniforms;

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

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
	let coord = vec2<u32>(in.position.xy);

	var albedo = textureLoad(inAlbedo, coord, 0);
	var bloom = textureLoad(inBloom, coord, 0);
	var depth = textureLoad(inDepth, coord, 0).r;

	if ENABLE_REFLECTIONS {
		var reflection = textureLoad(inReflection, coord, 0);
		var mirror = textureLoad(inMirror, coord, 0);

		if u.reflection > 0 && mirror.a > 0.0 {

			if true {
				var mirrorColor = vec4(0.0);
				if mirror.r > 0.0 {
					reflection = blur(inReflection, vec2<i32>(coord), 3, 4);
					mirrorColor = mix(vec4(0.15, 0.15, 0.15, 1.0), reflection, 0.15);
				}
				else {
					reflection = blur(inReflection, vec2<i32>(coord), 1, 2);
					mirrorColor = mix(vec4(0.15, 0.15, 0.15, 1.0), reflection, 0.4);
				}
				// FIXMe make noise relative to work instead of screen
				var q = fractalNoise(in.position.xyy, 200.0, 1) / 2.0;
				albedo = mix(albedo, mirrorColor, mirror.a - q);
			}
			else {
				if mirror.r > 0.0 {
					albedo = mix(reflection, vec4(0.1, 0.1, 0.9, 1.0), 0.4);
				} else {
					albedo = mix(reflection, vec4(0.9, 0.1, 0.1, 1.0), 0.4);
				}
			}
		}
	}

	let fog = smoothstep(0.8, 1.0, pow(depth * 2.0, 90.0));
	//let fogColor = vec4(0.15, 0.05, 0.2, 1.0);
	let fogColor = vec4(0.5, 0.05, 0.8, 1.0);
	//albedo = mix(albedo, fogColor, fog);
	//albedo.a = 1.0 - fog;
	//bloom = mix(bloom, vec4(0.0, 0.0, 0.0, 1.0), fog);

/*
	var color = albedo + bloom * 0.33;
	//color = mix(color, vec4(0.3, 0.1, 0.3, 1.0), fog);
	if (depth == 1.0) {
		// Transparent sky
		if u.reflection > 0 {
			let m = smoothstep(0.5, 0.7, in.uv.y);
			color = mix(color, vec4(0.0), clamp(m, 0.0, 1.0));
		} else {
			let m = smoothstep(0.5, 0.7, 1.0 - in.uv.y);
			color = mix(color, vec4(0.0), clamp(m, 0.0, 1.0));
		}
	}
*/

	var color = albedo;
	//color.a = clamp(1.0 - fog, 0.0, 1.0);
	bloom = vec4(bloom.rgb * bloom.a, bloom.a);
	bloom *= 0.33;
	color += bloom;
	
	return vec4(color.rgb * color.a, color.a);
}

fn blur(tex: texture_2d<f32>, coord: vec2<i32>, kernel: i32, spread: i32) -> vec4<f32> {
	var color = vec4(0.0);
	for (var y = -kernel; y <= kernel; y += 1) {
		for (var x = -kernel; x <= kernel; x += 1) {
			let offset = vec2(x * spread / 2, y * spread * 2);
			color += textureLoad(tex, coord + offset, 0);
		}
	}
	let k = 2.0 * f32(kernel) + 1.0;
	color = color / (k * k);

	return color;
}
