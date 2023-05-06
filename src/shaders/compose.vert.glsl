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
	gl_Position = vec4(position, 0.0, 1.0);
	uv = position * 0.5 + 0.5;
	uv.y = 1.0 - uv.y;
}
