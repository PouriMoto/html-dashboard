/* manage.js — فرم افزودن/ویرایش پروژه، مدیریت دسته‌ها و تأییدیه‌ها.
   این ماژول ذخیره نمی‌کند: کتابخانهٔ جدید را از طریق callback به app.js می‌دهد. */
import { escapeHtml as esc, faNumber } from './utils.js';
import { icon, iconFromSpec } from './icons.js';
import { PREVIEW_MODES, PREVIEW_MODE_INFO } from './projects.js';
import * as V from './validators.js';
import * as L from './library.js';
import { checkLocalFile } from './preview.js';

const STORAGE_NOTE = 'تغییرات در localStorage همین مرورگر و همین آدرس ذخیره می‌شوند و بین دستگاه‌ها همگام نمی‌شوند. برای انتقال از «دریافت خروجی JSON» استفاده کنید.';

export function makeDialog(cls, { backdropClose = false } = {}) {
  const d = document.createElement('dialog');
  d.className = `modal ${cls}`;
  if (backdropClose) d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  return d;
}

/* ---------- تأییدیه ---------- */
export function confirmDialog({ title, body, confirmLabel = 'تأیید', danger = false }) {
  return new Promise((resolve) => {
    const d = makeDialog('modal-sm', { backdropClose: true });
    let result = false;
    d.setAttribute('aria-labelledby', 'cf-title');
    d.innerHTML = `<div class="modal-shell"><header class="modal-head"><h2 id="cf-title">${esc(title)}</h2></header>
      <div class="modal-body">${body}</div>
      <footer class="modal-foot"><button type="button" class="btn btn-ghost" data-act="cancel" autofocus>انصراف</button>
      <button type="button" class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}" data-act="ok">${esc(confirmLabel)}</button></footer></div>`;
    d.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'ok') { result = true; d.close(); } else if (a === 'cancel') d.close();
    });
    d.addEventListener('close', () => resolve(result));
    d.showModal();
  });
}

export const field = ({ id, label, required = false, hint = '', control }) => `<div class="field" data-field="${id}">
  <label for="f-${id}">${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>${control}
  ${hint ? `<p class="hint" id="f-${id}-hint">${hint}</p>` : ''}<p class="field-error" id="f-${id}-err" hidden></p></div>`;

export function showErrors(root, errors) {
  const summary = root.querySelector('.error-summary');
  root.querySelectorAll('.field-error').forEach((n) => { n.hidden = true; n.textContent = ''; });
  root.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
  const names = Object.keys(errors);
  if (!names.length) { summary.hidden = true; return; }
  names.forEach((n) => {
    const err = root.querySelector(`#f-${n}-err`);
    const input = root.querySelector(`#f-${n}`);
    err.textContent = errors[n]; err.hidden = false;
    if (input) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', `f-${n}-err`); }
  });
  summary.hidden = false;
  summary.innerHTML = `<strong>لطفاً ${faNumber(names.length)} مورد را اصلاح کنید:</strong><ul>${names.map((n) => `<li>${esc(errors[n])}</li>`).join('')}</ul>`;
  root.querySelector(`#f-${names[0]}`)?.focus();
}

/* ---------- فرم پروژه ---------- */
export function openProjectForm({ library, project = null, defaultCategory = '', onSave }) {
  const editing = Boolean(project);
  const dir = library.settings.projectsDir;
  const tagMap = new Map(library.tags.map((t) => [t.id, t.label]));
  const e = project?.entry || {};
  const type0 = e.localPath && project.launchTarget !== 'deployed' ? 'local' : e.deployedUrl ? 'external' : 'local';
  const val = {
    title: project?.title || '', description: project?.description || '', categoryId: project ? project.categoryId || '' : defaultCategory,
    path: type0 === 'external' ? e.deployedUrl : e.localPath || '', thumb: project?.cover.thumbnail || '', emoji: project?.cover.icon?.emoji || '',
    tags: (project?.tags || []).map((t) => tagMap.get(t) || t).join('، '), mode: project?.previewMode || 'thumbnail',
    featured: Boolean(project?.featured), visibility: project?.visibility || 'visible',
  };
  const d = makeDialog('modal-lg');
  d.setAttribute('aria-labelledby', 'pf-title');
  const catOptions = `<option value="">بدون دسته</option>${library.categories.map((c) => `<option value="${esc(c.id)}"${c.id === val.categoryId ? ' selected' : ''}>${esc(c.icon.emoji)} ${esc(c.label)}${c.hidden ? ' (پنهان از منو)' : ''}</option>`).join('')}`;
  const choice = (name, value, title, hint, checked) => `<label class="choice"><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span><strong>${title}</strong><small>${hint}</small></span></label>`;

  d.innerHTML = `<form class="modal-shell form" novalidate>
    <header class="modal-head"><h2 id="pf-title">${editing ? 'ویرایش پروژه' : 'افزودن پروژه'}</h2>
      <button type="button" class="icon-btn" data-act="cancel" aria-label="بستن فرم">${icon('close')}</button></header>
    <div class="modal-body">
      <div class="error-summary" role="alert" hidden></div>
      ${field({ id: 'title', label: 'نام پروژه', required: true, control: `<input id="f-title" name="title" type="text" maxlength="120" value="${esc(val.title)}" autocomplete="off">` })}
      ${field({ id: 'description', label: 'توضیح کوتاه', hint: 'حداکثر ۲۰۰ نویسه؛ روی کارت نمایش داده می‌شود.', control: `<textarea id="f-description" name="description" rows="2" maxlength="200">${esc(val.description)}</textarea>` })}
      ${field({ id: 'category', label: 'دسته', control: `<select id="f-category" name="category">${catOptions}</select>` })}
      <fieldset class="choices"><legend>نوع مکان پروژه</legend>
        ${choice('locType', 'local', 'فایل HTML داخل همین سایت', `مسیر نسبی داخل پوشهٔ <code>${esc(dir)}</code>`, type0 === 'local')}
        ${choice('locType', 'external', 'سایت مستقل (مستقر شده)', 'نشانی کامل http یا https', type0 === 'external')}
      </fieldset>
      ${field({ id: 'path', label: '<span id="path-label"></span>', required: true, hint: '<span id="path-hint"></span>', control: `<input id="f-path" name="path" type="text" dir="ltr" value="${esc(val.path)}" autocomplete="off" spellcheck="false">` })}
      <div class="picker" id="path-picker">
        <div class="btn-row">
          <button type="button" class="btn btn-ghost btn-sm" data-pick="folder">${icon('folder')} انتخاب پوشهٔ پروژه…</button>
          <button type="button" class="btn btn-ghost btn-sm" data-pick="file">${icon('file')} انتخاب فایل HTML…</button>
        </div>
        <div id="pick-choose" hidden><label for="pick-list">چند فایل HTML پیدا شد؛ یکی را انتخاب کنید</label><select id="pick-list"></select></div>
        <p class="hint" id="path-status" role="status"></p>
        <p class="hint">فقط نام و مسیر فایل خوانده می‌شود؛ محتوا هرگز خوانده یا ارسال نمی‌شود. فایل باید خودتان در پوشهٔ <code>${esc(dir)}</code> سایت قرار گرفته باشد.</p>
      </div>
      <p class="note">این برنامه فایل آپلود نمی‌کند. فایل‌های HTML جدید را خودتان در پوشهٔ <code>${esc(dir)}</code> بگذارید (یا جای دیگری منتشر کنید) و بعد مسیر یا نشانی‌شان را اینجا وارد کنید.</p>
      ${field({ id: 'thumb', label: 'مسیر تصویر پوشش (اختیاری)', hint: 'فایل باید از قبل داخل assets/ باشد. مثال: assets/thumbnails/inflation.webp', control: `<input id="f-thumb" name="thumb" type="text" dir="ltr" value="${esc(val.thumb)}" autocomplete="off" spellcheck="false">` })}
      <div class="picker"><button type="button" class="btn btn-ghost btn-sm" data-pick="thumb">${icon('image')} انتخاب تصویر…</button><p class="hint" id="thumb-status" role="status"></p></div>
      ${field({ id: 'emoji', label: 'ایموجی جایگزین (اختیاری)', hint: 'وقتی تصویری نباشد یا بارگذاری نشود نمایش داده می‌شود.', control: `<input id="f-emoji" name="emoji" type="text" maxlength="12" value="${esc(val.emoji)}" autocomplete="off">` })}
      ${field({ id: 'tags', label: 'برچسب‌ها (اختیاری)', hint: 'با «،» یا «,» جدا کنید. حداکثر ۱۲ برچسب.', control: `<input id="f-tags" name="tags" type="text" value="${esc(val.tags)}" autocomplete="off">` })}
      <fieldset class="choices"><legend>حالت پیش‌نمایش</legend>
        ${PREVIEW_MODES.map((m) => choice('mode', m, PREVIEW_MODE_INFO[m].label, PREVIEW_MODE_INFO[m].hint, val.mode === m)).join('')}
      </fieldset>
      <div class="inline-fields">
        <label class="check"><input type="checkbox" name="featured"${val.featured ? ' checked' : ''}> پروژهٔ ویژه</label>
        ${field({ id: 'visibility', label: 'وضعیت نمایش', control: `<select id="f-visibility" name="visibility"><option value="visible"${val.visibility === 'visible' ? ' selected' : ''}>قابل نمایش</option><option value="hidden"${val.visibility === 'hidden' ? ' selected' : ''}>پنهان (فقط در حالت مدیریت دیده می‌شود)</option></select>` })}
      </div>
      <p class="note">${STORAGE_NOTE}</p>
    </div>
    <footer class="modal-foot"><button type="button" class="btn btn-ghost" data-act="cancel">انصراف</button><button type="submit" class="btn btn-primary">${editing ? 'ذخیرهٔ تغییرات' : 'افزودن پروژه'}</button></footer>
    <input type="file" id="pick-folder" webkitdirectory hidden><input type="file" id="pick-file" accept=".html,.htm,text/html" hidden><input type="file" id="pick-thumb" accept="image/*" hidden>
  </form>`;

  const form = d.querySelector('form');
  const syncLoc = () => {
    const ext = form.elements.locType.value === 'external';
    d.querySelector('#path-label').textContent = ext ? 'نشانی سایت' : 'مسیر نسبی فایل HTML';
    d.querySelector('#path-hint').innerHTML = ext ? 'مثال: <code>https://example.com</code>' : `مثال: <code>${esc(dir)}inflation/index.html</code> (بدون «..» و بدون «/» ابتدایی)`;
    d.querySelector('#path-picker').hidden = ext;
    form.elements.path.placeholder = ext ? 'https://example.com' : `${dir}inflation/index.html`;
  };
  form.addEventListener('change', (ev) => { if (ev.target.name === 'locType') syncLoc(); });
  syncLoc();

  /* انتخاب مسیر با «Choose file»: مرورگر مسیر کامل را نمی‌دهد، پس نام/مسیر نسبی داخل پوشه با پوشهٔ مجاز ترکیب و وجودش در سایت بررسی می‌شود */
  const setStatus = (id, text) => { d.querySelector(id).textContent = text; };
  async function verifyPath(value, statusId, fileLabel) {
    setStatus(statusId, 'در حال بررسی…');
    const ok = await checkLocalFile(new URL(value, document.baseURI).href);
    setStatus(statusId, ok === true ? `✓ ${fileLabel} در سایت پیدا شد.` : ok === false ? `⚠ ${fileLabel} هنوز در سایت پیدا نمی‌شود؛ آن را در همین مسیر قرار دهید و commit کنید.` : 'بررسی وجود فایل ممکن نشد.');
  }
  function useLocal(rel) {
    form.elements.path.value = dir + rel;
    const r = V.validateProjectPath(form.elements.path.value, dir);
    if (!r.ok) { setStatus('#path-status', `⚠ ${r.error}`); return; }
    verifyPath(r.value, '#path-status', 'فایل');
  }
  d.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => d.querySelector(`#pick-${b.dataset.pick}`).click()));
  d.querySelector('#pick-folder').addEventListener('change', (ev) => {
    const top = dir.replace(/\/$/, '');
    const paths = [...ev.target.files].map((f) => f.webkitRelativePath || f.name)
      .filter((pth) => /\.html?$/i.test(pth) && !pth.split('/').some((x) => x.startsWith('.') || x === 'node_modules'))
      .map((pth) => (pth.startsWith(`${top}/`) ? pth.slice(top.length + 1) : pth));
    ev.target.value = '';
    const box = d.querySelector('#pick-choose'); const list = d.querySelector('#pick-list');
    box.hidden = true;
    if (!paths.length) { setStatus('#path-status', 'در این پوشه فایل HTML پیدا نشد.'); return; }
    paths.sort((a, b) => a.split('/').length - b.split('/').length || (/index\.html?$/i.test(b) - /index\.html?$/i.test(a)) || a.localeCompare(b));
    useLocal(paths[0]);
    if (paths.length > 1) {
      list.innerHTML = paths.slice(0, 200).map((pth) => `<option value="${esc(pth)}">${esc(pth)}</option>`).join('');
      list.onchange = () => useLocal(list.value);
      box.hidden = false;
    }
  });
  d.querySelector('#pick-file').addEventListener('change', (ev) => {
    const f = ev.target.files[0]; ev.target.value = '';
    if (f) useLocal(f.name);
  });
  d.querySelector('#pick-thumb').addEventListener('change', (ev) => {
    const f = ev.target.files[0]; ev.target.value = '';
    if (!f) return;
    form.elements.thumb.value = `assets/thumbnails/${f.name}`;
    const r = V.validateThumbnail(form.elements.thumb.value);
    if (!r.ok) { setStatus('#thumb-status', `⚠ ${r.error}`); return; }
    verifyPath(r.value, '#thumb-status', 'تصویر');
  });
  d.addEventListener('click', (ev) => { if (ev.target.closest('[data-act="cancel"]')) d.close(); });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = new FormData(form);
    const errors = {};
    const title = String(f.get('title')).trim();
    if (!title) errors.title = 'نام پروژه را وارد کنید.';
    else if (title.length > 120) errors.title = 'نام پروژه نباید بیشتر از ۱۲۰ نویسه باشد.';
    const description = String(f.get('description')).trim();
    if (description.length > 200) errors.description = 'توضیح کوتاه نباید بیشتر از ۲۰۰ نویسه باشد.';
    const categoryId = String(f.get('category'));
    if (categoryId && !library.categories.some((c) => c.id === categoryId)) errors.category = 'دستهٔ انتخاب‌شده وجود ندارد.';
    const type = String(f.get('locType'));
    const loc = type === 'external' ? V.validateExternalUrl(f.get('path')) : V.validateProjectPath(f.get('path'), dir);
    if (!loc.ok) errors.path = loc.error;
    const thumb = V.validateThumbnail(f.get('thumb')); if (!thumb.ok) errors.thumb = thumb.error;
    const emoji = V.validateEmoji(f.get('emoji')); if (!emoji.ok) errors.emoji = emoji.error;
    const tg = V.parseTags(f.get('tags')); if (!tg.ok) errors.tags = tg.error;
    const mode = String(f.get('mode'));
    if (!PREVIEW_MODES.includes(mode)) errors.mode = 'حالت پیش‌نمایش نامعتبر است.';
    showErrors(d, errors);
    if (Object.keys(errors).length) return;

    const { library: lib2, ids } = L.resolveTags(library, tg.tags);
    const entry = { localPath: e.localPath ?? null, deployedUrl: e.deployedUrl ?? null }; // مقدار دیگر حذف نمی‌شود
    if (type === 'external') entry.deployedUrl = loc.value; else entry.localPath = loc.value;
    const today = new Date().toISOString().slice(0, 10);
    const base = project || {
      id: L.newProjectId(lib2, title), subtitle: '', sortOrder: 0,
      cover: { thumbnail: null, gradient: null, accent: null, icon: null },
      meta: { version: null, author: null, createdAt: today, updatedAt: null, language: null, direction: null, status: null, estimatedMinutes: null, notes: '', custom: {} },
    };
    const saved = {
      ...base, title, description, categoryId: categoryId || null, tags: ids, entry,
      launchTarget: type === 'external' ? 'deployed' : 'local', previewMode: mode,
      cover: { ...base.cover, thumbnail: thumb.value, icon: emoji.value ? { emoji: emoji.value, tabler: null } : null },
      featured: f.get('featured') === 'on', visibility: f.get('visibility') === 'hidden' ? 'hidden' : 'visible',
      meta: { ...base.meta, createdAt: base.meta.createdAt || today, updatedAt: today },
    };
    const out = editing ? L.updateProject(lib2, project.id, saved) : L.addProject(lib2, saved);
    d.close();
    onSave(out, saved, { insecure: Boolean(loc.insecure), editing });
  });
  d.showModal();
  form.elements.title.focus();
}

/* ---------- مدیریت دسته‌ها ---------- */
export function openCategoryManager({ getLibrary, onChange }) {
  const d = makeDialog('modal-lg');
  d.setAttribute('aria-labelledby', 'cm-title');
  let view = { mode: 'list' };
  let slugTouched = false;

  const countOf = (id) => getLibrary().projects.filter((p) => p.categoryId === id).length;
  const push = (lib) => { onChange(lib); render(); };

  function listView(lib) {
    const rows = lib.categories.map((c, i) => `<li class="cat-row${c.hidden ? ' is-hidden' : ''}">
      <span class="cat-ico">${iconFromSpec(c.icon)}</span>
      <div class="cat-main"><strong>${esc(c.label)}</strong>${c.hidden ? '<span class="chip">پنهان از منو</span>' : ''}
        <span class="cat-meta"><code>${esc(c.id)}</code><span>${faNumber(countOf(c.id))} پروژه</span></span></div>
      <div class="cat-actions">
        <button type="button" class="icon-btn sm" data-act="up" data-id="${esc(c.id)}" aria-label="انتقال «${esc(c.label)}» به بالا"${i === 0 ? ' disabled' : ''}>${icon('up')}</button>
        <button type="button" class="icon-btn sm" data-act="down" data-id="${esc(c.id)}" aria-label="انتقال «${esc(c.label)}» به پایین"${i === lib.categories.length - 1 ? ' disabled' : ''}>${icon('down')}</button>
        <button type="button" class="icon-btn sm" data-act="edit" data-id="${esc(c.id)}" aria-label="ویرایش «${esc(c.label)}»">${icon('edit')}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="toggle" data-id="${esc(c.id)}" aria-label="${c.hidden ? 'نمایش' : 'پنهان کردن'} «${esc(c.label)}» در منو">${c.hidden ? 'نمایش' : 'پنهان'}</button>
        <button type="button" class="icon-btn sm danger" data-act="delete" data-id="${esc(c.id)}" aria-label="حذف «${esc(c.label)}»">${icon('trash')}</button>
      </div></li>`).join('');
    return `<div class="modal-body">
      ${lib.categories.length ? `<ul class="cat-list">${rows}</ul>` : '<p class="muted">هنوز دسته‌ای ندارید. اولین دسته را بسازید.</p>'}
      <p class="note">${STORAGE_NOTE}</p></div>
      <footer class="modal-foot"><button type="button" class="btn btn-ghost" data-act="close">بستن</button><button type="button" class="btn btn-primary" data-act="new">${icon('plus')} دستهٔ جدید</button></footer>`;
  }

  function formView(lib) {
    const c = view.id ? lib.categories.find((x) => x.id === view.id) : null;
    const v = c || { id: '', label: '', description: '', icon: { emoji: '', tabler: null }, hidden: false };
    return `<form class="form" novalidate><div class="modal-body">
      <div class="error-summary" role="alert" hidden></div>
      ${field({ id: 'label', label: 'نام دسته', required: true, control: `<input id="f-label" name="label" type="text" maxlength="40" value="${esc(v.label)}" autocomplete="off">` })}
      ${field({ id: 'slug', label: 'شناسهٔ نشانی', required: !c, hint: c ? 'این شناسه ثابت است و با تغییر نام عوض نمی‌شود، تا لینک‌های قبلی کار کنند.' : `در نشانی به شکل ?category=… استفاده می‌شود. مثال: finance`, control: `<input id="f-slug" name="slug" type="text" dir="ltr" maxlength="40" value="${esc(v.id)}"${c ? ' readonly' : ''} autocomplete="off" spellcheck="false">` })}
      ${field({ id: 'description', label: 'توضیح (اختیاری)', control: `<textarea id="f-description" name="description" rows="2" maxlength="160">${esc(v.description)}</textarea>` })}
      ${field({ id: 'emoji', label: 'ایموجی', hint: 'اگر خالی بماند 📁 نمایش داده می‌شود.', control: `<input id="f-emoji" name="emoji" type="text" maxlength="12" value="${esc(v.icon.emoji === '📁' && !c ? '' : v.icon.emoji)}" autocomplete="off">` })}
      ${field({ id: 'tabler', label: 'نام آیکون Tabler (اختیاری)', hint: 'فقط وقتی فایل اسپرایت در assets/icons/ باشد استفاده می‌شود؛ مثال: coin', control: `<input id="f-tabler" name="tabler" type="text" dir="ltr" value="${esc(v.icon.tabler || '')}" autocomplete="off" spellcheck="false">` })}
      <label class="check"><input type="checkbox" name="hidden"${v.hidden ? ' checked' : ''}> پنهان از منو و کاشی‌های داشبورد</label>
    </div><footer class="modal-foot"><button type="button" class="btn btn-ghost" data-act="back">بازگشت</button><button type="submit" class="btn btn-primary">${c ? 'ذخیرهٔ تغییرات' : 'ساخت دسته'}</button></footer></form>`;
  }

  function deleteView(lib) {
    const c = lib.categories.find((x) => x.id === view.id);
    const n = countOf(c.id);
    const others = lib.categories.filter((x) => x.id !== c.id);
    const move = n ? `<fieldset class="choices"><legend>با ${faNumber(n)} پروژهٔ این دسته چه شود؟</legend>
      ${others.length ? `<label class="choice"><input type="radio" name="after" value="move" checked><span><strong>انتقال به دستهٔ دیگر</strong><select name="target" aria-label="دستهٔ مقصد">${others.map((o) => `<option value="${esc(o.id)}">${esc(o.icon.emoji)} ${esc(o.label)}</option>`).join('')}</select></span></label>` : ''}
      <label class="choice"><input type="radio" name="after" value="none"${others.length ? '' : ' checked'}><span><strong>بی‌دسته بماند</strong><small>پروژه‌ها در «همهٔ پروژه‌ها» می‌مانند.</small></span></label></fieldset>` : '<p>این دسته پروژه‌ای ندارد.</p>';
    return `<form class="form" novalidate><div class="modal-body">
      <p>دستهٔ «<strong>${esc(c.label)}</strong>» حذف می‌شود. <strong>هیچ پروژه‌ای حذف نخواهد شد.</strong></p>${move}
      <label class="check"><input type="checkbox" name="sure"> مطمئنم که می‌خواهم این دسته حذف شود</label></div>
      <footer class="modal-foot"><button type="button" class="btn btn-ghost" data-act="back" autofocus>انصراف</button><button type="submit" class="btn btn-danger-solid" disabled>حذف دسته</button></footer></form>`;
  }

  function render() {
    const lib = getLibrary();
    if (view.id && !lib.categories.some((c) => c.id === view.id)) view = { mode: 'list' };
    const title = { list: 'مدیریت دسته‌ها', form: view.id ? 'ویرایش دسته' : 'دستهٔ جدید', delete: 'حذف دسته' }[view.mode];
    d.innerHTML = `<div class="modal-shell"><header class="modal-head"><h2 id="cm-title">${title}</h2><button type="button" class="icon-btn" data-act="close" aria-label="بستن مدیریت دسته‌ها">${icon('close')}</button></header>
      ${view.mode === 'list' ? listView(lib) : view.mode === 'form' ? formView(lib) : deleteView(lib)}</div>`;
    slugTouched = false;
    d.querySelector('input:not([readonly]), button[autofocus]')?.focus();
  }

  d.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const id = b.dataset.id; const lib = getLibrary();
    switch (b.dataset.act) {
      case 'close': d.close(); break;
      case 'back': view = { mode: 'list' }; render(); break;
      case 'new': view = { mode: 'form', id: null }; render(); break;
      case 'edit': view = { mode: 'form', id }; render(); break;
      case 'delete': view = { mode: 'delete', id }; render(); break;
      case 'up': push(L.moveCategory(lib, id, -1)); break;
      case 'down': push(L.moveCategory(lib, id, 1)); break;
      case 'toggle': push(L.updateCategory(lib, id, { hidden: !lib.categories.find((c) => c.id === id).hidden })); break;
      default: break;
    }
  });
  d.addEventListener('input', (ev) => {
    const f = ev.target.form;
    if (!f) return;
    if (ev.target.name === 'sure') f.querySelector('button[type="submit"]').disabled = !ev.target.checked;
    if (ev.target.name === 'slug') slugTouched = true;
    if (ev.target.name === 'label' && !view.id && !slugTouched) f.elements.slug.value = V.slugify(ev.target.value);
  });
  d.addEventListener('change', (ev) => { if (ev.target.name === 'sure') ev.target.form.querySelector('button[type="submit"]').disabled = !ev.target.checked; });

  d.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const form = ev.target; const f = new FormData(form); const lib = getLibrary();
    if (view.mode === 'delete') {
      if (f.get('sure') !== 'on') return;
      const moveTo = f.get('after') === 'move' ? String(f.get('target')) : null;
      const delId = view.id;
      view = { mode: 'list' };
      push(L.deleteCategory(lib, delId, moveTo));
      return;
    }
    const errors = {};
    const label = String(f.get('label')).trim();
    if (!label) errors.label = 'نام دسته را وارد کنید.';
    else if (lib.categories.some((c) => c.id !== view.id && c.label.trim() === label)) errors.label = 'دسته‌ای با این نام وجود دارد.';
    let slug = view.id;
    if (!view.id) {
      const s = V.validateSlug(f.get('slug'));
      if (!s.ok) errors.slug = s.error;
      else if (lib.categories.some((c) => c.id === s.value)) errors.slug = 'این شناسه قبلاً استفاده شده است.';
      else slug = s.value;
    }
    const emoji = V.validateEmoji(f.get('emoji')); if (!emoji.ok) errors.emoji = emoji.error;
    const tabler = V.validateTabler(f.get('tabler')); if (!tabler.ok) errors.tabler = tabler.error;
    const description = String(f.get('description')).trim();
    if (description.length > 160) errors.description = 'توضیح نباید بیشتر از ۱۶۰ نویسه باشد.';
    showErrors(d, errors);
    if (Object.keys(errors).length) return;
    const patch = { label, description, icon: { emoji: emoji.value || '📁', tabler: tabler.value }, hidden: f.get('hidden') === 'on' };
    const next = view.id
      ? L.updateCategory(lib, view.id, patch)
      : L.addCategory(lib, { id: slug, ...patch, accent: L.ACCENTS[lib.categories.length % L.ACCENTS.length], order: lib.categories.length + 1 });
    view = { mode: 'list' };
    push(next);
  });

  render();
  d.showModal();
}
