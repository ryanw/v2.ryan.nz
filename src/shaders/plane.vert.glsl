#version 300 es
precision highp float;

struct Camera {
	mat4 model;
	mat4 view;
	mat4 projection;
};

uniform Camera camera;

in vec2 position;
out vec2 uv;

void main() {
	mat4 mv = camera.view * camera.model;
	vec4 hpos = mv * vec4(position, 0.0, 1.0);
	gl_Position = camera.projection * hpos;
	uv = position * 0.5 + 0.5;
}
