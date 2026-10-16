/* admin.js — پنجره‌های ورود مدیر و تغییر اطلاعات ورود. متن کاربر فقط با escape یا textContent درج می‌شود. */
import { escapeHtml as esc, faNumber } from './utils.js';
import { icon } from './icons.js';
import { makeDialog, field, showErrors } from './manage.js';
import * as Auth from './auth.js';
import { downloadJson } from './import-export.js';

const NOTE = 'ورود مدیر در این نسخهٔ ایستا فقط یک قفل در مرورگر است و امنیت واقعی نیست. دادهٔ منتشرشده در مخزن برای همه قابل خواندن است.';

export function openLoginDialog({ getRecord, onSuccess }) {
  const d = makeDialog('modal-sm');
  d.setAttribute('aria-labelledby', 'lg-title');
  d.innerHTML = `<form class="modal-shell form" novalidate>
    <header class="modal-head"><h2 id="lg-title">ورود مدیر</h2><button type="button" class="icon-btn" data-act="cancel" aria-label="بستن">${icon('close')}</button></header>
    <div class="modal-body">
      <p class="muted">برای افزودن و مدیریت پروژه‌ها وارد شوید. بازدیدکنندگان بدون ورود فقط می‌توانند پروژه‌ها را ببینند، جستجو کنند و اجرا کنند.</p>
      <div class="error-summary" role="alert" hidden></div>
      ${field({ id: 'phone', label: 'شماره تلفن', required: true, control: '<input id="f-phone" name="phone" type="tel" inputmode="tel" dir="ltr" autocomplete="username" spellcheck="false">' })}
      ${field({ id: 'password', label: 'رمز عبور', required: true, control: '<input id="f-password" name="password" type="password" dir="ltr" autocomplete="current-password">' })}
      <p class="note">${NOTE}</p>
    </div>
    <footer class="modal-foot"><button type="button" class="btn btn-ghost" data-act="cancel">انصراف</button><button type="submit" class="btn btn-primary">${icon('lock')} ورود</button></footer>
  </form>`;
  const form = d.querySelector('form');
  d.addEventListener('click', (e) => { if (e.target.closest('[data-act="cancel"]')) d.close(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const phone = Auth.normalizePhone(form.elements.phone.value);
    const password = form.elements.password.value;
    const errors = {};
    const lock = Auth.lockState();
    if (lock.locked) errors.password = `تلاش‌های ناموفق زیاد بود؛ ${faNumber(lock.seconds)} ثانیه صبر کنید.`;
    else if (!Auth.cryptoAvailable()) errors.password = 'ورود نیاز به https یا localhost دارد (مرورگر در این آدرس رمزنگاری را در اختیار نمی‌گذارد).';
    else {
      if (!phone) errors.phone = 'شماره تلفن را وارد کنید.'; else if (!Auth.isValidPhone(phone)) errors.phone = 'شماره تلفن معتبر نیست. مثال: 09123456789';
      if (!password) errors.password = 'رمز عبور را وارد کنید.';
    }
    showErrors(d, errors);
    if (Object.keys(errors).length) return;
    submit.disabled = true;
    try {
      const record = await getRecord();
      if (!record) { showErrors(d, { password: 'فایل data/auth.json پیدا نشد یا معتبر نیست؛ ورود مدیر در دسترس نیست.' }); return; }
      if (await Auth.verifyLogin(phone, password, record)) { Auth.resetFailures(); d.close(); onSuccess(); return; }
      const left = Auth.registerFailure();
      showErrors(d, { password: `شماره یا رمز عبور درست نیست.${left > 0 && left < Auth.MAX_FAILS ? ` ${faNumber(left)} تلاش دیگر باقی مانده است.` : ''}` });
    } finally {
      form.elements.password.value = '';
      submit.disabled = false;
    }
  });
  d.showModal();
  form.elements.phone.focus();
}

/** رکورد ورود تازه می‌سازد و برای جایگزینی data/auth.json دانلود می‌کند؛ هیچ رمزی ذخیره یا نمایش داده نمی‌شود. */
export function openCredentialsDialog() {
  const d = makeDialog('modal-sm');
  d.setAttribute('aria-labelledby', 'cr-title');
  d.innerHTML = `<form class="modal-shell form" novalidate>
    <header class="modal-head"><h2 id="cr-title">تغییر اطلاعات ورود</h2><button type="button" class="icon-btn" data-act="cancel" aria-label="بستن">${icon('close')}</button></header>
    <div class="modal-body">
      <p class="muted">یک فایل <code>auth.json</code> تازه ساخته می‌شود. آن را به‌جای <code>data/auth.json</code> در مخزن بگذارید و commit کنید. رمز و شماره هیچ‌جا ذخیره نمی‌شوند؛ فقط هش آن‌ها در فایل است.</p>
      <div class="error-summary" role="alert" hidden></div>
      ${field({ id: 'phone', label: 'شمارهٔ تلفن تازه', required: true, control: '<input id="f-phone" name="phone" type="tel" inputmode="tel" dir="ltr" autocomplete="off" spellcheck="false">' })}
      ${field({ id: 'password', label: 'رمز عبور تازه', required: true, hint: 'حداقل ۱۲ نویسه؛ یک عبارت بلند و تصادفی بهتر از رمز کوتاه است، چون هش در مخزن قابل دانلود است.', control: '<input id="f-password" name="password" type="password" dir="ltr" autocomplete="new-password">' })}
      ${field({ id: 'confirm', label: 'تکرار رمز عبور', required: true, control: '<input id="f-confirm" name="confirm" type="password" dir="ltr" autocomplete="new-password">' })}
    </div>
    <footer class="modal-foot"><button type="button" class="btn btn-ghost" data-act="cancel">انصراف</button><button type="submit" class="btn btn-primary">ساخت و دانلود auth.json</button></footer>
  </form>`;
  const form = d.querySelector('form');
  d.addEventListener('click', (e) => { if (e.target.closest('[data-act="cancel"]')) d.close(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = Auth.normalizePhone(form.elements.phone.value);
    const pw = form.elements.password.value;
    const errors = {};
    if (!Auth.isValidPhone(phone)) errors.phone = 'شماره تلفن معتبر نیست. مثال: 09123456789';
    if (pw.length < 12) errors.password = 'رمز عبور باید حداقل ۱۲ نویسه باشد.';
    if (pw !== form.elements.confirm.value) errors.confirm = 'تکرار رمز با رمز یکسان نیست.';
    if (!Auth.cryptoAvailable()) errors.password = 'ساخت رکورد نیاز به https یا localhost دارد.';
    showErrors(d, errors);
    if (Object.keys(errors).length) return;
    const record = await Auth.createRecord(phone, pw);
    downloadJson(record, 'auth.json');
    d.close();
  });
  d.showModal();
  form.elements.phone.focus();
}
