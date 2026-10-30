// SPDX-License-Identifier: 0BSD
(() => {
  const slider = document.querySelector('.slider');
  const input = document.querySelector('input[type="range"]');
  const output = document.querySelector('[data-value]');
  const label = document.querySelector('label');
  let initialValue;
  let widgetWidth = 344;

  function fitPreview() {
    const available = Math.max(1, document.body.clientWidth - 48);
    const scale = Math.min(2.5, Math.max(1, available / 344));
    slider.style.setProperty('--preview-scale', String(scale));
    slider.style.setProperty('--preview-width', `${Math.min(widgetWidth, available / scale)}px`);
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
    slider.style.setProperty('--spacing', `${settings.patternSpacing}px`);
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
