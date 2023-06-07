struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
}

struct Uniforms {
	shading: u32,
	pixelated: vec2<u32>,
}

@group(0) @binding(0)
var inInk: texture_2d<f32>;
@group(0) @binding(1)
var inPaper: texture_2d<f32>;
@group(0) @binding(2)
var inShade: texture_2d<f32>;
@group(0) @binding(3)
var<uniform> u: Uniforms;

const ditherMatrix = mat4x4(
	0.0000, 0.5000, 0.1250, 0.6250,
	0.7500, 0.2500, 0.8750, 0.3750,
	0.1875, 0.6875, 0.0625, 0.5625,
	0.9375, 0.4375, 0.8125, 0.3125
);

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


	let ink = textureLoad(inInk, coord / u.pixelated, 0);
	let paper = textureLoad(inPaper, coord / u.pixelated, 0);
	let shade = textureLoad(inShade, coord, 0).r;

	switch (u.shading) {
		// None
		case 0: {
			if (coord.x + coord.y) % 2 == 0 {
				return ink;
			} else {
				return paper;
			}
		}

		// Flat shading
		case 1: {
			return mix(paper, ink, shade);
		}

		// Dithered shading
		case 2: {
			let shadeLevels = 1.0;
			let div = 1.0;
			let ditherCoord = vec2(i32(in.position.x / div) % 4, i32(in.position.y / div) % 4);
			let ditherVal = ditherMatrix[ditherCoord.x][ditherCoord.y];
			let g = clamp(floor(shade * shadeLevels + ditherVal) / shadeLevels, 0.0, 1.0);
			return mix(paper, ink, g);
		}

		// Shade
		case 3: {
			return vec4(vec3(shade), 1.0);
		}

		// Ink only
		case 4: {
			return ink;
		}

		// Paper only
		case 5: {
			return paper;
		}

		default: {
			return paper;
		}
	}
}
