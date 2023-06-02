@group(0) @binding(0)
var inColor: texture_2d<f32>;
@group(0) @binding(1)
var inColorPixelated: texture_2d<f32>;

@group(0) @binding(2)
var inPixel: texture_2d<u32>;
@group(0) @binding(3)
var inNormal: texture_2d<f32>;

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
}

struct Uniforms {
	pixelated: u32,
	shading: u32,
}

@group(0) @binding(4)
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
	let coord = vec2<i32>(in.position.xy);
	let color = textureLoad(inColor, coord, 0);
	let colorPixelated = textureLoad(inColorPixelated, coord, 0);
	let pixel = textureLoad(inPixel, coord, 0);
	let normal = textureLoad(inNormal, coord, 0);

	var outputColor = vec4(color.rgb, 1.0);
	if u.pixelated > 0 {
		outputColor = vec4(colorPixelated.rgb, 1.0);
	}
	if u.shading == 0 {
		return outputColor;
	}
	if u.shading == 1 {
		return vec4(normal.rgb, 1.0);
	}
	if pixel.r > 0 {
		return outputColor;
	} else {
		return vec4(0.0, 0.0, 0.0, 1.0);
	}
}
