# Project Deck: مشخصات پروژه (مرحلهٔ ۱)

## اصول
- فقط HTML5، CSS3 و Vanilla JS (ماژول ES). بدون بک‌اند، دیتابیس، فریم‌ورک و مرحلهٔ build.
- همهٔ مسیرها نسبی‌اند تا زیرمسیر GitHub Pages کار کند.
- داده‌ها (دسته‌ها، برچسب‌ها، پروژه‌ها) از JSON می‌آیند. هیچ نام دسته‌ای در JS نیست.
- بدون دارایی سفارشی (فونت، آیکون، تصویر، صدا) هم برنامه کامل کار می‌کند.

## اسکیمای کتابخانه (`schemaVersion: 1`)
```jsonc
{
  "schema": "project-deck/library",
  "schemaVersion": 1,
  "settings": {
    "siteTitle": "Project Deck",
    "iconSpritePath": "assets/icons/tabler-sprite.svg",   // اختیاری، مسیر نسبی
    "iconSymbolPrefix": "tabler-",
    "projectsDir": "projects/",                              // پوشهٔ مجاز مسیر پروژه‌ها
    "backgroundImage": "assets/backgrounds/background.webp", // اختیاری
    "ambientAudio": { "src": "assets/audio/ambient.mp3", "label": "..." }  // اختیاری
  },
  "categories": [ { "id" /* slug پایدار */, "label", "description?", "icon?", "accent?", "order?", "hidden?" } ],
  "tags":       [ { "id", "label" } ],
  "projects":   [ /* Project */ ]
}
```

### Project
| فیلد | نوع | توضیح |
|---|---|---|
| `id` | string (الزامی، یکتا) | شناسهٔ پایدار |
| `title` | string | پیش‌فرض: `id` |
| `subtitle`, `description` | string | اختیاری |
| `categoryId` | string | باید در `categories` باشد |
| `tags` | string[] | شناسهٔ برچسب‌ها. برچسب ثبت‌نشده با همان شناسه نمایش داده می‌شود |
| `entry.localPath` | string / null | مسیر نسبی داخل `settings.projectsDir` (پیش‌فرض `projects/`)؛ بدون `/` ابتدایی، `..`، فاصله، بک‌اسلش یا scheme؛ باید به `.html` یا `/` ختم شود. query/hash مجاز است |
| `entry.deployedUrl` | string / null | نشانی کامل `http(s)` با نام میزبان معتبر، بدون نام‌کاربری/رمز |
| `launchTarget` | `auto` / `local` / `deployed` | `auto` یعنی محلی در اولویت، سپس مستقر شده |
| `previewMode` | `thumbnail` / `iframe` / `new-tab` | `thumbnail` (پیش‌فرض): جزئیات با پوشش و اجرا در تب جدید. `iframe`: پیش‌نمایش زنده در پنجره. `new-tab`: اجرای مستقیم در تب جدید. مقدار قدیمی `none` به `thumbnail` تبدیل می‌شود |
| `cover.thumbnail` | string / null | مسیر نسبی داخل `assets/` با پسوند تصویر (png, jpg, webp, svg, gif, avif). تصویر راه‌دور مجاز نیست |
| `cover.gradient` | [hex, hex] | اختیاری |
| `cover.accent` | hex | اختیاری (جایگزین: رنگ دسته) |
| `cover.icon` | `{emoji, tabler}` یا رشته | اختیاری (جایگزین: آیکون دسته) |
| `featured` | boolean | ویژه‌ها در خانه برجسته می‌شوند |
| `visibility` | `visible` / `hidden` | پنهان‌ها فقط با گزینهٔ تنظیمات دیده می‌شوند |
| `sortOrder` | number | ترتیب دستی در مرتب‌سازی «پیشنهادی» |
| `meta` | object | `version, author, createdAt, updatedAt, language, direction, status, estimatedMinutes, notes, custom` (همه اختیاری) |

حذف یا نامعتبر بودن `entry` (هر دو مقدار تهی یا ناامن) یعنی پروژه نادیده گرفته می‌شود و در `warnings` گزارش می‌شود.

### نسخه‌بندی
- `normalizeLibrary()` نسخهٔ جدیدتر از `SCHEMA_VERSION` را رد می‌کند و نسخهٔ قدیمی‌تر را از مسیر `migrate()` ارتقا می‌دهد (در نسخهٔ ۱ فقط جای خالی آماده است).
- خروجی JSON همان اسکیما به‌علاوهٔ `exportedAt` و `userState.favorites` است.

## ذخیره‌سازی (localStorage، پیشوند `projectdeck.v1.`)
| کلید | محتوا |
|---|---|
| `library` | `{ storeVersion: 1, savedAt, library }`. تا اولین تغییر، `data/projects.json` منبع است و بعد از آن این نسخه |
| `library.corrupt` | پشتیبان دادهٔ خراب یا ناسازگار (برای بازیابی دستی) |
| `user` | `{ version, favorites[], recent[{id,at}], prefs{sort, manage} }` |

اگر localStorage در دسترس نباشد، همان‌ها تا بستن صفحه در حافظه می‌مانند.

## نشانی‌ها (URLSearchParams + History API)
`?` (داشبورد) · `?view=library|favorites|recent|settings` · `?category=<slug>` · پارامترهای `search` و `tag` با همهٔ آن‌ها ترکیب می‌شوند. تغییر نمای صفحه `pushState` و تایپ جستجو `replaceState` می‌زند؛ `popstate` وضعیت را از نشانی بازمی‌خواند.

## قرارداد ماژول‌ها
- `utils.js`, `validators.js`, `router.js` ← بدون وابستگی به ماژول‌های دیگر.
- `storage.js`, `categories.js`, `icons.js`, `filters.js` ← فقط `utils.js`.
- `projects.js` ← `categories.js`, `validators.js`, `utils.js`.
- `library.js` (عملیات خالص CRUD) ← `validators.js`. ذخیره نمی‌کند.
- `preview.js`, `manage.js`, `import-export.js` ← `projects.js`, `icons.js`, `library.js`/`validators.js`. فرم‌ها فقط کتابخانهٔ جدید را از طریق callback برمی‌گردانند.
- `app.js` ← همه. فقط `app.js` ذخیره می‌کند و به وضعیت برنامه دست می‌زند.

## سازگاری با مراحل بعدی
- مدیریت از داخل رابط (پیاده‌شده در مرحلهٔ ۲): فرم‌ها با `validators.js` اعتبارسنجی می‌کنند، `library.js` تغییر می‌دهد و `app.js` با `storage.saveLibraryStore()` ذخیره می‌کند.
- حالت‌های اجرای تازه (قاب تمام‌صفحه، همان تب): فیلد `launchMode` را می‌شود بدون تغییر اسکیمای فعلی اضافه کرد؛ فیلدهای ناشناخته نادیده گرفته می‌شوند و نسخهٔ اسکیما بالا می‌رود.
- مجموعه‌ها، پوشه‌ها و تم‌ها: کلیدهای سطح بالای تازه در سند کتابخانه، همراه با یک گام در `migrate()`.

## نسخهٔ ۰٫۲: افزوده‌ها
- **فایل پشتیبان:** سند کتابخانه + `app`, `appVersion`, `exportedAt`, `preferences{sort}`, `userState{favorites}`. هنگام ورود فقط `schema = project-deck/library` و `schemaVersion = 1` پذیرفته می‌شود؛ نسخهٔ دیگر رد می‌شود (مهاجرت خودکار هنوز پیاده نیست).
- **حدها:** حداکثر ۵۰۰ پروژه، ۱۰۰ دسته، ۳۰۰ برچسب، ۵ مگابایت. `meta.custom` فقط مقدارهای ساده و کلیدهای بی‌خطر نگه می‌دارد.
- **ادغام:** پیش‌فرض `keep`؛ `replace` و `copy` (پسوند `-imported`) فقط با انتخاب صریح.
- **نمای مدیر/بازدیدکننده:** بازدیدکننده همیشه `data/projects.json` را می‌بیند؛ مدیر پیش‌نویس `localStorage` را. جلسهٔ مدیر در `sessionStorage` (`projectdeck.v1.admin`) است.
- **`data/auth.json`:** `{ version, algo: "PBKDF2-SHA256", iterations, salt, hash }` (base64). ورودی هش: `phone + "\n" + password` (UTF-8)، شماره به شکل `09xxxxxxxxx`.
- **ماژول‌های تازه:** `auth.js`, `admin.js`, `data-manager.js`, `boot-check.js`.
