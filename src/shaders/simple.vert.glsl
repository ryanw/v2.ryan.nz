#version 300 es
precision highp float;

struct Camera {
	mat4 model;
	mat4 view;
	mat4 projection;
};

uniform Camera camera;

in vec3 position;
in vec2 uv;

out vec3 vPosition;
out vec2 vTexCoord;


void main() {
	mat4 mvp = camera.model * camera.view * camera.projection;
	gl_Position = mvp * vec4(position, 1.0);
	vPosition = position;
	vTexCoord = uv;
}
