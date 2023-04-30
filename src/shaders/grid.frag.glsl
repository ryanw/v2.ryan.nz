#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D frame;

in vec3 vPosition;
in vec3 vSrcPosition;
in vec3 vBarycentric;
in vec2 vTexCoord;

layout(location = 0) out vec4 outAlbedo;
layout(location = 1) out vec4 outPosition;
layout(location = 2) out vec4 outNormal;
layout(location = 3) out vec4 outSpecular;

float edgeDistance(vec3 barycentric, float thickness) {
	vec3 dx = dFdx(barycentric);
	vec3 dy = dFdy(barycentric);
	vec3 d = sqrt(dx * dx + dy * dy);
	vec3 a = step(d * thickness, barycentric);
	return min(min(a.x, a.y), a.z);
}

void main(void) {
	vec3 c0 = vec3(1.0, 0.8, 0.1);
	vec3 c1 = vec3(0.3, 0.1, 0.8);
	vec3 color = mix(c0, c1, edgeDistance(vBarycentric, 1.0));
	outAlbedo = vec4(color, 1.0);
	outPosition = vec4(vPosition, 1.0);
	outNormal = vec4(vBarycentric, 1.0);
	outSpecular = vec4(vTexCoord, 0.0, 1.0);
}
