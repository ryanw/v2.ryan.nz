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
	float l = length(p);
	float a = smoothstep(0.0, fwidth(l) * 2.0, 1.0 - l);
	if (length(p) < 1.0) {
		outColor = vec4(0.0, 0.0, 0.0, a);
	}
}
