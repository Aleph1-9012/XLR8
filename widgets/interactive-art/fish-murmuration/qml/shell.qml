// SPDX-License-Identifier: 0BSD
pragma ComponentBehavior: Bound
import QtQuick
import Quickshell

ShellRoot {
    FloatingWindow {
        title: "Chaldea / Fish murmuration"
        implicitWidth: 360
        implicitHeight: 477
        color: "#030303"

        Widget {
            anchors.centerIn: parent
            width: Math.min(parent.width, parent.height * 40 / 53)
            height: width * 53 / 40
            focus: true
        }
    }
}
