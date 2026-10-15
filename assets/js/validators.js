/* validators.js — اعتبارسنجی مسیر، نشانی، تصویر، ایموجی، شناسهٔ نشانی و برچسب‌ها.
   همهٔ تابع‌ها { ok, value } یا { ok:false, error } برمی‌گردانند و هرگز ورودی نامعتبر را بی‌صدا «درست» نمی‌کنند. */
export const DEFAULT_PROJECTS_DIR = 'projects/';
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const CTRL_RE = /[\u0000-\u001f\u007f]/;
const IMAGE_RE = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
const fail = (error) => ({ ok: false, error });

/** بخش مسیر را بررسی می‌کند: بدون «..»، «.»، بک‌اسلش و کدگذاری پنهان آن‌ها. query و hash دست‌نخورده می‌مانند. */
function checkRelative(raw, { what }) {
  const v = String(raw ?? '').trim();
  if (!v) return fail(`${what} را وارد کنید.`);
  if (CTRL_RE.test(v) || /\s/.test(v)) return fail(`${what} نباید فاصله داشته باشد؛ به‌جای آن از «-» استفاده کنید.`);
  if (v.includes('\\')) return fail('از «/» به‌جای «\\» استفاده کنید.');
  if (SCHEME_RE.test(v) || v.startsWith('//')) return fail(`${what} باید نسبی باشد و با http: یا // شروع نشود.`);
  if (v.startsWith('/')) return fail(`${what} نباید با «/» شروع شود (در GitHub Pages با زیرمسیر خراب می‌شود).`);
  const m = v.match(/^([^?#]*)([?#].*)?$/);
  let path = m[1].replace(/^(\.\/)+/, '').replace(/\/{2,}/g, '/');
  const tail = m[2] || '';
  if (!path) return fail(`${what} معتبر نیست.`);
  for (const seg of path.split('/')) {
    let decoded;
    try { decoded = decodeURIComponent(seg); } catch { return fail(`${what} شامل کدگذاری نامعتبر (%) است.`); }
    if (seg === '.' || seg === '..' || decoded === '.' || decoded === '..') return fail('استفاده از «..» یا «.» در مسیر مجاز نیست.');
    if (/[\\/]/.test(decoded)) return fail(`${what} شامل جداکنندهٔ پنهان مسیر است.`);
  }
  return { ok: true, path, tail };
}

export function validateProjectPath(raw, dir = DEFAULT_PROJECTS_DIR) {
  const r = checkRelative(raw, { what: 'مسیر پروژه' });
  if (!r.ok) return r;
  if (!r.path.startsWith(dir) || r.path.length === dir.length) return fail(`مسیر باید داخل پوشهٔ «\u2066${dir}\u2069» باشد. مثال: \u2066${dir}inflation/index.html\u2069`);
  if (!/\.html?$/i.test(r.path) && !r.path.endsWith('/')) return fail('مسیر باید به یک فایل .html یا یک پوشه (با «/» پایانی) ختم شود.');
  return { ok: true, value: r.path + r.tail };
}

export function validateExternalUrl(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return fail('نشانی سایت را وارد کنید.');
  if (CTRL_RE.test(v) || /\s/.test(v)) return fail('نشانی نباید فاصله داشته باشد.');
  if (!/^https?:\/\/[^/]/i.test(v)) return fail('نشانی باید با https:// یا http:// شروع شود. مثال: https://example.com');
  let u;
  try { u = new URL(v); } catch { return fail('نشانی معتبر نیست. مثال: https://example.com'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return fail('فقط نشانی‌های http و https مجاز است.');
  if (u.username || u.password) return fail('نشانی نباید نام‌کاربری یا رمز داشته باشد.');
  if (!u.hostname.includes('.') && u.hostname !== 'localhost') return fail('نام سایت معتبر نیست. مثال: https://example.com');
  return { ok: true, value: v, insecure: u.protocol === 'http:' };
}

export function validateThumbnail(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return { ok: true, value: null };
  const r = checkRelative(v, { what: 'مسیر تصویر' });
  if (!r.ok) return r;
  if (!r.path.startsWith('assets/')) return fail('تصویر باید داخل پوشهٔ assets باشد. مثال: assets/thumbnails/inflation.webp');
  if (!IMAGE_RE.test(r.path) || r.tail) return fail('مسیر تصویر باید به یک فایل تصویری (png، jpg، webp، svg، gif، avif) ختم شود.');
  return { ok: true, value: r.path };
}

export function validateEmoji(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return { ok: true, value: null };
  if (v.length > 12 || /[\p{L}\p{N}<>"'&]/u.test(v)) return fail('فقط یک ایموجی یا نماد وارد کنید.');
  return { ok: true, value: v };
}

export function slugify(text) {
  return String(text ?? '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
}

export function validateSlug(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return fail('شناسهٔ نشانی را به انگلیسی وارد کنید. مثال: finance');
  if (v.length > 40 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)) return fail('شناسه فقط می‌تواند حروف کوچک انگلیسی، عدد و «-» داشته باشد (حداکثر ۴۰ نویسه).');
  return { ok: true, value: v };
}

export function validateTabler(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return { ok: true, value: null };
  return /^[a-z0-9-]{1,40}$/.test(v) ? { ok: true, value: v } : fail('نام آیکون Tabler فقط حروف کوچک انگلیسی، عدد و «-» دارد.');
}

/** برچسب‌ها با «،» یا «,» یا خط جدید جدا می‌شوند. */
export function parseTags(raw) {
  const tags = [...new Set(String(raw ?? '').split(/[,،\n]/).map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean))];
  if (tags.length > 12) return fail('حداکثر ۱۲ برچسب مجاز است.');
  if (tags.some((t) => t.length > 30 || /[<>"]/.test(t))) return fail('هر برچسب حداکثر ۳۰ نویسه است و نباید نویسه‌های < > " داشته باشد.');
  return { ok: true, tags };
}
