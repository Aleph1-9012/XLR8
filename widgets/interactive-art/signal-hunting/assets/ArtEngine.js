// SPDX-License-Identifier: 0BSD
// Original simulation and drawing rules, shared by browser and QML hosts.
function createArtEngine() {
    let ctx;
    const bone = a => `rgba(232,232,232,${a})`;
    const TAU = Math.PI * 2, clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const noise = n => {
        const v = Math.sin(n * 127.1 + 311.7) * 43758.5453123;

        return v - Math.floor(v);
    };

    const design = { density: 'Fine', accent: '#cc1515' };
    const state = { paused: false, time: 0, w: 700, h: 380, signals: [] };
    const targets = [[28, 64, 76], [72, 35, 58], [46, 82, 31]], discoveries = ['Scout vessel', 'Ribbed wanderer', 'The broken crown'];
    const signal = { index: 0, values: [50, 50, 50], locked: false };
    const meta = { "style": "lab", "title": "Signal hunting", "hint": "Tune the three dials until the hidden shape resolves", "brand": "TSUGUMORI // PLAY", "fields": 3 };
    const fields = [{ "key": "tune:0", "type": "range", "label": "Frequency", "value": 50.0, "min": 0, "max": 100, "step": 1, "outputKey": "tune0" }, { "key": "tune:1", "type": "range", "label": "Phase", "value": 50.0, "min": 0, "max": 100, "step": 1, "outputKey": "tune1" }, { "key": "tune:2", "type": "range", "label": "Gain", "value": 50.0, "min": 0, "max": 100, "step": 1, "outputKey": "tune2" }];
    const view = { buttons: { "motion": { "key": "motion", "type": "button", "label": "Pause motion", "disabled": false, "hidden": false, "pressed": false }, "assist": { "key": "assist", "type": "button", "label": "Assist one dial", "disabled": false, "hidden": false, "pressed": false }, "collect": { "key": "collect", "type": "button", "label": "Collect discovery", "disabled": true, "hidden": false, "pressed": false }, "next-signal": { "key": "next-signal", "type": "button", "label": "Next signal", "disabled": false, "hidden": false, "pressed": false } }, outputs: { "tune0": "50 \u00b7 cold", "tune1": "50 \u00b7 warm", "tune2": "50 \u00b7 cold" }, qualities: {}, archives: [], status: "" };

    function status(value) {
        view.status = value;
    }

    function output(key, value) {
        view.outputs[key] = String(value);
    }

    function button(key) {
        return view.buttons[key] || (view.buttons[key] = { key, type: 'button', label: key });
    }

    function archiveChip(label, callback) {
        view.archives.push({ label, callback });
    }

    function accent(alpha = 1) {
        const c = design.accent;

        return `rgba(${parseInt(c.slice(1, 3), 16)},${parseInt(c.slice(3, 5), 16)},${parseInt(c.slice(5, 7), 16)},${alpha})`;
    }

    function line(points, color, width = 1) {
        if (points.length < 2)
            return;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++)
            ctx.lineTo(points[i].x, points[i].y);

        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
    }

    function dot(x, y, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
    }

    function text(str, x, y, color = bone(.62), align = 'left', size = 11) {
        ctx.font = size + 'px "Share Tech Mono", monospace';
        ctx.textAlign = align;
        ctx.fillStyle = color;
        ctx.fillText(str, x, y);
    }

    function project(x, y, z, scale, angle = .4, tilt = .25, cx = state.w / 2, cy = state.h / 2 + 5) {
        const x1 = x * Math.cos(angle) + z * Math.sin(angle), z1 = -x * Math.sin(angle) + z * Math.cos(angle);
        const y1 = y * Math.cos(tilt) - z1 * Math.sin(tilt), z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
        const p = 4.8 / (4.8 + z2);

        return { x: cx + x1 * scale * p, y: cy + y1 * scale * p, z: z2, p };
    }

    function background() {
        const { w, h } = state;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);
    }

    function signalPoint(index, u, v) {
        if (index === 0) {
            const x = (u * 2 - 1) * 1.62, env = Math.pow(Math.max(.001, Math.sin(Math.PI * u)), .55);

            return [x, .42 * env * Math.cos(v * TAU), .46 * env * Math.sin(v * TAU) * (u > .6 ? 1.2 : 1)];
        }

        if (index === 1) {
            const a = u * TAU, r = .7 + .21 * Math.cos(5 * a);

            return [r * Math.cos(a), r * Math.sin(a), Math.sin(v * TAU) * .44 + .13 * Math.sin(9 * a)];
        }

        const a = u * TAU, r = .48 + .45 * (Math.floor(u * 7) % 2);

        return [r * Math.cos(a) * 1.3, r * Math.sin(a), .2 * Math.sin(v * TAU)];
    }

    function drawSignal() {
        const diffs = signal.values.map((v, i) => Math.abs(v - targets[signal.index][i])), error = signal.locked ? 0 : clamp((Math.max(...diffs) + diffs.reduce((a, b) => a + b, 0) / 3) / 75, 0, 1);
        const scale = Math.min(state.w * .25, state.h * .32), time = state.time, amount = design.density === 'Fine' ? 1350 : 760;
        const angle = signal.index === 0 ? -.38 : .1;
        const dots = [];

        for (let i = 0; i < amount; i++) {
            const u = (i % 90) / 89, v = Math.floor(i / 90) / Math.ceil(amount / 90), p3 = signalPoint(signal.index, u, v);

            if (signal.index === 0 && i % 7 === 0) {
                p3[1] *= 1.7;
                p3[2] *= 2.3;
            }

            const p = project(...p3, scale, angle, .22);
            const scatter = error * error;
            const x = p.x + (noise(i * 3 + 1) - .5) * state.w * .85 * scatter + Math.sin(i * .63 + time * 2) * error * 18;
            const y = p.y + (noise(i * 3 + 2) - .5) * state.h * .9 * scatter + Math.cos(i * .43 + time * 1.4) * error * 15;
            dots.push({ x, y, z: p.z, i });
        }

        dots.sort((a, b) => b.z - a.z).forEach(p => dot(p.x, p.y, p.i % 7 === 0 ? 1.15 : .65, p.i % 31 === 0 ? accent(.85) : bone(signal.locked ? .66 : .25 + (1 - error) * .4)));

        if (signal.locked) {
            const y = state.h / 2 + 5, sz = Math.min(state.w * .34, 150);
            line([{ x: state.w / 2 - sz - 12, y: y - 30 }, { x: state.w / 2 - sz - 12, y: y + 30 }], accent(.6));
            line([{ x: state.w / 2 + sz + 12, y: y - 30 }, { x: state.w / 2 + sz + 12, y: y + 30 }], accent(.6));
            text(discoveries[signal.index].toUpperCase(), state.w / 2, state.h - 54, '#e8e8e8', 'center', 13);
        }
    }

    function needsMotion() {
        return !signal.locked;
    }

    function updateMotion() {
        button('motion').label = state.paused ? 'Resume motion' : 'Pause motion';
        button('motion').pressed = state.paused;
    }

    function updateSignal(announce = true) {
        signal.locked = signal.values.every((v, i) => Math.abs(v - targets[signal.index][i]) <= 5);
        signal.values.forEach((v, i) => {
            const diff = Math.abs(v - targets[signal.index][i]), quality = diff <= 5 ? 'matched' : diff <= 14 ? 'warm' : 'cold';
            output('tune' + i, v + ' · ' + quality);
            fields.find(c => c.key === 'tune:' + i).value = v;
            view.qualities[i] = 100 - Math.min(100, diff * 2);
        });

        button('assist').disabled = signal.locked;
        button('collect').disabled = !signal.locked || state.signals.includes(signal.index);
        button('collect').label = state.signals.includes(signal.index) ? 'Collected' : 'Collect discovery';

        if (announce)
            status(signal.locked ? discoveries[signal.index] + ' found. Collect it to keep a discovery card.' : 'Tune until every dial reads matched. Assist solves one dial.');
    }

    const actions = {
        motion() {
            state.paused = !state.paused;
            updateMotion();
            status(state.paused ? 'Motion paused. Controls still work.' : 'Motion resumed.');
        },
        assist() {
            const i = signal.values.findIndex((v, j) => Math.abs(v - targets[signal.index][j]) > 5);

            if (i >= 0)
                signal.values[i] = targets[signal.index][i];

            updateSignal();
        },
        collect() {
            if (!signal.locked || state.signals.includes(signal.index))
                return;

            const i = signal.index;
            state.signals.push(i);
            archiveChip(String(i + 1).padStart(2, '0') + '// ' + discoveries[i], () => {
                signal.index = i;
                signal.values = targets[i].slice();
                updateSignal();
                status(discoveries[i] + ' · collected in this preview.');
            });

            updateSignal(false);
            status(discoveries[i] + ' collected. Choose Next signal to search again.');
        },
        'next-signal'() {
            signal.index = (signal.index + 1) % targets.length;
            signal.values = [50, 50, 50];
            updateSignal();
        }
    };

    function resize(w, h) {
        w = Math.max(1, w);
        h = Math.max(80, h);

        if (w === state.w && h === state.h)
            return;

        state.w = w;
        state.h = h;
    }

    const api = { meta,
        get paused() {
            return state.paused;
        },
        setPaused(value) {
            if (state.paused !== value)
                actions.motion();
        },
        controls() {
            return fields.map(c => (Object.assign({}, c, { output: view.outputs[c.outputKey] || '', quality: c.key.startsWith('tune:') ? view.qualities[c.key.slice(5)] : undefined }))).concat(Object.values(view.buttons).filter(c => c.key !== 'motion'));
        },
        status() {
            return view.status;
        },
        archives() {
            return view.archives.map((a, i) => ({ key: 'archive:' + i, label: a.label }));
        },
        action(key, value) {
            var _a;

            if (key.startsWith('input:')) {
                return;
            }
            else if (key.startsWith('tune:')) {
                signal.values[Number(key.slice(5))] = Number(value);
                updateSignal();
            }
            else if (key.startsWith('archive:'))
                (_a = view.archives[Number(key.slice(8))]) === null || _a === void 0 ? void 0 : _a.callback();
            else if (view.buttons[key] && !view.buttons[key].disabled && actions[key])
                actions[key]();

            return '';
        },
        // Required host callbacks; this design responds through its controls.
        pointer() {},
        key() {},
        configure(settings) {
            Object.assign(design, settings);
        },
        needsMotion,
        render(context, w, h, elapsed) {
            ctx = context;
            resize(w, h);
            const dt = !state.paused && needsMotion() ? Math.min(.04, Math.max(0, elapsed)) : 0;
            state.time += dt;
            background();
            drawSignal(dt);
        },
        suspend() {}
    };

    updateMotion();
    status("Tune until every dial reads matched. Assist solves one dial.");

    updateSignal(false);

    return api;
}
