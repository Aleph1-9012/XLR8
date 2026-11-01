// SPDX-License-Identifier: 0BSD
// Shared simulation, skeleton, and vector painting for the browser and Qt hosts.
var SeaTurtleMotion = (() => {
  'use strict';

  const CROP = { x: 500, y: 880, width: 2400, height: 2740 };
  const REFERENCE_SCALE = 3277 / 1600;
  const PAPER = [254 / 255, 251 / 255, 244 / 255];

  // Skeleton, in reference coordinates at 1600 wide. Local +x runs along the shell towards the head.
  const CENTER = [810, 1025];
  const SHELL_RADII = [372, 306];
  const REST_ANGLE = -50 * Math.PI / 180;
  const BODY_LENGTH = 1450;
  const FOCAL = 3000;
  const LIMBS = {
    rearLeft: { side: -1, kind: 'rear', joints: [[530, 1225], [445, 1290], [365, 1355], [295, 1430]], radii: [50, 60, 65, 30] },
    rearRight: { side: 1, kind: 'rear', joints: [[705, 1300], [685, 1410], [700, 1530], [735, 1725]], radii: [55, 80, 75, 35] },
    foreLeft: { side: -1, kind: 'fore', joints: [[925, 700], [800, 620], [650, 600], [510, 635], [425, 715]], radii: [70, 75, 75, 55, 25] },
    foreRight: { side: 1, kind: 'fore', joints: [[1125, 880], [1225, 925], [1295, 1030], [1320, 1165], [1305, 1365]], radii: [60, 90, 90, 70, 30] },
    neck: { side: 0, kind: 'neck', joints: [[1000, 790], [1090, 690], [1185, 590], [1262, 510]], radii: [85, 105, 125, 70] },
  };

  // One foreflipper stroke. Phase 0 is the top of the stroke: the flipper sweeps down and back
  // through about 40% of the cycle, then feathers edge-on and lifts forward during recovery.
  const STROKE = {
    at: [0, .2, .38, .5, .72, .9],
    sweep: [.5, .1, -.26, -.32, .05, .38],
    lift: [.6, .02, -.52, -.46, .1, .5],
    feather: [.16, -.34, -.08, .55, .92, .62],
    flex: [.24, .42, .14, -.26, -.42, -.14],
    curl: [-.04, .1, .16, .06, -.1, -.1],
  };
  const POWER_END = .42;
  const HIDDEN_REACH = .62;

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function smooth(low, high, value) {
    const t = clamp((value - low) / (high - low), 0, 1);

    return t * t * (3 - 2 * t);
  }

  function approach(value, target, rate, dt) {
    return value + (target - value) * (1 - Math.exp(-rate * dt));
  }

  function wrapped(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  // Periodic cubic through the stroke keys, so velocity stays continuous across the cycle.
  function sample(channel, phase) {
    const keys = STROKE.at;
    const count = keys.length;
    const position = ((phase % 1) + 1) % 1;
    let index = count - 1;

    for (let i = 0; i < count - 1; i++) {
      if (position < keys[i + 1]) {
        index = i;
        break;
      }
    }

    const next = (index + 1) % count;
    const before = (index + count - 1) % count;
    const after = (index + 2) % count;
    const gap = (next === 0 ? 1 : keys[next]) - keys[index];
    const t = (position - keys[index]) / gap;
    const beforeGap = ((keys[next] - keys[before] + 1) % 1) || 1;
    const afterGap = ((keys[after] - keys[index] + 1) % 1) || 1;
    const tangentA = (channel[next] - channel[before]) / beforeGap * gap;
    const tangentB = (channel[after] - channel[index]) / afterGap * gap;
    const t2 = t * t;
    const t3 = t2 * t;

    return (2 * t3 - 3 * t2 + 1) * channel[index] + (t3 - 2 * t2 + t) * tangentA
      + (-2 * t3 + 3 * t2) * channel[next] + (t3 - t2) * tangentB;
  }

  function toLocal(x, y) {
    const dx = x - CENTER[0];
    const dy = y - CENTER[1];
    const cosine = Math.cos(REST_ANGLE);
    const sine = Math.sin(REST_ANGLE);

    return [dx * cosine + dy * sine, -dx * sine + dy * cosine];
  }

  // Bone 0 is the shell; each limb owns one bone per segment.
  let boneCount = 1;

  for (const limb of Object.values(LIMBS)) {
    limb.points = limb.joints.map(([x, y]) => toLocal(x, y));
    limb.bones = limb.points.slice(0, -1).map(() => boneCount++);
    limb.axes = limb.bones.map((_, i) => {
      const dx = limb.points[i + 1][0] - limb.points[i][0];
      const dy = limb.points[i + 1][1] - limb.points[i][1];
      const length = Math.hypot(dx, dy);

      return [dx / length, dy / length];
    });
  }

  function skinVertex(limb, x, y) {
    if (!limb) return { first: 0, second: 0, blend: 0 };

    let closest = Infinity;
    let reach = 0;

    for (let i = 0; i < limb.bones.length; i++) {
      const [ax, ay] = limb.points[i];
      const [bx, by] = limb.points[i + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
      const distance = Math.hypot(x - ax - dx * t, y - ay - dy * t);

      if (distance < closest) {
        closest = distance;
        reach = i + t;
      }
    }

    if (reach < .5) return { first: 0, second: limb.bones[0], blend: smooth(0, .5, reach) };

    const lower = Math.min(Math.floor(reach - .5), limb.bones.length - 1);
    const upper = Math.min(lower + 1, limb.bones.length - 1);

    return { first: limb.bones[lower], second: limb.bones[upper], blend: smooth(0, 1, reach - .5 - lower) };
  }

  function parts(text) {
    const result = [];
    const header = /^@(\w+) (\d+) (\d+) (\d+) (\d+)$/gm;
    let match = header.exec(text);

    while (match) {
      const [, name, x, y, width, height] = match;

      if (result.length) result[result.length - 1].end = match.index;

      result.push({ name, box: { x: Number(x), y: Number(y), width: Number(width), height: Number(height) },
        start: match.index + match[0].length + 1, end: text.length });
      match = header.exec(text);
    }

    return result;
  }

  function paintPart(context, text, part) {
    const numbers = new Int32Array(1024);
    let start = part.start;

    while (start < part.end) {
      let end = text.indexOf('\n', start);

      if (end < 0 || end > part.end) end = part.end;

      if (end - start > 6) {
        context.fillStyle = `#${text.slice(start, start + 6)}`;
        context.beginPath();
        let count = 0;
        let value = 0;
        let negative = false;
        let reading = false;

        for (let i = start + 6; i <= end; i++) {
          const code = i < end ? text.charCodeAt(i) : 59;
          const digit = code >= 48 && code <= 57;

          if (digit) {
            value = value * 10 + code - 48;
            reading = true;
            continue;
          }

          if (reading) {
            numbers[count++] = negative ? -value : value;
            value = 0;
            negative = false;
            reading = false;
          }

          if (code === 45) negative = true;

          if (code === 59) {
            traceLoop(context, numbers, count);
            count = 0;
          }
        }

        context.fill('evenodd');
      }

      start = end + 1;
    }
  }

  // Quadratics through edge midpoints give round outlines from few stored points.
  function traceLoop(context, numbers, count) {
    if (count < 6) return;

    const points = count / 2;
    let x = numbers[0];
    let y = numbers[1];
    const firstX = x;
    const firstY = y;
    let lastX = x;
    let lastY = y;

    for (let i = 1; i < points; i++) {
      lastX += numbers[i * 2];
      lastY += numbers[i * 2 + 1];
    }

    context.moveTo((lastX + firstX) / 2, (lastY + firstY) / 2);

    for (let i = 1; i <= points; i++) {
      const nextX = i < points ? x + numbers[i * 2] : firstX;
      const nextY = i < points ? y + numbers[i * 2 + 1] : firstY;
      context.quadraticCurveTo(x, y, (x + nextX) / 2, (y + nextY) / 2);
      x = nextX;
      y = nextY;
    }

    context.closePath();
  }

  // Column-major rotation about an axis through a pivot, written into a slot of the bone array.
  function rotation(out, offset, ax, ay, az, angle, px, py) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const k = 1 - c;
    const m00 = c + ax * ax * k;
    const m01 = ax * ay * k - az * s;
    const m02 = ax * az * k + ay * s;
    const m10 = ay * ax * k + az * s;
    const m11 = c + ay * ay * k;
    const m12 = ay * az * k - ax * s;
    const m20 = az * ax * k - ay * s;
    const m21 = az * ay * k + ax * s;
    const m22 = c + az * az * k;
    out[offset] = m00; out[offset + 1] = m10; out[offset + 2] = m20; out[offset + 3] = 0;
    out[offset + 4] = m01; out[offset + 5] = m11; out[offset + 6] = m21; out[offset + 7] = 0;
    out[offset + 8] = m02; out[offset + 9] = m12; out[offset + 10] = m22; out[offset + 11] = 0;
    out[offset + 12] = px - (m00 * px + m01 * py);
    out[offset + 13] = py - (m10 * px + m11 * py);
    out[offset + 14] = -(m20 * px + m21 * py);
    out[offset + 15] = 1;
  }

  function multiply(out, a, b) {
    const r00 = a[0] * b[0] + a[4] * b[1] + a[8] * b[2];
    const r10 = a[1] * b[0] + a[5] * b[1] + a[9] * b[2];
    const r20 = a[2] * b[0] + a[6] * b[1] + a[10] * b[2];
    const r01 = a[0] * b[4] + a[4] * b[5] + a[8] * b[6];
    const r11 = a[1] * b[4] + a[5] * b[5] + a[9] * b[6];
    const r21 = a[2] * b[4] + a[6] * b[5] + a[10] * b[6];
    const r02 = a[0] * b[8] + a[4] * b[9] + a[8] * b[10];
    const r12 = a[1] * b[8] + a[5] * b[9] + a[9] * b[10];
    const r22 = a[2] * b[8] + a[6] * b[9] + a[10] * b[10];
    const tx = a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12];
    const ty = a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13];
    const tz = a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14];
    out[0] = r00; out[1] = r10; out[2] = r20; out[3] = 0;
    out[4] = r01; out[5] = r11; out[6] = r21; out[7] = 0;
    out[8] = r02; out[9] = r12; out[10] = r22; out[11] = 0;
    out[12] = tx; out[13] = ty; out[14] = tz; out[15] = 1;
  }

  const pose = new Float32Array(boneCount * 16);
  const accumulated = new Float32Array(16);
  const step = new Float32Array(16);
  const joined = new Float32Array(16);

  // Sweep turns in the swimming plane, lift bends towards the viewer, feather twists about the limb.
  function addJoint(limb, index, sweep, lift, feather) {
    const [px, py] = limb.points[index];
    const [dx, dy] = limb.axes[index];
    rotation(step, 0, 0, 0, 1, sweep, px, py);
    multiply(joined, accumulated, step);
    rotation(step, 0, dy, -dx, 0, lift, px, py);
    multiply(accumulated, joined, step);
    rotation(step, 0, dx, dy, 0, feather, px, py);
    multiply(joined, accumulated, step);
    accumulated.set(joined);
    pose.set(accumulated, limb.bones[index] * 16);
  }

  function writePose(state) {
    const { phase, stroke, turn, roll, pitch, neckYaw, neckPitch, rudder, kick } = state;
    rotation(step, 0, 1, 0, 0, roll, 0, 0);
    rotation(joined, 0, 0, 1, 0, pitch, 0, 0);
    multiply(accumulated, step, joined);
    pose.set(accumulated, 0);
    const shell = accumulated.slice();

    for (const limb of Object.values(LIMBS)) {
      accumulated.set(shell);

      if (limb.kind === 'fore') {
        // The outer flipper works harder through a turn while the inner one holds back.
        const power = stroke * (1 + limb.side * turn * .24);
        const forward = -limb.side;
        const bias = limb.side * turn * .1 * stroke;

        for (let i = 0; i < limb.bones.length; i++) {
          // Each segment follows the one before it, which bends the flipper like a soft foil.
          const at = phase - i * .022;
          const feather = sample(STROKE.feather, at) * power;

          if (i === 0) {
            addJoint(limb, 0, forward * (sample(STROKE.sweep, at) * power + bias), sample(STROKE.lift, at) * power, forward * feather * .55);
          } else {
            const share = i === 1 ? .22 : .39;
            addJoint(limb, i, -forward * sample(STROKE.curl, at) * power * share, sample(STROKE.flex, at) * power * share, forward * feather * .15);
          }
        }
      } else if (limb.kind === 'rear') {
        // Rear flippers trail as rudders, spreading to the inside of a turn with a slight kick.
        const outward = limb.side;
        const trail = Math.sin((phase + .32 + (limb.side > 0 ? .06 : 0)) * Math.PI * 2);

        for (let i = 0; i < limb.bones.length; i++) {
          const share = i === 0 ? .5 : .25;
          const wave = Math.sin((phase + .32 - i * .05) * Math.PI * 2);
          const yaw = outward > 0 ? rudder : -rudder;
          addJoint(limb, i, (yaw * .55 + wave * .025 * stroke * outward) * share, (wave * .22 * kick + trail * .03) * share, wave * .2 * kick * share * outward);
        }
      } else {
        const bob = Math.sin((phase - .08) * Math.PI * 2) * .035 * stroke;

        for (let i = 0; i < limb.bones.length; i++) {
          addJoint(limb, i, neckYaw * [.34, .42, .24][i], (neckPitch + bob) * [.5, .3, .2][i], 0);
        }
      }
    }
  }

  function createRandom() {
    let seed = 0x5eaf00d ^ Date.now();

    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function create() {
    const random = createRandom();
    const turtle = {
      x: 0, y: 0, angle: REST_ANGLE, angularVelocity: 0, speed: 0,
      phase: .9, stroke: 0, strokeGoal: 1, effort: 1, dash: 0,
      roll: 0, pitch: 0, turn: 0, neckYaw: 0, neckPitch: 0, rudder: 0, kick: 0,
      goal: null, called: false, strokesLeft: 5, glideLeft: 0, passTime: 0, meander: random() * 10,
      held: false,
    };
    let width = 0;
    let height = 0;
    let scale = 1;
    let size = 1;
    let frozen = false;
    const bodyPixels = () => BODY_LENGTH * scale;

    function fitScale() {
      scale = frozen ? Math.min(width / 1600, height / 2000) : Math.min(height * .66, width * .5, 900) * size / BODY_LENGTH;
    }

    // Fits the reference layout into the canvas, so a capture can be compared with the original.
    function placeFrozen() {
      turtle.x = width / 2 + (CENTER[0] - 800) * scale;
      turtle.y = height / 2 + (CENTER[1] - 1000) * scale;
      turtle.angle = REST_ANGLE;
    }

    // A pass aims past the far edge, so the turtle crosses the whole stage and leaves
    // instead of turning round inside an invisible box.
    function nextPass() {
      const past = bodyPixels() * .85;
      const goRight = turtle.x < width / 2;
      const goDown = turtle.y < height / 2;
      const alongSides = random() < Math.min(.8, width / (width + height) + .2);

      turtle.goal = alongSides
        ? { x: goRight ? width + past : -past, y: height * (goDown ? .3 + random() * .7 : random() * .7) }
        : { x: width * (goRight ? .3 + random() * .7 : random() * .7), y: goDown ? height + past : -past };
      turtle.called = false;
      turtle.passTime = 0;
    }

    // Once fully out of sight it slips round to another edge and starts a new crossing.
    function reenter() {
      const hidden = bodyPixels() * HIDDEN_REACH;
      const fromSides = random() < width / (width + height);
      const along = .15 + random() * .7;
      const farSide = random() < .5;

      turtle.x = fromSides ? (farSide ? width + hidden : -hidden) : width * along;
      turtle.y = fromSides ? height * along : (farSide ? height + hidden : -hidden);
      nextPass();
      turtle.angle = Math.atan2(turtle.goal.y - turtle.y, turtle.goal.x - turtle.x);
      turtle.angularVelocity = 0;
      turtle.turn = 0;
      turtle.roll = 0;
      turtle.neckYaw = 0;
      turtle.rudder = 0;
    }

    function call(x, y) {
      turtle.goal = { x, y };
      turtle.called = true;
      turtle.passTime = 0;
      turtle.glideLeft = 0;
      turtle.strokesLeft = Math.max(turtle.strokesLeft, 3);
    }

    function dart() {
      turtle.dash = 2.6;
      turtle.glideLeft = 0;
      turtle.strokesLeft = Math.max(turtle.strokesLeft, 3);
    }

    function recenter() {
      Object.assign(turtle, { x: width * .5, y: height * .5, angle: REST_ANGLE, angularVelocity: 0, speed: 0, phase: .9, stroke: 0, dash: 0, roll: 0, pitch: 0, turn: 0, neckYaw: 0, neckPitch: 0, rudder: 0, kick: 0, goal: null, called: false, glideLeft: 0, strokesLeft: 5 });
    }

    function advance(dt) {
      const bodyLength = bodyPixels();
      turtle.dash = Math.max(0, turtle.dash - dt);
      const dashing = smooth(0, .8, turtle.dash);
      turtle.effort = approach(turtle.effort, (turtle.called ? 1.22 : 1) + dashing * .75, 1.4, dt);
      const previousPhase = turtle.phase;
      turtle.phase = (turtle.phase + dt * turtle.effort / 3.3) % 1;

      if (turtle.phase < previousPhase) {
        // A cruising turtle mixes runs of strokes with long glides on outstretched flippers.
        if (turtle.glideLeft > 0) {
          turtle.glideLeft--;
        } else if (--turtle.strokesLeft <= 0 && !turtle.called && !dashing) {
          turtle.glideLeft = 1;
          turtle.strokesLeft = 3 + Math.floor(random() * 4);
        }
      }

      turtle.strokeGoal = turtle.glideLeft > 0 || turtle.held ? (turtle.held ? .45 : 0) : 1 + dashing * .12;
      turtle.stroke = approach(turtle.stroke, turtle.strokeGoal, 1.1, dt);

      if (turtle.held) {
        turtle.speed = 0;
        turtle.angularVelocity = approach(turtle.angularVelocity, 0, 5, dt);
        turtle.turn = approach(turtle.turn, 0, 4, dt);
        turtle.roll = approach(turtle.roll, 0, 3, dt);
        turtle.rudder = approach(turtle.rudder, 0, 3, dt);
        turtle.neckYaw = approach(turtle.neckYaw, 0, 3, dt);
        turtle.kick = approach(turtle.kick, 1, 3, dt);

        return;
      }

      turtle.passTime += dt;

      if (!turtle.goal) nextPass();

      const outside = Math.max(-turtle.x, turtle.x - width, -turtle.y, turtle.y - height);

      if (!turtle.called && outside > bodyLength * HIDDEN_REACH) reenter();

      let goalX = turtle.goal.x - turtle.x;
      let goalY = turtle.goal.y - turtle.y;
      const remaining = Math.hypot(goalX, goalY);

      if (remaining < bodyLength * (turtle.called ? .35 : .5) || turtle.passTime > 30) {
        nextPass();
        goalX = turtle.goal.x - turtle.x;
        goalY = turtle.goal.y - turtle.y;
      }

      // A slow meander keeps the path organic; it fades out when the turtle has been called.
      turtle.meander += dt * .19;
      const drift = turtle.called ? 0 : (Math.sin(turtle.meander) + Math.sin(turtle.meander * 2.3 + 1.2) * .5) * .28;
      const error = wrapped(Math.atan2(goalY, goalX) + drift - turtle.angle);
      const speedShare = clamp(turtle.speed / (bodyLength * .1), .3, 1);
      const maximumTurn = (.34 + (turtle.called ? .16 : 0) + dashing * .2) * speedShare;
      turtle.angularVelocity = approach(turtle.angularVelocity, clamp(error * .9, -maximumTurn, maximumTurn), 1.5, dt);
      turtle.angle = wrapped(turtle.angle + turtle.angularVelocity * dt);
      const turnAmount = clamp(turtle.angularVelocity / .5, -1, 1);
      turtle.turn = approach(turtle.turn, turnAmount, 2.2, dt);

      // Thrust comes only from the downstroke, then water drag bleeds speed through the recovery.
      // Facing away from the goal it pushes less, which tightens the turn instead of orbiting.
      const position = turtle.phase;
      const push = position < POWER_END ? Math.sin(position / POWER_END * Math.PI) : 0;
      const aligned = .35 + .65 * Math.max(0, Math.cos(error));
      const thrust = .31 * bodyLength * push * turtle.stroke * turtle.effort * turtle.effort * aligned;
      const drag = 1.35 / bodyLength * turtle.speed * turtle.speed;
      turtle.speed = Math.max(0, turtle.speed + (thrust - drag) * dt);
      turtle.x += Math.cos(turtle.angle) * turtle.speed * dt;
      turtle.y += Math.sin(turtle.angle) * turtle.speed * dt;

      // The whole body banks into a turn, rocks with each stroke, and the head leads the turn.
      const rock = Math.sin((position - .12) * Math.PI * 2) * .028 * turtle.stroke;
      turtle.roll = approach(turtle.roll, -turtle.turn * .16, 2, dt);
      turtle.pitch = approach(turtle.pitch, rock, 5, dt);
      turtle.neckYaw = approach(turtle.neckYaw, clamp(error, -1, 1) * .28, 2.6, dt);
      turtle.neckPitch = approach(turtle.neckPitch, -rock * 1.3, 4, dt);
      turtle.rudder = approach(turtle.rudder, turnAmount * .42, 2, dt);
      turtle.kick = approach(turtle.kick, .35 * turtle.stroke + Math.abs(turnAmount) * .35, 2, dt);
    }

    function hit(x, y) {
      const dx = (x - turtle.x) / scale;
      const dy = (y - turtle.y) / scale;
      const cosine = Math.cos(turtle.angle);
      const sine = Math.sin(turtle.angle);
      const localX = dx * cosine + dy * sine;
      const localY = -dx * sine + dy * cosine;

      if (Math.hypot(localX / SHELL_RADII[0], localY / SHELL_RADII[1]) < 1.05) return true;

      return Object.values(LIMBS).some(limb => limb.points.some(([jx, jy], i) => {
        return Math.hypot(localX - jx, localY - jy) < limb.radii[i] + 18;
      }));
    }

    function layout(nextWidth, nextHeight) {
      if (nextWidth <= 0 || nextHeight <= 0) return;

      if (width) {
        turtle.x *= nextWidth / width;
        turtle.y *= nextHeight / height;

        if (turtle.goal) {
          turtle.goal.x *= nextWidth / width;
          turtle.goal.y *= nextHeight / height;
        }
      } else {
        turtle.x = nextWidth * .5;
        turtle.y = nextHeight * .5;
      }

      width = nextWidth;
      height = nextHeight;
      fitScale();

      if (frozen) placeFrozen();
    }

    function configure(nextSize) {
      size = nextSize;
      fitScale();
    }

    function freeze(phase) {
      frozen = true;
      fitScale();
      placeFrozen();

      if (phase !== null) {
        turtle.phase = phase;
        turtle.stroke = 1;
        turtle.kick = .35;
      }
    }

    return { turtle, advance, hit, call, dart, recenter, configure, freeze, layout, bodyPixels,
      get width() { return width; }, get height() { return height; }, get scale() { return scale; } };
  }

  return { CROP, REFERENCE_SCALE, PAPER, FOCAL, LIMBS, boneCount, toLocal, skinVertex, create, parts, paintPart,
    pose(turtle) { writePose(turtle); return pose; } };
})();
