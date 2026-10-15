/* کنترل مشترک تم (خودکار/روشن/تاریک) و اندازه‌ی فونت — برای همه‌ی بازی‌ها */
(function(){
var H=document.documentElement,REM=H.hasAttribute('data-rem');
function get(k,d){try{var v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}}
function set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
var theme=get('fc_theme','auto'),fs=parseInt(get('fc_fs','19'))||19;
function clampFs(v){return Math.max(17,Math.min(28,v))}
function applyTheme(){if(theme=='auto')H.removeAttribute('data-theme');else H.setAttribute('data-theme',theme);
 try{if(typeof CUR!=='undefined'&&typeof paint=='function')paint(CUR<0?-1:CUR)}catch(e){}
 try{if(typeof theme_=='function')theme_()}catch(e){}}
function applyFs(){fs=clampFs(fs);if(REM)H.style.fontSize=fs+'px';else{var a=document.getElementById('app');if(a)a.style.zoom=(fs/19)}
 var l=document.getElementById('fcui-fl');if(l)l.textContent=String(fs).replace(/\d/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'[d]})}
applyTheme();
if(REM)H.style.fontSize=fs+'px';
function build(){
 var st=document.createElement('style');st.textContent='#fcui-b{position:fixed;left:.7rem;bottom:.7rem;z-index:50;width:46px;height:46px;border-radius:50%;border:2px solid var(--bd,#d9ccb6);background:var(--card,#fff);color:var(--tx,#222);font-size:22px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);opacity:.9}#fcui-p{position:fixed;left:.7rem;bottom:4rem;z-index:50;width:min(300px,calc(100vw - 1.4rem));background:var(--card,#fff);color:var(--tx,#222);border:2px solid var(--bd,#d9ccb6);border-radius:16px;padding:12px 14px;font:16px/1.8 inherit;font-family:inherit;box-shadow:0 4px 16px rgba(0,0,0,.25);display:none;direction:rtl}#fcui-p.on{display:block}#fcui-p b{display:block;margin:.3rem 0}#fcui-p .r{display:flex;gap:.4rem;align-items:center}#fcui-p button{flex:1;min-height:44px;border-radius:12px;border:2px solid var(--bd,#d9ccb6);background:var(--bb,#f1e9da);color:inherit;font:inherit;font-weight:700;cursor:pointer}#fcui-p button.s{background:var(--ac,#d98a2b);color:#fff;border-color:var(--ac,#d98a2b)}#fcui-p span{min-width:2.4rem;text-align:center}';
 document.head.appendChild(st);
 var b=document.createElement('button');b.id='fcui-b';b.type='button';b.setAttribute('aria-label','تنظیمات نمایش');b.textContent='⚙️';
 var p=document.createElement('div');p.id='fcui-p';
 p.innerHTML='<b>🎨 نمایش</b><div class="r" id="fcui-t"><button data-t="auto">خودکار</button><button data-t="light">روشن</button><button data-t="dark">تاریک</button></div><b>🔤 اندازه‌ی نوشته</b><div class="r"><button data-f="-1" aria-label="کوچک‌تر">A−</button><span id="fcui-fl"></span><button data-f="1" aria-label="بزرگ‌تر">A+</button><button data-f="0">اولیه</button></div>';
 document.body.appendChild(b);document.body.appendChild(p);
 function mark(){[].forEach.call(p.querySelectorAll('[data-t]'),function(x){x.className=x.getAttribute('data-t')==theme?'s':''})}
 b.onclick=function(){p.classList.toggle('on')};
 p.onclick=function(e){var t=e.target.getAttribute&&e.target.getAttribute('data-t'),f=e.target.getAttribute&&e.target.getAttribute('data-f');
  if(t){theme=t;set('fc_theme',t);applyTheme();mark()}
  if(f!=null){fs=f=='0'?19:fs+parseInt(f);fs=clampFs(fs);set('fc_fs',fs);applyFs()}};
 document.addEventListener('click',function(e){if(!p.contains(e.target)&&e.target!==b)p.classList.remove('on')});
 mark();applyFs()}
if(document.readyState=='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
