/* utils.js — کمکی‌های کوچک و مشترک (بدون وابستگی) */

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function debounce(fn, wait = 120) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export const faNumber = (n) => Number(n || 0).toLocaleString('fa-IR');

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

export const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** فقط رنگ هگزادسیمال معتبر برمی‌گرداند؛ در غیر این صورت null. */
export function safeColor(v) {
  return typeof v === 'string' && /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v.trim()) ? v.trim() : null;
}

/** آیکون را به شکل { emoji, tabler } یکدست می‌کند. رشتهٔ ساده یعنی فقط ایموجی. */
export function normalizeIconSpec(raw, fallbackEmoji = '📁') {
  if (typeof raw === 'string' && raw.trim()) return { emoji: raw.trim(), tabler: null };
  if (isPlainObject(raw)) {
    const tabler = typeof raw.tabler === 'string' && /^[a-z0-9-]+$/.test(raw.tabler) ? raw.tabler : null;
    return { emoji: typeof raw.emoji === 'string' && raw.emoji.trim() ? raw.emoji.trim() : fallbackEmoji, tabler };
  }
  return { emoji: fallbackEmoji, tabler: null };
}

export function hashString(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h;
}
