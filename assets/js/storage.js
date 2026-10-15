/* storage.js — پایدارسازی در localStorage با جایگزین حافظهٔ موقت */
const NS = 'projectdeck.v1.';
const mem = new Map();

function probe() {
  try {
    const k = `${NS}__probe`;
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    return null; // حالت خصوصی، مسدودسازی کوکی/ذخیره‌سازی، یا نبود localStorage
  }
}
const backend = probe();

export const isPersistent = () => Boolean(backend);

function read(key) {
  try {
    const raw = backend ? backend.getItem(NS + key) : mem.get(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key, value) {
  const raw = JSON.stringify(value);
  try {
    if (backend) backend.setItem(NS + key, raw);
    else mem.set(key, raw);
    return true;
  } catch {
    mem.set(key, raw); // مثلاً پر شدن سهمیه؛ تا بستن صفحه در حافظه می‌ماند
    return false;
  }
}

function remove(key) {
  try { backend?.removeItem(NS + key); } catch { /* نادیده بگیر */ }
  mem.delete(key);
}

/* حالت کاربر: علاقه‌مندی‌ها، اخیراً باز شده‌ها و ترجیحات */
function normalizeUser(raw) {
  const u = raw && typeof raw === 'object' ? raw : {};
  const ids = (a) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string'))] : []);
  const recent = Array.isArray(u.recent) ? u.recent.filter((r) => r && typeof r.id === 'string' && Number.isFinite(r.at)).slice(0, 20) : [];
  const prefs = u.prefs && typeof u.prefs === 'object' ? u.prefs : {};
  return { version: 1, favorites: ids(u.favorites), recent, prefs: { sort: typeof prefs.sort === 'string' ? prefs.sort : 'featured', manage: prefs.manage !== false } };
}

export const loadUserState = () => normalizeUser(read('user'));
export const saveUserState = (state) => write('user', state);

/* کتابخانهٔ کاربر: { storeVersion, savedAt, library }. تا اولین تغییر، data/projects.json منبع است. */
const STORE_VERSION = 1;

function rawGet(key) {
  try { return backend ? backend.getItem(NS + key) : mem.get(key) ?? null; } catch { return null; }
}

/** دادهٔ خراب کنار گذاشته می‌شود اما نسخهٔ پشتیبان آن (library.corrupt) برای بازیابی دستی می‌ماند. */
export function quarantineLibrary() {
  const raw = rawGet('library');
  if (raw != null) { try { if (backend) backend.setItem(`${NS}library.corrupt`, raw); else mem.set('library.corrupt', raw); } catch { /* نادیده بگیر */ } }
  remove('library');
}

/** status: 'none' | 'ok' | 'corrupt' */
export function loadLibraryStore() {
  const raw = rawGet('library');
  if (raw == null) return { doc: null, status: 'none' };
  try {
    const v = JSON.parse(raw);
    const doc = v && typeof v === 'object' && v.library ? v.library : v; // پشتیبانی از قالب بدون پوشش
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('bad');
    return { doc, status: 'ok' };
  } catch {
    quarantineLibrary();
    return { doc: null, status: 'corrupt' };
  }
}
export const saveLibraryStore = (doc) => write('library', { storeVersion: STORE_VERSION, savedAt: new Date().toISOString(), library: doc });
export const clearLibraryStore = () => remove('library');
