// SPDX-License-Identifier: 0BSD
// Original simulation and drawing rules, shared by browser and QML hosts.
function createArtEngine() {
    let ctx;
    const bone = a => `rgba(232,232,232,${a})`;
    const TAU = Math.PI * 2, clamp = (n, a, b) => Math.max(a, Math.min(b, n)), mix = (a, b, t) => a + (b - a) * t;

    const design = { density: 'Fine', accent: '#cc1515' };
    const state = { paused: false, w: 700, h: 380 };
    const resonance = { playing: false, energy: 0, beat: 'drift', intensity: .7, response: .7, clock: 0, phase: 0, bass: 0, treble: 0 };
    const meta = { "style": "lab", "title": "Resonance sculpture", "hint": "Bass squeezes the ring · Percussion ripples the rim", "brand": "TSUGUMORI // PLAY", "fields": 2 };
    const fields = [{ "key": "input:beat", "type": "select", "label": "Demo beat", "value": "drift", "options": [{ "value": "drift", "label": "Slow drift \u00b7 72 BPM" }, { "value": "pulse", "label": "Pulse \u00b7 118 BPM" }, { "value": "break", "label": "Broken rhythm \u00b7 144 BPM" }] }, { "key": "input:intensity", "type": "range", "label": "Response", "value": 70.0, "min": 10, "max": 100, "step": 1, "outputKey": "intensity" }];
    const view = { buttons: { "motion": { "key": "motion", "type": "button", "label": "Pause motion", "disabled": false, "hidden": false, "pressed": false }, "music": { "key": "music", "type": "button", "label": "Play demo beat", "disabled": false, "hidden": false, "pressed": false } }, outputs: { "intensity": "70%" }, status: "" };

    function status(value) {
        view.status = value;
    }

    function output(key, value) {
        view.outputs[key] = String(value);
    }

    function button(key) {
        return view.buttons[key] || (view.buttons[key] = { key, type: 'button', label: key });
    }

    function field(key) {
        return fields.find(c => c.key === 'input:' + key);
    }

    function ellipse(cx, cy, rx, ry, angle) {
        const k = .5522847498307936;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.moveTo(rx, 0);
        ctx.bezierCurveTo(rx, k * ry, k * rx, ry, 0, ry);
        ctx.bezierCurveTo(-k * rx, ry, -rx, k * ry, -rx, 0);
        ctx.bezierCurveTo(-rx, -k * ry, -k * rx, -ry, 0, -ry);
        ctx.bezierCurveTo(k * rx, -ry, rx, -k * ry, rx, 0);
        ctx.restore();
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

    function advanceResonance(dt) {
        if (dt <= 0) return;

        const target = resonance.playing ? 1 : 0;
        const decay = Math.exp(-5 * dt), previousEnergy = resonance.energy;
        resonance.energy = target + (previousEnergy - target) * decay;
        resonance.clock += target * dt + (previousEnergy - target) * (1 - decay) / 5;
        resonance.phase += dt * { drift: 72, pulse: 118, break: 144 }[resonance.beat] / 60;
        resonance.response = mix(resonance.response, resonance.intensity, 1 - Math.exp(-10 * dt));

        const beat = resonance.phase, fraction = beat % 1;
        const weight = resonance.beat === 'break' && Math.floor(beat) % 3 === 1 ? .3 : 1;
        const bass = Math.exp(-fraction * 9) * weight;
        const treble = Math.exp(-((beat * 2) % 1) * 12);
        resonance.bass = mix(resonance.bass, bass, 1 - Math.exp(-dt * (bass > resonance.bass ? 28 : 12)));
        resonance.treble = mix(resonance.treble, treble, 1 - Math.exp(-dt * (treble > resonance.treble ? 42 : 20)));

        if (!resonance.playing && resonance.energy < .002)
            resonance.energy = 0;
    }

    function drawResonance(dt) {
        advanceResonance(dt);

        const t = resonance.clock, b = resonance.phase, f = b % 1;
        const amplitude = resonance.energy * resonance.response;
        const bass = resonance.bass * amplitude, hit = resonance.treble * amplitude;
        const scale = Math.min(state.w * .26, state.h * .31), rows = design.density === 'Fine' ? 19 : 11, points = [];

        for (let j = 0; j < rows; j++) {
            const q = (j / (rows - 1) - .5) * 2, path = [];

            for (let i = 0; i <= 170; i++) {
                const a = i / 170 * TAU, r = 1.12 - .27 * bass + q * .24 + .03 * hit * Math.sin(a * 16 - t * 8);
                const z = .40 * q * Math.sin(3 * a + t * .2) + .18 * hit * Math.sin(a * 9 - b * 14);
                const p = project(r * Math.cos(a), r * Math.sin(a), z, scale, t * .13 + .3, .62, state.w / 2, state.h / 2 + 5);
                path.push(p);

                if (i < 170 && i % 2 === 0)
                    points.push(Object.assign({}, p, { edge: j === 0 || j === rows - 1 }));
            }

            line(path, j === 0 || j === rows - 1 ? bone(.65) : bone(.11 + .1 * resonance.energy), j === 0 || j === rows - 1 ? .9 : .55);
        }

        const dotGroups = Array.from({ length: 32 }, () => []);

        for (const p of points) {
            const depth = clamp(Math.floor((.25 + .25 * p.p - .4) * 80), 0, 15);
            dotGroups[depth * 2 + Number(p.edge)].push(p);
        }

        for (let i = 0; i < dotGroups.length; i++) {
            if (!dotGroups[i].length) continue;

            const radius = i % 2 ? .9 : .6;
            ctx.beginPath();

            for (const p of dotGroups[i]) {
                ctx.moveTo(p.x + radius, p.y);
                ctx.arc(p.x, p.y, radius, 0, TAU);
            }

            ctx.fillStyle = bone(.40625 + Math.floor(i / 2) * .0125);
            ctx.fill();
        }

        if (resonance.energy > .03) {
            for (let k = 0; k < 3; k++) {
                const age = (f + k / 3) % 1;
                const fade = Math.pow(Math.sin(Math.PI * age), 2) * (1 - age);
                ctx.strokeStyle = accent(fade * .6 * amplitude);
                ctx.lineWidth = .7;
                ctx.beginPath();
                ellipse(state.w / 2, state.h / 2 + 5, scale * (1.35 + age * .7), scale * (.55 + age * .3), .05);
                ctx.stroke();
            }
        }
    }

    function needsMotion() {
        return resonance.playing || resonance.energy > .002;
    }

    function updateMotion() {
        button('motion').label = state.paused ? 'Resume motion' : 'Pause motion';
        button('motion').pressed = state.paused;
    }

    const actions = {
        motion() {
            state.paused = !state.paused;
            updateMotion();
            status(state.paused ? 'Motion paused. Controls still work.' : 'Motion resumed.');
        },
        music() {
            resonance.playing = !resonance.playing;

            if (resonance.playing && state.paused) {
                state.paused = false;
                updateMotion();
            }

            button('music').label = resonance.playing ? 'Pause demo beat' : 'Play demo beat';
            button('music').pressed = resonance.playing;
            status(resonance.playing ? 'Silent simulated beat playing. Bass compresses the ring; percussion sends ripples.' : 'Demo paused. The sculpture settles into a still ring.');
        }
    };

    function inputValue(key, value) {
        if (key === 'beat') {
            resonance.beat = value;
            status('Demo pattern changed. No sound or player connection.');
        }

        if (key === 'intensity') {
            resonance.intensity = +value / 100;
            output('intensity', value + '%');
        }
    }

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
            return fields.map(c => (Object.assign({}, c, { output: view.outputs[c.outputKey] || '' }))).concat(Object.values(view.buttons).filter(c => c.key !== 'motion'));
        },
        status() {
            return view.status;
        },
        archives() {
            return [];
        },
        action(key, value) {
            if (key.startsWith('input:')) {
                const f = field(key.slice(6));

                if (!f)
                    return;

                f.value = value;
                inputValue(key.slice(6), value);
            }
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
            background();
            drawResonance(dt);
        },
        suspend() {}
    };

    updateMotion();
    status("Silent demo signal. This does not read your music player.");

    return api;
}
