/* auth.js — قفل ورود مدیر در سمت مرورگر.
   هشدار: بدون بک‌اند این فقط یک «قفل رابط کاربری» است، نه امنیت واقعی. هر کسی می‌تواند کد و data/auth.json را بخواند
   یا جلسه را در devtools دستکاری کند. شماره و رمز هرگز به‌صورت متن ساده ذخیره نمی‌شوند؛ فقط هش PBKDF2-SHA256 با salt
   در data/auth.json است. کنترل واقعی روی دادهٔ منتشرشده، دسترسی نوشتن به مخزن GitHub شماست. */
const SESSION_KEY = 'projectdeck.v1.admin';
const LOCK_KEY = 'projectdeck.v1.admin-lock';
export const MAX_FAILS = 5;
export const LOCK_MS = 30000;
const MIN_ITER = 100000; const MAX_ITER = 2000000;

export const cryptoAvailable = () => Boolean(globalThis.crypto && globalThis.crypto.subtle);

/** ارقام فارسی/عربی، فاصله و پیش‌شمارهٔ ایران (+98، 0098، 98) را به قالب 09xxxxxxxxx تبدیل می‌کند. */
export function normalizePhone(input) {
  let d = String(input ?? '')
    .replace(/[\u06F0-\u06F9]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\s\-()]/g, '');
  if (d.startsWith('+98')) d = `0${d.slice(3)}`;
  else if (d.startsWith('0098')) d = `0${d.slice(4)}`;
  else if (/^98\d{10}$/.test(d)) d = `0${d.slice(2)}`;
  else if (/^9\d{9}$/.test(d)) d = `0${d}`;
  return d;
}
export const isValidPhone = (p) => /^09\d{9}$/.test(p);

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(phone, password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`${phone}\n${password}`), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

export async function loadAuthRecord(url = 'data/auth.json') {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return null;
    const r = await res.json();
    const ok = r && r.version === 1 && r.algo === 'PBKDF2-SHA256' && Number.isInteger(r.iterations) && r.iterations >= MIN_ITER && r.iterations <= MAX_ITER
      && typeof r.salt === 'string' && typeof r.hash === 'string';
    return ok ? r : null;
  } catch { return null; }
}

export async function verifyLogin(phone, password, record) {
  if (!record) return false;
  let actual; let expected;
  try {
    actual = await derive(normalizePhone(phone), String(password), fromB64(record.salt), record.iterations);
    expected = fromB64(record.hash);
  } catch { return false; }
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i]; // مقایسهٔ بدون خروج زودهنگام
  return diff === 0;
}

/** رکورد تازه برای data/auth.json می‌سازد (برای تغییر شماره/رمز). */
export async function createRecord(phone, password, iterations = 310000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(normalizePhone(phone), String(password), salt, iterations);
  return { version: 1, algo: 'PBKDF2-SHA256', iterations, salt: toB64(salt), hash: toB64(hash) };
}

/* جلسه فقط در sessionStorage همین تب می‌ماند و با بستن تب پایان می‌یابد */
const ss = () => { try { return window.sessionStorage; } catch { return null; } };
export const hasSession = () => ss()?.getItem(SESSION_KEY) === '1';
export const startSession = () => { try { ss()?.setItem(SESSION_KEY, '1'); } catch { /* نادیده بگیر */ } };
export const endSession = () => { try { ss()?.removeItem(SESSION_KEY); } catch { /* نادیده بگیر */ } };

/* محدودیت تلاش (فقط جلوگیری از اشتباه‌های پشت‌سرهم؛ دور زدنش ساده است) */
let fails = 0; let lockedUntil = 0;
try { lockedUntil = Number(ss()?.getItem(LOCK_KEY)) || 0; } catch { /* نادیده بگیر */ }
export function lockState() {
  const left = lockedUntil - Date.now();
  return left > 0 ? { locked: true, seconds: Math.ceil(left / 1000) } : { locked: false, seconds: 0 };
}
export function registerFailure() {
  fails += 1;
  if (fails >= MAX_FAILS) { fails = 0; lockedUntil = Date.now() + LOCK_MS; try { ss()?.setItem(LOCK_KEY, String(lockedUntil)); } catch { /* نادیده بگیر */ } }
  return MAX_FAILS - fails;
}
export function resetFailures() { fails = 0; }
