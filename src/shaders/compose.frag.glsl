#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D g_albedo;
uniform sampler2D g_position;

in vec2 uv;

out vec4 outColor;

void main(void) {
	vec4 color = texture(g_albedo, uv);
	vec4 color2 = texture(g_position, uv);
	if (uv.x < 0.5) {
		outColor = color;
	} else {
		outColor = color2;
	}
}
