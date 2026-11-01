// SPDX-License-Identifier: 0BSD
#version 440
layout(location = 0) in vec4 qt_Vertex;
layout(location = 1) in vec2 qt_MultiTexCoord0;
layout(location = 0) out vec2 texCoord;
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

vec2 joint(int index) {
    if (index == 0) return point0;
    if (index == 1) return point1;
    if (index == 2) return point2;
    if (index == 3) return point3;
    return point4;
}

mat4 bone(int index) {
    if (index == 0) return bone0;
    if (index == 1) return bone1;
    if (index == 2) return bone2;
    return bone3;
}

void main() {
    texCoord = qt_MultiTexCoord0;
    vec2 reference = (partBox.xy + texCoord * partBox.zw + vec2(500.0, 880.0)) / (3277.0 / 1600.0);
    vec2 delta = reference - vec2(810.0, 1025.0);
    float cosine = cos(radians(-50.0));
    float sine = sin(radians(-50.0));
    vec4 rest = vec4(delta.x * cosine + delta.y * sine, -delta.x * sine + delta.y * cosine, 0.0, 1.0);
    vec4 moved = shellBone * rest;

    if (jointCount > 0) {
        float closest = 1e20;
        float reach = 0.0;
        for (int i = 0; i < 4; ++i) {
            if (i >= jointCount) break;
            vec2 a = joint(i);
            vec2 direction = joint(i + 1) - a;
            float t = clamp(dot(rest.xy - a, direction) / dot(direction, direction), 0.0, 1.0);
            float distance = length(rest.xy - a - direction * t);
            if (distance < closest) {
                closest = distance;
                reach = float(i) + t;
            }
        }
        if (reach < 0.5) {
            moved = mix(shellBone * rest, bone0 * rest, smoothstep(0.0, 0.5, reach));
        } else {
            int lower = int(min(floor(reach - 0.5), float(jointCount - 1)));
            int upper = lower + 1 < jointCount ? lower + 1 : jointCount - 1;
            moved = mix(bone(lower) * rest, bone(upper) * rest, smoothstep(0.0, 1.0, reach - 0.5 - float(lower)));
        }
    }

    vec2 local = moved.xy * (3000.0 / (3000.0 - moved.z));
    vec2 turned = vec2(local.x * heading.x - local.y * heading.y, local.x * heading.y + local.y * heading.x);
    gl_Position = qt_Matrix * vec4(turned * turtleScale + position, 0.0, 1.0);
}
