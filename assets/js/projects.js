/* projects.js — اسکیما، اعتبارسنجی و یکدست‌سازی پروژه‌ها، و تعیین نشانی اجرا */
import { isPlainObject, safeColor, normalizeIconSpec } from './utils.js';
import { normalizeCategories, normalizeTags } from './categories.js';
import { validateProjectPath, validateExternalUrl, validateThumbnail, DEFAULT_PROJECTS_DIR } from './validators.js';

export const SCHEMA_ID = 'project-deck/library';
export const SCHEMA_VERSION = 1;
export const APP_VERSION = '0.2.0';
const LIMITS = { projects: 500, categories: 100, tags: 300 };
export const PREVIEW_MODES = ['thumbnail', 'iframe', 'new-tab'];
/* برچسب‌های نمایشی حالت‌ها (برای کارت، فرم و پنجره‌ها) */
export const PREVIEW_MODE_INFO = {
  thumbnail: { label: 'فقط تصویر', icon: 'image', hint: 'جزئیات با تصویر پوشش نمایش داده می‌شود و اجرا در تب جدید انجام می‌شود.' },
  iframe: { label: 'پیش‌نمایش زنده', icon: 'eye', hint: 'پروژه داخل یک پنجره (iframe) باز می‌شود. بعضی سایت‌ها نمایش در قاب را مسدود می‌کنند.' },
  'new-tab': { label: 'تب جدید', icon: 'external', hint: 'اجرا مستقیم در یک تب تازه انجام می‌شود.' },
};
export const VISIBILITY = ['visible', 'hidden'];
export const LAUNCH_TARGETS = ['auto', 'local', 'deployed'];

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const dateStr = (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v.trim() : null);

/** مسیر نسبی امن: بدون scheme، بدون «/» ابتدایی (برای GitHub Pages زیرمسیر)، بدون «..». */
export function isSafeRelativePath(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v || SCHEME_RE.test(v) || v.startsWith('/') || v.includes('\\')) return false;
  return !v.split(/[?#]/)[0].split('/').includes('..');
}

export function isSafeHttpUrl(value) {
  try {
    const u = new URL(String(value).trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeProject(raw, ctx, warnings) {
  if (!isPlainObject(raw)) {
    warnings.push('یک ورودی پروژه شیء معتبر نبود و نادیده گرفته شد.');
    return null;
  }
  const id = str(raw.id, 120);
  if (!id) {
    warnings.push('پروژه‌ای بدون شناسهٔ id نادیده گرفته شد.');
    return null;
  }
  const title = str(raw.title, 200) || id;

  const entry = isPlainObject(raw.entry) ? raw.entry : {};
  let localPath = str(entry.localPath, 500) || null;
  let deployedUrl = str(entry.deployedUrl, 1000) || null;
  if (localPath) { const r = validateProjectPath(localPath, ctx.projectsDir); if (r.ok) localPath = r.value; else { warnings.push(`«${title}»: ${r.error}`); localPath = null; } }
  if (deployedUrl) { const r = validateExternalUrl(deployedUrl); if (r.ok) deployedUrl = r.value; else { warnings.push(`«${title}»: ${r.error}`); deployedUrl = null; } }
  if (!localPath && !deployedUrl) {
    warnings.push(`«${title}»: مسیر یا نشانی معتبری ندارد و نادیده گرفته شد.`);
    return null;
  }

  const categoryId = ctx.categoryIds.has(raw.categoryId) ? raw.categoryId : null;
  if (raw.categoryId && !categoryId) warnings.push(`«${title}»: دستهٔ «${raw.categoryId}» تعریف نشده است.`);

  const cover = isPlainObject(raw.cover) ? raw.cover : {};
  let thumbnail = str(cover.thumbnail, 500) || null;
  if (thumbnail) { const r = validateThumbnail(thumbnail); if (r.ok) thumbnail = r.value; else { warnings.push(`«${title}»: ${r.error}`); thumbnail = null; } }
  const g = (Array.isArray(cover.gradient) ? cover.gradient : []).map(safeColor);
  const m = isPlainObject(raw.meta) ? raw.meta : {};

  return {
    id,
    title,
    subtitle: str(raw.subtitle, 300),
    description: str(raw.description, 2000),
    categoryId,
    tags: [...new Set((Array.isArray(raw.tags) ? raw.tags : []).filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim()))],
    entry: { localPath, deployedUrl },
    launchTarget: LAUNCH_TARGETS.includes(raw.launchTarget) ? raw.launchTarget : 'auto',
    previewMode: PREVIEW_MODES.includes(raw.previewMode) ? raw.previewMode : 'thumbnail', // پیش‌فرض (و مقدار قدیمی none): فقط تصویر
    cover: {
      thumbnail,
      gradient: g.length >= 2 && g[0] && g[1] ? [g[0], g[1]] : null,
      accent: safeColor(cover.accent),
      icon: cover.icon ? normalizeIconSpec(cover.icon, '📦') : null,
    },
    featured: raw.featured === true,
    visibility: VISIBILITY.includes(raw.visibility) ? raw.visibility : 'visible',
    sortOrder: Number.isFinite(raw.sortOrder) ? raw.sortOrder : 0,
    meta: {
      version: str(m.version, 40) || null,
      author: str(m.author, 120) || null,
      createdAt: dateStr(m.createdAt),
      updatedAt: dateStr(m.updatedAt),
      language: str(m.language, 20) || null,
      direction: m.direction === 'rtl' || m.direction === 'ltr' ? m.direction : null,
      status: str(m.status, 60) || null,
      estimatedMinutes: Number.isFinite(m.estimatedMinutes) && m.estimatedMinutes > 0 ? m.estimatedMinutes : null,
      notes: str(m.notes, 2000),
      custom: safeCustom(m.custom),
    },
  };
}

/** فقط مقدارهای ساده و کلیدهای بی‌خطر؛ هرگز شیء تودرتو یا کلید prototype. */
function safeCustom(v) {
  const out = {};
  if (!isPlainObject(v)) return out;
  let n = 0;
  for (const [k, val] of Object.entries(v)) {
    if (n >= 20) break;
    if (['__proto__', 'constructor', 'prototype'].includes(k) || k.length > 60) continue;
    if (typeof val === 'string') { out[k] = val.slice(0, 500); n += 1; } else if (typeof val === 'number' || typeof val === 'boolean') { out[k] = val; n += 1; }
  }
  return out;
}

function validDir(v) {
  const d = typeof v === 'string' ? v.trim() : '';
  return d && isSafeRelativePath(d) && d.endsWith('/') ? d : DEFAULT_PROJECTS_DIR;
}

function normalizeSettings(raw) {
  const s = isPlainObject(raw) ? raw : {};
  const audio = isPlainObject(s.ambientAudio) ? s.ambientAudio : {};
  const audioSrc = str(audio.src, 500);
  const sprite = str(s.iconSpritePath, 500);
  return {
    siteTitle: str(s.siteTitle, 80) || 'Project Deck',
    iconSpritePath: isSafeRelativePath(sprite) ? sprite : null,
    projectsDir: validDir(s.projectsDir),
    backgroundImage: isSafeRelativePath(str(s.backgroundImage, 500)) ? str(s.backgroundImage, 500) : null,
    iconSymbolPrefix: typeof s.iconSymbolPrefix === 'string' && /^[a-z0-9_-]*$/i.test(s.iconSymbolPrefix) ? s.iconSymbolPrefix : 'tabler-',
    ambientAudio: { src: isSafeRelativePath(audioSrc) ? audioSrc : null, label: str(audio.label, 60) || 'موسیقی محیطی' },
  };
}

/** نقطهٔ گسترش برای نسخه‌های بعدی اسکیما: هر نسخه به نسخهٔ بالاتر ارتقا می‌یابد. */
function migrate(raw, fromVersion) {
  // نمونهٔ آینده: if (fromVersion < 2) raw = upgradeV1toV2(raw);
  void fromVersion;
  return raw;
}

export function normalizeLibrary(raw) {
  const warnings = [];
  if (!isPlainObject(raw)) throw new Error('ساختار فایل معتبر نیست: ریشهٔ JSON باید یک شیء باشد.');
  if (raw.schema !== undefined && raw.schema !== SCHEMA_ID) throw new Error('این فایل برای Project Deck ساخته نشده است (مقدار schema نامعتبر).');
  let version = raw.schemaVersion;
  if (version === undefined) { warnings.push('schemaVersion وجود نداشت؛ نسخهٔ ۱ فرض شد.'); version = 1; }
  if (!Number.isInteger(version) || version < 1) throw new Error('schemaVersion باید یک عدد صحیح مثبت باشد.');
  if (version > SCHEMA_VERSION) throw new Error(`نسخهٔ اسکیمای فایل (${version}) جدیدتر از نسخهٔ پشتیبانی‌شده (${SCHEMA_VERSION}) است. برنامه را به‌روز کنید.`);
  const data = migrate(raw, version);
  for (const k of Object.keys(LIMITS)) {
    if (Array.isArray(data[k]) && data[k].length > LIMITS[k]) throw new Error(`تعداد ${k} بیشتر از حد مجاز (${LIMITS[k]}) است.`);
  }

  const settings = normalizeSettings(data.settings);
  const categories = normalizeCategories(data.categories, warnings);
  const tags = normalizeTags(data.tags);
  const ctx = { categoryIds: new Set(categories.map((c) => c.id)), projectsDir: settings.projectsDir };
  const seen = new Set();
  const projects = [];
  (Array.isArray(data.projects) ? data.projects : []).forEach((rawProject) => {
    const p = normalizeProject(rawProject, ctx, warnings);
    if (!p) return;
    if (seen.has(p.id)) { warnings.push(`شناسهٔ پروژهٔ «${p.id}» تکراری بود و نمونهٔ دوم نادیده گرفته شد.`); return; }
    seen.add(p.id);
    projects.push(p);
  });

  return { library: { schema: SCHEMA_ID, schemaVersion: SCHEMA_VERSION, settings, categories, tags, projects }, warnings };
}

/** نشانی اجرا: محلی را ترجیح می‌دهد مگر launchTarget = deployed. مسیر نسبی نسبت به صفحه حل می‌شود (سازگار با زیرمسیر GitHub Pages). */
export function resolveLaunch(project) {
  const { localPath, deployedUrl } = project.entry;
  const order = project.launchTarget === 'deployed' ? ['deployed', 'local'] : ['local', 'deployed'];
  const kind = order.find((k) => (k === 'local' ? localPath : deployedUrl));
  if (!kind) return null;
  return { kind, url: kind === 'local' ? new URL(localPath, document.baseURI).href : deployedUrl };
}
