/* categories.js — دسته‌ها و برچسب‌ها همیشه از داده می‌آیند، نه از کد */
import { isPlainObject, safeColor, normalizeIconSpec } from './utils.js';

export function normalizeCategories(raw, warnings = []) {
  const seen = new Set();
  const out = [];
  (Array.isArray(raw) ? raw : []).forEach((c, i) => {
    if (!isPlainObject(c) || typeof c.id !== 'string' || !c.id.trim()) {
      warnings.push('یک دسته بدون شناسهٔ معتبر نادیده گرفته شد.');
      return;
    }
    const id = c.id.trim();
    if (seen.has(id)) {
      warnings.push(`شناسهٔ دستهٔ «${id}» تکراری بود.`);
      return;
    }
    seen.add(id);
    out.push({
      id,
      label: typeof c.label === 'string' && c.label.trim() ? c.label.trim() : id,
      description: typeof c.description === 'string' ? c.description.trim() : '',
      icon: normalizeIconSpec(c.icon, '📁'),
      accent: safeColor(c.accent),
      hidden: c.hidden === true,
      order: Number.isFinite(c.order) ? c.order : i + 1,
    });
  });
  return out.sort((a, b) => a.order - b.order);
}

export function normalizeTags(raw) {
  const seen = new Set();
  const out = [];
  (Array.isArray(raw) ? raw : []).forEach((t) => {
    const id = typeof t === 'string' ? t.trim() : isPlainObject(t) && typeof t.id === 'string' ? t.id.trim() : '';
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({ id, label: isPlainObject(t) && typeof t.label === 'string' && t.label.trim() ? t.label.trim() : id });
  });
  return out;
}

export const indexById = (list) => new Map(list.map((x) => [x.id, x]));

export function categoryCounts(projects) {
  const m = new Map();
  projects.forEach((p) => { if (p.categoryId) m.set(p.categoryId, (m.get(p.categoryId) || 0) + 1); });
  return m;
}
