// SPDX-License-Identifier: 0BSD
// Original simulation and drawing rules, shared by browser and QML hosts.
function createArtEngine() {
    let ctx;
    const bone = a => `rgba(232,232,232,${a})`;
    const TAU = Math.PI * 2, clamp = (n, a, b) => Math.max(a, Math.min(b, n)), mix = (a, b, t) => a + (b - a) * t;

    const design = { density: 'Fine', accent: '#cc1515' };
    const state = { paused: false, time: 0, w: 700, h: 380, pointer: { x: 0, y: 0, inside: false }, forms: [] };
    const specimen = { motion: .55, response: 1, freeze: null, ripples: [], offsetX: 0, offsetY: 0 };
    const meta = { "style": "lab", "title": "Specimen chamber", "hint": "Move to attract \u00b7 Click to send a ripple", "brand": "TSUGUMORI // PLAY", "fields": 2 };
    const fields = [{ "key": "input:response", "type": "select", "label": "Pointer response", "value": "1", "options": [{ "value": "1", "label": "Attract" }, { "value": "-1", "label": "Repel" }] }, { "key": "input:motion", "type": "range", "label": "Motion", "value": 55.0, "min": 0, "max": 100, "step": 1, "outputKey": "motion" }];
    const view = { buttons: { "motion": { "key": "motion", "type": "button", "label": "Pause motion", "disabled": false, "hidden": false, "pressed": false }, "ripple": { "key": "ripple", "type": "button", "label": "Send ripple", "disabled": false, "hidden": false, "pressed": false }, "save-form": { "key": "save-form", "type": "button", "label": "Freeze + keep form", "disabled": false, "hidden": false, "pressed": false }, "release-form": { "key": "release-form", "type": "button", "label": "Release specimen", "disabled": false, "hidden": true, "pressed": false } }, outputs: { "motion": "55%" }, archives: [], status: "" };

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

    function specimenGeometry(time, ox, oy) {
        const scale = Math.min(state.w * .225, state.h * .39), ribs = design.density === 'Fine' ? 78 : 44, pts = [];
        const phase = time * specimen.motion * 1.45;
        const spine = [];

        for (let j = 0; j <= ribs; j++) {
            const u = j / ribs, s = u * 2 - 1, env = Math.pow(Math.max(0, Math.sin(Math.PI * u)), .7);
            const sway = Math.sin(s * 3.2 - phase) * (.12 + specimen.motion * .24);
            const cx = s * 1.75 + ox * env, cy = sway + oy * env, cz = .28 * Math.cos(s * 3.8 - phase * .68);
            spine.push(project(cx, cy, cz, scale, .35 + Math.sin(phase * .16) * .28, .4));
            let pulse = 0;

            for (const wave of specimen.ripples) {
                const age = time - wave;
                const pos = age * .62;

                if (age >= 0 && age < 2.4)
                    pulse += .2 * Math.exp(-65 * (u - pos) * (u - pos)) * Math.exp(-age * .35);
            }

            const radius = env * (.28 + .07 * Math.sin(u * 9 - phase)) + pulse;
            const rib = [];

            for (let k = 0; k <= 23; k++) {
                const a = -Math.PI * .89 + k / 23 * Math.PI * 1.78;
                const p = project(cx + .10 * env * Math.cos(a), cy + radius * Math.cos(a), cz + radius * .82 * Math.sin(a), scale, .35 + Math.sin(phase * .16) * .28, .4);
                rib.push(p);
                pts.push(Object.assign({}, p, { r: k % 4 === 0 ? 1.15 : .65, a: .2 + (.7 - p.z * .18) * (.5 + .5 * env) }));
            }

            line(rib, bone(.16 + .16 * env), .65);

            if (j % 2 === 0) {
                const tip = rib[0], tip2 = rib[rib.length - 1];
                const fin = project(cx - .18 * env, cy + radius * Math.cos(-Math.PI * .89) * 1.8, cz + radius * Math.sin(-Math.PI * .89) * 1.9, scale, .35 + Math.sin(phase * .16) * .28, .4);
                line([tip, fin, tip2], bone(.1), .55);
            }
        }

        line(spine, bone(.82), 1);
        pts.sort((a, b) => b.z - a.z).forEach(p => dot(p.x, p.y, p.r, bone(clamp(p.a, .12, .9))));
        const head = spine[spine.length - 1];
        dot(head.x, head.y, 2.4, accent());

        return spine;
    }

    function drawSpecimen(dt) {
        const f = specimen.freeze;
        const time = f ? f.time : state.time;
        const targetX = state.pointer.inside ? (state.pointer.x / state.w - .5) * .64 * specimen.response : 0, targetY = state.pointer.inside ? (state.pointer.y / state.h - .5) * .62 * specimen.response : 0;

        if (!f) {
            specimen.offsetX = mix(specimen.offsetX, targetX, dt ? Math.min(1, dt * 3) : .12);
            specimen.offsetY = mix(specimen.offsetY, targetY, dt ? Math.min(1, dt * 3) : .12);
        }

        specimenGeometry(time, f ? f.ox : specimen.offsetX, f ? f.oy : specimen.offsetY);

        if (state.pointer.inside && !f) {
            const { x, y } = state.pointer;
            line([{ x: x - 7, y }, { x: x + 7, y }], accent(.7));
            line([{ x, y: y - 7 }, { x, y: y + 7 }], accent(.7));
            ctx.strokeStyle = accent(.17);
            ctx.beginPath();
            ctx.arc(x, y, 23, 0, TAU);
            ctx.stroke();
        }
    }

    function needsMotion() {
        return !specimen.freeze;
    }

    function updateMotion() {
        button('motion').label = state.paused ? 'Resume motion' : 'Pause motion';
        button('motion').pressed = state.paused;
    }

    function holdForm(f) {
        specimen.freeze = f;
        specimen.motion = f.motion;
        specimen.ripples = f.ripples.slice();
        field('motion').value = f.motion * 100;
        output('motion', Math.round(f.motion * 100) + '%');
        button('release-form').hidden = false;
        button('save-form').disabled = true;
        status('Form ' + String(f.id).padStart(2, '0') + ' held. Kept in this preview only.');
    }

    function releaseForm() {
        specimen.freeze = null;
        specimen.ripples = [];
        button('release-form').hidden = true;
        button('save-form').disabled = state.forms.length >= 6;
        status('Specimen released. Move the pointer or send a ripple.');
    }

    const actions = {
        motion() {
            state.paused = !state.paused;
            updateMotion();
            status(state.paused ? 'Motion paused. Controls still work.' : 'Motion resumed.');
        },
        ripple() {
            if (specimen.freeze)
                releaseForm();

            specimen.ripples.push(state.time);
            specimen.ripples = specimen.ripples.filter(t => state.time - t < 3);

            if (state.paused) {
                state.time += .7;
            }

            status('A ripple is travelling along the spine.');
        },
        'save-form'() {
            if (state.forms.length >= 6)
                return;

            const f = { id: state.forms.length + 1, time: state.time, ox: specimen.offsetX, oy: specimen.offsetY, motion: specimen.motion, ripples: specimen.ripples.slice() };
            state.forms.push(f);
            archiveChip('Form ' + String(f.id).padStart(2, '0'), () => holdForm(f));
            holdForm(f);
        },
        'release-form': releaseForm
    };

    function inputValue(key, value) {
        if (key === 'response') {
            specimen.response = +value;
            meta.hint = 'Move to ' + (+value === 1 ? 'attract' : 'repel') + ' · Click to send a ripple';
        }

        if (key === 'motion') {
            if (specimen.freeze)
                releaseForm();

            specimen.motion = +value / 100;
            output('motion', value + '%');
        }
    }

    function pointerMove(p) {
        state.pointer.x = p.x;
        state.pointer.y = p.y;
        state.pointer.inside = true;
    }

    function pointerDown(p) {
        state.pointer = Object.assign({}, p, { inside: true });
        actions.ripple();
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
            return view.archives.map((a, i) => ({ key: 'archive:' + i, label: a.label }));
        },
        action(key, value) {
            var _a;

            if (key.startsWith('input:')) {
                const f = field(key.slice(6));

                if (!f)
                    return;

                f.value = value;
                inputValue(key.slice(6), value);
            }
            else if (key.startsWith('archive:'))
                (_a = view.archives[Number(key.slice(8))]) === null || _a === void 0 ? void 0 : _a.callback();
            else if (view.buttons[key] && !view.buttons[key].disabled && actions[key])
                actions[key]();

            return '';
        },
        pointer(kind, x, y) {
            const p = { x, y };

            if (kind === 'move')
                pointerMove(p);

            if (kind === 'down')
                pointerDown(p);

            if (kind === 'leave') {
                state.pointer.inside = false;
            }
        },
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
            drawSpecimen(dt);
        },
        suspend() {
            state.pointer.inside = false;
        }
    };

    updateMotion();
    status("Specimen awake. Kept forms stay in this preview only.");

    return api;
}
