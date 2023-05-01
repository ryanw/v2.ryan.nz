#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D frame;

in vec3 vPosition;
in vec3 vSrcPosition;
in vec3 vBarycentric;
in vec2 vTexCoord;
in float vID;

layout(location = 0) out vec4 outAlbedo;
layout(location = 1) out vec4 outPosition;
layout(location = 2) out vec4 outNormal;
layout(location = 3) out vec4 outSpecular;

float edgeDistance(vec3 barycentric, float thickness, float s) {
	vec3 dx = dFdx(barycentric);
	vec3 dy = dFdy(barycentric);
	vec3 d = sqrt(dx * dx + dy * dy) * thickness;
	vec3 a = smoothstep(d * s, d, barycentric);
	return min(min(a.x, a.y), a.z);
}
float edgeDistance(vec3 barycentric, float thickness) {
	return edgeDistance(barycentric, thickness, 0.0);
}

void main(void) {
	vec4 lineColor = vec4(0.2, 0.7, 0.6, 1.0);
	vec4 vertColor = vec4(1.0, 0.2, 0.1, 1.0);
	vec4 faceColor = vec4(0.05, 0.1, 0.3, 1.0);
	float edge = edgeDistance(vBarycentric, 1.5, 0.2);
	float thickEdge = edgeDistance(vBarycentric, 8.0, 0.0);

	faceColor *= 1.0 - vID / 2.0;

	if (vID < 1.0 / 30.0) {
		faceColor = mix(vec4(1.0), faceColor, 0.5);
	}
	vec4 color = mix(lineColor, faceColor, edge);

	// Add lights at intersections
	float d = pow(length(vBarycentric), 8.0);
	color = mix(color, vertColor, d);

	// Add glow
	color = mix(color + lineColor * 0.2, color, thickEdge);

	outAlbedo = color;
	outPosition = vec4(vPosition, 1.0);
	outNormal = vec4(vBarycentric + vTexCoord.rgg, 1.0);
	outSpecular = vec4(lineColor.rgb * 2.0 * (1.0 - thickEdge), 1.0);
}
