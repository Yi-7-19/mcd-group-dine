import {Easing, interpolate} from 'remotion';

// A frame clock keeps the existing semantic HTML interactive and portable.
// scripts/build-motion.mjs bundles these two original Remotion helpers only.
const fps = 60;
const easing = Easing.bezier(0.2, 0.7, 0.2, 1);
const clamp = {extrapolateLeft:'clamp', extrapolateRight:'clamp', easing};
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const values = new WeakMap();
const jobs = new Map();
const resets = [];
let raf = 0;
let printing = false;

document.documentElement.dataset.motionEngine = 'remotion-4.0.534';

function tick(now) {
  raf = 0;
  for (const [element, job] of jobs) {
    const frame = (now - job.start) * fps / 1000;
    const value = interpolate(frame, [0, job.frames], [job.from, job.to], clamp);
    values.set(element, value);
    job.draw(value);
    if (frame >= job.frames) {
      jobs.delete(element);
      job.done?.();
    }
  }
  if (jobs.size) raf = requestAnimationFrame(tick);
}

function animate(element, to, milliseconds, draw, from = values.get(element) ?? 0, done) {
  if (reduced.matches || printing || document.hidden || from === to) {
    jobs.delete(element);
    values.set(element, to);
    draw(to);
    done?.();
    return;
  }
  values.set(element, from);
  draw(from);
  jobs.set(element, {from, to, start:performance.now(), frames:milliseconds * fps / 1000, draw, done});
  if (!raf) raf = requestAnimationFrame(tick);
}

function settle() {
  cancelAnimationFrame(raf);
  raf = 0;
  for (const [element, job] of jobs) {
    values.set(element, job.to);
    job.draw(job.to);
    job.done?.();
  }
  jobs.clear();
  resets.forEach(reset => reset());
}

for (const [selector, duration] of [['.hero-copy',480], ['.hero-visual',560]]) {
  const element = document.querySelector(selector);
  if (!element) continue;
  const draw = value => {
    element.style.opacity = String(value);
    element.style.transform = `translateY(${interpolate(value, [0,1], [14,0])}px)`;
  };
  animate(element, 1, duration, draw, 0, () => {
    element.style.removeProperty('opacity');
    element.style.removeProperty('transform');
  });
}

document.querySelectorAll('.button').forEach(element => {
  let hover = false;
  let pressed = false;
  const draw = value => {
    const y = interpolate(value, [-1,0,1], [1,0,-2]);
    const scale = interpolate(value, [-1,0,1], [.98,1,1]);
    element.style.transform = `translateY(${y}px) scale(${scale})`;
  };
  const reset = () => {
    hover = pressed = false;
    jobs.delete(element);
    values.set(element, 0);
    element.style.removeProperty('transform');
  };
  const update = () => {
    if (element.disabled || reduced.matches || printing) return reset();
    animate(element, pressed ? -1 : hover && fine.matches ? 1 : 0, 180, draw);
  };
  element.addEventListener('pointerenter', () => { hover = true; update(); });
  element.addEventListener('pointerleave', () => { hover = pressed = false; update(); });
  element.addEventListener('pointerdown', () => { pressed = true; update(); });
  element.addEventListener('pointerup', () => { pressed = false; update(); });
  element.addEventListener('pointercancel', () => { pressed = false; update(); });
  element.addEventListener('keydown', event => {
    if (!event.repeat && ['Enter',' '].includes(event.key)) { pressed = true; update(); }
  });
  element.addEventListener('keyup', event => {
    if (['Enter',' '].includes(event.key)) { pressed = false; update(); }
  });
  element.addEventListener('blur', () => { pressed = false; update(); });
  new MutationObserver(() => { if (element.disabled) reset(); }).observe(element, {attributes:true, attributeFilter:['disabled']});
  resets.push(reset);
});

document.querySelectorAll('.person-card, .food-card').forEach(card => {
  const image = card.querySelector('.food-photo');
  const element = image ?? card;
  const draw = value => { element.style.transform = image ? `scale(${1 + value * .035})` : `translateY(${-2 * value}px)`; };
  const reset = () => {
    jobs.delete(element);
    values.set(element, 0);
    element.style.removeProperty('transform');
  };
  card.addEventListener('pointerenter', () => {
    if (fine.matches && !reduced.matches && !printing) animate(element, 1, 240, draw);
  });
  card.addEventListener('pointerleave', () => animate(element, 0, 240, draw));
  resets.push(reset);
});

document.querySelectorAll('details').forEach(details => {
  const element = details.querySelector('.chevron');
  if (!element) return;
  values.set(element, Number(details.open));
  const draw = value => { element.style.transform = `rotate(${value * 180}deg)`; };
  const reset = () => {
    jobs.delete(element);
    values.set(element, Number(details.open));
    element.style.removeProperty('transform');
  };
  const content = details.querySelector('.member-items, .rules-body, .summary-lines');
  const clearContent = () => {
    if (!content) return;
    jobs.delete(content);
    content.style.removeProperty('opacity');
    content.style.removeProperty('transform');
  };
  details.addEventListener('toggle', () => {
    animate(element, Number(details.open), 200, draw);
    if (content && details.open) {
      animate(content, 1, 220, value => {
        content.style.opacity = String(value);
        content.style.transform = `translateY(${interpolate(value,[0,1],[4,0])}px)`;
      }, 0, clearContent);
    } else clearContent();
  });
  resets.push(clearContent);
  resets.push(reset);
});

document.querySelectorAll('.nav a').forEach(element => {
  let hover = false;
  const target = () => Number(element.hasAttribute('aria-current') || hover);
  const draw = value => element.style.setProperty('--nav-progress', String(value));
  values.set(element, target());
  const update = () => animate(element, target(), 200, draw);
  element.addEventListener('pointerenter', () => { hover = fine.matches; update(); });
  element.addEventListener('pointerleave', () => { hover = false; update(); });
  new MutationObserver(update).observe(element, {attributes:true, attributeFilter:['aria-current']});
  resets.push(() => {
    hover = false;
    jobs.delete(element);
    values.set(element, target());
    draw(target());
  });
});

reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
fine.addEventListener('change', settle);
document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
window.addEventListener('pagehide', settle);
window.addEventListener('beforeprint', () => { printing = true; settle(); });
window.addEventListener('afterprint', () => { printing = false; settle(); });
