// SPDX-License-Identifier: 0BSD
#version 440
layout(location = 0) in vec2 texCoord;
layout(location = 0) out vec4 color;
layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec4 partBox;
    vec2 position;
    vec2 heading;
    float turtleScale;
    int jointCount;
    vec2 point0;
    vec2 point1;
    vec2 point2;
    vec2 point3;
    vec2 point4;
    mat4 shellBone;
    mat4 bone0;
    mat4 bone1;
    mat4 bone2;
    mat4 bone3;
};
layout(binding = 1) uniform sampler2D source;
void main() {
    color = texture(source, texCoord) * qt_Opacity;
}
