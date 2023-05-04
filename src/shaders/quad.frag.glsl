#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 uv;
in vec2 pos;
uniform sampler2D frame;

out vec4 outColor;

void main(void) {
	vec4 color = texture(frame, uv);
	outColor = color;
}
