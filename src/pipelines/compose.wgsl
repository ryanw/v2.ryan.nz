@group(0) @binding(0)
var inColor: texture_2d<u32>;
@group(0) @binding(1)
var inPosition: texture_2d<f32>;
@group(0) @binding(2)
var inNormal: texture_2d<f32>;

struct VertexOut {
	@builtin(position) position: vec4<f32>,
	@location(0) uv: vec2<f32>,
}

struct Uniforms {
	pixelated: u32,
	shading: u32,
}

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
	let coord = vec2<i32>(in.position.xy);

	let colorPair = textureLoad(inColor, coord, 0);
	let fg = (colorPair & vec4(0x0f));
	let bg = ((colorPair & vec4(0xf0)) >> vec4(4u)) & vec4(0x0f);
	let fgColor = vec4<f32>(fg) / 15.0;
	let bgColor = vec4<f32>(bg) / 15.0;


	let pos = textureLoad(inPosition, coord, 0).xyz;
	if pos.x == 0.0 && pos.y == 0.0 && pos.z == 0.0 {
		//return vec4(0.0, 0.0, 0.0, 1.0);
	}

	let normal = textureLoad(inNormal, coord, 0).xyz;


	let lightPosition = vec3(0.0, 8.0, 40.0);
	let lightDir = normalize(lightPosition - pos);
	let shade = clamp(dot(normal, lightDir), 0.0, 1.0);

	switch (u.shading) {
		// None
		case 0: {
			return fgColor;
		}

		// Flat shading
		case 1: {
			return mix(fgColor, bgColor, shade);
		}

		// Dithered shading
		case 2: {
			let shadeLevels = 1.0;
			let div = 1.0;
			let ditherCoord = vec2(i32(in.position.x / div) % 4, i32(in.position.y / div) % 4);
			let ditherVal = ditherMatrix[ditherCoord.x][ditherCoord.y];
			let g = clamp(floor(shade * shadeLevels + ditherVal) / shadeLevels, 0.0, 1.0);
			return mix(fgColor, bgColor, g);
		}

		// Position
		case 3: {
			let s = 1.0;
			let r = 128.0;
			return vec4(((pos.xyz / s) % r) / r, 1.0);
		}

		default: {
			return bgColor;
		}
	}
}
