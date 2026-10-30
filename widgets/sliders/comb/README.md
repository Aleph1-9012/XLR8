# Comb

A solid red level meets a comb of fine vertical ticks. Adapted from `Lib-assests/chaldea assets/comb.html` at the owner's request. The original design is preserved as its own widget, with a browser preview and native QML control.

## Use

Save every output file with the displayed paths, including `assets/`, `README.md`, and both licenses. Run the standalone preview with `qs -p /path/to/your-folder/shell.qml` using Quickshell 0.3.0 or newer and Qt 6.11.2 or newer.

The control exposes `value` from 0 to 100 and emits `moved(value)` for user edits. Bind `value` and handle `onMoved` in your shell to connect it to a volume, brightness, or other percentage model. The supplied launcher keeps the value in memory and does not change system settings.

```qml
Widget {
    value: model.level
    onMoved: value => model.level = value
}
```

`initialValue` supplies the starting level. Label, colors, width, and pattern spacing are customizable. Appearance edits preserve the live preview's current level; changing Initial level applies that new value. Pointer and touch dragging, arrow keys, Home, End, Page Up, and Page Down adjust the control. The label supports plain text only. The default size is 344 × 66 pixels; narrower parents constrain the browser preview.

Original widget code is 0BSD. JetBrains Mono is bundled under the SIL Open Font License in `assets/OFL.txt`.
