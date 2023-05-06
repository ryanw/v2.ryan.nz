#version 300 es
precision highp float;

in vec2 uv;

layout(location = 0) out vec4 outAlbedo;
layout(location = 1) out vec4 outPosition;
layout(location = 2) out vec4 outNormal;
layout(location = 3) out vec4 outSpecular;

void main(void) {
	vec4 color = vec4(uv, 1.0, 1.0);
	outAlbedo = color;
}
