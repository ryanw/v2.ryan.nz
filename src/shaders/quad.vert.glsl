#version 300 es
precision highp float;

uniform vec2 size;

in vec2 position;

out vec2 uv;

void main() {
	gl_Position = vec4(position, 0.0, 1.0);
	uv = position * 0.5 + 0.5;//(position * size) / size.y;
}
