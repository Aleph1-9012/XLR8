// SPDX-License-Identifier: 0BSD
// Canvas geometry shared by HTML and Qt Quick. No media or image samples are drawn.
function randomSource(seed) {
    return function () {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;

        return seed / 4294967296;
    };
}

function profile() {
    const points = [[.5, 0]];
    const line = (x, y) => points.push([x, y]);
    const curve = (ax, ay, bx, by, x, y, steps) => {
        const start = points[points.length - 1];

        for (let i = 1; i <= steps; i++) {
            const t = i / steps, u = 1 - t;
            points.push([u * u * u * start[0] + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x,
                u * u * u * start[1] + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y]);
        }
    };

    // Rounded forebody, a small dorsal fin, two low fins and a slender forked tail.
    curve(.47, -.035, .41, -.060, .31, -.070, 7);
    curve(.22, -.075, .12, -.065, .07, -.060, 5);
    line(.030, -.110);
    curve(.005, -.120, .012, -.095, .020, -.070, 3);
    curve(-.060, -.065, -.17, -.040, -.31, -.015, 7);
    curve(-.38, -.030, -.43, -.075, -.50, -.110, 5);
    curve(-.51, -.112, -.50, -.098, -.48, -.085, 2);
    line(-.36, -.005);
    curve(-.35, .003, -.36, .017, -.37, .028, 2);
    line(-.48, .110);
    curve(-.49, .130, -.47, .120, -.46, .110, 2);
    line(-.31, .025);
    curve(-.21, .025, -.13, .045, -.06, .050, 5);
    line(-.075, .085);
    curve(-.04, .087, -.02, .062, -.005, .055, 3);
    curve(.06, .070, .14, .065, .20, .055, 5);
    line(.19, .085);
    curve(.22, .090, .23, .074, .24, .059, 2);
    curve(.36, .065, .45, .035, .50, 0, 8);

    return points;
}

const outline = profile();

function insideFish(x, y) {
    let inside = false;

    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
        const a = outline[i], b = outline[j];

        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }

    return inside;
}

// Each row is a continuous ellipse: centre x/y, cosine x/y, sine x/y,
// radians/second, body length, initial heading. Measured from the reference's
// moving fish, then bounded for continuous orbits beyond its ten-second clip.
const orbitSeeds = [
    [320.8469, 383.363, 77.3331, 54.187, -66.929, 82.8039, 0.363, 109.46, 2.532],
    [373.1533, 391.9113, 115.0367, 79.3287, -111.1784, 149.6665, 0.198, 100.26, 2.2036],
    [374.0129, 346.6917, 68.4871, 127.0983, -151.0264, 132.6412, 0.2075, 120.01, 2.4622],
    [307.2372, 407.2516, 69.3628, 84.7984, -91.7145, 66.8346, 0.2985, 99.27, 2.5222],
    [382.2955, 402.4852, 139.6645, 111.0148, -134.4157, 177.479, 0.1615, 122.5, 2.4391],
    [288.8136, 368.515, -2.6036, 130.495, -137.642, 19.0627, 0.324, 95.13, 2.7507],
    [355, 410, 110.8, 111.89, -111.89, 110.8, 0.3048, 115.28, 2.649],
    [291.5156, 426.3309, 74.6044, 110.6091, -115.0642, 56.0354, 0.275, 100.21, 2.8137],
    [409.4677, 411.2326, 127.6423, 163.8574, -187.1289, 202.0209, 0.134, 128.04, 2.2326],
    [270.9906, 397.9773, -41.2806, 164.7227, -145.5547, -29.4444, 0.255, 99.47, 2.7961],
    [328.7598, 433.027, 82.3202, 143.543, -175.5003, 84.6616, 0.2145, 111.57, 2.718],
    [284.8435, 415.1181, 15.2565, 180.9519, -166.1873, -2.3727, 0.2235, 84.33, 2.9759],
    [402.7757, 412.2213, 16.5743, 194.4787, -255.5884, 60.1708, 0.176, 109.89, 2.862],
    [396.443, 432.9897, 34.627, 202.6603, -262.5985, 85.9846, 0.164, 128.34, 2.6746],
    [445.0852, 430.0985, 52.2348, 207.2915, -235.3243, 150.4393, 0.143, 137.96, 2.5893],
    [339.6908, 416.2677, 4.8892, 222.0723, -247.3865, 8.7044, 0.1875, 98.27, 3.0259],
    [350, 430, -27.3, 246.63, -246.63, -27.3, 0.1934, 95.19, 2.9819],
    [399.4577, 515.5427, 73.4623, 167.3473, -263.9871, 109.4254, 0.1555, 118.87, 2.8133],
    [444.7268, 535.0034, 77.3832, 158.9566, -231.7472, 137.5434, 0.1475, 113.43, 2.5846],
    [386.0514, 478.0394, -87.1114, 239.3606, -254.7747, -58.226, 0.147, 148.28, 3.046],
    [375.4855, 512.1253, -11.7355, 233.0147, -289.7686, 3.5822, 0.132, 161.71, 2.9894],
];

function create() {
    const random = randomSource(211620);
    const fish = [];
    const ghosts = [];
    const grain = [];

    for (let index = 0; index < orbitSeeds.length; index++) {
        const orbit = orbitSeeds[index];
        const dots = [];
        const flecks = [];

        // Jittered, separated print dots retain visible grain instead of fine fog.
        for (let x = -.51; x < .51; x += .017) {
            for (let y = -.135; y < .135; y += .017) {
                const px = x + (random() - .5) * .014;
                const py = y + (random() - .5) * .014;

                if (insideFish(px, py)) dots.push([px, py, 1.1 + random() * .75]);
            }
        }

        for (let i = 0; i < dots.length; i += 9) flecks.push(dots[i]);

        const initialTangent = Math.atan2(orbit[5], orbit[4]);
        fish.push({ orbit, dots, flecks, wave: random() * Math.PI * 2,
            headingOffset: Math.atan2(Math.sin(orbit[8] - initialTangent), Math.cos(orbit[8] - initialTangent)),
            thickness: .92 + random() * .15 });
    }

    // Stippled bodies have their own phases in the same circulation. Packing
    // them through the foreground as well as behind it preserves the dense wake.
    for (let lane = 0; lane < 8; lane++) {
        for (let slot = 0; slot < 12; slot++) {
            const depth = (lane + .2 + random() * .5) / 8;
            const angle = -2.22 + slot * .385 + (lane % 3) * .11 + random() * .23;
            const rx = 102 + depth * 190, ry = 115 + depth * 235;
            const c = Math.cos(angle), s = Math.sin(angle);
            const template = fish[(lane * 12 + slot) % fish.length];
            const orbit = [245 + depth * 110, 315 + depth * 145,
                rx * c, ry * s, -rx * s, ry * c,
                (39 + random() * 8) / ((rx + ry) / 2), 94 + depth * 51 + random() * 13, 0];
            ghosts.push({ orbit, dots: template.dots, flecks: [], wave: random() * Math.PI * 2,
                headingOffset: 0, thickness: 1.03 + random() * .28,
                emerges: (lane * 12 + slot) % 7 === 0, revealDelay: .1 + random() * .3 });
        }
    }

    for (let i = 0; i < 2600; i++) grain.push([random() * 720, random() * 954, .45 + random() * 1.5]);

    return { time: 0, fish, ghosts, grain, pointer: { x: 360, y: 477, active: false }, bend: { x: 360, y: 477, strength: 0 } };
}

function advance(scene, dt, speed = 1) {
    const elapsed = Math.max(0, Math.min(.06, dt));
    scene.time += elapsed * speed;
    const weight = 1 - Math.exp(-elapsed * 4);
    scene.bend.x += (scene.pointer.x - scene.bend.x) * weight;
    scene.bend.y += (scene.pointer.y - scene.bend.y) * weight;
    scene.bend.strength += ((scene.pointer.active ? 1 : 0) - scene.bend.strength) * weight;
}

function setPointer(scene, x, y, active) {
    scene.pointer.x = x * 720;
    scene.pointer.y = y * 954;
    scene.pointer.active = active;
}

function reset(scene) {
    scene.time = 0;
    scene.pointer.active = false;
    scene.bend.strength = 0;
}

function pose(scene, fish, phase) {
    const o = fish.orbit;
    const angle = scene.time * o[6] - phase;
    const c = Math.cos(angle), s = Math.sin(angle);
    let x = o[0] + o[2] * c + o[4] * s;
    let y = o[1] + o[3] * c + o[5] * s;
    const vx = -o[2] * s + o[4] * c, vy = -o[3] * s + o[5] * c;
    const ax = -o[2] * c - o[4] * s, ay = -o[3] * c - o[5] * s;
    const radius = Math.pow(vx * vx + vy * vy, 1.5) / Math.max(1, vx * ay - vy * ax);
    const dx = x - scene.bend.x, dy = y - scene.bend.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const push = Math.max(0, 1 - distance / 170) * scene.bend.strength * 28;
    x += dx / Math.max(1, distance) * push;
    y += dy / Math.max(1, distance) * push;

    return { x, y, angle: Math.atan2(vy, vx) + fish.headingOffset, radius };
}

function bentY(x, y, bend, wave, thickness) {
    const tail = Math.max(0, .26 - x);

    return y * thickness + bend * x * x + wave * tail * tail;
}

function drawFish(ctx, scene, fish, phase, dotted) {
    const position = pose(scene, fish, phase);
    const distanceScale = Math.max(.62, Math.min(1.05, .74 + position.y / 2400));
    const length = fish.orbit[7] * distanceScale;
    const bend = Math.min(.55, length / position.radius * (dotted ? .45 : .16));
    const wave = Math.sin(scene.time * 3.1 + fish.wave - phase * 1.5) * .045;
    const depth = Math.min(1, Math.max(0, (position.y - 120) / 630));
    const thickness = fish.thickness * (dotted ? .85 + depth * .45 : 1);
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(position.angle);
    ctx.scale(length, length);
    ctx.beginPath();

    if (dotted) {
        ctx.fillStyle = 'rgba(244,246,241,' + (.26 + depth * .58) + ')';

        for (const point of fish.dots) {
            const size = point[2] * (.82 + depth * .18) / length;
            ctx.rect(point[0], bentY(point[0], point[1], bend, wave, thickness), size, size);
        }
    } else {
        for (let i = 0; i < outline.length; i++) {
            const point = outline[i];
            const y = bentY(point[0], point[1], bend, wave, thickness);

            if (i === 0) ctx.moveTo(point[0], y);
            else ctx.lineTo(point[0], y);
        }

        ctx.closePath();
    }

    ctx.fill();

    if (!dotted) {
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(.38, bentY(.38, -.025, bend, wave, thickness), .006, 0, Math.PI * 2);
        ctx.arc(.22, bentY(.22, .005, bend, wave, thickness), .012, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(3,3,3,.13)';
        ctx.beginPath();

        for (const dot of fish.flecks) ctx.rect(dot[0], bentY(dot[0], dot[1], bend, wave, thickness), .006, .006);

        ctx.fill();
    }

    ctx.restore();
}

function draw(ctx, scene, width, height) {
    ctx.save();
    ctx.fillStyle = '#030303';
    ctx.fillRect(0, 0, width, height);
    const scale = Math.min(width / 720, height / 954);
    ctx.translate((width - 720 * scale) / 2, (height - 954 * scale) / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(255,255,255,.02)';
    ctx.beginPath();

    for (const dot of scene.grain) ctx.rect(dot[0], dot[1], dot[2], dot[2]);

    ctx.fill();
    for (const fish of scene.ghosts) drawFish(ctx, scene, fish, 0, true);

    ctx.fillStyle = '#f5f7f2';

    // Some stippled fish coalesce as they circulate, matching the growing white
    // school in the reference without storing or playing back animation frames.
    for (const fish of scene.ghosts) {
        if (!fish.emerges) continue;

        const reveal = Math.max(0, Math.min(1, (Math.sin(scene.time * .15 - fish.revealDelay) - .15) / .65));

        if (reveal === 0) continue;

        ctx.globalAlpha = reveal * reveal * (3 - 2 * reveal);
        drawFish(ctx, scene, fish, 0, false);
    }

    ctx.globalAlpha = 1;

    for (const fish of scene.fish) drawFish(ctx, scene, fish, 0, false);

    ctx.restore();
}
