#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D albedo;

in vec2 uv;

out vec4 outColor;

void main(void) {
	vec4 color = texture(albedo, uv);
	outColor = color;
}
