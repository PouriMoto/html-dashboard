/* icons.js — آیکون‌ها و پوشش پروژه‌ها.
   اگر فایل اسپرایت Tabler (مسیر در settings.iconSpritePath) موجود باشد از آن استفاده می‌شود؛
   در غیر این صورت ایموجی یونیکد جایگزین است. هیچ درخواست شبکه‌ای به بیرون وجود ندارد. */
import { escapeHtml as esc, hashString } from './utils.js';

/* نام داخلی: [ایموجی جایگزین، نام آیکون Tabler] */
const UI = {
  home: ['🏠', 'home'], library: ['🗂️', 'layout-grid'], heart: ['🤍', 'heart'], heartFilled: ['❤️', 'heart-filled'],
  clock: ['🕘', 'clock'], settings: ['⚙️', 'settings'], search: ['🔍', 'search'], play: ['▶', 'player-play'],
  eye: ['👁', 'eye'], close: ['✕', 'x'], expand: ['⛶', 'arrows-maximize'], menu: ['☰', 'menu-2'],
  star: ['⭐', 'star'], music: ['🎵', 'music'], mute: ['🔇', 'volume-off'],
  edit: ['✏️', 'pencil'], trash: ['🗑️', 'trash'], plus: ['➕', 'plus'], data: ['🗄️', 'database'], external: ['↗', 'external-link'],
  info: ['ℹ️', 'info-circle'], up: ['↑', 'arrow-up'], down: ['↓', 'arrow-down'], hide: ['🙈', 'eye-off'], image: ['🖼️', 'photo'],
  tune: ['🛠️', 'adjustments'], upload: ['⬆️', 'upload'], download: ['⬇️', 'download'], lock: ['🔒', 'lock'], logout: ['🚪', 'logout'], file: ['📄', 'file'], folder: ['📁', 'folder-open'],
};

const sprite = { path: null, prefix: 'tabler-' };

export async function initIcons({ spritePath = null, symbolPrefix = 'tabler-' } = {}) {
  sprite.path = null;
  sprite.prefix = symbolPrefix;
  if (!spritePath) return false;
  try {
    const res = await fetch(spritePath, { method: 'HEAD', cache: 'no-cache' });
    const type = res.headers.get('content-type') || '';
    if (res.ok && (!type || /svg|xml/i.test(type))) sprite.path = spritePath;
  } catch { /* اسپرایت وجود ندارد؛ ایموجی استفاده می‌شود */ }
  return Boolean(sprite.path);
}

export const hasSprite = () => Boolean(sprite.path);

function render(emoji, tabler, extra = '') {
  if (sprite.path && tabler) {
    return `<svg class="ico ${extra}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="${esc(sprite.path)}#${esc(sprite.prefix + tabler)}"></use></svg>`;
  }
  return `<span class="ico ico-emoji ${extra}" aria-hidden="true">${esc(emoji)}</span>`;
}

export function icon(name, extra = '') {
  const [emoji, tabler] = UI[name] || ['•', null];
  return render(emoji, tabler, extra);
}

export function iconFromSpec(spec, extra = '') {
  const s = spec || {};
  return render(s.emoji || '📦', s.tabler, extra);
}

export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((n) => { n.innerHTML = icon(n.dataset.icon); });
}

function coverColors(p, cat) {
  if (p.cover.gradient) return p.cover.gradient;
  const accent = p.cover.accent || cat?.accent;
  if (accent) return [accent, '#161a26'];
  const h = hashString(p.id) % 360;
  return [`hsl(${h} 62% 46%)`, `hsl(${(h + 55) % 360} 55% 30%)`];
}

/** زنجیرهٔ جایگزین: تصویر بندانگشتی ← گرادیان + آیکون پروژه ← آیکون دسته ← 📦 */
export function coverHtml(p, cat) {
  const [c1, c2] = coverColors(p, cat);
  const img = p.cover.thumbnail
    ? `<img class="cover-img" data-cover-img src="${esc(p.cover.thumbnail)}" alt="" loading="lazy" decoding="async">`
    : '';
  return `<div class="cover" style="--c1:${esc(c1)};--c2:${esc(c2)}"><span class="cover-icon">${iconFromSpec(p.cover.icon || cat?.icon)}</span>${img}</div>`;
}
