# Interactive art

Fish in space, Fish murmuration, Magnetic powder, Specimen chamber, Orbital playground, Resonance sculpture, Signal hunting, Gravity sandbox, and Sea turtle each have an independent QML export and are included in production builds. Each preserves its original drawing and direct controls. Collections remain in memory. All designs are silent.

[Sea turtle](sea-turtle/README.md) has a native Quickshell export and browser preview, using the same swimming, skeleton, and vector pigment data on cream or white. It is a contained widget, with desktop overlay integration deferred. It is included in production builds, with the reference-derived artwork notice retained in its preview bundle and native export. The earlier Tidal turtle and Skeleton studies are archived outside this repository and are not included in previews or builds.

## Shared files

`_shared/qml/` holds `ArtWidget.qml`, `ArtField.qml`, `ArtButton.qml`, `ArtText.qml`, and the `shell.qml` launcher, which the seven imported designs use unchanged. Each of those widget folders keeps its own `assets/ArtEngine.js`, `Widget.qml.tmpl`, preview, thumbnail, and README.

[Fish murmuration](fish-murmuration/README.md) keeps its own Canvas component and launcher. Its `FishEngine.js` renderer is shared between the browser and Qt, with pointer interaction, pause/restart, and a speed setting. The export includes all five required files and needs no reference video.

Sea turtle keeps its own `TurtleMotion.js`, `Pigment.js`, QML components, and shader sources and binaries. It shares neither the imported designs' helpers nor Fish murmuration's renderer. Save all 14 exported files, including `ARTWORK_NOTICE.txt`, and retain their subfolders.

## Components

In the library, live controls and collections appear in the customization sidebar beside appearance settings. They operate the existing preview engine, while pointer and keyboard gestures remain on the canvas. Appearance changes and Reset preserve scene state and collections. A standalone preview keeps its local controls until an embedding host acknowledges the sidebar controls. Native exports retain their own controls.

Play/Pause stays at the top of the sidebar. Live controls appear before appearance settings in the scrollable area below, so long panels fit beside the artwork without hiding playback. On narrow screens the panel flows below the preview.

Hosted previews fill the preview column and use the canvas height for the panel, without wrapper padding, study mastheads, duplicate titles, gesture instructions, decorative footers, or local control panels. Actions remain available in the customization sidebar, and canvas accessibility labels retain interaction instructions. Standalone previews restore their original panels when no sidebar host is present. Library thumbnails use the hosted view and center the complete canvas within the card proportions.

Each imported design's `ArtEngine.js` drives both its browser preview and its native component. QML hosts the original drawing rules, pointer gestures, controls, and in-memory collections. Keep each exported `ArtEngine.js` with its QML helpers. Preserve the original drawing rules and interactions when changing either host. Settings change appearance and must leave scene state and collections intact. Native components stop animation when hidden.

Shared JavaScript must work in Qt’s JavaScript engine as well as the browser. The engines use ES2016-compatible syntax, including `Object.assign` instead of object spread. Browser and Qt Canvas APIs differ; the shared drawing code uses a Bezier ellipse helper to preserve the same geometry in both.

Orbital playground uses sample workspace labels, and Resonance sculpture uses a silent simulated beat.

## Inspect a change

Use the documented Bun export command and an isolated launcher. Check pointer gestures, keyboard controls, collection recall, pause/resume, settings, and narrow layouts. The generic library checker discovers these exports and assets automatically; no new test command or registration is needed.
