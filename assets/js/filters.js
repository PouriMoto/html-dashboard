/* filters.js — جستجو (با نرمال‌سازی فارسی)، فیلتر برچسب و مرتب‌سازی */
export const SORTS = [
  { id: 'featured', label: 'پیشنهادی' },
  { id: 'newest', label: 'جدیدترین' },
  { id: 'title', label: 'نام' },
  { id: 'recent', label: 'اخیراً باز شده' },
];

export function normalizeText(input) {
  return String(input ?? '')
    .toLowerCase()
    .replace(/[\u064A\u0649]/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9')
    .replace(/[\u0629\u06C0]/g, '\u0647')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/\u200c/g, '')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\s+/g, ' ')
    .trim();
}

const cache = new WeakMap();
function haystack(p, ctx) {
  let h = cache.get(p);
  if (h) return h;
  const parts = [p.title, p.subtitle, p.description, p.id, p.meta.author, p.meta.status, ctx.catMap.get(p.categoryId)?.label,
    ...p.tags.map((t) => ctx.tagMap.get(t)?.label || t), ...p.tags];
  h = normalizeText(parts.filter(Boolean).join(' '));
  cache.set(p, h);
  return h;
}

/** f = { query, tag }؛ ctx = { catMap, tagMap } */
export function filterProjects(projects, f, ctx) {
  const tokens = normalizeText(f.query).split(' ').filter(Boolean);
  return projects.filter((p) => (!f.tag || p.tags.includes(f.tag)) && tokens.every((t) => haystack(p, ctx).includes(t)));
}

export function sortProjects(list, sortId, recentAt = new Map()) {
  const arr = [...list];
  const byTitle = (a, b) => a.title.localeCompare(b.title, 'fa');
  const dateOf = (p) => Date.parse(p.meta.updatedAt || p.meta.createdAt || '') || 0;
  switch (sortId) {
    case 'newest': return arr.sort((a, b) => dateOf(b) - dateOf(a) || byTitle(a, b));
    case 'title': return arr.sort(byTitle);
    case 'recent': return arr.sort((a, b) => (recentAt.get(b.id) || 0) - (recentAt.get(a.id) || 0) || byTitle(a, b));
    default: return arr.sort((a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder || byTitle(a, b));
  }
}

export function collectTags(projects, tagMap) {
  const counts = new Map();
  projects.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  return [...counts]
    .map(([id, count]) => ({ id, count, label: tagMap.get(id)?.label || id }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fa'));
}
