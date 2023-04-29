#version 300 es
precision highp float;

struct Camera {
	mat4 model;
	mat4 view;
	mat4 projection;
};

uniform Camera camera;

in vec3 position;
in vec3 barycentric;
in vec2 uv;

out vec3 vPosition;
out vec2 vTexCoord;
out vec3 vBarycentric;


void main() {
	mat4 mv = camera.view * camera.model;
	vec4 hpos = mv * vec4(position, 1.0);
	gl_Position = camera.projection * hpos;
	vPosition = hpos.xyz / hpos.w;
	vTexCoord = uv;
	vBarycentric = barycentric;
}
