# Sliders

Comb, Slats, Stipple Blade, and Weave are independent percentage controls. They preserve the designs supplied in `Lib-assests/chaldea assets/`, including their default levels, compact proportions, track patterns, and handles.

| Widget | ID | Design adjustment |
| --- | --- | --- |
| [Comb](comb/README.md) | `sliders-comb` | Pattern spacing |
| [Slats](slats/README.md) | `sliders-slats` | Pattern spacing |
| [Stipple Blade](stipple-blade/README.md) | `sliders-stipple-blade` | Handle height |
| [Weave](weave/README.md) | `sliders-weave` | Colors and width |

Each entry includes its own browser preview, QML template, launcher, font, thumbnail, and usage guide. There is no design selector. Label, initial level, colors, and width remain settings. Browser previews keep direct range input and keyboard controls; appearance edits preserve the level until Initial level changes. The live preview fills the available panel and magnifies the control up to 2.5×, including its text, track, and handle. Narrow screens constrain its width. This magnification does not change the exported dimensions.

The native `Widget.qml` exposes a `value` property and `moved(value)` signal for a host model. The supplied `shell.qml` is an in-memory demonstration. Applications choose whether to connect a slider to audio, brightness, or another percentage value.

The browser uses an embedded Latin WOFF2 font so sandboxed previews need no cross-origin font requests. Native exports include JetBrains Mono Regular as TTF. Both use the SIL Open Font License in `assets/OFL.txt`; widget code uses 0BSD.

Comb and Stipple Blade lay out complete vector marks with equal edge margins. Stipple uses three full rows at consistent spacing. Columns that would intersect the handle are hidden as a unit, so dragging never exposes a sliced dot or tick. Browser previews, QML exports, and SVG thumbnails follow the same placement rules. Weave preserves its continuous five-pixel lattice, 30-pixel track, and tall blade handle. Its default control is 344 × 76 pixels with a starting value of 13.

## Verification

Export with the normal Bun export command and load those exact files in an isolated Quickshell configuration. The controls use Qt Quick Controls Basic, with keyboard focus, dragging, snapping, and a 0–100 range. Home and End select the endpoints; Page Up and Page Down move by ten.

Library thumbnails are SVG artwork in a 3:1 frame with 24 pixels of padding around the default widget. Tracks, handles, and JetBrains Mono letter outlines stay sharp at every display density. The SVGs contain no raster images or external font requests. Weave draws its lattice as explicit vector strokes in both the thumbnail and live preview, avoiding a small pattern tile that can soften when magnified. Its preview rebuilds that geometry only when the track width changes. Update thumbnails alongside any design changes; `frontend/scripts/thumbnails.ts` preserves SVG thumbnails when refreshing the library's raster captures.

On 2026-10-30, the generated exports passed `qmllint` and offscreen Qt 6.12.0 checks for rendering, pointer dragging, keyboard endpoints and steps, value binding, and the `moved` signal. The standalone launchers loaded under Quickshell 0.3.2 in a private session bus with temporary configuration and cache directories. These checks did not change desktop settings or verify integration with an audio or brightness service. The documented minimum Qt 6.11.2 was not the installed test version.

On 2026-10-31, Weave's exact generated export passed Qt 6.12.0 `qmllint` and offscreen checks for default rendering, long labels, pointer dragging, all arrow keys, Home/End/Page keys, initial value changes, host value binding, the `moved` signal, resizing, and recoloring. Its launcher loaded under Quickshell 0.3.2 with a private session bus and temporary XDG directories. Browser checks covered dragging, keyboard controls, customization, downloaded settings, and a 390-pixel viewport without horizontal overflow. Weave's custom keyboard steps use native slider methods so they preserve a host's value binding. These checks did not exercise a real touch device or connect a system service; Qt 6.11.2 remains untested.
