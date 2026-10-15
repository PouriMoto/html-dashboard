/* app.js — نقطهٔ ورود: بوت، مسیریابی با نشانی (query + History API)، رندر، مدیریت و رویدادها */
import * as storage from './storage.js';
import { normalizeLibrary, resolveLaunch, PREVIEW_MODE_INFO } from './projects.js';
import { categoryCounts, indexById } from './categories.js';
import { filterProjects, sortProjects, collectTags, SORTS } from './filters.js';
import { initIcons, icon, iconFromSpec, hydrateIcons, coverHtml } from './icons.js';
import { initPreview, initLive, checkLocalFile } from './preview.js';
import { openProjectForm, openCategoryManager, confirmDialog } from './manage.js';
import { buildExport, downloadJson, readImportFile, mergeLibraries } from './import-export.js';
import { VIEWS, parseLocation, toQuery, urlFor } from './router.js';
import * as L from './library.js';
import { escapeHtml as esc, debounce, faNumber } from './utils.js';

const DATA_URL = 'data/projects.json';
const NAV_MAIN = [
  { id: 'home', label: 'داشبورد', icon: 'home', state: {} },
  { id: 'library', label: 'همهٔ پروژه‌ها', icon: 'library', state: { view: 'library' } },
];
const NAV_LIB = [
  { id: 'favorites', label: 'علاقه‌مندی‌ها', icon: 'heart', state: { view: 'favorites' } },
  { id: 'recent', label: 'اخیراً باز شده', icon: 'clock', state: { view: 'recent' } },
  { id: 'settings', label: 'تنظیمات و راهنما', icon: 'settings', state: { view: 'settings' } },
];
const TITLES = Object.fromEntries([...NAV_MAIN, ...NAV_LIB].map((s) => [s.id, s.label]));
const $ = (sel, root = document) => root.querySelector(sel);
const mq = window.matchMedia('(max-width: 900px)');

const S = {
  library: null, catMap: new Map(), tagMap: new Map(), user: null,
  query: '', tag: '', route: { name: 'home', id: null },
  source: 'default', importMode: 'merge', lastWarnings: [], loadError: null, stale: false, notices: [], storageIssue: false,
};
let details = null; let live = null; let audio = null; let audioSrc = null;

const saveUser = () => storage.saveUserState(S.user);
const isFav = (id) => S.user.favorites.includes(id);
const isManage = () => S.user.prefs.manage;
const recentMap = () => new Map(S.user.recent.map((r) => [r.id, r.at]));
const allProjects = () => S.library.projects.filter((p) => isManage() || p.visibility === 'visible');
const findProject = (id) => S.library.projects.find((p) => p.id === id);
const filterCtx = () => ({ catMap: S.catMap, tagMap: S.tagMap });

function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast${type === 'error' ? ' is-error' : ''}`;
  el.textContent = message;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 5200);
}

/* ---------- بوت ---------- */
async function loadLibrary() {
  const { doc, status } = storage.loadLibraryStore();
  if (status === 'corrupt') S.notices.push('داده‌های ذخیره‌شده در مرورگر خراب بود و نادیده گرفته شد (نسخهٔ پشتیبان نگه‌داری شد). داده‌های پیش‌فرض بارگذاری شد.');
  if (doc) {
    try {
      const { library, warnings } = normalizeLibrary(doc);
      S.library = library; S.lastWarnings = warnings; S.source = 'local';
      return;
    } catch {
      storage.quarantineLibrary();
      S.notices.push('داده‌های ذخیره‌شده با اسکیمای برنامه سازگار نبود و کنار گذاشته شد. داده‌های پیش‌فرض بارگذاری شد.');
    }
  }
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { library, warnings } = normalizeLibrary(await res.json());
    S.library = library; S.lastWarnings = warnings; S.source = 'default';
    warnings.forEach((w) => console.warn('[Project Deck]', w));
  } catch (err) {
    S.loadError = err;
    S.library = normalizeLibrary({ schemaVersion: 1 }).library;
  }
}

function applyBackground() {
  const root = document.documentElement.style;
  const src = S.library.settings.backgroundImage;
  const clear = () => { root.removeProperty('--bg-image'); root.removeProperty('--bg-overlay'); };
  if (!src) { clear(); return; }
  const img = new Image();
  img.onload = () => { root.setProperty('--bg-image', `url("${new URL(src, document.baseURI).href}")`); root.setProperty('--bg-overlay', 'linear-gradient(rgba(10,12,17,.86), rgba(10,12,17,.93))'); };
  img.onerror = clear;
  img.src = src;
}

function indexLibrary() {
  S.catMap = indexById(S.library.categories);
  S.tagMap = indexById(S.library.tags);
}

async function applyLibrary() {
  indexLibrary();
  const { iconSpritePath, iconSymbolPrefix, siteTitle } = S.library.settings;
  await initIcons({ spritePath: iconSpritePath, symbolPrefix: iconSymbolPrefix });
  $('#brand-title').textContent = siteTitle;
  hydrateIcons(document);
  applyBackground();
  setupAudio();
  paintManage();
  onLocationChange({ syncInput: false });
}

async function boot() {
  S.user = storage.loadUserState();
  await loadLibrary();
  indexLibrary();
  details = initPreview($('#preview-dialog'), {
    getCategory: (id) => S.catMap.get(id), tagLabel: (id) => S.tagMap.get(id)?.label || id,
    isFavorite: isFav, isManage, onToggleFavorite: toggleFav,
    onLaunch: launchProject, onOpenTab: (id) => { const p = findProject(id); if (p) openInTab(p); },
    onEdit: editProject, onDelete: deleteProject,
  });
  live = initLive($('#live-dialog'));
  bindEvents();
  const { iconSpritePath, iconSymbolPrefix, siteTitle } = S.library.settings;
  await initIcons({ spritePath: iconSpritePath, symbolPrefix: iconSymbolPrefix });
  $('#brand-title').textContent = siteTitle;
  hydrateIcons(document);
  applyBackground();
  setupAudio();
  paintManage();
  renderStorageNotice();
  $('#boot-notice').hidden = true;
  onLocationChange({ first: true });
}

/* ---------- نشانی و مسیریابی ---------- */
function resolveLocation() {
  const raw = parseLocation();
  let name = 'home'; let id = null; let notice = '';
  if (raw.category) {
    if (S.catMap.has(raw.category)) { name = 'category'; id = raw.category; }
    else { name = 'library'; notice = `دستهٔ «${raw.category}» پیدا نشد؛ همهٔ پروژه‌ها نمایش داده شد.`; }
  } else if (raw.view) {
    if (VIEWS.includes(raw.view)) name = raw.view; else notice = 'نمای درخواستی معتبر نیست؛ داشبورد نمایش داده شد.';
  }
  if (name === 'home' && (raw.search || raw.tag)) name = 'library';
  return { route: { name, id }, query: raw.search, tag: raw.tag, notice };
}
const currentState = () => ({ view: S.route.name === 'category' ? '' : S.route.name, category: S.route.id || '', search: S.query, tag: S.tag });

function onLocationChange({ syncInput = true, first = false, focus = false } = {}) {
  const r = resolveLocation();
  S.route = r.route; S.query = r.query; S.tag = r.tag;
  if (r.notice) { toast(r.notice); history.replaceState(null, '', urlFor(currentState())); }
  const input = $('#search-input');
  if (syncInput && input.value !== S.query) input.value = S.query;
  $('#search-clear').hidden = !input.value;
  setSidebar(false);
  renderSidebar();
  renderMain();
  if (!first && focus) { $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); }
}

function go(partial, { replace = false, focus = true } = {}) {
  const url = urlFor({ ...currentState(), ...partial });
  if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  onLocationChange({ focus });
}

/* ---------- قالب‌ها ---------- */
function noticeHtml(title, text, actions = '') {
  return `<section class="empty"><div class="empty-art" aria-hidden="true"><span></span><span></span><span></span></div><h2>${esc(title)}</h2><p>${text}</p>${actions ? `<div class="empty-actions">${actions}</div>` : ''}</section>`;
}
const importBtn = '<button type="button" class="btn btn-ghost" data-action="import-pick">وارد کردن فایل JSON</button>';
const addBtn = `<button type="button" class="btn btn-primary" data-action="add-project">${icon('plus')} افزودن پروژه</button>`;

function emptyOrErrorHtml() {
  if (S.loadError) return noticeHtml('داده‌ها بارگذاری نشد', `خواندن <code>${DATA_URL}</code> ناموفق بود (${esc(S.loadError.message)}). اگر صفحه را با file:// باز کرده‌اید، آن را با یک سرور ایستا اجرا کنید؛ یا یک فایل JSON وارد کنید.`, addBtn + importBtn);
  return noticeHtml('کتابخانه هنوز خالی است', 'اولین پروژه را بدون ویرایش کد اضافه کنید، یا یک فایل JSON آماده وارد کنید.', addBtn + importBtn);
}

function cardHtml(p) {
  const cat = S.catMap.get(p.categoryId);
  const fav = isFav(p.id);
  const id = esc(p.id);
  const mode = PREVIEW_MODE_INFO[p.previewMode];
  const tags = p.tags.slice(0, 2).map((t) => `<span class="chip">${esc(S.tagMap.get(t)?.label || t)}</span>`).join('');
  const badges = `${p.featured ? '<span class="badge">ویژه</span>' : ''}${p.visibility === 'hidden' ? '<span class="badge badge-muted">پنهان</span>' : ''}`;
  const manage = isManage() ? `<button type="button" class="icon-btn sm" data-action="edit" data-id="${id}" aria-label="ویرایش ${esc(p.title)}">${icon('edit')}</button><button type="button" class="icon-btn sm danger" data-action="delete" data-id="${id}" aria-label="حذف ${esc(p.title)} از داشبورد">${icon('trash')}</button>` : '';
  return `<article class="card">
    <div class="card-cover">
      ${coverHtml(p, cat)}<div class="badges">${badges}</div>
      <span class="mode-pill">${icon(mode.icon)} ${mode.label}</span>
      <button type="button" class="fav-btn" data-action="fav" data-id="${id}" aria-pressed="${fav}" aria-label="علاقه‌مندی: ${esc(p.title)}">${icon(fav ? 'heartFilled' : 'heart')}</button>
      <button type="button" class="play-btn" data-action="launch" data-id="${id}" aria-label="${p.previewMode === 'iframe' ? 'پیش‌نمایش زنده' : 'اجرای'} ${esc(p.title)}">${icon('play')}</button>
    </div>
    <div class="card-body">
      <h3 class="card-title"><button type="button" class="card-link" data-action="open" data-id="${id}">${esc(p.title)}</button></h3>
      <p class="card-sub">${esc(p.description || p.subtitle || '')}</p>
      <div class="card-meta">${cat ? `<span class="chip chip-cat">${iconFromSpec(cat.icon)}${esc(cat.label)}</span>` : '<span class="chip">بدون دسته</span>'}${tags}</div>
    </div>
    <div class="card-foot"><button type="button" class="btn btn-ghost btn-sm" data-action="details" data-id="${id}">${icon('info')} جزئیات</button><span class="spacer"></span>${manage}</div>
  </article>`;
}

function shelfHtml(title, items, moreHref) {
  return `<section class="shelf" aria-label="${esc(title)}"><div class="shelf-head"><h2>${esc(title)}</h2>${moreHref ? `<a class="link" href="${moreHref}" data-nav>مشاهدهٔ همه</a>` : ''}</div><div class="row">${items.map(cardHtml).join('')}</div></section>`;
}

function heroHtml(p) {
  const cat = S.catMap.get(p.categoryId);
  const id = esc(p.id);
  const live = p.previewMode === 'iframe';
  return `<section class="hero" aria-labelledby="hero-title">
    <div class="hero-bg" aria-hidden="true">${coverHtml(p, cat)}</div>
    <div class="hero-body">
      ${cat ? `<span class="chip chip-cat">${iconFromSpec(cat.icon)}${esc(cat.label)}</span>` : ''}
      <h2 id="hero-title">${esc(p.title)}</h2>
      <p>${esc(p.description || p.subtitle || '')}</p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" data-action="launch" data-id="${id}">${icon(live ? 'eye' : 'play')} ${live ? 'پیش‌نمایش زنده' : 'اجرا'}</button>
        <button type="button" class="btn btn-ghost" data-action="details" data-id="${id}">${icon('info')} جزئیات</button>
      </div>
    </div>
  </section>`;
}

function tilesHtml(list) {
  const cats = S.library.categories.filter((c) => !c.hidden);
  if (!cats.length) return '';
  const counts = categoryCounts(list);
  return `<section class="shelf" aria-label="دسته‌بندی‌ها"><div class="shelf-head"><h2>دسته‌بندی‌ها</h2></div><div class="tiles">${cats.map((c) => `<a class="tile" href="${toQuery({ category: c.id })}" data-nav${c.accent ? ` style="--tile:${c.accent}"` : ''}><span class="tile-ico">${iconFromSpec(c.icon)}</span><span><strong>${esc(c.label)}</strong><small>${faNumber(counts.get(c.id) || 0)} پروژه</small></span></a>`).join('')}</div></section>`;
}

/* ---------- بخش‌ها ---------- */
function renderHome() {
  const list = allProjects();
  if (!list.length) return emptyOrErrorHtml();
  const rm = recentMap();
  const featured = sortProjects(list.filter((p) => p.featured), 'featured');
  const hero = featured[0] || sortProjects(list, 'featured')[0];
  const recents = sortProjects(list.filter((p) => rm.has(p.id)), 'recent', rm).slice(0, 10);
  const others = featured.filter((p) => p !== hero);
  return heroHtml(hero)
    + (recents.length ? shelfHtml('ادامه دهید', recents, toQuery({ view: 'recent' })) : '')
    + (others.length ? shelfHtml('پروژه‌های ویژه', others) : '')
    + tilesHtml(list)
    + shelfHtml('تازه‌ترین‌ها', sortProjects(list, 'newest').slice(0, 10), toQuery({ view: 'library' }));
}

function renderList() {
  const { name, id } = S.route;
  if (!S.library.projects.length) return { html: emptyOrErrorHtml(), count: null };
  const vis = allProjects(); const rm = recentMap();
  let base = vis; let desc = '';
  const cat = name === 'category' ? S.catMap.get(id) : null;
  if (cat) { desc = cat.description; base = vis.filter((p) => p.categoryId === id); }
  else if (name === 'favorites') base = vis.filter((p) => isFav(p.id));
  else if (name === 'recent') base = vis.filter((p) => rm.has(p.id));

  const tags = collectTags(base, S.tagMap);
  if (S.tag && !tags.some((t) => t.id === S.tag)) S.tag = '';
  const items = sortProjects(filterProjects(base, { query: S.query, tag: S.tag }, filterCtx()), name === 'recent' ? 'recent' : SORTS.some((s) => s.id === S.user.prefs.sort) ? S.user.prefs.sort : 'featured', rm);
  const sortId = SORTS.some((s) => s.id === S.user.prefs.sort) ? S.user.prefs.sort : 'featured';
  const filtering = Boolean(S.query.trim() || S.tag);

  const sortSelect = name === 'recent' ? '' : `<label class="select"><span class="sr-only">مرتب‌سازی</span><select id="sort-select">${SORTS.filter((s) => s.id !== 'recent').map((s) => `<option value="${s.id}"${s.id === sortId ? ' selected' : ''}>مرتب‌سازی: ${s.label}</option>`).join('')}</select></label>`;
  const hiddenNote = cat?.hidden ? '<span class="chip">این دسته از منو پنهان است</span>' : '';
  const head = `<div class="page-head"><p class="muted">${esc(desc) || (S.query.trim() ? `نتایج جستجو برای «${esc(S.query.trim())}»` : '')}</p>${hiddenNote}${sortSelect}</div>`;
  const chips = tags.length ? `<div class="chips" role="group" aria-label="فیلتر برچسب">${tags.map((t) => `<button type="button" class="chip" data-action="tag" data-tag="${esc(t.id)}" aria-pressed="${S.tag === t.id}">${S.tag === t.id ? '✓ ' : ''}${esc(t.label)} (${faNumber(t.count)})</button>`).join('')}</div>` : '';
  const clear = filtering ? `<div class="filter-bar"><span>${faNumber(items.length)} نتیجه</span><button type="button" class="btn btn-ghost btn-sm" data-action="clear-filters">${icon('close')} پاک کردن جستجو و فیلترها</button></div>` : '';

  if (!items.length) {
    let body;
    if (filtering) body = noticeHtml('نتیجه‌ای پیدا نشد', 'عبارت دیگری را امتحان کنید یا فیلترها را بردارید.', '<button type="button" class="btn btn-primary" data-action="clear-filters">پاک کردن جستجو و فیلترها</button>');
    else if (name === 'favorites') body = noticeHtml('علاقه‌مندی‌ها خالی است', 'روی نماد قلب هر پروژه بزنید تا اینجا بیاید.', `<a class="btn btn-primary" href="${toQuery({ view: 'library' })}" data-nav>دیدن همهٔ پروژه‌ها</a>`);
    else if (name === 'recent') body = noticeHtml('هنوز پروژه‌ای باز نکرده‌اید', 'پروژه‌هایی که اجرا می‌کنید اینجا فهرست می‌شوند.', `<a class="btn btn-primary" href="${toQuery({ view: 'library' })}" data-nav>دیدن همهٔ پروژه‌ها</a>`);
    else if (cat) body = noticeHtml('این دسته هنوز پروژه‌ای ندارد', 'یک پروژهٔ تازه به این دسته اضافه کنید یا پروژه‌ای را با ویرایش به اینجا منتقل کنید.', (isManage() ? addBtn : '') + `<a class="btn btn-ghost" href="${toQuery({ view: 'library' })}" data-nav>همهٔ پروژه‌ها</a>`);
    else body = emptyOrErrorHtml();
    return { html: head + chips + clear + body, count: 0 };
  }
  return { html: `${head}${chips}${clear}<div class="grid">${items.map(cardHtml).join('')}</div>`, count: items.length };
}

function renderSettings() {
  const lib = S.library;
  const fact = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  const warnings = S.lastWarnings.length ? `<ul class="warn-list">${S.lastWarnings.slice(0, 8).map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
  return `<div class="panels">
    <section class="panel"><h2>خلاصهٔ کتابخانه</h2><dl class="facts">
      ${fact('پروژه‌ها', faNumber(lib.projects.length))}${fact('دسته‌ها', faNumber(lib.categories.length))}${fact('برچسب‌ها', faNumber(lib.tags.length))}${fact('نسخهٔ اسکیما', faNumber(lib.schemaVersion))}
      ${fact('منبع داده', S.source === 'local' ? 'نسخهٔ ذخیره‌شده در این مرورگر' : '<code>data/projects.json</code>')}
      ${fact('ذخیره‌سازی', storage.isPersistent() ? 'localStorage' : 'فقط حافظهٔ موقت')}
    </dl>${warnings}</section>
    <section class="panel"><h2>ذخیره‌سازی در مرورگر</h2>
      <p>تغییراتی که در داشبورد می‌دهید در localStorage همین مرورگر و برای همین آدرس سایت ذخیره می‌شود. در مرورگر یا دستگاه دیگر، یا پس از پاک‌کردن داده‌های مرورگر، دیده نمی‌شود و هیچ همگام‌سازی خودکاری وجود ندارد. برای انتقال یا پشتیبان‌گیری از «دریافت خروجی JSON» و «وارد کردن فایل JSON» استفاده کنید.</p>
      <p>برای انتشار دائمی تغییرات برای همه، فایل خروجی را به‌جای <code>data/projects.json</code> در مخزن بگذارید.</p></section>
    <section class="panel"><h2>مدیریت</h2>
      <label><input type="checkbox" id="manage-check"${isManage() ? ' checked' : ''}> حالت مدیریت (دکمه‌های ویرایش و حذف، و نمایش پروژه‌های پنهان)</label>
      <div class="btn-row"><button type="button" class="btn btn-primary" data-action="add-project">${icon('plus')} افزودن پروژه</button><button type="button" class="btn btn-ghost" data-action="manage-categories">مدیریت دسته‌ها</button></div></section>
    <section class="panel"><h2>ورود و خروج داده</h2>
      <p>خروجی شامل پروژه‌ها، دسته‌ها، برچسب‌ها، تنظیمات و علاقه‌مندی‌هاست. ورود، فایل را با اسکیما می‌سنجد.</p>
      <fieldset><legend>حالت ورود</legend>
        <label><input type="radio" name="import-mode" value="merge"${S.importMode === 'merge' ? ' checked' : ''}> ادغام با کتابخانهٔ فعلی</label>
        <label><input type="radio" name="import-mode" value="replace"${S.importMode === 'replace' ? ' checked' : ''}> جایگزینی کامل</label>
      </fieldset>
      <div class="btn-row"><button type="button" class="btn btn-primary" data-action="export">دریافت خروجی JSON</button><button type="button" class="btn btn-ghost" data-action="import-pick">وارد کردن فایل JSON</button><button type="button" class="btn btn-ghost btn-danger" data-action="reset">بازنشانی به داده‌های پیش‌فرض</button></div></section>
    <section class="panel"><h2>فایل‌ها و محدودیت‌ها</h2>
      <p>این یک سایت ایستاست و نمی‌تواند فایلی را در مخزن GitHub بنویسد. فایل‌های HTML پروژه‌ها را خودتان در پوشهٔ <code>${esc(lib.settings.projectsDir)}</code> بگذارید یا جای دیگری منتشر کنید؛ سپس مسیر یا نشانی‌شان را در فرم وارد کنید. حذف پروژه از داشبورد هرگز فایل یا سایت اصلی را پاک نمی‌کند.</p></section>
  </div>`;
}

function renderMain() {
  const { name, id } = S.route;
  let html; let count = null;
  if (name === 'home') { html = renderHome(); count = allProjects().length; }
  else if (name === 'settings') html = renderSettings();
  else { const r = renderList(); html = r.html; count = r.count; }
  const cat = name === 'category' ? S.catMap.get(id) : null;
  const title = cat ? cat.label : TITLES[name] || 'داشبورد';
  $('#page-title').textContent = title;
  const pill = $('#page-count');
  pill.hidden = count == null;
  if (count != null) pill.textContent = `${faNumber(count)} پروژه`;
  document.title = `${title} | ${S.library.settings.siteTitle}`;
  $('#main').innerHTML = html;
}

function navLink(item, href, current, inner, extra = '') {
  return `<a class="nav-link" href="${href}" data-nav${current ? ' aria-current="page"' : ''}>${inner}${extra}</a>`;
}

function renderSidebar() {
  const vis = allProjects();
  const counts = categoryCounts(vis);
  const favCount = vis.filter((p) => isFav(p.id)).length;
  const cur = S.route.name;
  $('#nav-main').innerHTML = NAV_MAIN.map((s) => navLink(s, toQuery(s.state), cur === s.id, `${icon(s.icon)}<span>${esc(s.label)}</span>`)).join('');
  $('#nav-lib').innerHTML = NAV_LIB.map((s) => navLink(s, toQuery(s.state), cur === s.id, `${icon(s.icon)}<span>${esc(s.label)}</span>`, s.id === 'favorites' && favCount ? `<span class="count">${faNumber(favCount)}</span>` : '')).join('');
  const cats = S.library.categories.filter((c) => !c.hidden || (cur === 'category' && S.route.id === c.id));
  $('#nav-categories').innerHTML = cats.length
    ? cats.map((c) => navLink(c, toQuery({ category: c.id }), cur === 'category' && S.route.id === c.id, `${iconFromSpec(c.icon)}<span>${esc(c.label)}</span>`, `<span class="count">${faNumber(counts.get(c.id) || 0)}</span>`)).join('')
    : '<p class="nav-empty">هنوز دسته‌ای ندارید.</p>';
  $('#manage-cats-btn').hidden = !isManage();
}

function renderStorageNotice() {
  const msgs = [...S.notices];
  if (!storage.isPersistent()) msgs.push('ذخیره‌سازی مرورگر (localStorage) در دسترس نیست؛ تغییرات فقط تا بستن این صفحه می‌مانند. با «دریافت خروجی JSON» نسخهٔ پشتیبان بگیرید.');
  if (S.storageIssue) msgs.push('ذخیرهٔ آخرین تغییر در مرورگر ناموفق بود (ممکن است فضا پر باشد).');
  const n = $('#storage-notice');
  n.hidden = !msgs.length;
  n.textContent = msgs.join(' ');
}

/* ---------- ذخیره و تغییر کتابخانه ---------- */
function commit(lib) {
  S.library = lib; S.source = 'local';
  const ok = storage.saveLibraryStore(lib);
  S.storageIssue = !ok;
  if (!ok) toast('ذخیره در مرورگر ممکن نبود؛ تغییرات تا بستن صفحه می‌ماند.', 'error');
  renderStorageNotice();
  indexLibrary();
  onLocationChange({ syncInput: false }); // اگر دستهٔ انتخاب‌شده حذف شده باشد به حالت امن برمی‌گردد
}

function addProject() {
  openProjectForm({ library: S.library, defaultCategory: S.route.name === 'category' ? S.route.id : '', onSave: afterSave });
}
function editProject(id) {
  const p = findProject(id);
  if (p) openProjectForm({ library: S.library, project: p, onSave: afterSave });
}
function afterSave(lib, saved, info) {
  commit(lib);
  toast(info.editing ? `تغییرات «${saved.title}» ذخیره شد.` : `«${saved.title}» اضافه شد.`);
  if (info.insecure) toast('این نشانی http است و ایمن نیست؛ اگر ممکن است از https استفاده کنید.');
  const l = saved.entry.localPath && saved.launchTarget !== 'deployed' ? resolveLaunch(saved) : null;
  if (l) checkLocalFile(l.url).then((ok) => { if (ok === false) toast(`پروژه ذخیره شد، اما فایل «${saved.entry.localPath}» هنوز پیدا نمی‌شود. فایل را در پوشهٔ پروژه‌ها بگذارید.`, 'error'); });
}
async function deleteProject(id) {
  const p = findProject(id);
  if (!p) return;
  const ok = await confirmDialog({
    title: 'حذف پروژه از داشبورد', confirmLabel: 'حذف از داشبورد', danger: true,
    body: `<p>پروژهٔ «<strong>${esc(p.title)}</strong>» از داشبورد حذف شود؟</p><p class="muted">فقط ورودی این پروژه پاک می‌شود. فایل HTML یا سایت اصلی حذف نمی‌شود.</p>`,
  });
  if (!ok) return;
  S.user.favorites = S.user.favorites.filter((x) => x !== id);
  S.user.recent = S.user.recent.filter((r) => r.id !== id);
  saveUser();
  commit(L.deleteProject(S.library, id));
  toast(`«${p.title}» از داشبورد حذف شد.`);
}
function manageCategories() {
  openCategoryManager({ getLibrary: () => S.library, onChange: (lib) => commit(lib) });
}

/* ---------- اقدام‌ها ---------- */
function toggleFav(id) {
  const on = !isFav(id);
  S.user.favorites = on ? [...S.user.favorites, id] : S.user.favorites.filter((x) => x !== id);
  saveUser();
  document.querySelectorAll(`.fav-btn[data-id="${CSS.escape(id)}"]`).forEach((b) => { b.setAttribute('aria-pressed', String(on)); b.innerHTML = icon(on ? 'heartFilled' : 'heart'); });
  renderSidebar();
  if (S.route.name === 'favorites' && !on) renderMain();
  return on;
}

function recordRecent(id) {
  S.user.recent = [{ id, at: Date.now() }, ...S.user.recent.filter((r) => r.id !== id)].slice(0, 20);
  saveUser();
  S.stale = true;
}

function openInTab(p) {
  const target = resolveLaunch(p);
  if (!target) { toast('برای این پروژه نشانی معتبری ثبت نشده است.', 'error'); return; }
  const a = document.createElement('a');
  a.href = target.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.append(a); a.click(); a.remove();
  recordRecent(p.id);
  toast(`«${p.title}» در تب جدید باز شد.`);
}

function launchProject(id) {
  const p = findProject(id);
  if (!p) return;
  if (p.previewMode === 'iframe' && resolveLaunch(p)) { recordRecent(id); live.open(p); } else openInTab(p);
}

function showDetails(id) { const p = findProject(id); if (p) details.open(p); }

function doExport() {
  downloadJson(buildExport(S.library, S.user), `project-deck-${new Date().toISOString().slice(0, 10)}.json`);
  toast('فایل خروجی ساخته شد.');
}

function doReset() {
  confirmDialog({ title: 'بازنشانی داده‌ها', confirmLabel: 'بازنشانی', danger: true, body: '<p>تغییرات ذخیره‌شده در این مرورگر حذف و <code>data/projects.json</code> دوباره بارگذاری می‌شود. علاقه‌مندی‌ها حفظ می‌شوند.</p>' })
    .then((ok) => { if (ok) { storage.clearLibraryStore(); location.reload(); } });
}

async function onImportFile(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const { library, warnings, favorites } = await readImportFile(file);
    const replace = S.importMode === 'replace';
    S.lastWarnings = warnings; S.loadError = null;
    if (favorites) { S.user.favorites = replace ? favorites : [...new Set([...S.user.favorites, ...favorites])]; saveUser(); }
    commit(replace ? library : mergeLibraries(S.library, library));
    await applyLibrary();
    toast(`ورود انجام شد: ${faNumber(library.projects.length)} پروژه خوانده شد.`);
  } catch (err) {
    toast(err.message || 'ورود فایل ناموفق بود.', 'error');
  }
}

/* ---------- صدای محیطی (پیش‌فرض خاموش) ---------- */
function paintAudio(on) {
  const btn = $('#audio-btn'); const label = S.library.settings.ambientAudio.label;
  btn.setAttribute('aria-pressed', String(on));
  btn.setAttribute('aria-label', on ? `توقف ${label}` : `پخش ${label}`);
  btn.title = btn.getAttribute('aria-label');
  btn.innerHTML = icon(on ? 'music' : 'mute');
}
function stopAudio() { if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); audio = null; } }
function setupAudio() {
  const cfg = S.library.settings.ambientAudio;
  if (audioSrc !== cfg.src) { stopAudio(); audioSrc = cfg.src; }
  $('#audio-btn').hidden = !cfg.src;
  paintAudio(Boolean(audio && !audio.paused));
}
async function toggleAudio() {
  if (audio && !audio.paused) { audio.pause(); paintAudio(false); return; }
  if (!audio) { audio = new Audio(); audio.loop = true; audio.volume = 0.35; audio.preload = 'none'; audio.src = audioSrc; }
  try { await audio.play(); paintAudio(true); } catch { stopAudio(); paintAudio(false); toast('فایل صوتی پیدا یا پخش نشد. فایل را در assets/audio/ قرار دهید.', 'error'); }
}

/* ---------- منوها ---------- */
function setSidebar(open) {
  $('#app').classList.toggle('sidebar-open', open);
  $('#menu-btn').setAttribute('aria-expanded', String(open));
  $('#scrim').hidden = !open;
  $('#sidebar').inert = mq.matches && !open;
}
function setMenu(open, focusFirst = false) {
  $('#data-btn').setAttribute('aria-expanded', String(open));
  $('#data-menu').hidden = !open;
  if (open && focusFirst) $('#data-menu [role^="menuitem"]')?.focus();
}
function paintManage() {
  const t = $('#manage-toggle');
  t.setAttribute('aria-checked', String(isManage()));
  t.textContent = `حالت مدیریت: ${isManage() ? 'روشن' : 'خاموش'}`;
}
function toggleManage(on = !isManage()) {
  S.user.prefs.manage = on; saveUser(); paintManage();
  onLocationChange({ syncInput: false });
}

/* ---------- رویدادها ---------- */
const onSearch = debounce(() => {
  const q = $('#search-input').value;
  S.query = q;
  $('#search-clear').hidden = !q;
  if (['home', 'settings'].includes(S.route.name) && q.trim()) go({ view: 'library', category: '' }, { focus: false });
  else { history.replaceState(null, '', urlFor(currentState())); renderMain(); }
}, 140);

function clearFilters({ keepTag = false } = {}) {
  S.query = ''; if (!keepTag) S.tag = '';
  $('#search-input').value = ''; $('#search-clear').hidden = true;
  history.replaceState(null, '', urlFor(currentState()));
  renderMain();
}

function onClick(e) {
  const nav = e.target.closest('a[data-nav]');
  if (nav && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    history.pushState(null, '', nav.href);
    setMenu(false);
    onLocationChange({ focus: true });
    return;
  }
  const dataMenu = e.target.closest('#data-btn');
  if (dataMenu) { setMenu($('#data-menu').hidden, true); return; }
  if (!e.target.closest('.popover-wrap')) setMenu(false);
  const t = e.target.closest('[data-action]');
  if (!t) return;
  if (t.closest('#data-menu')) setMenu(false);
  const { action, id, tag } = t.dataset;
  switch (action) {
    case 'open': { const p = findProject(id); if (p && p.previewMode === 'new-tab') openInTab(p); else showDetails(id); break; }
    case 'details': showDetails(id); break;
    case 'launch': launchProject(id); break;
    case 'fav': toggleFav(id); break;
    case 'edit': editProject(id); break;
    case 'delete': deleteProject(id); break;
    case 'tag': go({ tag: S.tag === tag ? '' : tag }, { replace: true, focus: false }); $(`#main [data-tag="${CSS.escape(tag)}"]`)?.focus(); break;
    case 'clear-filters': clearFilters(); break;
    case 'add-project': addProject(); break;
    case 'manage-categories': manageCategories(); break;
    case 'toggle-manage': toggleManage(); break;
    case 'export': doExport(); break;
    case 'import-pick': $('#import-input').click(); break;
    case 'reset': doReset(); break;
    default: break;
  }
}

function onChange(e) {
  const t = e.target;
  if (t.id === 'sort-select') { S.user.prefs.sort = t.value; saveUser(); renderMain(); $('#sort-select')?.focus(); }
  else if (t.id === 'manage-check') toggleManage(t.checked);
  else if (t.name === 'import-mode') S.importMode = t.value;
}

function onKey(e) {
  if (e.key === 'Escape') {
    if (!$('#data-menu').hidden) { setMenu(false); $('#data-btn').focus(); }
    if ($('#app').classList.contains('sidebar-open')) setSidebar(false);
    if (e.target.id === 'search-input' && e.target.value) clearFilters({ keepTag: true });
  }
  const menu = $('#data-menu');
  if (!menu.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    const items = [...menu.querySelectorAll('[role^="menuitem"]')];
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    e.preventDefault();
  }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && !document.querySelector('dialog[open]')) { e.preventDefault(); $('#search-input').focus(); }
}

function bindEvents() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKey);
  document.addEventListener('error', (e) => { // تصویر پوشش خراب یا ناموجود: حذف می‌شود تا گرادیان و آیکون دیده شود
    const el = e.target;
    if (el instanceof HTMLImageElement && el.hasAttribute('data-cover-img')) el.remove();
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && S.stale) { S.stale = false; if (['home', 'recent'].includes(S.route.name)) renderMain(); }
  });
  window.addEventListener('popstate', () => onLocationChange({ focus: false }));
  $('#search-input').addEventListener('input', onSearch);
  $('#search-form').addEventListener('submit', (e) => e.preventDefault());
  $('#search-clear').addEventListener('click', () => { clearFilters({ keepTag: true }); $('#search-input').focus(); });
  $('#menu-btn').addEventListener('click', () => setSidebar(!$('#app').classList.contains('sidebar-open')));
  $('#scrim').addEventListener('click', () => setSidebar(false));
  $('#audio-btn').addEventListener('click', toggleAudio);
  $('#import-input').addEventListener('change', onImportFile);
  mq.addEventListener('change', () => setSidebar(false));
}

boot().catch((err) => {
  console.error(err);
  $('#main').innerHTML = noticeHtml('خطای غیرمنتظره', esc(err?.message || 'برنامه راه‌اندازی نشد.'));
});
