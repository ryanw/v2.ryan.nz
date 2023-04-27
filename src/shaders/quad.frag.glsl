#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 uv;
in vec2 pos;
uniform sampler2D frame;
uniform bool antialias;

out vec4 outColor;

void main(void) {
	outColor = vec4(1.0, 0.0, 0.0, 1.0);
}
