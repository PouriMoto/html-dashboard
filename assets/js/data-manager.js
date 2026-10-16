/* data-manager.js — ویزارد ورود پشتیبان: خواندن فایل، خلاصه، انتخاب حالت (جایگزینی/ادغام) و تأیید صریح.
   فایل فقط به‌عنوان داده خوانده می‌شود (file.text + JSON.parse)؛ چیزی اجرا نمی‌شود و همهٔ متن‌ها escape می‌شوند. */
import { escapeHtml as esc, faNumber, formatDate } from './utils.js';
import { icon } from './icons.js';
import { makeDialog } from './manage.js';
import { analyzeImport, planMerge, MAX_IMPORT_BYTES } from './import-export.js';

const POLICIES = [
  { id: 'keep', title: 'نگه‌داشتن نسخهٔ فعلی (پیش‌فرض)', hint: 'اگر شناسهٔ پروژه از قبل هست، نسخهٔ فعلی دست‌نخورده می‌ماند و نسخهٔ فایل نادیده گرفته می‌شود.' },
  { id: 'replace', title: 'جایگزینی با نسخهٔ فایل', hint: 'پروژه‌ها و دسته‌های هم‌شناسه با نسخهٔ فایل عوض می‌شوند. تغییرات فعلی آن‌ها از بین می‌رود.' },
  { id: 'copy', title: 'افزودن نسخهٔ فایل با شناسهٔ تازه', hint: 'هر دو نسخه می‌مانند؛ نسخهٔ فایل با پسوند «-imported» به شناسه اضافه می‌شود.' },
];

export function openImportWizard({ getLibrary, onExport, onApply }) {
  const d = makeDialog('modal-lg');
  d.setAttribute('aria-labelledby', 'im-title');
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json,.json'; input.hidden = true;
  d.append(input);
  const root = document.createElement('div');
  d.prepend(root);
  let analysis = null; let fileName = '';
  let mode = 'merge'; let policy = 'keep'; let sure = false;

  const lines = (items, max = 8) => `<ul class="warn-list">${items.slice(0, max).map((w) => `<li>${esc(w)}</li>`).join('')}${items.length > max ? `<li>و ${faNumber(items.length - max)} مورد دیگر…</li>` : ''}</ul>`;
  const fact = (l, v) => `<div><dt>${l}</dt><dd>${v}</dd></div>`;

  function summaryHtml(cur) {
    const a = analysis; const s = a.summary;
    const plan = mode === 'merge' ? planMerge(cur, a.library, policy) : null;
    const st = plan?.stats;
    const outcome = mode === 'replace'
      ? `<p class="note"><strong>نتیجه:</strong> تنظیمات، دسته‌ها و ${faNumber(cur.projects.length)} پروژهٔ فعلی با محتوای فایل (${faNumber(a.library.projects.length)} پروژه، ${faNumber(a.library.categories.length)} دسته) جایگزین می‌شود. فایل‌های HTML پروژه‌ها حذف نمی‌شوند.</p>`
      : `<p class="note"><strong>نتیجه:</strong> ${faNumber(st.added)} پروژهٔ تازه افزوده می‌شود${s.conflicts.length ? `؛ ${faNumber(s.conflicts.length)} پروژه شناسهٔ تکراری دارد و طبق سیاست بالا ${policy === 'keep' ? 'نسخهٔ فعلی حفظ می‌شود' : policy === 'replace' ? 'با نسخهٔ فایل جایگزین می‌شود' : 'با شناسهٔ تازه کپی می‌شود'}` : ''}. دسته‌های تازه: ${faNumber(st.catsAdded)}، برچسب‌های تازه: ${faNumber(st.tagsAdded)}. تنظیمات فعلی حفظ می‌شود.</p>`;
    return `<dl class="facts">
        ${fact('فایل', `<span dir="ltr">${esc(fileName)}</span>`)}${fact('نسخهٔ اسکیما', faNumber(s.schemaVersion))}${fact('زمان خروجی', esc(formatDate(s.exportedAt)) || '—')}
        ${fact('پروژه‌ها در فایل', faNumber(s.rawProjects))}${fact('پروژهٔ معتبر', faNumber(s.validProjects))}${fact('رد شده', faNumber(s.rejectedProjects))}
        ${fact('شناسهٔ تکراری در فایل', faNumber(s.duplicateIds))}${fact('دسته‌ها', faNumber(s.categories))}${fact('برچسب‌ها', faNumber(s.tags))}
      </dl>
      ${a.warnings.length ? `<details open><summary>${faNumber(a.warnings.length)} مورد هشدار (رکوردهای نامعتبر کنار گذاشته می‌شوند)</summary>${lines(a.warnings)}</details>` : '<p class="muted">هیچ رکورد نامعتبری پیدا نشد.</p>'}
      ${s.conflicts.length && mode === 'merge' ? `<details open><summary>${faNumber(s.conflicts.length)} پروژه با شناسهٔ موجود</summary>${lines(s.conflicts.map((p) => `${p.title} (${p.id})`))}</details>` : ''}
      <fieldset class="choices"><legend>حالت ورود</legend>
        <label class="choice"><input type="radio" name="mode" value="merge"${mode === 'merge' ? ' checked' : ''}><span><strong>ادغام</strong><small>رکوردهای تازه اضافه می‌شوند و چیزی بی‌صدا بازنویسی نمی‌شود.</small></span></label>
        <label class="choice"><input type="radio" name="mode" value="replace"${mode === 'replace' ? ' checked' : ''}><span><strong>جایگزینی کامل</strong><small>پیکربندی فعلی با فایل عوض می‌شود. نیاز به تأیید صریح دارد.</small></span></label>
      </fieldset>
      ${mode === 'merge' ? `<fieldset class="choices"><legend>اگر شناسه از قبل وجود داشت</legend>${POLICIES.map((p) => `<label class="choice"><input type="radio" name="policy" value="${p.id}"${policy === p.id ? ' checked' : ''}><span><strong>${p.title}</strong><small>${p.hint}</small></span></label>`).join('')}</fieldset>`
        : `<label class="check"><input type="checkbox" name="sure"${sure ? ' checked' : ''}> جایگزینی کامل را تأیید می‌کنم؛ پروژه‌ها و دسته‌های فعلی حذف می‌شوند.</label>
           <p class="hint">پیش از ادامه می‌توانید <button type="button" class="link" data-act="export">از وضعیت فعلی پشتیبان بگیرید</button>.</p>`}
      ${outcome}`;
  }

  function render() {
    const cur = getLibrary();
    let body;
    if (!analysis) body = '<p>یک فایل پشتیبان Project Deck (JSON) انتخاب کنید. فایل فقط به‌عنوان داده خوانده می‌شود و هیچ کدی از آن اجرا نمی‌شود. پیش از اعمال، خلاصه‌ای از تغییرات را می‌بینید.</p>';
    else if (!analysis.ok) body = `<div class="error-summary" role="alert"><strong>ورود ممکن نیست</strong><p>${esc(analysis.error)}</p></div><p class="muted">داشبورد دست‌نخورده است. فایل دیگری را امتحان کنید.</p>`;
    else body = summaryHtml(cur);
    const canApply = analysis?.ok && (mode === 'merge' || sure);
    root.innerHTML = `<div class="modal-shell"><header class="modal-head"><h2 id="im-title">وارد کردن پشتیبان</h2><button type="button" class="icon-btn" data-act="close" aria-label="بستن">${icon('close')}</button></header>
      <div class="modal-body">${body}<p class="note">حداکثر حجم فایل ${faNumber(MAX_IMPORT_BYTES / 1024 / 1024)} مگابایت.</p></div>
      <footer class="modal-foot"><button type="button" class="btn btn-ghost" data-act="choose">${icon('upload')} ${analysis ? 'انتخاب فایل دیگر' : 'انتخاب فایل JSON'}</button>
      ${analysis?.ok ? `<button type="button" class="btn ${mode === 'replace' ? 'btn-danger-solid' : 'btn-primary'}" data-act="apply"${canApply ? '' : ' disabled'}>${mode === 'replace' ? 'جایگزینی کامل' : 'ادغام و اعمال'}</button>` : ''}</footer></div>`;
  }

  input.addEventListener('change', async () => {
    const f = input.files[0]; input.value = '';
    if (!f) return;
    fileName = f.name; mode = 'merge'; policy = 'keep'; sure = false;
    analysis = f.size > MAX_IMPORT_BYTES ? { ok: false, error: 'حجم فایل بیشتر از ۵ مگابایت است.' } : analyzeImport(await f.text(), getLibrary());
    render();
    d.querySelector('[data-act="apply"], [data-act="choose"]')?.focus();
  });
  d.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'close') d.close();
    else if (a === 'choose') input.click();
    else if (a === 'export') onExport();
    else if (a === 'apply' && analysis?.ok) {
      const cur = getLibrary();
      const merged = mode === 'merge' ? planMerge(cur, analysis.library, policy) : null;
      d.close();
      onApply({ mode, library: merged ? merged.library : analysis.library, stats: merged?.stats || null, favorites: analysis.favorites, sort: analysis.sort });
    }
  });
  d.addEventListener('change', (e) => {
    const n = e.target.name;
    if (n === 'mode') mode = e.target.value; else if (n === 'policy') policy = e.target.value; else if (n === 'sure') sure = e.target.checked; else return;
    render();
    d.querySelector(n === 'sure' ? '[name="sure"]' : `[name="${n}"]:checked`)?.focus();
  });
  render();
  d.showModal();
  d.querySelector('[data-act="choose"]').focus();
}
