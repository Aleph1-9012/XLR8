// SPDX-License-Identifier: 0BSD
(() => {
  const slider = document.querySelector('.slider');
  const input = document.querySelector('input[type="range"]');
  const output = document.querySelector('[data-value]');
  const label = document.querySelector('label');
  const track = document.querySelector('.track');
  const pattern = document.querySelector('.remaining svg');
  let initialValue;
  let widgetWidth = 344;
  let patternWidth = -1;
  let columns = [];
  let patternSpacing = 7;
  let drawnSpacing = 0;

  function showPattern() {
    // Keep each mark beyond the 3px handle and its 2px background mask.
    const edge = patternWidth * input.valueAsNumber / 100 + 3.5;

    for (const column of columns) {
      const visible = column.center - 1 >= edge;

      if (column.visible !== visible) {
        column.element.style.visibility = visible ? 'visible' : 'hidden';
        column.visible = visible;
      }
    }
  }

  function layoutPattern(scale) {
    const width = track.getBoundingClientRect().width / scale;

    if (width === patternWidth && patternSpacing === drawnSpacing) return;

    patternWidth = width;
    drawnSpacing = patternSpacing;
    pattern.setAttribute('viewBox', `0 0 ${Math.max(1, width)} 8`);
    const count = Math.max(0, Math.floor((width - 4) / patternSpacing) + 1);
    const first = (width - (count - 1) * patternSpacing) / 2;
    const children = document.createDocumentFragment();
    columns = [];

    for (let index = 0; index < count; index++) {
      const center = first + index * patternSpacing;
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const mark = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      mark.setAttribute('x', String(center - 1));
      mark.setAttribute('width', '2');
      mark.setAttribute('height', '8');
      group.append(mark);
      children.append(group);
      columns.push({ center, element: group, visible: undefined });
    }

    pattern.replaceChildren(children);
    showPattern();
  }

  function fitPreview() {
    const available = Math.max(1, document.body.clientWidth - 48);
    const scale = Math.min(2.5, Math.max(1, available / 344));
    slider.style.setProperty('--preview-scale', String(scale));
    slider.style.setProperty('--preview-width', `${Math.min(widgetWidth, available / scale)}px`);
    layoutPattern(scale);
  }

  function render() {
    const value = input.valueAsNumber;
    slider.style.setProperty('--position', `${value}%`);
    output.textContent = String(value);
    input.setAttribute('aria-valuetext', `${value} percent`);
    showPattern();
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
    patternSpacing = settings.patternSpacing;
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
