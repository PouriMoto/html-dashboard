/* library.js — عملیات خالص روی کتابخانه (افزودن/ویرایش/حذف پروژه و دسته). هر تابع کتابخانهٔ جدید برمی‌گرداند و ذخیره نمی‌کند. */
import { slugify } from './validators.js';

const next = (lib, patch) => ({ ...lib, ...patch });
const renumber = (cats) => cats.map((c, i) => ({ ...c, order: i + 1 }));
export const ACCENTS = ['#8b7cff', '#3fd8c5', '#ffb86b', '#5ab0ff', '#ff7a9c', '#c4e86b'];

/* پروژه‌ها: شناسه یک‌بار ساخته می‌شود و هرگز با تغییر نام عوض نمی‌شود */
export function newProjectId(lib, title) {
  const ids = new Set(lib.projects.map((p) => p.id));
  const base = slugify(title) || `project-${Date.now().toString(36)}`;
  let id = base; let n = 2;
  while (ids.has(id)) id = `${base}-${n++}`;
  return id;
}
export const addProject = (lib, p) => next(lib, { projects: [...lib.projects, p] });
export const updateProject = (lib, id, p) => next(lib, { projects: lib.projects.map((x) => (x.id === id ? { ...p, id } : x)) });
export const deleteProject = (lib, id) => next(lib, { projects: lib.projects.filter((p) => p.id !== id) });

/** نام برچسب‌ها را به شناسه تبدیل می‌کند و برچسب تازه را به فهرست برچسب‌ها اضافه می‌کند. */
export function resolveTags(lib, labels) {
  const known = new Map();
  lib.tags.forEach((t) => { known.set(t.id, t); known.set(t.label, t); });
  const tags = [...lib.tags]; const ids = [];
  labels.forEach((label) => {
    let t = known.get(label);
    if (!t) {
      t = { id: label.replace(/\s+/g, '-'), label };
      if (!tags.some((x) => x.id === t.id)) tags.push(t);
      known.set(label, t);
    }
    ids.push(t.id);
  });
  return { library: tags.length === lib.tags.length ? lib : next(lib, { tags }), ids: [...new Set(ids)] };
}

/* دسته‌ها: id همان slug پایدار است و هنگام ویرایش تغییر نمی‌کند */
export const addCategory = (lib, c) => next(lib, { categories: renumber([...lib.categories, c]) });
export const updateCategory = (lib, id, patch) => next(lib, { categories: lib.categories.map((c) => (c.id === id ? { ...c, ...patch, id } : c)) });
export function moveCategory(lib, id, dir) {
  const a = [...lib.categories];
  const i = a.findIndex((c) => c.id === id); const j = i + dir;
  if (i < 0 || j < 0 || j >= a.length) return lib;
  [a[i], a[j]] = [a[j], a[i]];
  return next(lib, { categories: renumber(a) });
}
/** حذف دسته: پروژه‌ها هرگز حذف نمی‌شوند؛ به دستهٔ دیگر می‌روند (moveTo) یا بی‌دسته می‌مانند (null). */
export function deleteCategory(lib, id, moveTo = null) {
  return next(lib, {
    categories: renumber(lib.categories.filter((c) => c.id !== id)),
    projects: lib.projects.map((p) => (p.categoryId === id ? { ...p, categoryId: moveTo } : p)),
  });
}
