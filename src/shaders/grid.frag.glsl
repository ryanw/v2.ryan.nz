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
	vec3 d = sqrt(dx * dx + dy * dy) * thickness;
	vec3 a = smoothstep(vec3(0.0), d, barycentric);
	return min(min(a.x, a.y), a.z);
}

void main(void) {
	vec4 lineColor = vec4(0.224, 0.722, 1.000, 1.0);
	vec4 vertColor = vec4(1.000, 0.244, 0.224, 1.0);
	vec4 faceColor = vec4(0.051, 0.133, 0.286, 1.0);
	float edge = edgeDistance(vBarycentric, 2.0);
	float thickEdge = edgeDistance(vBarycentric, 16.0);
	vec4 color = mix(lineColor, faceColor, edge);

	// Add lights at intersections
	float m = 8.0;
	float d = pow(vBarycentric.r, m) + pow(vBarycentric.g, m) + pow(vBarycentric.b, m);
	color = mix(color, vertColor, d);

	// Add glow
	color = mix(color + lineColor * 0.2, color, thickEdge);

	outAlbedo = color;
	outPosition = vec4(vPosition, 1.0);
	outNormal = vec4(vBarycentric + vTexCoord.rgg, 1.0);
	outSpecular = vec4(lineColor.rgb * 2.0, 1.0 - thickEdge);
}
