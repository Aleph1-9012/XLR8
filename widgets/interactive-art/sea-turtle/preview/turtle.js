// SPDX-License-Identifier: 0BSD
(() => {
  'use strict';

  const Motion = window.SeaTurtleMotion;
  const { CROP, REFERENCE_SCALE, PAPER, FOCAL, LIMBS, boneCount, toLocal, skinVertex } = Motion;
  const SHARPEN = .6;
  const MAX_PIXEL_RATIO = 3;
  const MAX_SCENE_PIXELS = 16e6;
  const BACKGROUNDS = { Cream: [254 / 255, 251 / 255, 244 / 255], White: [1, 1, 1] };

  // One grid per body part, drawn limbs first so a flipper tucked back passes under the shell.
  function buildMesh(parts) {
    const spacing = 22;
    const vertices = [];
    const indices = [];
    const ranges = [];

    for (const part of parts) {
      const { x, y, width, height } = part.box;
      const columns = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);
      const base = vertices.length / 7;
      const first = indices.length;

      for (let row = 0; row <= rows; row++) {
        for (let column = 0; column <= columns; column++) {
          const insideX = Math.min(column * spacing, width);
          const insideY = Math.min(row * spacing, height);
          const [localX, localY] = toLocal((x + insideX + CROP.x) / REFERENCE_SCALE, (y + insideY + CROP.y) / REFERENCE_SCALE);
          const skin = skinVertex(LIMBS[part.name], localX, localY);
          vertices.push(insideX / width, insideY / height, localX, localY, skin.first, skin.second, skin.blend);
        }
      }

      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const a = base + row * (columns + 1) + column;
          const b = a + 1;
          const c = a + columns + 1;
          const d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }

      ranges.push({ part, first: first * 4, count: indices.length - first });
    }

    return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices), ranges };
  }

  function paintPigment(scale) {
    return Motion.parts(window.SeaTurtlePigment).map(part => {
      const { box } = part;
      const surface = document.createElement('canvas');
      surface.width = Math.ceil(box.width * scale);
      surface.height = Math.ceil(box.height * scale);
      const context = surface.getContext('2d', { willReadFrequently: true });
      context.setTransform(surface.width / box.width, 0, 0, surface.height / box.height,
        -box.x * surface.width / box.width, -box.y * surface.height / box.height);
      Motion.paintPart(context, window.SeaTurtlePigment, part);

      return { ...part, surface };
    });
  }

  const VERTEX_SOURCE = `#version 300 es
    in vec2 aUv;
    in vec2 aLocal;
    in vec3 aSkin;
    uniform mat4 uBones[${boneCount}];
    uniform vec2 uPosition;
    uniform mat2 uTurn;
    uniform float uScale;
    uniform vec2 uView;
    out vec2 vUv;

    void main() {
      vec4 rest = vec4(aLocal, 0.0, 1.0);
      vec4 moved = mix(uBones[int(aSkin.x)] * rest, uBones[int(aSkin.y)] * rest, aSkin.z);
      float depth = ${FOCAL.toFixed(1)} / (${FOCAL.toFixed(1)} - moved.z);
      vec2 world = uTurn * (moved.xy * depth) * uScale + uPosition;
      vec2 clip = world / uView * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      vUv = aUv;
    }`;

  const FRAGMENT_SOURCE = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uPigment;
    out vec4 color;

    void main() {
      color = texture(uPigment, vUv);
    }`;

  const FINISH_VERTEX_SOURCE = `#version 300 es
    out vec2 vUv;

    void main() {
      vUv = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 2.0;
      gl_Position = vec4(vUv * 2.0 - 1.0, 0.0, 1.0);
    }`;

  // Runs once over the finished turtle, once its parts are composited. Taking the reference's
  // cream out of the pigment lets the same marks sit cleanly on either solid background.
  const FINISH_FRAGMENT_SOURCE = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uScene;
    uniform vec3 uBackground;
    uniform vec2 uStep;
    out vec4 color;
    const vec3 paper = vec3(${PAPER.map(value => value.toFixed(5)).join(', ')});

    vec3 paintedAt(vec2 uv) {
      vec4 mark = texture(uScene, uv);

      return mark.rgb + (1.0 - mark.a) * paper;
    }

    void main() {
      vec3 centre = paintedAt(vUv);
      vec3 around = paintedAt(vUv + vec2(uStep.x, 0.0)) + paintedAt(vUv - vec2(uStep.x, 0.0))
        + paintedAt(vUv + vec2(0.0, uStep.y)) + paintedAt(vUv - vec2(0.0, uStep.y));
      // Restores the edge contrast averaging takes away. Capped at the paper, so no pale halo forms.
      vec3 painted = clamp(centre + (centre - around * 0.25) * ${SHARPEN.toFixed(2)}, vec3(0.0), paper);
      vec3 removed = (paper - painted) / paper;
      float strength = clamp(max(removed.r, max(removed.g, removed.b)), 0.0, 1.0);
      vec3 glaze = max(painted - (1.0 - strength) * paper, 0.0);
      color = vec4(glaze + (1.0 - strength) * uBackground, 1.0);
    }`;

  function compile(gl, type, source) {
    const unit = gl.createShader(type);
    gl.shaderSource(unit, source);
    gl.compileShader(unit);

    if (!gl.getShaderParameter(unit, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(unit));

    return unit;
  }

  function link(gl, vertexSource, fragmentSource) {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));

    return program;
  }

  function uploadPigment(gl, parts) {
    for (const part of parts) {
      gl.bindTexture(gl.TEXTURE_2D, part.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, part.surface);
      gl.generateMipmap(gl.TEXTURE_2D);
      part.surface = null;
    }
  }

  function createRenderer(gl, parts) {
    const program = link(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
    const finish = link(gl, FINISH_VERTEX_SOURCE, FINISH_FRAGMENT_SOURCE);
    gl.useProgram(program);
    const mesh = buildMesh(parts);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    for (const [name, size, offset] of [['aUv', 2, 0], ['aLocal', 2, 8], ['aSkin', 3, 16]]) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 28, offset);
    }

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    const anisotropy = gl.getExtension('EXT_texture_filter_anisotropic');

    for (const part of parts) {
      part.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, part.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      if (anisotropy) gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    }

    uploadPigment(gl, parts);

    // Parts composite opaquely, as painted, before the single finishing pass. Finishing each
    // part separately would double the pigment wherever two parts meet.
    const sceneTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
    const scene = gl.createFramebuffer();
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.uniform1i(gl.getUniformLocation(program, 'uPigment'), 0);
    gl.useProgram(finish);
    gl.uniform1i(gl.getUniformLocation(finish, 'uScene'), 1);
    const uniform = name => gl.getUniformLocation(program, name);

    return {
      program,
      finish,
      scene,
      sceneTexture,
      sceneWidth: 0,
      sceneHeight: 0,
      background: gl.getUniformLocation(finish, 'uBackground'),
      step: gl.getUniformLocation(finish, 'uStep'),
      bones: uniform('uBones'),
      position: uniform('uPosition'),
      turn: uniform('uTurn'),
      scale: uniform('uScale'),
      view: uniform('uView'),
      ranges: mesh.ranges,
    };
  }

  // Draws one turtle into a canvas. adapter.js owns input, playback, and settings.
  function create(canvas) {
    const scene = Motion.create();
    const { turtle, advance, hit, call, dart, recenter, bodyPixels } = scene;
    let width = 0;
    let height = 0;
    let scale = 1;
    let background = BACKGROUNDS.Cream;
    let parts = [];
    let renderer = null;
    let detail = 0;
    let detailTimer = 0;

    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
    const flat = gl ? null : canvas.getContext('2d');
    const textureLimit = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 4096;

    function paint() {
      if (!width) return;

      if (gl) draw(gl, renderer);
      else drawFlat(flat);
    }

    // The largest scene is the one a screen can afford twice over: averaging two scene pixels into
    // each canvas pixel keeps the marks crisp at any position and angle.
    function sceneFactor() {
      return canvas.width * canvas.height * 4 <= MAX_SCENE_PIXELS && Math.max(canvas.width, canvas.height) * 2 <= textureLimit ? 2 : 1;
    }

    // The marks are vectors, so they are painted at the size they appear rather than shrunk from a
    // larger bitmap, which is what softens them.
    function wantedDetail() {
      const pixelsPerUnit = scale * canvas.width / width * sceneFactor();

      return Math.min(pixelsPerUnit / REFERENCE_SCALE, 1, textureLimit / CROP.height);
    }

    function repaintPigment() {
      detail = wantedDetail();
      const fresh = paintPigment(detail);

      if (!parts.length) {
        parts = fresh;

        return;
      }

      parts.forEach((part, index) => { part.surface = fresh[index].surface; });

      if (gl) uploadPigment(gl, parts);
    }

    function refreshDetail() {
      clearTimeout(detailTimer);

      if (!parts.length || Math.abs(wantedDetail() / detail - 1) < .04) return;

      detailTimer = setTimeout(() => {
        repaintPigment();
        paint();
      }, 140);
    }

    // Takes the canvas's exact device pixels when the browser reports them, so its buffer is never
    // resampled on the way to the screen.
    function layout(devicePixels) {
      const box = canvas.getBoundingClientRect();
      const nextWidth = box.width;
      const nextHeight = box.height;

      if (!nextWidth || !nextHeight) return;

      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const exact = devicePixels && Math.abs(devicePixels.inlineSize - nextWidth * ratio) <= 1 && Math.abs(devicePixels.blockSize - nextHeight * ratio) <= 1;

      scene.layout(nextWidth, nextHeight);
      width = scene.width;
      height = scene.height;
      scale = scene.scale;
      const pixelWidth = exact ? devicePixels.inlineSize : Math.round(width * ratio);
      const pixelHeight = exact ? devicePixels.blockSize : Math.round(height * ratio);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      refreshDetail();
    }

    function draw(gl, renderer) {
      if (renderer.sceneWidth !== canvas.width || renderer.sceneHeight !== canvas.height) {
        renderer.sceneWidth = canvas.width;
        renderer.sceneHeight = canvas.height;
        gl.activeTexture(gl.TEXTURE1);
        renderer.sceneFactor = sceneFactor();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, canvas.width * renderer.sceneFactor, canvas.height * renderer.sceneFactor, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.scene);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderer.sceneTexture, 0);
      }

      gl.viewport(0, 0, canvas.width * renderer.sceneFactor, canvas.height * renderer.sceneFactor);
      gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.scene);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(renderer.program);
      gl.enable(gl.BLEND);
      gl.uniformMatrix4fv(renderer.bones, false, Motion.pose(turtle));
      gl.uniform2f(renderer.position, turtle.x, turtle.y);
      const cosine = Math.cos(turtle.angle);
      const sine = Math.sin(turtle.angle);
      gl.uniformMatrix2fv(renderer.turn, false, [cosine, sine, -sine, cosine]);
      gl.uniform1f(renderer.scale, scale);
      gl.uniform2f(renderer.view, width, height);

      for (const range of renderer.ranges) {
        gl.bindTexture(gl.TEXTURE_2D, range.part.texture);
        gl.drawElements(gl.TRIANGLES, range.count, gl.UNSIGNED_INT, range.first);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.BLEND);
      gl.useProgram(renderer.finish);
      gl.uniform3fv(renderer.background, background);
      gl.uniform2f(renderer.step, 1 / canvas.width, 1 / canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // Without WebGL2 the painted turtle still shows, without the flipper motion.
    function drawFlat(context) {
      const ratio = canvas.width / width;
      const fit = bodyPixels() * 1.14 / CROP.width;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(ratio * fit, 0, 0, ratio * fit, ratio * (width - CROP.width * fit) / 2, ratio * (height - CROP.height * fit) / 2);

      for (const { box, surface } of parts) context.drawImage(surface, box.x, box.y, box.width, box.height);
    }

    function configure(nextSize, backgroundName) {
      scene.configure(nextSize);
      scale = scene.scale;
      background = BACKGROUNDS[backgroundName];
      refreshDetail();
    }

    function freeze(phase) {
      scene.freeze(phase);
      scale = scene.scale;
      refreshDetail();
    }

    layout();
    repaintPigment();
    renderer = gl ? createRenderer(gl, parts) : null;

    return {
      animated: Boolean(gl),
      turtle,
      advance,
      hit,
      call,
      dart,
      recenter,
      configure,
      freeze,
      layout,
      bodyPixels,
      paint,
    };
  }

  window.SeaTurtle = { create };
})();
