/* router.js — وضعیت صفحه در نشانی (URLSearchParams + History API)، بدون کتابخانه و بدون سرور.
   نمونه‌ها: ?category=finance  |  ?view=favorites  |  ?category=finance&search=تورم */
export const VIEWS = ['home', 'library', 'favorites', 'recent', 'settings'];

export function parseLocation(search = window.location.search) {
  const p = new URLSearchParams(search);
  return { view: p.get('view') || '', category: p.get('category') || '', search: (p.get('search') || '').slice(0, 200), tag: (p.get('tag') || '').slice(0, 60) };
}

/** state = { view, category, search, tag } ← رشتهٔ query ('?' یعنی صفحهٔ اصلی بدون پارامتر) */
export function toQuery(state) {
  const p = new URLSearchParams();
  if (state.category) p.set('category', state.category);
  else if (state.view && state.view !== 'home') p.set('view', state.view);
  if (state.search && state.search.trim()) p.set('search', state.search.trim());
  if (state.tag) p.set('tag', state.tag);
  const q = p.toString();
  return q ? `?${q}` : '?';
}

/** مسیر فعلی صفحه را حفظ می‌کند (سازگار با زیرمسیر GitHub Pages). */
export function urlFor(state) {
  const q = toQuery(state);
  return window.location.pathname + (q === '?' ? '' : q);
}
