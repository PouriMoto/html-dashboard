/* preview.js — پنجرهٔ جزئیات (initPreview) و پنجرهٔ پیش‌نمایش زنده با iframe (initLive) */
import { escapeHtml as esc, formatDate, faNumber } from './utils.js';
import { icon, iconFromSpec, coverHtml } from './icons.js';
import { resolveLaunch, PREVIEW_MODE_INFO } from './projects.js';

/* ---------- جزئیات ---------- */
export function initPreview(dialog, hooks) {
  let current = null;
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.addEventListener('close', () => { dialog.innerHTML = ''; current = null; });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) return close();
    const btn = e.target.closest('[data-pv]');
    if (!btn || !current) return;
    const id = current.id;
    switch (btn.dataset.pv) {
      case 'close': close(); break;
      case 'launch': if (current.previewMode === 'iframe') close(); hooks.onLaunch(id); break;
      case 'tab': hooks.onOpenTab(id); break;
      case 'edit': close(); hooks.onEdit(id); break;
      case 'delete': close(); hooks.onDelete(id); break;
      case 'fav': {
        const on = hooks.onToggleFavorite(id);
        btn.setAttribute('aria-pressed', String(on));
        btn.innerHTML = `${icon(on ? 'heartFilled' : 'heart')} <span>${on ? 'در علاقه‌مندی‌ها' : 'علاقه‌مندی'}</span>`;
        break;
      }
      default: break;
    }
  });

  function render(p) {
    const cat = hooks.getCategory(p.categoryId);
    const launch = resolveLaunch(p);
    const mode = PREVIEW_MODE_INFO[p.previewMode];
    const fav = hooks.isFavorite(p.id);
    const fact = (label, html) => (html ? `<div><dt>${label}</dt><dd>${html}</dd></div>` : '');
    const m = p.meta;
    const facts = [
      fact('دسته', cat ? `${iconFromSpec(cat.icon)} ${esc(cat.label)}` : 'بدون دسته'),
      fact('حالت پیش‌نمایش', `${icon(mode.icon)} ${mode.label}`),
      fact('نسخه', m.version && esc(m.version)),
      fact('نویسنده', m.author && esc(m.author)),
      fact('آخرین به‌روزرسانی', esc(formatDate(m.updatedAt))),
      fact('تاریخ ایجاد', esc(formatDate(m.createdAt))),
      fact('زمان تقریبی', m.estimatedMinutes ? `${faNumber(m.estimatedMinutes)} دقیقه` : ''),
      fact('وضعیت', m.status && esc(m.status)),
      fact('نوع', launch ? (launch.kind === 'local' ? 'پروژهٔ محلی' : 'سایت مستقر شده') : ''),
      fact('مسیر', `<code>${esc(p.entry.localPath || p.entry.deployedUrl)}</code>`),
    ].join('');
    const tags = p.tags.length ? `<ul class="chips">${p.tags.map((t) => `<li class="chip">${esc(hooks.tagLabel(t))}</li>`).join('')}</ul>` : '';
    const live = p.previewMode === 'iframe';
    dialog.innerHTML = `<div class="modal-shell">
      <header class="pv-head">
        <div><h2 id="pv-title">${esc(p.title)}</h2>${p.subtitle ? `<p>${esc(p.subtitle)}</p>` : ''}</div>
        <button type="button" class="icon-btn" data-pv="close" aria-label="بستن جزئیات">${icon('close')}</button>
      </header>
      <div class="pv-stage"><div class="card-cover pv-cover">${coverHtml(p, cat)}</div></div>
      <div class="pv-body">
        ${p.description ? `<p class="pv-desc">${esc(p.description)}</p>` : ''}
        ${tags}
        <dl class="facts">${facts}</dl>
        <div class="pv-actions">
          <button type="button" class="btn btn-primary" data-pv="launch" autofocus ${launch ? '' : 'disabled'}>${icon(live ? 'eye' : 'external')} ${live ? 'پیش‌نمایش زنده' : 'اجرا در تب جدید'}</button>
          ${live && launch ? `<button type="button" class="btn btn-ghost" data-pv="tab">${icon('external')} اجرا در تب جدید</button>` : ''}
          <button type="button" class="btn btn-ghost" data-pv="fav" aria-pressed="${fav}">${icon(fav ? 'heartFilled' : 'heart')} <span>${fav ? 'در علاقه‌مندی‌ها' : 'علاقه‌مندی'}</span></button>
          ${hooks.isManage() ? `<button type="button" class="btn btn-ghost" data-pv="edit">${icon('edit')} ویرایش</button><button type="button" class="btn btn-ghost btn-danger" data-pv="delete">${icon('trash')} حذف از داشبورد</button>` : ''}
        </div>
      </div>
    </div>`;
  }

  return { open(project) { current = project; render(project); if (!dialog.open) dialog.showModal(); }, close };
}

/* ---------- پیش‌نمایش زنده ---------- */
const LOAD_TIMEOUT_MS = 12000;

/** وجود فایل محلی را بررسی می‌کند (HEAD، و در صورت نبود پشتیبانی GET). true/false/null (نامشخص) */
export async function checkLocalFile(url) {
  try {
    let res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    if (res.status === 405 || res.status === 501) res = await fetch(url, { cache: 'no-cache' });
    return res.ok;
  } catch { return null; }
}

export function initLive(dialog) {
  let token = 0; let timer = null; let current = null;
  const stop = () => { token += 1; clearTimeout(timer); };

  dialog.addEventListener('close', () => { stop(); dialog.innerHTML = ''; current = null; });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) { dialog.close(); return; }
    const b = e.target.closest('[data-lv]');
    if (!b) return;
    if (b.dataset.lv === 'close') dialog.close();
    if (b.dataset.lv === 'fs') dialog.querySelector('#lv-stage')?.requestFullscreen?.().catch(() => {});
    if (b.dataset.lv === 'retry' && current) open(current);
  });

  function fallback(message) {
    clearTimeout(timer);
    const stage = dialog.querySelector('#lv-stage');
    if (!stage) return;
    stage.innerHTML = `<div class="lv-fallback" role="alert"><p class="lv-fallback-title">پیش‌نمایش نمایش داده نشد</p><p>${esc(message)}</p>
      <div class="btn-row"><a class="btn btn-primary btn-sm" href="${esc(current.url)}" target="_blank" rel="noopener noreferrer">${icon('external')} باز کردن در تب جدید</a>
      <button type="button" class="btn btn-ghost btn-sm" data-lv="retry">تلاش دوباره</button></div></div>`;
  }

  async function open(project) {
    const launch = resolveLaunch(project);
    if (!launch) return;
    current = { ...project, url: launch.url };
    const my = ++token;
    // فقط پروژهٔ محلی هم‌مبدأ است و به allow-same-origin نیاز دارد؛ سایت خارجی کمترین مجوزها را می‌گیرد.
    const sandbox = launch.kind === 'local'
      ? 'allow-scripts allow-same-origin allow-forms allow-modals allow-pointer-lock'
      : 'allow-scripts allow-forms allow-modals allow-popups';
    dialog.setAttribute('aria-labelledby', 'lv-title');
    dialog.innerHTML = `<div class="modal-shell lv-shell">
      <header class="lv-head">
        <div class="lv-title"><h2 id="lv-title">${esc(project.title)}</h2><span class="muted">پیش‌نمایش زنده</span></div>
        <div class="lv-actions">
          <a class="btn btn-ghost btn-sm" href="${esc(launch.url)}" target="_blank" rel="noopener noreferrer">${icon('external')} <span>باز کردن مستقل</span></a>
          ${document.fullscreenEnabled ? `<button type="button" class="btn btn-ghost btn-sm" data-lv="fs">${icon('expand')} <span>تمام‌صفحه</span></button>` : ''}
          <button type="button" class="icon-btn" data-lv="close" aria-label="بستن پیش‌نمایش" autofocus>${icon('close')}</button>
        </div>
      </header>
      <div class="lv-stage" id="lv-stage"><div class="lv-loading" role="status"><span class="spinner" aria-hidden="true"></span> در حال بارگذاری…</div></div>
      <p class="lv-hint">اگر صفحه خالی ماند یا خطا نشان داد، احتمالاً سایت مقصد نمایش در قاب را مسدود کرده است؛ «باز کردن مستقل» را بزنید.</p>
    </div>`;
    if (!dialog.open) dialog.showModal();

    if (launch.kind === 'local') {
      const exists = await checkLocalFile(launch.url);
      if (my !== token) return;
      if (exists === false) { fallback(`فایل HTML در مسیر «${project.entry.localPath}» پیدا نشد. فایل را در پوشهٔ پروژه‌ها قرار دهید یا مسیر را ویرایش کنید.`); return; }
    }
    const stage = dialog.querySelector('#lv-stage');
    const frame = document.createElement('iframe');
    frame.className = 'lv-frame';
    frame.title = `پیش‌نمایش ${project.title}`;
    frame.setAttribute('sandbox', sandbox);
    frame.setAttribute('allow', 'fullscreen');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.hidden = true;
    frame.addEventListener('load', () => { if (my !== token) return; clearTimeout(timer); frame.hidden = false; stage.querySelector('.lv-loading')?.remove(); });
    frame.addEventListener('error', () => fallback('بارگذاری ناموفق بود.'));
    frame.src = launch.url; // قبل از درج در صفحه، تا رویداد load مربوط به about:blank اولیه شلیک نشود
    stage.append(frame);
    timer = setTimeout(() => { if (my === token) fallback('بارگذاری بیش از حد طول کشید؛ ممکن است سایت مقصد نمایش در قاب را مسدود کرده باشد.'); }, LOAD_TIMEOUT_MS);
  }

  return { open, close: () => dialog.open && dialog.close() };
}
