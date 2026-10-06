document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('extract-form'); const urlInput = document.getElementById('url-input'); const submitBtn = document.getElementById('submit-btn'); const pasteBtn = document.getElementById('paste-btn'); const clearBtn = document.getElementById('clear-btn'); const languageBtn = document.getElementById('language-btn'); const statusCard = document.getElementById('status-card'); const statusText = document.getElementById('status-text'); const errorCard = document.getElementById('error-card'); const errorMessage = document.getElementById('error-message'); const resultSection = document.getElementById('result-section'); const mediaCard = document.querySelector('.media-card'); const mediaThumbnailContainer = document.querySelector('.media-thumbnail-container'); const photoGallery = document.getElementById('photo-gallery'); const photoLightbox = document.getElementById('photo-lightbox'); const photoLightboxImage = document.getElementById('photo-lightbox-image'); const photoLightboxDownload = document.getElementById('photo-lightbox-download'); const photoLightboxClose = document.getElementById('photo-lightbox-close'); const resThumbnail = document.getElementById('res-thumbnail'); const resDuration = document.getElementById('res-duration'); const resAvatar = document.getElementById('res-avatar'); const resAuthorName = document.getElementById('res-author-name'); const resAuthorUser = document.getElementById('res-author-user'); const resTitle = document.getElementById('res-title'); const downloadStd = document.getElementById('download-standard-btn'); const downloadHd = document.getElementById('download-hd-btn');
  const translations = {
    en:{ready:'Ready',heroBadge:"Videos • Photos • Stories",heroTitle:"TikTok Video, Photo & Story Downloader",heroSubtitle:"Paste a TikTok video, photo or story link to see the available downloads. No account or app needed.",paste:'Paste',clear:'Clear',getVideo:"Get download",retrieving:'Retrieving...',trust1:'No registration',trust2:'Fast processing',trust3:"Works in your browser",resultTitle:'Your media is ready',downloadMp4:'Download MP4',downloadHd:'Download best available quality',downloadImage:'Download Image',downloadAll:'Download All',viewFullscreen:'View Fullscreen',close:'Close',downloadingAll:'Downloading All...',photo:'Photo',photosReady:'Your photos are ready',footerText:'A modern, fast and simple TikTok media downloading experience.',placeholder:'Paste TikTok URL...',creator:'Creator',user:'@user',description:"Media description",clipboardUnavailable:'Clipboard access is not available.',clipboardEmpty:'Clipboard is empty.',clipboardManual:'Unable to read the clipboard. Please paste the TikTok URL manually.',enterUrl:"Please paste a TikTok video, photo or story link.",tooLong:'The URL is too long.',invalidUrl:"Use a supported HTTPS TikTok video, photo or story link.",session:"Preparing your download…",retrievingInfo:"Finding available media…",serverToken:'The server did not return a valid session token.',unexpected:'Server returned an unexpected response',invalidJson:'The server returned invalid JSON.',requestFailed:'Request failed',noVideo:'The requested TikTok media could not be retrieved.',noDownload:'The server did not provide a download URL.',readyStatus:'Media ready.',generic:'Unable to retrieve the TikTok media. Please try again.',aboutTitle:"Download TikTok videos, photos and stories",aboutText:"Save available media from supported TikTok links. Copy the post or story share link, paste it above, then choose a download. Public stories must still be available.",howTitle:"Copy, paste and download",howText:"In TikTok, open the video, photo post or story and choose Share, then Copy link. Paste the link here, select Get download and save the available media.",privacyTitle:"No account needed",privacyText:"Use the tool without signing up or installing an app. You choose the link to process; TikVideo does not ask for your TikTok password.",copyrightTitle:'Use content responsibly',copyrightText:'Only retrieve or download material you are legally entitled to access or use. TikVideo is an independent tool and is not affiliated with TikTok.',faqTitle:'Frequently asked questions',faq1q:'Do I need an account?',faq1a:'No. TikVideo does not require registration or a user account to submit a supported URL.',faq2q:"How do I download a video, photo or story?",faq2a:"Copy its share link in TikTok, paste it into TikVideo and select Get download. If media is available, choose a download button.",faq3q:'What links are supported?',faq3a:"Use HTTPS links from tiktok.com, www.tiktok.com, m.tiktok.com, vm.tiktok.com or vt.tiktok.com. Supported Douyin links are also accepted.",faq4q:"Does every link work?",faq4a:"No. Private, deleted or expired content may be unavailable. Downloads also depend on the source platform and network conditions.",faq5q:'Is TikVideo affiliated with TikTok?',faq5a:'No. TikVideo is an independent web tool and is not presented as an official TikTok service.',faq6q:'Can I download TikTok photos?',faq6a:'Yes. Supported TikTok photo posts can be retrieved as individual images when the image sources are available.',guideTitle:"Tips for downloading TikTok media",guideText:"Use the original share link and download promptly: download links expire after a few minutes. If a link expires, submit the TikTok link again. Your browser may ask permission to download several photos; you can also save each image separately.",aboutLink:'About',privacyLink:'Privacy',termsLink:'Terms',copyrightLink:'Copyright',contactLink:'Contact',faq7q:"Can I download TikTok stories?",faq7a:"Yes, supported public TikTok story links can return a download while the story is available. Copy the story share link and paste it above. Private or expired stories may not work.",networkError:"Could not connect. Check your internet connection and try again.",timeoutError:"The request took too long. Please try again.",rateLimit:"Too many requests. Please wait a minute and try again.",downloadHint:"Download links expire after a few minutes. Submit the TikTok link again if a download stops working."},
    ar:{ready:'جاهز',heroBadge:"فيديوهات • صور • قصص",heroTitle:"تحميل فيديوهات وصور وقصص تيك توك",heroSubtitle:"الصق رابط فيديو أو صور أو ستوري تيك توك لعرض خيارات التحميل المتاحة، بدون حساب أو تثبيت تطبيق.",paste:'لصق',clear:'مسح',getVideo:"عرض التحميل",retrieving:'جارٍ الجلب...',trust1:'بدون تسجيل',trust2:'معالجة سريعة',trust3:"مباشرة من المتصفح",resultTitle:"الوسائط جاهزة",downloadMp4:'تحميل MP4',downloadHd:'تحميل بأفضل جودة متاحة',downloadImage:'تحميل الصورة',downloadAll:'تحميل الكل',viewFullscreen:'عرض الصورة كاملة',close:'إغلاق',downloadingAll:'جارٍ تحميل الكل...',photo:'صورة',photosReady:'الصور جاهزة',footerText:'تجربة حديثة وسريعة وبسيطة لتحميل وسائط TikTok.',placeholder:'الصق رابط تيك توك هنا...',creator:'الناشر',user:'@مستخدم',description:"وصف الوسائط",clipboardUnavailable:'الوصول إلى الحافظة غير متاح.',clipboardEmpty:'الحافظة فارغة.',clipboardManual:'تعذر قراءة الحافظة. الصق رابط تيك توك يدويًا.',enterUrl:"الصق رابط فيديو أو صور أو ستوري من تيك توك.",tooLong:'الرابط طويل جدًا.',invalidUrl:"استخدم رابط HTTPS مدعومًا لفيديو أو صور أو ستوري من تيك توك.",session:"جارٍ تجهيز التحميل…",retrievingInfo:"جارٍ البحث عن الوسائط المتاحة…",serverToken:'لم يُرجع الخادم رمز جلسة صالحًا.',unexpected:'أعاد الخادم استجابة غير متوقعة',invalidJson:'أعاد الخادم بيانات JSON غير صالحة.',requestFailed:'فشل الطلب',noVideo:'تعذر جلب وسائط TikTok المطلوبة.',noDownload:'لم يُرجع الخادم رابط تحميل.',readyStatus:'الوسائط جاهزة.',generic:'تعذر جلب وسائط TikTok. يرجى المحاولة مرة أخرى.',aboutTitle:"حمّل فيديوهات وصور وستوري تيك توك",aboutText:"احفظ الوسائط المتاحة من روابط تيك توك المدعومة. انسخ رابط مشاركة المنشور أو القصة والصقه أعلاه، ثم اختر التحميل. يجب أن تكون القصة عامة وما زالت متاحة.",howTitle:"انسخ الرابط والصقه وحمّل",howText:"افتح الفيديو أو منشور الصور أو الستوري في تيك توك، واختر مشاركة ثم نسخ الرابط. الصقه هنا واضغط عرض التحميل، ثم احفظ الوسائط المتاحة.",privacyTitle:"بدون حساب أو تطبيق",privacyText:"استخدم الأداة بدون تسجيل أو تثبيت تطبيق. أنت تختار الرابط، ولا يطلب TikVideo كلمة مرور حسابك في تيك توك.",copyrightTitle:'استخدم المحتوى بمسؤولية',copyrightText:'استخدم فقط المواد التي يحق لك قانونيًا الوصول إليها أو حفظها. TikVideo أداة مستقلة وليست تابعة لـ TikTok.',faqTitle:'الأسئلة الشائعة',faq1q:'هل أحتاج إلى حساب؟',faq1a:'لا. لا يتطلب TikVideo التسجيل أو إنشاء حساب لإرسال رابط مدعوم.',faq2q:"كيف أحمل فيديو أو صورًا أو ستوري؟",faq2a:"انسخ رابط المشاركة من تيك توك والصقه في TikVideo، ثم اضغط عرض التحميل. اختر زر التحميل عندما تتوفر الوسائط.",faq3q:'ما الروابط المدعومة؟',faq3a:"استخدم روابط HTTPS من tiktok.com أو www.tiktok.com أو m.tiktok.com أو vm.tiktok.com أو vt.tiktok.com. تُقبل أيضًا روابط Douyin المدعومة.",faq4q:"هل تعمل جميع الروابط؟",faq4a:"لا. قد لا يتوفر المحتوى الخاص أو المحذوف أو المنتهي. يعتمد التحميل أيضًا على منصة المصدر وحالة الشبكة.",faq5q:'هل TikVideo تابع لـ TikTok؟',faq5a:'لا. TikVideo أداة ويب مستقلة ولا يتم تقديمها كخدمة رسمية تابعة لـ TikTok.',faq6q:'هل يمكنني تحميل صور TikTok؟',faq6a:'نعم. يمكن جلب منشورات الصور المدعومة وتحميل الصور بشكل منفصل عندما تتوفر مصادر الصور.',guideTitle:"نصائح لتحميل وسائط تيك توك",guideText:"استخدم رابط المشاركة الأصلي وحمّل فورًا؛ تنتهي روابط التحميل بعد بضع دقائق. عند انتهاء الرابط، أرسل رابط تيك توك مجددًا. قد يطلب المتصفح السماح بتنزيل صور متعددة، ويمكنك تحميل كل صورة على حدة.",aboutLink:'من نحن',privacyLink:'الخصوصية',termsLink:'الشروط',copyrightLink:'حقوق النشر',contactLink:'اتصل بنا',faq7q:"هل يمكن تحميل قصص أو ستوريات تيك توك؟",faq7a:"نعم، يمكن تحميل القصص العامة المدعومة ما دامت متاحة. انسخ رابط مشاركة الستوري والصقه أعلاه. قد لا تعمل القصص الخاصة أو المنتهية.",networkError:"تعذر الاتصال. تحقق من الإنترنت وحاول مجددًا.",timeoutError:"استغرق الطلب وقتًا طويلًا. حاول مجددًا.",rateLimit:"طلبات كثيرة. انتظر دقيقة ثم حاول مجددًا.",downloadHint:"تنتهي روابط التحميل بعد بضع دقائق. أرسل رابط تيك توك مجددًا إذا توقف التحميل."}
  };
  const isArabicPath = location.pathname === '/ar' || location.pathname.startsWith('/ar/');
  // Keep the URL as the source of truth: / is English and /ar/ is Arabic.
  // The stored preference is not used on the English root URL, so / never serves Arabic content.
  let lang = isArabicPath ? 'ar' : 'en';
  try { if(isArabicPath) localStorage.setItem('nexus-language','ar'); } catch {}
  const t=key=>translations[lang][key] || translations.en[key] || key;
  let currentPhotoImages=[]; let currentPhotoDownloads=[]; let currentLightboxIndex=0;
  let activeRequest=null; let statusTimer=null; let lightboxTrigger=null;
  function cancelRequest(){
    const pending=activeRequest;activeRequest=null;pending?.abort();
    clearTimeout(statusTimer);setLoading(false);hideStatus();
  }
  function setImage(image,src){
    image.classList.toggle('hidden',!src);
    if(src)image.src=src;else image.removeAttribute('src');
  }
  resAvatar.addEventListener('error',()=>resAvatar.classList.add('hidden'));
  resThumbnail.addEventListener('error',()=>mediaThumbnailContainer?.classList.add('hidden'));
  function applyLanguage(){const isAr=lang==='ar';document.documentElement.lang=lang;document.documentElement.dir=isAr?'rtl':'ltr';document.body.dir=isAr?'rtl':'ltr';languageBtn.textContent=isAr?'English':'العربية';languageBtn.setAttribute('aria-label',isAr?'Switch to English':'التبديل إلى العربية');urlInput.placeholder=t('placeholder');urlInput.setAttribute('aria-label',isAr?'رابط فيديو أو صور أو ستوري من تيك توك':'TikTok video, photo or story URL');document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});document.title=isAr?'TikVideo — تحميل فيديوهات وصور وقصص تيك توك':'TikVideo — TikTok Video, Photo & Story Downloader';const desc=document.querySelector('meta[name="description"]');if(desc)desc.content=isAr?'حمّل فيديوهات وصور وقصص تيك توك العامة المتاحة باستخدام TikVideo. الصق رابط المشاركة واحفظ الوسائط من المتصفح، بدون حساب أو تثبيت تطبيق.':'Download TikTok videos, photos and available public stories with TikVideo. Paste a share link and save media online—no account or app needed.';if(!resultSection.classList.contains('hidden')){if(mediaCard?.classList.contains('photo-result')){const count=currentPhotoImages.length||photoGallery?.querySelectorAll('.photo-item').length||1;setResultTitle(`${t('photosReady')} (${count})`);downloadStd.setAttribute('aria-label',t('downloadAll'));const downloadLabel=downloadStd.querySelector('[data-i18n]');if(downloadLabel)downloadLabel.textContent=t('downloadAll');photoLightbox?.setAttribute('aria-label',isAr?'عارض الصور':'Photo viewer');photoLightboxClose?.setAttribute('aria-label',t('close'));photoLightboxDownload?.setAttribute('aria-label',t('downloadImage'))}else{setResultTitle(t('resultTitle'));downloadStd.setAttribute('aria-label',t('downloadMp4'));if(!downloadHd.classList.contains('hidden'))downloadHd.setAttribute('aria-label',t('downloadHd'))}}}

  languageBtn.addEventListener('click',()=>{try{localStorage.setItem('nexus-language',lang==='en'?'ar':'en')}catch{}});
  function showError(message){errorMessage.textContent=message || t('generic');errorCard.classList.remove('hidden')} function hideError(){errorCard.classList.add('hidden');errorMessage.textContent=''} function showStatus(message){statusText.textContent=message;statusCard.classList.remove('hidden')} function hideStatus(){statusCard.classList.add('hidden')}
  function resetResult(){
    resultSection.classList.add('hidden');
    mediaCard?.classList.remove('photo-result');
    mediaThumbnailContainer?.classList.remove('hidden');
    currentPhotoImages=[]; currentPhotoDownloads=[]; currentLightboxIndex=0;
    closePhotoLightbox();
    if(photoGallery){photoGallery.innerHTML='';photoGallery.classList.add('hidden')}
    resThumbnail.removeAttribute('src');
    resThumbnail.classList.remove('hidden');
    resThumbnail.alt=lang==='ar'?'صورة مصغرة للوسائط':'Media thumbnail';
    resDuration.textContent='';
    resDuration.classList.remove('hidden');
    resAuthorName.textContent=t('creator');
    resAuthorUser.textContent=t('user');
    resTitle.textContent=t('description');
    downloadStd.classList.remove('hidden');
    downloadStd.removeAttribute('href');
    downloadStd.removeAttribute('download');
    downloadStd.classList.remove('is-loading');
    downloadStd.removeAttribute('aria-busy');
    const standardLabel=downloadStd.querySelector('[data-i18n]');
    if(standardLabel)standardLabel.textContent=t('downloadMp4');
    downloadStd.setAttribute('aria-label',t('downloadMp4'));
    downloadHd.removeAttribute('href');
    downloadHd.removeAttribute('download');
    downloadHd.classList.add('hidden');
  }
  function closePhotoLightbox(){
    if(!photoLightbox)return;
    const wasOpen=!photoLightbox.classList.contains('hidden');
    photoLightbox.classList.add('hidden');
    photoLightbox.setAttribute('aria-hidden','true');
    document.body.classList.remove('lightbox-open');
    if(photoLightboxImage)photoLightboxImage.removeAttribute('src');
    if(photoLightboxDownload){photoLightboxDownload.removeAttribute('href');photoLightboxDownload.removeAttribute('download')}
    if(wasOpen&&lightboxTrigger?.isConnected)lightboxTrigger.focus();
    lightboxTrigger=null;
  }
  function updatePhotoLightbox(){
    if(!photoLightboxImage||!photoLightboxDownload||!currentPhotoImages.length)return;
    const index=Math.min(Math.max(currentLightboxIndex,0),currentPhotoImages.length-1);
    currentLightboxIndex=index;
    const imageUrl=currentPhotoImages[index];
    const downloadUrl=currentPhotoDownloads[index]||'';
    photoLightboxImage.src=imageUrl;
    photoLightboxImage.alt=`${t('photo')} ${index+1}`;
    if(downloadUrl){
      photoLightboxDownload.href=downloadUrl;
      photoLightboxDownload.setAttribute('download',getImageFilename(index,imageUrl));
    }else{
      photoLightboxDownload.removeAttribute('href');
      photoLightboxDownload.removeAttribute('download');
    }
    photoLightboxClose?.setAttribute('aria-label',t('close'));
    photoLightboxDownload.setAttribute('aria-label',t('downloadImage'));
    photoLightbox.setAttribute('aria-label',`${t('photo')} ${index+1}`);
  }
  function openPhotoLightbox(index){
    if(!currentPhotoImages.length)return;
    lightboxTrigger=document.activeElement;
    currentLightboxIndex=index;
    updatePhotoLightbox();
    photoLightbox?.classList.remove('hidden');
    photoLightbox?.setAttribute('aria-hidden','false');
    document.body.classList.add('lightbox-open');
    photoLightboxClose?.focus();
  }
  function downloadAllPhotos(){
    if(!currentPhotoDownloads.length)return;
    const label=downloadStd.querySelector('[data-i18n]');
    if(label)label.textContent=t('downloadingAll');
    downloadStd.setAttribute('aria-busy','true');
    downloadStd.classList.add('is-loading');
    for(let i=0;i<currentPhotoDownloads.length;i++){
      const anchor=document.createElement('a');
      anchor.href=currentPhotoDownloads[i];
      anchor.setAttribute('download',getImageFilename(i,currentPhotoImages[i]));
      anchor.setAttribute('rel','nofollow');
      anchor.style.position='fixed';
      anchor.style.left='-9999px';
      anchor.style.top='-9999px';
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(()=>anchor.remove(),2000);
    }
    setTimeout(()=>{
      if(label)label.textContent=t('downloadAll');
      downloadStd.removeAttribute('aria-busy');
      downloadStd.classList.remove('is-loading');
    },800);
  }
  function setAuthor(data){
    const author=data.author || {};
    resAuthorName.textContent=author.name || t('creator');
    resAuthorUser.textContent=`@${author.username || t('user').replace(/^@/,'')}`;
    setImage(resAvatar,author.avatar);
  }
  function setResultTitle(text){const el=document.querySelector('.result-heading [data-i18n="resultTitle"]');if(el)el.textContent=text}
  function getImageFilename(index,url){
    let extension='jpg';
    try{const pathname=new URL(url).pathname;const match=pathname.match(/\.(jpe?g|png|webp|avif)$/i);if(match)extension=match[1].toLowerCase()}catch{}
    return `tikvideo-image-${String(index+1).padStart(2,'0')}.${extension}`;
  }
  function renderPhotoResult(data){
    const images=Array.isArray(data.images)?data.images.filter(Boolean):[];
    const downloads=Array.isArray(data.imageDownloadUrls)?data.imageDownloadUrls.filter(Boolean):[];
    if(!images.length||!downloads.length)throw new Error(t('noDownload'));
    currentPhotoImages=images;
    currentPhotoDownloads=downloads;
    mediaCard?.classList.add('photo-result');
    mediaThumbnailContainer?.classList.add('hidden');
    resDuration.textContent='';
    resDuration.classList.add('hidden');
    setAuthor(data);
    resTitle.textContent=data.title || (lang==='ar'?'منشور صور TikTok':'TikTok photo post');
    downloadStd.removeAttribute('href');
    downloadStd.removeAttribute('download');
    downloadStd.setAttribute('role','button');
    downloadStd.setAttribute('tabindex','0');
    downloadStd.classList.remove('hidden','is-loading');
    downloadStd.removeAttribute('aria-busy');
    const standardLabel=downloadStd.querySelector('[data-i18n]');
    if(standardLabel)standardLabel.textContent=t('downloadAll');
    downloadStd.setAttribute('aria-label',t('downloadAll'));
    downloadHd.classList.add('hidden');
    setResultTitle(`${t('photosReady')} (${images.length})`);
    if(photoGallery){
      photoGallery.innerHTML='';
      for(let i=0;i<images.length;i++){
        const item=document.createElement('div');
        item.className='photo-item';
        item.addEventListener('click',()=>openPhotoLightbox(i));

        const image=document.createElement('img');
        image.src=images[i];
        image.alt=`${t('photo')} ${i+1}`;
        image.loading=i<3?'eager':'lazy';
        image.referrerPolicy='no-referrer';

        const downloadButton=document.createElement('a');
        downloadButton.className='photo-download-button';
        downloadButton.href=downloads[i];
        downloadButton.setAttribute('download',getImageFilename(i,images[i]));
        downloadButton.setAttribute('rel','nofollow');
        downloadButton.setAttribute('aria-label',`${t('downloadImage')} ${i+1}`);
        downloadButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        downloadButton.addEventListener('click',event=>event.stopPropagation());

        const viewButton=document.createElement('button');
        viewButton.type='button';
        viewButton.className='photo-view-button';
        viewButton.setAttribute('aria-label',`${t('viewFullscreen')} ${i+1}`);
        viewButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 4H4v4M4 4l6 6M16 4h4v4M20 4l-6 6M8 20H4v-4M4 20l6-6M16 20h4v-4M20 20l-6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        viewButton.addEventListener('click',event=>{
          event.stopPropagation();
          openPhotoLightbox(i);
        });

        const index=document.createElement('span');
        index.className='photo-index';
        index.textContent=String(i+1);
        item.append(image,downloadButton,viewButton,index);
        photoGallery.append(item);
      }
      photoGallery.classList.remove('hidden');
    }
  }
  function renderVideoResult(data){
    mediaCard?.classList.remove('photo-result');
    mediaThumbnailContainer?.classList.toggle('hidden',!data.thumbnail);
    currentPhotoImages=[];
    currentPhotoDownloads=[];
    if(photoGallery){photoGallery.innerHTML='';photoGallery.classList.add('hidden')}
    resDuration.classList.remove('hidden');
    resThumbnail.classList.remove('hidden');
    resThumbnail.alt=lang==='ar'?'صورة مصغرة للفيديو':'Video thumbnail';
    setImage(resThumbnail,data.thumbnail);
    if(typeof data.videoDuration==='number' && data.videoDuration>0){const totalSeconds=Math.round(data.videoDuration);const minutes=Math.floor(totalSeconds/60);const seconds=String(totalSeconds%60).padStart(2,'0');resDuration.textContent=`${minutes}:${seconds}`}else resDuration.textContent='';
    setAuthor(data);
    resTitle.textContent=data.title || (lang==='ar'?'فيديو تيك توك':'TikTok Video');
    downloadStd.href=data.downloadUrl;
    downloadStd.removeAttribute('role');
    downloadStd.removeAttribute('tabindex');
    downloadStd.setAttribute('download','tikvideo.mp4');
    downloadStd.classList.remove('hidden');
    const standardLabel=downloadStd.querySelector('[data-i18n]');
    if(standardLabel)standardLabel.textContent=t('downloadMp4');
    downloadStd.setAttribute('aria-label',t('downloadMp4'));
    if(data.hdDownloadUrl){downloadHd.href=data.hdDownloadUrl;downloadHd.setAttribute('download','tikvideo-hd.mp4');downloadHd.classList.remove('hidden');downloadHd.setAttribute('aria-label',t('downloadHd'))}else{downloadHd.removeAttribute('href');downloadHd.removeAttribute('download');downloadHd.classList.add('hidden')}
    setResultTitle(t('resultTitle'));
  }
  function setLoading(loading){submitBtn.disabled=loading;form.setAttribute('aria-busy',String(loading));const buttonText=submitBtn.querySelector('.btn-text');if(buttonText)buttonText.textContent=loading?t('retrieving'):t('getVideo')}
  function isTikTokUrl(value){try{const parsed=new URL(value);const hostname=parsed.hostname.toLowerCase().replace(/\.$/,'');const allowedHosts=['tiktok.com','www.tiktok.com','vm.tiktok.com','vt.tiktok.com','m.tiktok.com','douyin.com','www.douyin.com'];return parsed.protocol==='https:'&&allowedHosts.includes(hostname)}catch{return false}}
  async function readJson(response){const contentType=response.headers.get('content-type') || '';if(!contentType.includes('application/json'))throw new Error(`${t('unexpected')} (${response.status}).`);let data;try{data=await response.json()}catch{throw new Error(t('invalidJson'))}if(!response.ok)throw new Error(response.status===429?t('rateLimit'):response.status>=500?t('noVideo'):data?.error?.message || `${t('requestFailed')} (${response.status}).`);return data}
  downloadStd.addEventListener('click',event=>{
    if(mediaCard?.classList.contains('photo-result')){
      event.preventDefault();
      downloadAllPhotos();
    }
  });
  photoLightboxClose?.addEventListener('click',closePhotoLightbox);
  downloadStd.addEventListener('keydown',event=>{
    if(mediaCard?.classList.contains('photo-result')&&(event.key==='Enter'||event.key===' ')){
      event.preventDefault();downloadAllPhotos();
    }
  });
  photoLightbox?.addEventListener('click',event=>{
    if(event.target===photoLightbox||event.target.classList.contains('photo-lightbox-backdrop'))closePhotoLightbox();
  });
  photoGallery?.addEventListener('click',event=>{
    if(!event.target.closest('.photo-item'))return;
    const item=event.target.closest('.photo-item');
    if(event.target.closest('.photo-view-button,.photo-download-button'))return;
    photoGallery.querySelectorAll('.photo-item.photo-download-visible').forEach(el=>{
      if(el!==item)el.classList.remove('photo-download-visible');
    });
  });
  photoLightboxDownload?.addEventListener('click',event=>{
    if(!photoLightboxDownload.href)event.preventDefault();
  });
  document.addEventListener('keydown',event=>{
    if(!photoLightbox||photoLightbox.classList.contains('hidden'))return;
    if(event.key==='Escape'){event.preventDefault();closePhotoLightbox()}
    if(event.key==='Tab'){
      const targets=[photoLightboxClose,photoLightboxDownload].filter(el=>el&&(el.tagName!=='A'||el.hasAttribute('href')));
      const index=targets.indexOf(document.activeElement);
      event.preventDefault();
      targets[(index+(event.shiftKey?-1:1)+targets.length)%targets.length]?.focus();
    }
  });
  pasteBtn.addEventListener('click',async()=>{hideError();try{if(!navigator.clipboard?.readText){showError(t('clipboardUnavailable'));urlInput.focus();return}const text=await navigator.clipboard.readText();if(!text){showError(t('clipboardEmpty'));return}cancelRequest();resetResult();urlInput.value=text.trim();urlInput.removeAttribute('aria-invalid');urlInput.focus()}catch{showError(t('clipboardManual'));urlInput.focus()}});
  clearBtn.addEventListener('click',()=>{cancelRequest();urlInput.value='';hideError();resetResult();urlInput.removeAttribute('aria-invalid');urlInput.focus()});
  urlInput.addEventListener('input',()=>{cancelRequest();hideError();resetResult();urlInput.removeAttribute('aria-invalid')});
  form.addEventListener('submit',async event=>{
    event.preventDefault();cancelRequest();hideError();resetResult();urlInput.removeAttribute('aria-invalid');
    const inputUrl=urlInput.value.trim();
    if(!inputUrl){showError(t('enterUrl'));urlInput.setAttribute('aria-invalid','true');urlInput.focus();return}
    if(inputUrl.length>2048){showError(t('tooLong'));return}
    if(!isTikTokUrl(inputUrl)){showError(t('invalidUrl'));urlInput.setAttribute('aria-invalid','true');urlInput.focus();return}
    const controller=new AbortController();activeRequest=controller;
    let timedOut=false;
    const timeout=setTimeout(()=>{timedOut=true;controller.abort()},65000);
    setLoading(true);showStatus(t('session'));
    try{
      const tokenRes=await fetch('/api/token',{method:'POST',headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal});
      const tokenData=await readJson(tokenRes);
      const sessionToken=tokenData?.data?.token;
      if(activeRequest!==controller)return;
      if(!sessionToken)throw new Error(t('serverToken'));
      showStatus(t('retrievingInfo'));
      const extractRes=await fetch(`/api/extract?url=${encodeURIComponent(inputUrl)}`,{method:'GET',headers:{Accept:'application/json',Authorization:`Bearer ${sessionToken}`},cache:'no-store',signal:controller.signal});
      const result=await readJson(extractRes);
      if(activeRequest!==controller)return;
      if(!result?.success || !result?.data)throw new Error(result?.error?.message || t('noVideo'));
      const data=result.data;
      if(data.type==='image'&&Array.isArray(data.images)){
        renderPhotoResult(data);
      }else{
        if(!data.downloadUrl)throw new Error(t('noDownload'));
        renderVideoResult(data);
      }
      resultSection.classList.remove('hidden');
      showStatus(t('readyStatus'));
      statusTimer=setTimeout(hideStatus,1200);
    }catch(error){
      if(activeRequest!==controller)return;
      hideStatus();
      if(timedOut)showError(t('timeoutError'));
      else if(error?.name!=='AbortError')showError(error?.name==='TypeError'?t('networkError'):error?.message||t('generic'));
    }finally{
      clearTimeout(timeout);
      if(activeRequest===controller){activeRequest=null;setLoading(false)}
    }
  });
  applyLanguage();
});
