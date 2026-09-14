document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('extract-form');
  const urlInput = document.getElementById('url-input');
  const submitBtn = document.getElementById('submit-btn');
  const pasteBtn = document.getElementById('paste-btn');
  const clearBtn = document.getElementById('clear-btn');
  const languageBtn = document.getElementById('language-btn');
  const statusCard = document.getElementById('status-card');
  const statusText = document.getElementById('status-text');
  const errorCard = document.getElementById('error-card');
  const errorMessage = document.getElementById('error-message');
  const resultSection = document.getElementById('result-section');
  const resThumbnail = document.getElementById('res-thumbnail');
  const resDuration = document.getElementById('res-duration');
  const resAvatar = document.getElementById('res-avatar');
  const resAuthorName = document.getElementById('res-author-name');
  const resAuthorUser = document.getElementById('res-author-user');
  const resTitle = document.getElementById('res-title');
  const downloadStd = document.getElementById('download-standard-btn');
  const downloadHd = document.getElementById('download-hd-btn');

  const translations = {
    en: {
      ready:'Ready', heroBadge:'FAST • CLEAN • PRIVATE', heroTitle:'Download TikTok videos with ease', heroSubtitle:'Download TikTok videos without a watermark. Just paste the link and let TikVideo handle the rest.', paste:'Paste', clear:'Clear', getVideo:'Get Video', retrieving:'Retrieving...', trust1:'No registration', trust2:'Fast processing', trust3:'Mobile friendly', resultTitle:'Your video is ready', downloadMp4:'Download MP4', downloadHd:'Download HD MP4', footerText:'A modern, fast and simple video downloading experience.', placeholder:'Paste TikTok URL...', creator:'Creator', user:'@user', description:'Video Description', clipboardUnavailable:'Clipboard access is not available.', clipboardEmpty:'Clipboard is empty.', clipboardManual:'Unable to read the clipboard. Please paste the TikTok URL manually.', enterUrl:'Please enter a TikTok URL.', tooLong:'The URL is too long.', invalidUrl:'Please enter a valid TikTok URL.', session:'Creating secure session...', retrievingInfo:'Retrieving video information...', serverToken:'The server did not return a valid session token.', unexpected:'Server returned an unexpected response', invalidJson:'The server returned invalid JSON.', requestFailed:'Request failed', noVideo:'The video could not be retrieved.', noDownload:'The server did not provide a download URL.', readyStatus:'Video ready.', generic:'Unable to retrieve the video. Please try again.', aboutTitle:'A simple TikTok video retrieval tool', aboutText:'TikVideo is a web utility that accepts a TikTok URL, retrieves available video information from its media sources, and presents an available MP4 download option. The service does not require an account.', howTitle:'How it works', howText:'Paste a supported TikTok URL, start the request, review the returned video information, then use the available download option.', privacyTitle:'Privacy by design', privacyText:'The site has no user account system. The selected language is stored locally in the browser, while short-lived service tokens are used for API requests.', copyrightTitle:'Respect copyright', copyrightText:'Only retrieve or download material you are legally entitled to access or use. Rights holders can request review or removal through the site\'s copyright process.', faqTitle:'Frequently asked questions', faq1q:'Do I need an account?', faq1a:'No. The current site does not require registration or a user account to submit a supported URL.', faq2q:'What links are supported?', faq2a:'The service validates HTTPS links from TikTok and supported TikTok short-link hosts. Douyin links are also accepted by the current service.', faq3q:'Is every video guaranteed to download?', faq3a:'No. Availability depends on the source media, network conditions, and the third-party systems used to retrieve the media. The site does not promise that every URL will always work.', faq4q:'Is TikVideo affiliated with TikTok?', faq4a:'No. TikVideo is an independent web tool and is not presented as an official TikTok service.', aboutLink:'About', privacyLink:'Privacy', termsLink:'Terms', copyrightLink:'Copyright', contactLink:'Contact'
    },
    ar: {
      ready:'جاهز', heroBadge:'سريع • نظيف • خاص', heroTitle:'حمّل فيديوهات تيك توك بسهولة', heroSubtitle:'حمّل فيديوهات TikTok بدون علامة مائية. فقط الصق الرابط ودع TikVideo يتولى الباقي.', paste:'لصق', clear:'مسح', getVideo:'جلب الفيديو', retrieving:'جارٍ الجلب...', trust1:'بدون تسجيل', trust2:'معالجة سريعة', trust3:'متوافق مع الهاتف', resultTitle:'الفيديو جاهز', downloadMp4:'تحميل MP4', downloadHd:'تحميل HD MP4', footerText:'تجربة حديثة وسريعة وبسيطة لتحميل الفيديوهات.', placeholder:'الصق رابط تيك توك هنا...', creator:'الناشر', user:'@مستخدم', description:'وصف الفيديو', clipboardUnavailable:'الوصول إلى الحافظة غير متاح.', clipboardEmpty:'الحافظة فارغة.', clipboardManual:'تعذر قراءة الحافظة. الصق رابط تيك توك يدويًا.', enterUrl:'يرجى إدخال رابط تيك توك.', tooLong:'الرابط طويل جدًا.', invalidUrl:'يرجى إدخال رابط تيك توك صالح.', session:'جارٍ إنشاء جلسة آمنة...', retrievingInfo:'جارٍ جلب معلومات الفيديو...', serverToken:'لم يُرجع الخادم رمز جلسة صالحًا.', unexpected:'أعاد الخادم استجابة غير متوقعة', invalidJson:'أعاد الخادم بيانات JSON غير صالحة.', requestFailed:'فشل الطلب', noVideo:'تعذر جلب الفيديو.', noDownload:'لم يُرجع الخادم رابط تحميل.', readyStatus:'الفيديو جاهز.', generic:'تعذر جلب الفيديو. يرجى المحاولة مرة أخرى.', aboutTitle:'أداة بسيطة لجلب فيديوهات تيك توك', aboutText:'TikVideo أداة ويب تستقبل رابط TikTok، وتجلب معلومات الفيديو المتاحة من مصادر الوسائط، ثم تعرض خيار تحميل MP4 عندما يتوفر مصدر صالح. لا تتطلب الخدمة إنشاء حساب.', howTitle:'كيف تعمل الخدمة؟', howText:'الصق رابط TikTok مدعومًا، ابدأ الطلب، راجع معلومات الفيديو التي تم إرجاعها، ثم استخدم خيار التحميل المتاح.', privacyTitle:'الخصوصية في التصميم', privacyText:'لا يحتوي الموقع على نظام حسابات للمستخدمين. تُحفظ اللغة المختارة محليًا في المتصفح، بينما تُستخدم رموز خدمة قصيرة العمر لطلبات API.', copyrightTitle:'احترام حقوق النشر', copyrightText:'استخدم فقط المواد التي يحق لك قانونيًا الوصول إليها أو استخدامها. يمكن لأصحاب الحقوق طلب المراجعة أو الإزالة من خلال آلية حقوق النشر في الموقع.', faqTitle:'الأسئلة الشائعة', faq1q:'هل أحتاج إلى حساب؟', faq1a:'لا. الموقع الحالي لا يتطلب التسجيل أو إنشاء حساب لإرسال رابط مدعوم.', faq2q:'ما الروابط المدعومة؟', faq2a:'تتحقق الخدمة من روابط HTTPS التابعة لـ TikTok ومن نطاقات روابط TikTok المختصرة المدعومة. كما تقبل الخدمة روابط Douyin الحالية.', faq3q:'هل يضمن الموقع تحميل كل فيديو؟', faq3a:'لا. يعتمد توفر التحميل على مصدر الوسائط وحالة الشبكة والأنظمة الخارجية المستخدمة لجلب الوسائط. لا يضمن الموقع عمل كل رابط بشكل دائم.', faq4q:'هل TikVideo تابع لـ TikTok؟', faq4a:'لا. TikVideo أداة ويب مستقلة ولا يتم تقديمها كخدمة رسمية تابعة لـ TikTok.', aboutLink:'من نحن', privacyLink:'الخصوصية', termsLink:'الشروط', copyrightLink:'حقوق النشر', contactLink:'اتصل بنا'
    }
  };

  let lang = localStorage.getItem('nexus-language') || 'en';
  if (!translations[lang]) lang = 'en';
  function t(key) { return translations[lang][key] || translations.en[key] || key; }

  function applyLanguage() {
    const isAr = lang === 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.body.dir = 'ltr';
    languageBtn.textContent = isAr ? 'English' : 'العربية';
    languageBtn.setAttribute('aria-label', isAr ? 'Switch to English' : 'التبديل إلى العربية');
    urlInput.placeholder = t('placeholder');
    urlInput.setAttribute('aria-label', isAr ? 'رابط فيديو تيك توك' : 'TikTok video URL');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.title = isAr ? 'TikVideo — تحميل فيديوهات تيك توك' : 'TikVideo — TikTok Downloader';
    if (!resultSection.classList.contains('hidden')) {
      downloadStd.setAttribute('aria-label', t('downloadMp4'));
      if (!downloadHd.classList.contains('hidden')) downloadHd.setAttribute('aria-label', t('downloadHd'));
    }
  }

  languageBtn.addEventListener('click', () => { lang = lang === 'en' ? 'ar' : 'en'; localStorage.setItem('nexus-language', lang); applyLanguage(); });
  function showError(message) { errorMessage.textContent = message || t('generic'); errorCard.classList.remove('hidden'); }
  function hideError() { errorCard.classList.add('hidden'); errorMessage.textContent = ''; }
  function showStatus(message) { statusText.textContent = message; statusCard.classList.remove('hidden'); }
  function hideStatus() { statusCard.classList.add('hidden'); }
  function resetResult() { resultSection.classList.add('hidden'); resThumbnail.removeAttribute('src'); resAvatar.removeAttribute('src'); resDuration.textContent = ''; resAuthorName.textContent = t('creator'); resAuthorUser.textContent = t('user'); resTitle.textContent = t('description'); downloadStd.removeAttribute('href'); downloadHd.removeAttribute('href'); downloadHd.classList.add('hidden'); }
  function setLoading(loading) { submitBtn.disabled = loading; const buttonText = submitBtn.querySelector('.btn-text'); if (buttonText) buttonText.textContent = loading ? t('retrieving') : t('getVideo'); }
  function isTikTokUrl(value) { try { const parsed = new URL(value); const hostname = parsed.hostname.toLowerCase().replace(/^www\./, ''); const allowedHosts = ['tiktok.com','vm.tiktok.com','vt.tiktok.com','m.tiktok.com','douyin.com','www.douyin.com']; return allowedHosts.some(host => hostname === host || hostname.endsWith(`.${host}`)); } catch { return false; } }
  async function readJson(response) { const contentType = response.headers.get('content-type') || ''; if (!contentType.includes('application/json')) throw new Error(`${t('unexpected')} (${response.status}).`); let data; try { data = await response.json(); } catch { throw new Error(t('invalidJson')); } if (!response.ok) throw new Error(data?.error?.message || `${t('requestFailed')} (${response.status}).`); return data; }

  pasteBtn.addEventListener('click', async () => { hideError(); try { if (!navigator.clipboard?.readText) throw new Error(t('clipboardUnavailable')); const text = await navigator.clipboard.readText(); if (!text) { showError(t('clipboardEmpty')); return; } urlInput.value = text.trim(); urlInput.focus(); } catch (error) { showError(error?.message || t('clipboardManual')); } });
  clearBtn.addEventListener('click', () => { urlInput.value = ''; hideError(); hideStatus(); resetResult(); urlInput.focus(); });

  form.addEventListener('submit', async event => {
    event.preventDefault(); hideError(); resetResult();
    const inputUrl = urlInput.value.trim();
    if (!inputUrl) { showError(t('enterUrl')); urlInput.focus(); return; }
    if (inputUrl.length > 2048) { showError(t('tooLong')); return; }
    if (!isTikTokUrl(inputUrl)) { showError(t('invalidUrl')); urlInput.focus(); return; }
    setLoading(true); showStatus(t('session'));
    try {
      const tokenRes = await fetch('/api/token', { method:'POST', headers:{'Accept':'application/json'}, cache:'no-store' });
      const tokenData = await readJson(tokenRes); const sessionToken = tokenData?.data?.token;
      if (!sessionToken) throw new Error(t('serverToken'));
      showStatus(t('retrievingInfo'));
      const extractRes = await fetch(`/api/extract?url=${encodeURIComponent(inputUrl)}`, { method:'GET', headers:{'Accept':'application/json','Authorization':`Bearer ${sessionToken}`}, cache:'no-store' });
      const result = await readJson(extractRes);
      if (!result?.success || !result?.data) throw new Error(result?.error?.message || t('noVideo'));
      const data = result.data; if (!data.downloadUrl) throw new Error(t('noDownload'));
      if (data.thumbnail) resThumbnail.src = data.thumbnail; else resThumbnail.removeAttribute('src');
      if (typeof data.videoDuration === 'number' && data.videoDuration > 0) { const totalSeconds = Math.round(data.videoDuration); const minutes = Math.floor(totalSeconds / 60); const seconds = String(totalSeconds % 60).padStart(2, '0'); resDuration.textContent = `${minutes}:${seconds}`; } else resDuration.textContent = '';
      const author = data.author || {}; resAuthorName.textContent = author.name || t('creator'); resAuthorUser.textContent = `@${author.username || t('user').replace(/^@/,'')}`; if (author.avatar) resAvatar.src = author.avatar; else resAvatar.removeAttribute('src'); resTitle.textContent = data.title || (lang === 'ar' ? 'فيديو تيك توك' : 'TikTok Video');
      downloadStd.href = data.downloadUrl; downloadStd.setAttribute('aria-label', t('downloadMp4'));
      if (data.hdDownloadUrl) { downloadHd.href = data.hdDownloadUrl; downloadHd.classList.remove('hidden'); downloadHd.setAttribute('aria-label', t('downloadHd')); } else { downloadHd.removeAttribute('href'); downloadHd.classList.add('hidden'); }
      resultSection.classList.remove('hidden'); showStatus(t('readyStatus')); setTimeout(hideStatus, 1200);
    } catch (error) { console.error('TikVideo extraction error:', error); hideStatus(); showError(error?.message || t('generic')); }
    finally { setLoading(false); }
  });
  applyLanguage();
});
