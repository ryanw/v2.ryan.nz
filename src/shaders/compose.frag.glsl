#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 uv;

out vec4 outColor;

void main(void) {
	outColor = vec4(uv, 1.0, 1.0);
}
