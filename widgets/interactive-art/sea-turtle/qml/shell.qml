// SPDX-License-Identifier: 0BSD
pragma ComponentBehavior: Bound
import QtQuick
import Quickshell

ShellRoot {
    FloatingWindow {
        title: "Chaldea / Sea turtle"
        implicitWidth: 640
        implicitHeight: 400
        color: "#fefbf4"

        Widget { anchors.fill: parent; focus: true }
    }
}
