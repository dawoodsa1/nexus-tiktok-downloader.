document.addEventListener('DOMContentLoaded', () => {
  const translations = {
    en: {
      switch: 'العربية',
      switchAria: 'Switch to Arabic',
      home: 'Home',
      about: 'About',
      privacy: 'Privacy',
      terms: 'Terms',
      copyright: 'Copyright',
      contact: 'Contact',
      faq: 'FAQ'
    },
    ar: {
      switch: 'English',
      switchAria: 'التبديل إلى الإنجليزية',
      home: 'الرئيسية',
      about: 'من نحن',
      privacy: 'الخصوصية',
      terms: 'الشروط',
      copyright: 'حقوق النشر',
      contact: 'اتصل بنا',
      faq: 'الأسئلة الشائعة'
    }
  };

  const pages = {
    '/about.html': {
      title: { en: 'About TikVideo', ar: 'عن TikVideo' },
      description: {
        en: 'About TikVideo, an independent bilingual TikTok video retrieval tool.',
        ar: 'معلومات عن TikVideo، أداة مستقلة ثنائية اللغة لجلب فيديوهات TikTok.'
      },
      label: { en: 'ABOUT', ar: 'من نحن' }
    },
    '/privacy.html': {
      title: { en: 'Privacy Policy — TikVideo', ar: 'سياسة الخصوصية — TikVideo' },
      description: {
        en: 'TikVideo privacy information: accounts, browser preferences, service requests and technical data.',
        ar: 'معلومات خصوصية TikVideo: الحسابات وتفضيلات المتصفح وطلبات الخدمة والبيانات التقنية.'
      },
      label: { en: 'PRIVACY', ar: 'الخصوصية' }
    },
    '/terms.html': {
      title: { en: 'Terms of Use — TikVideo', ar: 'شروط الاستخدام — TikVideo' },
      description: {
        en: 'TikVideo terms of use for the independent TikTok video retrieval service.',
        ar: 'شروط استخدام خدمة TikVideo المستقلة لجلب فيديوهات TikTok.'
      },
      label: { en: 'TERMS', ar: 'الشروط' }
    },
    '/copyright.html': {
      title: { en: 'Copyright — TikVideo', ar: 'حقوق النشر — TikVideo' },
      description: {
        en: 'TikVideo copyright and content removal information for rights holders.',
        ar: 'معلومات حقوق النشر وطلبات إزالة المحتوى في TikVideo لأصحاب الحقوق.'
      },
      label: { en: 'COPYRIGHT', ar: 'حقوق النشر' }
    },
    '/contact.html': {
      title: { en: 'Contact — TikVideo', ar: 'اتصل بنا — TikVideo' },
      description: {
        en: 'Contact TikVideo for service, privacy and copyright requests.',
        ar: 'تواصل مع TikVideo لطلبات الخدمة والخصوصية وحقوق النشر.'
      },
      label: { en: 'CONTACT', ar: 'اتصل بنا' }
    }
  };

  const page = pages[window.location.pathname] || null;
  const html = document.documentElement;
  const button = document.getElementById('language-switch');
  const storedLanguage = (() => {
    try { return localStorage.getItem('nexus-language'); } catch { return null; }
  })();
  let lang = storedLanguage === 'ar' ? 'ar' : 'en';

  const setText = (selector, key) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = translations[lang][key];
    });
  };

  function applyLanguage() {
    const isArabic = lang === 'ar';
    html.lang = lang;
    html.dir = isArabic ? 'rtl' : 'ltr';
    document.body.dir = isArabic ? 'rtl' : 'ltr';

    document.querySelectorAll('.en').forEach((element) => {
      element.hidden = isArabic;
    });
    document.querySelectorAll('.ar').forEach((element) => {
      element.hidden = !isArabic;
    });

    setText('[data-i18n="home"]', 'home');
    setText('[data-i18n="about"]', 'about');
    setText('[data-i18n="privacy"]', 'privacy');
    setText('[data-i18n="terms"]', 'terms');
    setText('[data-i18n="copyright"]', 'copyright');
    setText('[data-i18n="contact"]', 'contact');
    setText('[data-i18n="faq"]', 'faq');
    document.querySelectorAll('.footer-links a[data-footer-faq="true"]').forEach((link) => {
      link.href = isArabic ? '/ar/faq.html' : '/faq.html';
    });

    if (button) {
      button.textContent = translations[lang].switch;
      button.setAttribute('aria-label', translations[lang].switchAria);
    }

    if (page) {
      document.title = page.title[lang];
      const description = document.querySelector('meta[name="description"]');
      if (description) description.setAttribute('content', page.description[lang]);
      const label = document.querySelector('[data-page-label]');
      if (label) label.textContent = page.label[lang];
    }
  }

  button?.addEventListener('click', () => {
    lang = lang === 'ar' ? 'en' : 'ar';
    try { localStorage.setItem('nexus-language', lang); } catch {}
    applyLanguage();
  });

  applyLanguage();
});
