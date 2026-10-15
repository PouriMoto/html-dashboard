/* import-export.js — خروجی/ورودی JSON با اعتبارسنجی اسکیما */
import { normalizeLibrary } from './projects.js';

const MAX_BYTES = 5 * 1024 * 1024;

export function buildExport(library, userState) {
  return { ...library, exportedAt: new Date().toISOString(), userState: { favorites: [...userState.favorites] } };
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readImportFile(file) {
  if (file.size > MAX_BYTES) throw new Error('حجم فایل بیشتر از ۵ مگابایت است.');
  let raw;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error('فایل، JSON معتبر نیست.');
  }
  const { library, warnings } = normalizeLibrary(raw); // خطای اسکیما همین‌جا پرتاب می‌شود
  const fav = raw && raw.userState && Array.isArray(raw.userState.favorites) ? raw.userState.favorites.filter((x) => typeof x === 'string') : null;
  return { library, warnings, favorites: fav };
}

const byId = (a, b) => {
  const m = new Map(a.map((x) => [x.id, x]));
  b.forEach((x) => m.set(x.id, x));
  return [...m.values()];
};

/** ادغام: آیتم‌های هم‌شناسه با نسخهٔ واردشده جایگزین می‌شوند؛ تنظیمات فعلی حفظ می‌شود. */
export function mergeLibraries(base, incoming) {
  return {
    ...base,
    categories: byId(base.categories, incoming.categories).sort((a, b) => a.order - b.order),
    tags: byId(base.tags, incoming.tags),
    projects: byId(base.projects, incoming.projects),
  };
}
