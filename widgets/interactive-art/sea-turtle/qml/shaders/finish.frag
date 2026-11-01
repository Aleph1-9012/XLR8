// SPDX-License-Identifier: 0BSD
#version 440
layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 color;
layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec4 backgroundColor;
    vec2 pixelStep;
};
layout(binding = 1) uniform sampler2D source;
const vec3 paper = vec3(254.0, 251.0, 244.0) / 255.0;

vec3 paintedAt(vec2 uv) {
    vec4 mark = texture(source, uv);
    return mark.rgb + (1.0 - mark.a) * paper;
}

void main() {
    vec3 centre = paintedAt(qt_TexCoord0);
    vec3 around = paintedAt(qt_TexCoord0 + vec2(pixelStep.x, 0.0)) + paintedAt(qt_TexCoord0 - vec2(pixelStep.x, 0.0))
        + paintedAt(qt_TexCoord0 + vec2(0.0, pixelStep.y)) + paintedAt(qt_TexCoord0 - vec2(0.0, pixelStep.y));
    vec3 painted = clamp(centre + (centre - around * 0.25) * 0.6, vec3(0.0), paper);
    vec3 removed = (paper - painted) / paper;
    float strength = clamp(max(removed.r, max(removed.g, removed.b)), 0.0, 1.0);
    vec3 glaze = max(painted - (1.0 - strength) * paper, vec3(0.0));
    color = vec4(glaze + (1.0 - strength) * backgroundColor.rgb, 1.0) * qt_Opacity;
}
