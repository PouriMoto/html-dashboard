/* اگر ماژول‌ها لود نشوند (مثلاً با file://) همین پیام دیده می‌شود؛ app.js پس از بوت موفق آن را پنهان می‌کند. */
(function () {
  if (location.protocol === 'file:') {
    var n = document.getElementById('boot-notice');
    n.hidden = false;
    n.textContent = 'این صفحه با file:// باز شده است و مرورگر ماژول‌های جاوااسکریپت و خواندن JSON را مسدود می‌کند. پوشهٔ پروژه را با یک سرور ایستا اجرا کنید (راهنما در README.md).';
  }
})();
