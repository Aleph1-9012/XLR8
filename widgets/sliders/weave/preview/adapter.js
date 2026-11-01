// SPDX-License-Identifier: 0BSD
(() => {
  const slider = document.querySelector('.slider');
  const input = document.querySelector('input[type="range"]');
  const output = document.querySelector('[data-value]');
  const label = document.querySelector('label');
  const track = document.querySelector('.track-art');
  const weave = document.querySelector('[data-weave]');
  let initialValue;
  let widgetWidth = 344;
  let drawnWidth = -1;

  function layoutWeave(scale) {
    const width = track.getBoundingClientRect().width / scale;

    if (width === drawnWidth) return;

    drawnWidth = width;
    track.setAttribute('viewBox', `0 0 ${Math.max(1, width)} 36`);
    const strokes = [];

    // Full vector strokes avoid enlarging a rasterized five-pixel pattern tile.
    for (let x = 0; x < width; x += 5) {
      strokes.push(`M${x + .5} 0V36M${x + 2.5} 0V36`);

      for (let y = 0; y < 36; y += 5) {
        strokes.push(`M${x} ${y + 2.5}h3M${x + 2.5} ${y + .5}h2.5M${x + 2.5} ${y + 4.5}h2.5`);
      }
    }

    weave.setAttribute('d', strokes.join(''));
  }

  function fitPreview() {
    const available = Math.max(1, document.body.clientWidth - 48);
    const scale = Math.min(2.5, Math.max(1, available / 344));
    slider.style.setProperty('--preview-scale', String(scale));
    slider.style.setProperty('--preview-width', `${Math.min(widgetWidth, available / scale)}px`);
    layoutWeave(scale);
  }

  function render() {
    const value = input.valueAsNumber;
    slider.style.setProperty('--position', `${value}%`);
    output.textContent = String(value);
    input.setAttribute('aria-valuetext', `${value} percent`);
  }

  input.addEventListener('input', render);
  window.addEventListener('resize', fitPreview);
  fitPreview();
  render();

  window.ChaldeaPreview.connect(settings => {
    label.textContent = settings.label;
    slider.style.setProperty('--slider-bg', settings.backgroundColor);
    slider.style.setProperty('--slider-text', settings.textColor);
    slider.style.setProperty('--slider-accent', settings.accentColor);
    widgetWidth = settings.widgetWidth;
    fitPreview();

    // Appearance edits preserve the level chosen directly in the preview.
    if (initialValue !== settings.initialValue) {
      initialValue = settings.initialValue;
      input.value = String(initialValue);
    }

    render();
  });
})();
