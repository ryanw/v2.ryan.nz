#version 300 es
precision highp float;

struct Plane {
	vec3 origin;
	vec3 normal;
};

uniform Plane plane;

in vec2 uv;

out vec4 outColor;

void main(void) {
	vec4 color = vec4(uv, plane.origin.x + plane.normal.x, 1.0);
	vec2 p = uv * 2.0 - 1.0;
	float a = smoothstep(0.0, 0.1, 1.0 - length(p));
	outColor = vec4(uv * 0.4, 0.0, a);
}
