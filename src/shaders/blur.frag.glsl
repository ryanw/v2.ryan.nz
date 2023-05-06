#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 uv;
in vec2 pos;
uniform sampler2D frame;
uniform float radius;

out vec4 outColor;

void main(void) {
	vec2 size = 1.0 / vec2(textureSize(frame, 0));
	vec2 texCoord = vec2(uv.x, 1.0 - uv.y);
	vec4 color = texture(frame, texCoord);
	int samples = 1;

	float rad = max(0.0, pow(1.0 - uv.y, 7.0) * radius);
	rad += 1.0;

	int r = int(rad);
	for (int x = -r; x <= r; x += 2) {
		for (int y = -r; y <= r; y += 2) {
			vec2 offset = vec2(float(x), float(y)) * size;
			color += texture(frame, texCoord + offset);
			samples++;
		}
	}
	color /= float(samples);
	color.a *= 1.0 / (rad * 2.0);
	outColor = vec4(color.rgb, color.a);
}
