# Cheat Sheet تکمیل `data/projects.json`

بررسی کردم. ساختار فایل منظم است و برای داشبورد Project Deck لازم نیست همه‌ی `null`ها را پر کنی. نکته‌ی مهم این است که بین فیلد ضروری، فیلد اختیاری و فیلد وابسته به نوع پروژه تفاوت بگذاریم.

هدف این راهنما این است که هنگام اضافه‌کردن هر پروژه‌ی جدید، فقط اطلاعات لازم را وارد کنی و بقیه‌ی تنظیمات را با پیش‌فرض‌های منطقی مدیریت کنی.

## ۱. معنی مقادیر خالی

| مقدار   | معنی                 | چه زمانی استفاده شود؟                                  |
| ------- | -------------------- | ------------------------------------------------------ |
| `null`  | مقدار تعریف نشده است | وقتی مقدار اختیاری است یا هنوز مشخص نیست               |
| `""`    | رشته‌ی خالی          | برای متن اختیاری؛ ولی اگر متن لازم است، باید تکمیل شود |
| `[]`    | فهرست خالی           | وقتی هیچ تگ یا گزینه‌ای انتخاب نشده                    |
| `{}`    | شیء خالی             | وقتی تنظیمات سفارشی وجود ندارد                         |
| `false` | غیرفعال              | برای ویژگی‌های منطقی مانند `featured`                  |
| `0`     | عدد صفر              | برای ترتیب نمایش، فقط اگر صفر واقعاً منظور باشد        |

قاعده: `null` را صرفاً برای زیباتر شدن فایل با مقدار ساختگی جایگزین نکن. بعضی `null`ها کاملاً درست‌اند.

## ۲. چک‌لیست تمام فیلدهایی که در فایل تو `null` هستند

این جدول برای پروژه‌های واقعی تو تهیه شده؛ نه فقط ورودی‌های نمونه.

| فیلد                    | پیشنهاد تکمیل                          | اولویت             |
| ----------------------- | -------------------------------------- | ------------------ |
| `entry.deployedUrl`     | اگر پروژه فقط محلی است، `null` بماند   | اختیاری            |
| `entry.localPath`       | اگر پروژه فقط آنلاین است، `null` بماند | وابسته به نوع اجرا |
| `cover.thumbnail`       | مسیر تصویر کاور، در صورت وجود          | پیشنهادی           |
| `cover.gradient`        | آرایه‌ی دو رنگ برای پس‌زمینه‌ی جایگزین | پیشنهادی           |
| `cover.accent`          | رنگ شاخص پروژه مثل `"#3fd8c5"`         | اختیاری            |
| `cover.icon`            | یک شیء شامل `emoji` و `tabler`         | اختیاری            |
| `meta.author`           | نام سازنده یا برند                     | پیشنهادی           |
| `meta.version`          | مثل `"1.0.0"`                          | پیشنهادی           |
| `meta.updatedAt`        | تاریخ آخرین ویرایش واقعی               | پیشنهادی           |
| `meta.language`         | برای محتوای فارسی `"fa"`               | پیشنهادی           |
| `meta.direction`        | برای رابط فارسی `"rtl"`                | پیشنهادی           |
| `meta.status`           | وضعیت واقعی پروژه                      | پیشنهادی           |
| `meta.estimatedMinutes` | زمان تقریبی استفاده، به دقیقه          | پیشنهادی           |
| `meta.custom`           | تنظیمات اختصاصی؛ در نبودشان `{}`       | اختیاری            |

نکته: پیشنهادهای بالا بر اساس معنای فیلدهاست. رفتار دقیق هر فیلد به کد داشبورد بستگی دارد؛ مثلاً ممکن است رابط کاربری برای `thumbnail: null` به‌صورت خودکار از آیکون یا گرادیان استفاده کند.

## ۳. راهنمای آماده برای پرکردن هر فیلد

### A. `entry` — مسیر اجرای پروژه

این بخش مشخص می‌کند داشبورد پروژه را از کجا باز کند.

```
"entry": {
  "localPath": "projects/my-project/index.html",
  "deployedUrl": null
}
```

- `localPath`: مسیر نسبی فایل HTML در مخزن.
- `deployedUrl`: آدرس مستقل پروژه، مثلاً GitHub Pages یا یک سایت مستقرشده.

| وضعیت پروژه         | `localPath` | `deployedUrl` |
| ------------------- | ----------- | ------------- |
| فقط داخل مخزن       | مسیر فایل   | `null`        |
| فقط آنلاین          | `null`      | آدرس واقعی    |
| هم محلی و هم آنلاین | مسیر فایل   | آدرس واقعی    |

نکته: `launchTarget` را نیز متناسب انتخاب کن؛ `local` برای فایل محلی و `deployed` برای نسخه‌ی آنلاین. اگر از `auto` استفاده می‌کنی، رفتار آن را با کد داشبورد تطبیق بده.

### B. `cover` — کاور و ظاهر کارت

[VendGogh | Vending Management Software](https://images.openai.com/static-rsc-4/anD-m4rTvkBWKCYASy6CZ4Bi7iUlqyqmMFvNsCkGWqM1FDn7IHSbREkMb0AWUAxzYUOsB_ckmTFXdHyUsviZDz94QKbwwF_wc1jKoHgjDcqudTIPSoQEzGy13eEy3NprSSEpBZvs9a-JcYmJylHZdY7gfomQknLzE1YN2HBZn1A?purpose=inline)

`thumbnail` — تصویر کاور

اگر تصویر اختصاصی نداری، `null` بماند. اگر داری، مسیر نسبی آن را ثبت کن.

```
"thumbnail": "assets/covers/my-project.webp"
```

`gradient` — پس‌زمینه‌ی جایگزین

دو رنگ HEX برای گرادیان. اگر تصویر کاور نداری، این گزینه مفید است.

```
"gradient": ["#3fd8c5", "#5b4fd6"]
```

`accent` — رنگ شاخص

بهتر است با رنگ دسته‌ی پروژه هماهنگ باشد. اگر داشبورد رنگ دسته را به‌صورت خودکار اعمال می‌کند، ممکن است نیازی به این فیلد نباشد.

```
"accent": "#8b7cff"
```

`cover.icon` یک شیء است، نه یک رشته‌ی ساده:

```
"icon": {
  "emoji": "🧭",
  "tabler": "compass"
}
```

اگر آیکون اختصاصی تعیین نمی‌کنی، `null` بگذار؛ ولی اگر می‌خواهی کارت حتی بدون تصویر هویت بصری داشته باشد، ایموجی و آیکون متناسب انتخاب کن. نام آیکون باید در Sprite پروژه موجود باشد.

### C. `meta` — مشخصات پروژه

| فیلد               | قالب پیشنهادی           | مثال           |
| ------------------ | ----------------------- | -------------- |
| `version`          | نسخه‌ی معنایی           | `"1.0.0"`      |
| `author`           | سازنده یا برند واقعی    | `"Pouria"`     |
| `createdAt`        | تاریخ ایجاد             | `"2026-10-16"` |
| `updatedAt`        | تاریخ آخرین تغییر واقعی | `"2026-10-16"` |
| `language`         | کد زبان                 | `"fa"`         |
| `direction`        | جهت رابط                | `"rtl"`        |
| `status`           | وضعیت قابل فهم          | `"آزمایشی"`    |
| `estimatedMinutes` | عدد صحیح دقیقه          | `3`            |
| `notes`            | یادداشت داخلی           | `""`           |
| `custom`           | تنظیمات اضافه           | `{}`           |

نکات مهم:

- `version`: برای پروژه‌ی تازه می‌توانی از `"0.1.0"` شروع کنی؛ برای نسخه‌ی پایدار و منتشرشده معمولاً `"1.0.0"` مناسب است.
- `author`: نام واقعی سازنده، برند یا نامی که می‌خواهی نمایش داده شود؛ اگر مشخص نیست، `null` بماند.
- `language`: برای پروژه‌های فارسی `"fa"` و برای انگلیسی `"en"`.
- `direction`: برای رابط راست‌چین `"rtl"` و برای چپ‌چین `"ltr"`.
- `estimatedMinutes`: زمان تقریبی استفاده‌ی کاربر است، نه مدت ساخت پروژه.
- `status`: مقادیر نمونه‌ی فایل شامل `"نمونه"` و `"پیش‌نویس"` است. اگر کد داشبورد وضعیت‌های مشخصی را انتظار دارد، از همان فهرست استفاده کن.
- `custom`: تا وقتی ساختار مشخصی برای اطلاعات اختصاصی تعریف نکرده‌ای، همان `{}` بماند.

## ۴. پیشنهاد تکمیل سه پروژه‌ی واقعی تو

برای این سه پروژه، مقادیر زیر یک نقطه‌ی شروع مناسب هستند. مدت استفاده، نسخه و برچسب‌ها را بر اساس محتوای واقعی بررسی کن.

[War Concept. Military silhouettes fighting scene on war fog sky background, World War Soldiers Silhouette Below Cloudy Skyline At night. Battle in ruined city.](https://images.openai.com/static-rsc-4/7c28OTb9Kke93ZF_Iw-oMyQEP0wFb4xd9_CO6D8f8-A0SXX_hGRNkOxqnvyalx0eaMW0nH99_tryyH1ndCW6LkKkVPl3Z8cgp21KRrGOfdHF50q7MMVRbiScPg3VH4YjSULOLUnMwe2xh4Es_FSIa0tcsVhwYREjkJoJF3ku6Zh3X0KoeA65DJHDj_dHeUHv?purpose=inline)

ارادۀ جنگیدن

`project-mv9ek39c` · نمونه‌ی تعاملی / محتوای روایی

```
"subtitle": "نقش اراده و تعهد در نتیجۀ نبردها",
"tags": ["interactive", "persian", "education"],
"gradient": ["#26334d", "#8b7cff"],
"accent": "#8b7cff",
"icon": {
  "emoji": "⚔️",
  "tabler": "swords"
}
```

در `meta`: زبان `fa`، جهت `rtl`، نسخه‌ی اولیه `0.1.0`، وضعیت «آزمایشی». زمان را بعد از آزمایش تعیین کن.

[Product Illustration :: Behance](https://images.openai.com/static-rsc-4/zbylxJyg3JvRUd7Ms6XJ_DnEooqJxcXbj74Za8O-lnt3jZucxBD1GOKR4Egixt87VP5OZ8acmbxez4kB-3GpQ5FXJ4-FwQMPlTUO_ZuSe8ETHbmA05DwYjtX-ppWTC9ICX8VUW8-253_bcwXyRTnlSdPh0tYeTREaKYQU31xzsQ?purpose=inline)

شبیه‌سازی‌های مالی

`project-mv9exouw` · بازی‌ها و تجربه‌های آموزشی مالی

```
"subtitle": "پنج بازی تعاملی برای درک مفاهیم پول و اقتصاد",
"tags": ["interactive", "persian", "finance", "education"],
"gradient": ["#123c4a", "#3fd8c5"],
"accent": "#3fd8c5",
"icon": {
  "emoji": "💰",
  "tabler": "chart-donut"
}
```

در `meta`: زبان `fa`، جهت `rtl`، نسخه‌ی اولیه `0.1.0`، وضعیت «آزمایشی». اگر بازی‌ها مستقل اجرا می‌شوند، زمان را برای کل مجموعه یا هر تجربه مطابق رفتار واقعی داشبورد مشخص کن.

[bandar abbas attractions Sepahran's blog](https://images.openai.com/static-rsc-4/N9DJpGRA87taU9-rVhvbaX53ETIWoIZ-z5vbTcse-wvCpYycFOioBwFUgbWKVsR1mqHOfGd7BHkqvqFozUeu2ziW6xCaU77t3Bp7-pPJF4XGsQzUk2eB14W11oFpmmfSz3e1I9f-i7esQgLvD-sJ9D5gsKBBWsvKdQSsjlqY23o?purpose=inline)

عمارت کلاه‌فرنگی بندرعباس

`project-mvauywda` · نمونه‌ی انیمیشن HTML و GSAP

```
"subtitle": "نمونه‌ی موشن‌گرافیک روایی با HTML و GSAP",
"tags": ["interactive", "persian", "experiment"],
"gradient": ["#17344d", "#c4e86b"],
"accent": "#c4e86b",
"icon": {
  "emoji": "🎬",
  "tabler": "movie"
}
```

در `meta`: زبان `fa`، جهت `rtl`، نسخه‌ی اولیه `0.1.0`، وضعیت «آزمایشی». `estimatedMinutes` را بر اساس زمان تماشای انیمیشن پر کن.

این مقادیر برای نمایش کارت‌ها پیشنهاد شده‌اند؛ قبل از استفاده، مطمئن شو نام آیکون‌ها در Sprite وجود دارند و برچسب‌ها واقعاً با محتوای پروژه منطبق‌اند.

## ۵. چک‌لیست قبل از ثبت هر پروژه

### آماده‌سازی پروژه

0 از 10

شناسه

id یکتا و بدون فاصله است.

عنوان و توضیح

title مشخص است؛ subtitle و description محتوای واقعی را معرفی می‌کنند.

دسته‌بندی

categoryId دقیقاً با یکی از دسته‌های تعریف‌شده تطابق دارد.

برچسب‌ها

tags فقط شامل شناسه‌های موجود در آرایه‌ی tags هستند.

مسیر اجرا

localPath یا deployedUrl معتبر و متناسب با launchTarget است.

نمایش

thumbnail، gradient یا icon برای کارت در نظر گرفته شده است.

زبان و جهت

language و direction با رابط واقعی هماهنگ‌اند.

وضعیت و نسخه

status، version و تاریخ‌ها واقع‌بینانه هستند.

ترتیب و برجسته‌سازی

sortOrder و featured آگاهانه تعیین شده‌اند.

آزمایش

پروژه از داخل داشبورد و در اندازه‌ی موبایل آزمایش شده است.

پاک‌کردن تیک‌هاکپی چک‌لیست

## ۶. الگوی نهایی پیشنهادی برای پروژه‌ی جدید

این الگو را کپی کن و فقط مقادیر موردنیاز را عوض کن:

```

{
  "id": "my-new-project",
  "title": "عنوان پروژه",
  "subtitle": "توضیح کوتاه و کاربردی",
  "description": "این پروژه چه کاری انجام می‌دهد و چه چیزی به کاربر می‌آموزد؟",
  "categoryId": "prototypes",
  "tags": ["interactive", "persian"],
  "entry": {
    "localPath": "projects/my-new-project/index.html",
    "deployedUrl": null
  },
  "launchTarget": "local",
  "previewMode": "iframe",
  "cover": {
    "thumbnail": null,
    "gradient": ["#17344d", "#3fd8c5"],
    "accent": "#3fd8c5",
    "icon": {
      "emoji": "🧩",
      "tabler": "puzzle"
    }
  },
  "featured": false,
  "visibility": "visible",
  "sortOrder": 10,
  "meta": {
    "version": "0.1.0",
    "author": "نام سازنده",
    "createdAt": "2026-10-16",
    "updatedAt": "2026-10-16",
    "language": "fa",
    "direction": "rtl",
    "status": "آزمایشی",
    "estimatedMinutes": 3,
    "notes": "",
    "custom": {}
  }
}

```

این یک الگوی شروع است، نه تضمین سازگاری با تمام قواعد اعتبارسنجی داشبورد؛ مخصوصاً `previewMode`، `launchTarget` و `status` باید با پیاده‌سازی فعلی هماهنگ باشند.

پیشنهاد مهم برای معماری Project Deck: برای کاهش کار دستی، در مرحله‌ی بعد می‌توان یک پیش‌فرض خودکار تعریف کرد که هنگام افزودن پروژه‌ی فارسی، `language` را `fa`، `direction` را `rtl` و `cover.accent` را از رنگ دسته دریافت کند. فقط اطلاعات واقعاً اختصاصی مثل عنوان، توضیح، مسیر، تگ‌ها و زمان استفاده را دستی وارد می‌کنی. این کار بهتر از آن است که هر بار تمام `null`ها را اجباری پر کنی.