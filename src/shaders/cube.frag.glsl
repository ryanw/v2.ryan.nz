#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D frame;

in vec3 vPosition;
in vec2 vTexCoord;

layout(location = 0) out vec4 outAlbedo;
layout(location = 1) out vec4 outPosition;

void main(void) {
	outAlbedo = vec4(vTexCoord, 1.0, 1.0);
	outPosition = vec4(vPosition, 1.0);
}
