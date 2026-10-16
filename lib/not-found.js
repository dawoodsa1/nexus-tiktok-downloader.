export const NOT_FOUND_HEADERS = Object.freeze({
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex'
});

// Only the language depends on the request; never echo an untrusted URL into HTML.
export function notFoundPage(pathname) {
  const ar = pathname === '/ar' || pathname.startsWith('/ar/');
  const home = ar ? '/ar/' : '/';
  const prefix = ar ? '/ar' : '';
  const title = ar ? 'الصفحة غير موجودة' : 'Page not found';
  const links = [
    ['about', ar ? 'من نحن' : 'About'],
    ['privacy', ar ? 'الخصوصية' : 'Privacy'],
    ['faq', ar ? 'الأسئلة الشائعة' : 'FAQ'],
    ['terms', ar ? 'الشروط' : 'Terms'],
    ['copyright', ar ? 'حقوق النشر' : 'Copyright'],
    ['contact', ar ? 'اتصل بنا' : 'Contact']
  ];
  return `<!DOCTYPE html>
<html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="#f6f7f9">
<title>404 — ${title} | TikVideo</title>
<link rel="icon" href="/favicon.ico?v=brand3" type="image/x-icon">
<link rel="apple-touch-icon" href="/icons/icon-180.png?v=brand3">
<link rel="stylesheet" href="/legal.css?v=fonts1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
<style>
.legal-shell{min-height:100svh;display:flex;flex-direction:column}
.not-found{width:100%;max-width:640px;text-align:center;margin:clamp(24px,7vh,72px) auto;padding:clamp(24px,6vw,48px)}
.not-found .error-code{font-size:clamp(4rem,20vw,7rem);line-height:1;font-weight:800;color:#087c78;margin:0 0 20px}
.not-found h1{font-size:clamp(1.5rem,5vw,2rem);line-height:1.5}
.not-found p{max-width:440px;margin:12px auto 24px}
.home-link{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 22px;border-radius:12px;background:#15171a;color:#fff;text-decoration:none;font-weight:700}
.not-found .help-links{display:flex;justify-content:center;flex-wrap:wrap;gap:8px 24px;margin-top:16px}
.help-links a{display:inline-flex;align-items:center;min-height:44px;color:#444950}
</style>
</head>
<body class="${ar ? 'ar' : 'en'}"><div class="legal-shell">
<header class="legal-header">
<a class="brand" href="${home}" aria-label="${ar ? 'الصفحة الرئيسية' : 'Home'}">TIKVIDEO</a>
<a class="language-switch" href="${ar ? '/' : '/ar/'}" lang="${ar ? 'en' : 'ar'}" aria-label="${ar ? 'Switch to English' : 'التبديل إلى العربية'}">${ar ? 'English' : 'العربية'}</a>
</header>
<main class="card not-found">
<p class="error-code" aria-hidden="true">404</p>
<h1>${title}</h1>
<p>${ar ? 'قد يكون الرابط غير صحيح أو أن الصفحة نُقلت. يمكنك العودة إلى الصفحة الرئيسية أو زيارة الروابط التالية.' : 'The link may be incorrect or the page may have moved. Return to the homepage or use the links below.'}</p>
<a class="home-link" href="${home}">${ar ? 'العودة إلى الرئيسية' : 'Back to homepage'}</a>
<nav class="help-links" aria-label="${ar ? 'روابط للمساعدة' : 'Help links'}">
<a href="${prefix}/faq">${ar ? 'الأسئلة الشائعة' : 'Frequently asked questions'}</a>
<a href="${prefix}/contact">${ar ? 'اتصل بنا' : 'Contact us'}</a>
</nav>
</main>
<footer class="app-footer"><div class="footer-inner">
<div class="footer-brand">TIKVIDEO <span>TIKTOK DOWNLOADER</span></div>
<nav class="footer-links" aria-label="${ar ? 'معلومات الموقع' : 'Site information'}">${links.map(([path, label]) => `<a href="${prefix}/${path}">${label}</a>`).join('')}</nav>
</div></footer>
</div></body></html>`;
}
