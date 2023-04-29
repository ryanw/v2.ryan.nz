#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D g_albedo;
uniform sampler2D g_position;
uniform sampler2D g_normal;
uniform sampler2D g_specular;

in vec2 uv;

out vec4 outColor;

void main(void) {
	vec4 albedo = texture(g_albedo, uv);
	vec4 position = texture(g_position, uv);
	vec4 normal = texture(g_normal, uv);
	vec4 specular = texture(g_specular, uv);

	if (uv.y < 0.5) {
		if (uv.x < 0.5) {
			outColor = albedo;
		} else {
			outColor = position;
		}
	} else {
		if (uv.x < 0.5) {
			outColor = normal;
		} else {
			outColor = specular;
		}
	}
}
