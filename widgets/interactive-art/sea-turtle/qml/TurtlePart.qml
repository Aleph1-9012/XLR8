// SPDX-License-Identifier: 0BSD
pragma ComponentBehavior: Bound
import QtQuick
import "TurtleMotion.js" as Motion
import "Pigment.js" as Pigment

ShaderEffect {
    id: partView

    required property var part
    required property var matrices
    required property vector2d position
    required property vector2d heading
    required property real turtleScale
    required property real detail
    readonly property var limb: Motion.SeaTurtleMotion.LIMBS[part.name]
    readonly property int jointCount: limb ? limb.bones.length : 0
    readonly property vector4d partBox: Qt.vector4d(part.box.x, part.box.y, part.box.width, part.box.height)
    readonly property vector2d point0: joint(0)
    readonly property vector2d point1: joint(1)
    readonly property vector2d point2: joint(2)
    readonly property vector2d point3: joint(3)
    readonly property vector2d point4: joint(4)
    readonly property matrix4x4 shellBone: matrices[0]
    readonly property matrix4x4 bone0: bone(0)
    readonly property matrix4x4 bone1: bone(1)
    readonly property matrix4x4 bone2: bone(2)
    readonly property matrix4x4 bone3: bone(3)
    property var source: pigment

    function joint(index: int): vector2d {
        const point = limb && limb.points[Math.min(index, limb.points.length - 1)];
        return point ? Qt.vector2d(point[0], point[1]) : Qt.vector2d(0, 0);
    }

    function bone(index: int): matrix4x4 {
        return matrices[limb ? limb.bones[Math.min(index, limb.bones.length - 1)] : 0];
    }

    mesh: GridMesh {
        resolution: Qt.size(Math.ceil(partView.part.box.width / 22), Math.ceil(partView.part.box.height / 22))
    }
    vertexShader: Qt.resolvedUrl("shaders/turtle.vert.qsb")
    fragmentShader: Qt.resolvedUrl("shaders/turtle.frag.qsb")

    Canvas {
        id: pigment
        width: Math.max(1, Math.ceil(partView.part.box.width * partView.detail))
        height: Math.max(1, Math.ceil(partView.part.box.height * partView.detail))
        visible: false
        onWidthChanged: requestPaint()
        onHeightChanged: requestPaint()
        onAvailableChanged: if (available) requestPaint()
        onPaint: {
            const context = getContext("2d");
            const box = partView.part.box;
            context.reset();
            context.fillRule = Qt.OddEvenFill;
            context.setTransform(width / box.width, 0, 0, height / box.height,
                -box.x * width / box.width, -box.y * height / box.height);
            Motion.SeaTurtleMotion.paintPart(context, Pigment.SeaTurtlePigment, partView.part);
        }
    }
}
