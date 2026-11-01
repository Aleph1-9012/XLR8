(() => {
  'use strict';

  const canvas = document.getElementById('school');
  const context = canvas.getContext('2d');
  const preview = window.ChaldeaPreview;
  const scene = create();
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches;
  let speed = 1;
  let lastTime = 0;
  let request = 0;

  function paint() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw(context, scene, width, height);
  }

  function tick(now) {
    request = 0;

    if (paused || document.hidden) return;
    if (lastTime && now - lastTime < 1000 / 30) {
      request = requestAnimationFrame(tick);

      return;
    }

    if (lastTime) advance(scene, (now - lastTime) / 1000, speed);

    lastTime = now;
    paint();
    request = requestAnimationFrame(tick);
  }

  function schedule() {
    cancelAnimationFrame(request);
    lastTime = 0;

    if (!paused && !document.hidden) request = requestAnimationFrame(tick);

    preview?.controlsChanged();
  }

  function restart() {
    reset(scene);
    paint();
  }

  canvas.addEventListener('pointermove', event => {
    const box = canvas.getBoundingClientRect();
    setPointer(scene, (event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height, true);
  });
  canvas.addEventListener('pointerleave', () => setPointer(scene, .5, .5, false));
  canvas.addEventListener('pointerdown', event => {
    canvas.focus();
    const box = canvas.getBoundingClientRect();
    setPointer(scene, (event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height, true);
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerType !== 'mouse') setPointer(scene, .5, .5, false);
  });
  canvas.addEventListener('pointercancel', () => setPointer(scene, .5, .5, false));
  canvas.addEventListener('keydown', event => {
    if (event.code === 'Space') {
      event.preventDefault();
      paused = !paused;
      schedule();
    }

    if (event.key.toLowerCase() === 'r') restart();
  });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => {
    paused = motion.matches;
    schedule();
  });
  new ResizeObserver(paint).observe(canvas);
  preview?.connect(settings => {
    speed = settings.speed;
    paint();
  }, {
    read() {
      return {
        controls: [{ type: 'button', key: 'restart', label: 'Restart' }],
        archives: [],
        status: 'Move across the school to part the fish. Space pauses; R restarts.',
        paused,
        canEscape: false,
      };
    },
    pause(value) { paused = value; schedule(); },
    action(key) { if (key === 'restart') restart(); },
    hosted() {},
  });
  paint();
  schedule();
})();
