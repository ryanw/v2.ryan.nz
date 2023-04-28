#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D frame;

in vec3 vPosition;
in vec2 vTexCoord;

out vec4 outColor;

void main(void) {
	outColor = vec4(vTexCoord, 1.0, 1.0);
}
