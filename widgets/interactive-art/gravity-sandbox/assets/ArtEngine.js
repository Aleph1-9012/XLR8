// SPDX-License-Identifier: 0BSD
// Original simulation and drawing rules, shared by browser and QML hosts.
function createArtEngine() {
    let ctx;
    const bone = a => `rgba(232,232,232,${a})`;
    const TAU = Math.PI * 2;
    const noise = n => {
        const v = Math.sin(n * 127.1 + 311.7) * 43758.5453123;

        return v - Math.floor(v);
    };

    const design = { accent: '#cc1515' };
    const state = { paused: false, time: 0, w: 700, h: 380, pointer: { x: 0, y: 0, down: false } };
    const gravity = { strength: .65, count: 700, center: false, second: false, particles: [] };
    const meta = { "style": "lab", "title": "Gravity sandbox", "hint": "Hold and drag to pull · Release to scatter · Esc clears wells", "brand": "TSUGUMORI // PLAY", "fields": 2 };
    const fields = [{ "key": "input:gravity", "type": "range", "label": "Gravity", "value": 65.0, "min": 10, "max": 100, "step": 1, "outputKey": "gravity" }, { "key": "input:particles", "type": "range", "label": "Particles", "value": 700.0, "min": 200, "max": 1200, "step": 100, "outputKey": "particles" }];
    const view = { buttons: { "motion": { "key": "motion", "type": "button", "label": "Pause motion", "disabled": false, "hidden": false, "pressed": false }, "well": { "key": "well", "type": "button", "label": "Hold center well", "disabled": false, "hidden": false, "pressed": false }, "second-well": { "key": "second-well", "type": "button", "label": "Add second well", "disabled": false, "hidden": false, "pressed": false }, "scatter": { "key": "scatter", "type": "button", "label": "Scatter", "disabled": false, "hidden": false, "pressed": false } }, outputs: { "gravity": "65%", "particles": "700" }, status: "" };

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

    function background() {
        const { w, h } = state;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);
    }

    function makeParticles() {
        gravity.particles = Array.from({ length: gravity.count }, (_, i) => ({ x: noise(i * 5 + 10) * state.w, y: 36 + noise(i * 5 + 11) * (state.h - 60), vx: (noise(i * 5 + 12) - .5) * 24, vy: (noise(i * 5 + 13) - .5) * 24, history: [] }));
    }

    function burst(x, y, power = 90) {
        for (const p of gravity.particles) {
            const dx = p.x - x, dy = p.y - y, d = Math.max(15, Math.hypot(dx, dy));
            p.vx += dx / d * power;
            p.vy += dy / d * power;
        }
    }

    function wells() {
        const all = [];

        if (state.pointer.down)
            all.push({ x: state.pointer.x, y: state.pointer.y });
        else if (gravity.center)
            all.push({ x: state.w * .5, y: state.h * .5 });

        if (gravity.second)
            all.push({ x: state.w * .73, y: state.h * .36 });

        return all;
    }

    function drawGravity(dt) {
        const all = wells(), { w, h } = state;

        for (const p of gravity.particles) {
            if (dt) {
                p.history.unshift({ x: p.x, y: p.y });

                if (p.history.length > 6)
                    p.history.pop();

                for (const g of all) {
                    const dx = g.x - p.x, dy = g.y - p.y, d2 = dx * dx + dy * dy + 240;
                    const force = (160000 + gravity.strength * 900000) / d2;
                    const d = Math.sqrt(d2);
                    p.vx += (dx / d * force - dy / d * force * .26) * dt;
                    p.vy += (dy / d * force + dx / d * force * .26) * dt;
                }

                const friction = Math.pow(all.length ? .994 : .985, dt * 60);
                p.vx *= friction;
                p.vy *= friction;

                if (!all.length) {
                    p.vx += Math.sin(p.y * .018 + state.time) * dt * 2.5;
                    p.vy += Math.cos(p.x * .018 - state.time) * dt * 2.5;
                }

                const speed = Math.hypot(p.vx, p.vy);

                if (speed > 240) {
                    p.vx *= 240 / speed;
                    p.vy *= 240 / speed;
                }

                p.x += p.vx * dt;
                p.y += p.vy * dt;

                if (p.x < 0 || p.x > w || p.y < 30 || p.y > h - 14) {
                    p.x = (p.x + w) % w;
                    p.y = 30 + ((p.y - 30 + h - 44) % (h - 44));
                    p.history = [];
                }
            }

            const speed = Math.hypot(p.vx, p.vy);

            if (p.history.length > 1 && speed > 8)
                line([{ x: p.x, y: p.y }, ...p.history], bone(.09 + Math.min(.19, speed / 700)), .6);

            dot(p.x, p.y, speed > 90 ? 1 : .7, speed > 100 ? accent(.9) : bone(.28 + Math.min(.45, speed / 150)));
        }

        for (const g of all) {
            for (let k = 0; k < 3; k++) {
                ctx.strokeStyle = accent(.7 - k * .2);
                ctx.lineWidth = .8;
                ctx.beginPath();
                ctx.arc(g.x, g.y, 7 + k * 13 + Math.sin(state.time * 3) * 2, 0, TAU);
                ctx.stroke();
            }

            line([{ x: g.x - 5, y: g.y }, { x: g.x + 5, y: g.y }], bone(.8));
            line([{ x: g.x, y: g.y - 5 }, { x: g.x, y: g.y + 5 }], bone(.8));
        }
    }

    function needsMotion() {
        return true;
    }

    function updateMotion() {
        button('motion').label = state.paused ? 'Resume motion' : 'Pause motion';
        button('motion').pressed = state.paused;
    }

    function releaseWells() {
        const all = wells();
        state.pointer.down = false;
        gravity.center = false;
        gravity.second = false;

        for (const w of all)
            burst(w.x, w.y, 70);

        button('well').pressed = false;
        button('well').label = 'Hold center well';
        button('second-well').pressed = false;
        button('second-well').label = 'Add second well';
        status('Wells released. Particles are drifting.');
    }

    const actions = {
        motion() {
            state.paused = !state.paused;
            updateMotion();
            status(state.paused ? 'Motion paused. Controls still work.' : 'Motion resumed.');
        },
        well() {
            if (gravity.center) {
                gravity.center = false;
                burst(state.w / 2, state.h / 2);
            }
            else
                gravity.center = true;

            button('well').pressed = gravity.center;
            button('well').label = gravity.center ? 'Release + burst' : 'Hold center well';
            status(gravity.center ? 'Center well held. Release it to throw the particles outward.' : 'Center well released.');
        },
        'second-well'() {
            gravity.second = !gravity.second;
            button('second-well').pressed = gravity.second;
            button('second-well').label = gravity.second ? 'Remove second well' : 'Add second well';

            if (!gravity.second)
                burst(state.w * .73, state.h * .36, 60);

            status(gravity.second ? 'Second well added. The two fields compete.' : 'Second well removed.');
        },
        scatter() {
            releaseWells();
            burst(state.w / 2, state.h / 2, 160);
            status('Particles scattered. Hold anywhere to gather them again.');
        }
    };

    function inputValue(key, value) {
        if (key === 'gravity') {
            gravity.strength = +value / 100;
            output('gravity', value + '%');
        }

        if (key === 'particles') {
            gravity.count = +value;
            output('particles', value);
            makeParticles();
        }
    }

    function pointerMove(p) {
        state.pointer.x = p.x;
        state.pointer.y = p.y;
    }

    function pointerDown(p) {
        state.pointer = Object.assign({}, p, { down: true });
    }

    function pointerUp() {
        if (state.pointer.down) {
            burst(state.pointer.x, state.pointer.y);
            status('Well released. Hold again to catch the particles.');
        }

        state.pointer.down = false;
    }

    function resize(w, h) {
        w = Math.max(1, w);
        h = Math.max(80, h);

        if (w === state.w && h === state.h)
            return;

        const oldW = state.w, oldH = state.h;
        state.w = w;
        state.h = h;

        for (const p of gravity.particles) {
            p.x *= w / oldW;
            p.y *= h / oldH;
            p.history = [];
        }
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
        pointer(kind, x, y) {
            const p = { x, y };

            if (kind === 'move')
                pointerMove(p);

            if (kind === 'down')
                pointerDown(p);

            if (kind === 'up')
                pointerUp();
        },
        key(key) {
            if (key === 'Escape')
                releaseWells();
        },
        configure(settings) {
            Object.assign(design, settings);
        },
        needsMotion,
        render(context, w, h, elapsed) {
            ctx = context;
            resize(w, h);

            if (!gravity.particles.length)
                makeParticles();

            const dt = !state.paused && needsMotion() ? Math.min(.04, Math.max(0, elapsed)) : 0;
            state.time += dt;
            background();
            drawGravity(dt);
        },
        suspend() {
            state.pointer.down = false;
        }
    };

    updateMotion();
    status("Hold inside the field or use Hold center well. Escape releases all wells.");

    return api;
}
