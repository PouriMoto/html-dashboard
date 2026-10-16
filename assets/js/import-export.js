/* import-export.js — پشتیبان‌گیری، تحلیل فایل ورودی (بدون اجرا و بدون اعتماد) و برنامهٔ ادغام.
   فقط پیکربندی داشبورد خروجی می‌گیرد؛ هرگز کد اجرایی یا محتوای فایل‌های HTML پروژه‌ها نه. */
import { normalizeLibrary, SCHEMA_ID, SCHEMA_VERSION, APP_VERSION } from './projects.js';
import { isPlainObject } from './utils.js';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function buildExport(library, userState) {
  return {
    schema: SCHEMA_ID, schemaVersion: SCHEMA_VERSION, app: 'project-deck', appVersion: APP_VERSION, exportedAt: new Date().toISOString(),
    settings: library.settings, categories: library.categories, tags: library.tags, projects: library.projects,
    preferences: { sort: userState.prefs.sort }, userState: { favorites: [...userState.favorites] },
  };
}

/** فایل انتشار: فقط کتابخانه (بدون علاقه‌مندی‌ها)؛ مستقیم جایگزین data/projects.json می‌شود. */
export function buildPublish(library) {
  return { schema: SCHEMA_ID, schemaVersion: SCHEMA_VERSION, settings: library.settings, categories: library.categories, tags: library.tags, projects: library.projects };
}

export function backupFilename(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `project-deck-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** متن JSON را فقط به‌عنوان داده تحلیل می‌کند. { ok:false, error } یا { ok:true, library, warnings, summary, favorites, sort } */
export function analyzeImport(text, current) {
  if (typeof text !== 'string' || text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'حجم فایل بیشتر از ۵ مگابایت است.' };
  let raw;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'فایل JSON معتبر نیست (خطای نحوی). فایل خراب یا ناقص است.' }; }
  if (!isPlainObject(raw)) return { ok: false, error: 'ساختار فایل معتبر نیست: ریشهٔ JSON باید یک شیء باشد.' };
  if (raw.schema !== SCHEMA_ID) return { ok: false, error: 'این فایل پشتیبان Project Deck نیست (مقدار schema نامعتبر یا ناموجود).' };
  if (!Number.isInteger(raw.schemaVersion) || raw.schemaVersion < 1) return { ok: false, error: 'schemaVersion باید یک عدد صحیح مثبت باشد.' };
  if (raw.schemaVersion > SCHEMA_VERSION) return { ok: false, error: `نسخهٔ اسکیمای فایل (${raw.schemaVersion}) جدیدتر از نسخهٔ پشتیبانی‌شده (${SCHEMA_VERSION}) است؛ برنامه را به‌روز کنید.` };
  for (const k of ['projects', 'categories', 'tags']) {
    if (raw[k] !== undefined && !Array.isArray(raw[k])) return { ok: false, error: `فیلد ${k} باید یک آرایه باشد.` };
  }
  let result;
  try { result = normalizeLibrary(raw); } catch (err) { return { ok: false, error: err.message || 'فایل معتبر نیست.' }; }
  const { library, warnings } = result;
  const ids = (raw.projects || []).map((p) => (isPlainObject(p) && typeof p.id === 'string' ? p.id.trim() : null)).filter(Boolean);
  const duplicateIds = ids.length - new Set(ids).size;
  const rawProjects = (raw.projects || []).length;
  const curIds = new Set(current.projects.map((p) => p.id));
  return {
    ok: true, library, warnings,
    favorites: isPlainObject(raw.userState) && Array.isArray(raw.userState.favorites) ? raw.userState.favorites.filter((x) => typeof x === 'string').slice(0, 1000) : null,
    sort: isPlainObject(raw.preferences) && typeof raw.preferences.sort === 'string' ? raw.preferences.sort : null,
    summary: {
      schemaVersion: raw.schemaVersion, exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null,
      rawProjects, validProjects: library.projects.length, rejectedProjects: rawProjects - library.projects.length - duplicateIds, duplicateIds,
      categories: library.categories.length, tags: library.tags.length,
      conflicts: library.projects.filter((p) => curIds.has(p.id)),
    },
  };
}

const byId = (a, b, replace) => {
  const m = new Map(a.map((x) => [x.id, x]));
  b.forEach((x) => { if (!m.has(x.id) || replace) m.set(x.id, x); });
  return [...m.values()];
};

/** ادغام. policy: 'keep' نگه‌داشتن نسخهٔ فعلی | 'replace' جایگزینی با نسخهٔ واردشده | 'copy' افزودن نسخهٔ واردشده با شناسهٔ تازه.
    هیچ رکوردی بی‌صدا بازنویسی نمی‌شود؛ پیش‌فرض همیشه «keep» است. */
export function planMerge(base, incoming, policy = 'keep') {
  const stats = { added: 0, kept: 0, replaced: 0, copied: 0, catsAdded: 0, catsExisting: 0, tagsAdded: 0 };
  const baseIds = new Set(base.projects.map((p) => p.id));
  const used = new Set(baseIds);
  let projects = [...base.projects];
  incoming.projects.forEach((p) => {
    if (!baseIds.has(p.id)) { projects.push(p); used.add(p.id); stats.added += 1; }
    else if (policy === 'replace') { projects = projects.map((x) => (x.id === p.id ? p : x)); stats.replaced += 1; }
    else if (policy === 'copy') {
      let id = `${p.id}-imported`; let n = 2;
      while (used.has(id)) id = `${p.id}-imported-${n++}`;
      used.add(id); projects.push({ ...p, id }); stats.copied += 1;
    } else stats.kept += 1;
  });
  const baseCat = new Set(base.categories.map((c) => c.id));
  incoming.categories.forEach((c) => { if (baseCat.has(c.id)) stats.catsExisting += 1; else stats.catsAdded += 1; });
  const baseTag = new Set(base.tags.map((t) => t.id));
  stats.tagsAdded = incoming.tags.filter((t) => !baseTag.has(t.id)).length;
  const cats = byId(base.categories, incoming.categories, policy === 'replace').map((c, i) => ({ ...c, order: i + 1 }));
  return { stats, library: { ...base, categories: cats, tags: byId(base.tags, incoming.tags, policy === 'replace'), projects } };
}
