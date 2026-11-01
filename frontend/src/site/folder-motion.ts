import { flushSync } from 'svelte';

interface Reveal {
  animation: Animation;
  from: number;
  to: number;
}

function labelBounds(node: HTMLElement) {
  const style = getComputedStyle(node);
  const scale = style.scale === 'none' ? 1 : Number.parseFloat(style.scale);

  return { node, rect: node.getBoundingClientRect(), size: Number.parseFloat(style.fontSize) * scale };
}

function visibleScroll(button: HTMLButtonElement, folderHeight: number): number {
  const start = window.scrollY;

  if (button.getAttribute('aria-expanded') !== 'true') return start;

  const top = button.getBoundingClientRect().top;
  const visibleTop = Math.max(12, Math.min(top, window.innerHeight - folderHeight - 16));

  return Math.max(0, start + top - visibleTop);
}

export function folderMotion(section: HTMLElement) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(max-width: 850px)');
  const animations: Animation[] = [];
  const cleanups: (() => void)[] = [];
  const reveals = new Map<HTMLElement, Reveal>();
  let width = section.clientWidth;
  let scrollFrame = 0;

  function stopScroll(): void {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
  }

  function stop(): void {
    stopScroll();

    for (const animation of animations) {
      animation.onfinish = null;
      animation.cancel();
    }

    for (const cleanup of cleanups) cleanup();

    animations.length = 0;
    cleanups.length = 0;
    reveals.clear();
    section.style.removeProperty('height');
    delete section.dataset.folderMotion;
  }

  function measure() {
    return [...section.querySelectorAll<HTMLElement>('.family-folder')].map(node => {
      const content = node.querySelector<HTMLElement>('.folder-content')!;
      const inner = node.querySelector<HTMLElement>('.folder-content-inner')!;
      const reveal = reveals.get(inner);
      const progress = reveal?.animation.effect?.getComputedTiming().progress ?? 1;

      return {
        node,
        rect: node.getBoundingClientRect(),
        surface: node.querySelector<HTMLElement>('.folder-surface')!,
        content: inner,
        contentRect: inner.getBoundingClientRect(),
        visible: reveal ? reveal.from + (reveal.to - reveal.from) * progress : content.getBoundingClientRect().height,
        labels: [...node.querySelectorAll<HTMLElement>('.folder-toggle > span')].map(labelBounds),
      };
    });
  }

  function run(update: () => void, button: HTMLButtonElement): void {
    if (!phone.matches || preference.matches || document.hidden) {
      stop();
      flushSync(update);

      if (phone.matches && !document.hidden) {
        const folder = button.closest<HTMLElement>('.family-folder')!;
        window.scrollTo({ top: visibleScroll(button, folder.getBoundingClientRect().height), behavior: 'instant' });
      }

      return;
    }

    const before = measure();
    const sectionBefore = section.getBoundingClientRect();
    const descriptor = section.querySelector<HTMLElement>('.family-directory-heading p')!;
    const browse = section.querySelector<HTMLElement>('.folder-browse')!;
    const descriptorBefore = descriptor.getBoundingClientRect();
    const browseBefore = browse.getBoundingClientRect();
    stop();

    // Freeze page height while the folder contents take their final layout once.
    section.style.height = `${sectionBefore.height}px`;
    section.dataset.folderMotion = '';
    flushSync(update);

    const after = measure();
    const descriptorAfter = descriptor.getBoundingClientRect();
    const browseAfter = browse.getBoundingClientRect();
    const style = getComputedStyle(section);
    const height = Math.max(Number.parseFloat(style.minHeight), browseAfter.bottom - section.getBoundingClientRect().top + Number.parseFloat(style.paddingBottom));
    const scrollStart = window.scrollY;
    const opened = after.find(folder => folder.node.contains(button))!;
    const scrollEnd = visibleScroll(button, opened.rect.height);
    const options: KeyframeAnimationOptions = {
      duration: Number.parseFloat(style.getPropertyValue('--folder-duration')),
      easing: style.getPropertyValue('--ease').trim(),
      fill: 'both',
    };

    function animate(node: HTMLElement, frames: Keyframe[]): Animation {
      const animation = node.animate(frames, options);
      animations.push(animation);

      return animation;
    }

    for (const [index, end] of after.entries()) {
      const start = before[index]!;
      const shift = start.rect.top - end.rect.top;

      if (Math.abs(shift) > .1) animate(end.node, [{ translate: `0 ${shift}px` }, { translate: '0 0' }]);

      // Later folders cover this fixed-size artwork as they move. The grain and
      // silhouette no longer resize and repaint on every animation frame.
      end.surface.style.height = `${Math.max(start.rect.height, end.rect.height) + 28}px`;
      end.surface.style.bottom = 'auto';
      cleanups.push(() => {
        end.surface.style.removeProperty('height');
        end.surface.style.removeProperty('bottom');
      });

      for (const [labelIndex, label] of end.labels.entries()) {
        const previous = start.labels[labelIndex]!;
        const x = previous.rect.left - label.rect.left;
        const y = previous.rect.top + previous.rect.height / 2 - label.rect.top - label.rect.height / 2 - shift;

        if (Math.abs(x) < .1 && Math.abs(y) < .1 && Math.abs(previous.size - label.size) < .01) continue;

        animate(label.node, [
          { translate: `${x}px ${y}px`, scale: String(previous.size / label.size) },
          { translate: '0 0', scale: '1' },
        ]);
      }

      if (start.visible === 0 && end.visible === 0) continue;

      const fullHeight = Math.max(start.contentRect.height, end.contentRect.height, start.visible, end.visible);
      const content = end.content;
      content.style.position = 'absolute';
      content.style.inset = '0 0 auto';
      content.style.height = `${fullHeight}px`;
      cleanups.push(() => {
        content.style.removeProperty('position');
        content.style.removeProperty('inset');
        content.style.removeProperty('height');
      });

      const animation = animate(content, [
        { clipPath: `inset(0 0 ${fullHeight - start.visible}px)`, translate: `0 ${start.contentRect.top - end.contentRect.top - shift}px` },
        { clipPath: `inset(0 0 ${fullHeight - end.visible}px)`, translate: '0 0' },
      ]);
      reveals.set(content, { animation, from: start.visible, to: end.visible });
    }

    animate(descriptor, [{ translate: `0 ${descriptorBefore.top - descriptorAfter.top}px` }, { translate: '0 0' }]);
    animate(browse, [{ translate: `0 ${browseBefore.top - browseAfter.top}px` }, { translate: '0 0' }]);
    // Only the outer spacer changes height; text and artwork move as fixed layers.
    const clock = animate(section, [{ height: `${sectionBefore.height}px` }, { height: `${height}px` }]);
    clock.onfinish = () => {
      if (scrollFrame) window.scrollTo({ top: scrollEnd, behavior: 'instant' });

      stop();
    };

    // Keep the newly opened contents visible, using the same timeline. Wheel and
    // touch input cancel this correction instead of competing with the visitor.
    if (scrollEnd !== scrollStart) {
      function scroll(): void {
        const progress = clock.effect?.getComputedTiming().progress ?? 1;
        window.scrollTo({ top: scrollStart + (scrollEnd - scrollStart) * progress, behavior: 'instant' });
        scrollFrame = requestAnimationFrame(scroll);
      }

      scrollFrame = requestAnimationFrame(scroll);
    }
  }

  const observer = new ResizeObserver(() => {
    if (section.clientWidth === width) return;

    width = section.clientWidth;
    stop();
  });
  observer.observe(section);
  preference.addEventListener('change', stop);
  document.addEventListener('visibilitychange', stop);
  window.addEventListener('wheel', stopScroll, { passive: true });
  window.addEventListener('touchstart', stopScroll, { passive: true });

  return {
    run,
    destroy(): void {
      stop();
      observer.disconnect();
      preference.removeEventListener('change', stop);
      document.removeEventListener('visibilitychange', stop);
      window.removeEventListener('wheel', stopScroll);
      window.removeEventListener('touchstart', stopScroll);
    },
  };
}
