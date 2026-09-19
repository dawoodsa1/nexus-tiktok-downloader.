document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('extract-form'); const urlInput = document.getElementById('url-input'); const submitBtn = document.getElementById('submit-btn'); const pasteBtn = document.getElementById('paste-btn'); const clearBtn = document.getElementById('clear-btn'); const languageBtn = document.getElementById('language-btn'); const statusCard = document.getElementById('status-card'); const statusText = document.getElementById('status-text'); const errorCard = document.getElementById('error-card'); const errorMessage = document.getElementById('error-message'); const resultSection = document.getElementById('result-section'); const mediaCard = document.querySelector('.media-card'); const mediaThumbnailContainer = document.querySelector('.media-thumbnail-container'); const photoGallery = document.getElementById('photo-gallery'); const photoLightbox = document.getElementById('photo-lightbox'); const photoLightboxImage = document.getElementById('photo-lightbox-image'); const photoLightboxDownload = document.getElementById('photo-lightbox-download'); const photoLightboxClose = document.getElementById('photo-lightbox-close'); const resThumbnail = document.getElementById('res-thumbnail'); const resDuration = document.getElementById('res-duration'); const resAvatar = document.getElementById('res-avatar'); const resAuthorName = document.getElementById('res-author-name'); const resAuthorUser = document.getElementById('res-author-user'); const resTitle = document.getElementById('res-title'); const downloadStd = document.getElementById('download-standard-btn'); const downloadHd = document.getElementById('download-hd-btn');
  const translations = {
    en:{ready:'Ready',heroBadge:'Secure • Fast • Simple',heroTitle:'TikTok Video & Photo Downloader Without Watermark',heroSubtitle:'Paste a TikTok video URL and TikVideo will automatically retrieve the available download options.',paste:'Paste',clear:'Clear',getVideo:'Get Media',retrieving:'Retrieving...',trust1:'No registration',trust2:'Fast processing',trust3:'Mobile friendly',resultTitle:'Your media is ready',downloadMp4:'Download MP4',downloadHd:'Download HD MP4',downloadImage:'Download Image',downloadAll:'Download All',viewFullscreen:'View Fullscreen',close:'Close',downloadingAll:'Downloading All...',photo:'Photo',photosReady:'Your photos are ready',footerText:'A modern, fast and simple TikTok media downloading experience.',placeholder:'Paste TikTok URL...',creator:'Creator',user:'@user',description:'Video Description',clipboardUnavailable:'Clipboard access is not available.',clipboardEmpty:'Clipboard is empty.',clipboardManual:'Unable to read the clipboard. Please paste the TikTok URL manually.',enterUrl:'Please enter a TikTok video or photo URL.',tooLong:'The URL is too long.',invalidUrl:'Please enter a valid TikTok video or photo URL.',session:'Creating secure session...',retrievingInfo:'Retrieving TikTok media information...',serverToken:'The server did not return a valid session token.',unexpected:'Server returned an unexpected response',invalidJson:'The server returned invalid JSON.',requestFailed:'Request failed',noVideo:'The requested TikTok media could not be retrieved.',noDownload:'The server did not provide a download URL.',readyStatus:'Media ready.',generic:'Unable to retrieve the TikTok media. Please try again.',aboutTitle:'A simple TikTok video and photo downloader',aboutText:'TikVideo is a web tool for retrieving available media from TikTok video and photo posts. Paste a supported link, review the returned information, and use the available download option.',howTitle:'How to download a TikTok video or photo',howText:'Copy a TikTok video or photo post link, paste it into TikVideo, start the request, review the returned information, then choose the available download option.',privacyTitle:'Private by design',privacyText:'No user account is required. The selected language is stored locally in your browser and short-lived service tokens are used for API requests.',copyrightTitle:'Use content responsibly',copyrightText:'Only retrieve or download material you are legally entitled to access or use. TikVideo is an independent tool and is not affiliated with TikTok.',faqTitle:'Frequently asked questions',faq1q:'Do I need an account?',faq1a:'No. TikVideo does not require registration or a user account to submit a supported URL.',faq2q:'How do I download a TikTok video or photo?',faq2a:'Open TikTok, copy a video or photo post link, paste it into TikVideo, and start the request. If media is available, the download option is shown.',faq3q:'What links are supported?',faq3a:'The service validates HTTPS links from TikTok and supported TikTok short-link hosts. Douyin links are also accepted by the current service.',faq4q:'Is every video or photo guaranteed to download?',faq4a:'No. Availability depends on the source media, network conditions, and third-party systems used to retrieve the media. The site does not promise that every post will always work.',faq5q:'Is TikVideo affiliated with TikTok?',faq5a:'No. TikVideo is an independent web tool and is not presented as an official TikTok service.',faq6q:'Can I download TikTok photos?',faq6a:'Yes. Supported TikTok photo posts can be retrieved as individual images when the image sources are available.',guideTitle:'TikTok video and photo downloading guide',guideText:'For the best experience, use the original share link from TikTok, keep the browser tab open while the request is processed, and download only content you are permitted to save.',aboutLink:'About',privacyLink:'Privacy',termsLink:'Terms',copyrightLink:'Copyright',contactLink:'Contact'},
    ar:{ready:'جاهز',heroBadge:'أمن • سريع • بسيط',heroTitle:'تحميل فيديوهات وصور تيك توك بدون علامة مائية',heroSubtitle:'الصق رابط فيديو TikTok وسيقوم TikVideo بجلب خيارات التنزيل المتاحة تلقائيًا.',paste:'لصق',clear:'مسح',getVideo:'جلب الوسائط',retrieving:'جارٍ الجلب...',trust1:'بدون تسجيل',trust2:'معالجة سريعة',trust3:'متوافق مع الهاتف',resultTitle:'الفيديو جاهز',downloadMp4:'تحميل MP4',downloadHd:'تحميل HD MP4',downloadImage:'تحميل الصورة',downloadAll:'تحميل الكل',viewFullscreen:'عرض الصورة كاملة',close:'إغلاق',downloadingAll:'جارٍ تحميل الكل...',photo:'صورة',photosReady:'الصور جاهزة',footerText:'تجربة حديثة وسريعة وبسيطة لتحميل وسائط TikTok.',placeholder:'الصق رابط تيك توك هنا...',creator:'الناشر',user:'@مستخدم',description:'وصف الفيديو',clipboardUnavailable:'الوصول إلى الحافظة غير متاح.',clipboardEmpty:'الحافظة فارغة.',clipboardManual:'تعذر قراءة الحافظة. الصق رابط تيك توك يدويًا.',enterUrl:'يرجى إدخال رابط فيديو أو صورة من TikTok.',tooLong:'الرابط طويل جدًا.',invalidUrl:'يرجى إدخال رابط فيديو أو صورة صالح من TikTok.',session:'جارٍ إنشاء جلسة آمنة...',retrievingInfo:'جارٍ جلب معلومات وسائط TikTok...',serverToken:'لم يُرجع الخادم رمز جلسة صالحًا.',unexpected:'أعاد الخادم استجابة غير متوقعة',invalidJson:'أعاد الخادم بيانات JSON غير صالحة.',requestFailed:'فشل الطلب',noVideo:'تعذر جلب وسائط TikTok المطلوبة.',noDownload:'لم يُرجع الخادم رابط تحميل.',readyStatus:'الوسائط جاهزة.',generic:'تعذر جلب وسائط TikTok. يرجى المحاولة مرة أخرى.',aboutTitle:'أداة بسيطة لتحميل فيديوهات وصور تيك توك',aboutText:'TikVideo أداة ويب لجلب الوسائط المتاحة من منشورات فيديوهات وصور TikTok. الصق الرابط المدعوم، راجع المعلومات التي تم إرجاعها، ثم استخدم خيار التحميل المتاح.',howTitle:'كيفية تحميل فيديو أو صورة من تيك توك',howText:'انسخ رابط فيديو أو منشور صور من TikTok، الصقه في TikVideo، ابدأ الطلب، راجع المعلومات التي تم إرجاعها، ثم اختر خيار التحميل المتاح.',privacyTitle:'الخصوصية أولًا',privacyText:'لا تحتاج إلى إنشاء حساب. تُحفظ اللغة محليًا في المتصفح وتُستخدم رموز خدمة قصيرة العمر لطلبات API.',copyrightTitle:'استخدم المحتوى بمسؤولية',copyrightText:'استخدم فقط المواد التي يحق لك قانونيًا الوصول إليها أو حفظها. TikVideo أداة مستقلة وليست تابعة لـ TikTok.',faqTitle:'الأسئلة الشائعة',faq1q:'هل أحتاج إلى حساب؟',faq1a:'لا. لا يتطلب TikVideo التسجيل أو إنشاء حساب لإرسال رابط مدعوم.',faq2q:'كيف أحمل فيديو أو صورة من تيك توك؟',faq2a:'افتح TikTok، انسخ رابط فيديو أو منشور صور، الصقه في TikVideo وابدأ الطلب. إذا توفرت الوسائط، سيظهر خيار التحميل.',faq3q:'ما الروابط المدعومة؟',faq3a:'تتحقق الخدمة من روابط HTTPS التابعة لـ TikTok ومن نطاقات روابط TikTok المختصرة المدعومة. كما تقبل الخدمة روابط Douyin الحالية.',faq4q:'هل يضمن الموقع تحميل كل فيديو أو صورة؟',faq4a:'لا. يعتمد توفر التحميل على مصدر الوسائط وحالة الشبكة والأنظمة الخارجية المستخدمة لجلب الوسائط. لا يضمن الموقع عمل كل منشور بشكل دائم.',faq5q:'هل TikVideo تابع لـ TikTok؟',faq5a:'لا. TikVideo أداة ويب مستقلة ولا يتم تقديمها كخدمة رسمية تابعة لـ TikTok.',faq6q:'هل يمكنني تحميل صور TikTok؟',faq6a:'نعم. يمكن جلب منشورات الصور المدعومة وتحميل الصور بشكل منفصل عندما تتوفر مصادر الصور.',guideTitle:'دليل تحميل فيديوهات وصور تيك توك',guideText:'لأفضل تجربة، استخدم رابط المشاركة الأصلي من TikTok، وأبقِ صفحة المتصفح مفتوحة أثناء معالجة الطلب، وحمّل فقط المحتوى المسموح لك بحفظه أو استخدامه.',aboutLink:'من نحن',privacyLink:'الخصوصية',termsLink:'الشروط',copyrightLink:'حقوق النشر',contactLink:'اتصل بنا'}
  };
  const isArabicPath = location.pathname === '/ar' || location.pathname.startsWith('/ar/');
  let lang = isArabicPath ? 'ar' : (localStorage.getItem('nexus-language') || 'en');
  if(!translations[lang]) lang='en';
  const t=key=>translations[lang][key] || translations.en[key] || key;
  let currentPhotoImages=[]; let currentPhotoDownloads=[]; let currentLightboxIndex=0;
  function applyLanguage(){const isAr=lang==='ar';document.documentElement.lang=lang;document.documentElement.dir=isAr?'rtl':'ltr';document.body.dir=isAr?'rtl':'ltr';languageBtn.textContent=isAr?'English':'العربية';languageBtn.setAttribute('aria-label',isAr?'Switch to English':'التبديل إلى العربية');urlInput.placeholder=t('placeholder');urlInput.setAttribute('aria-label',isAr?'رابط فيديو أو صورة من TikTok':'TikTok video or photo URL');document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});document.title=isAr?'تحميل فيديوهات وصور تيك توك بدون علامة مائية | TikVideo':'TikTok Video & Photo Downloader Without Watermark | TikVideo';const desc=document.querySelector('meta[name="description"]');if(desc)desc.content=isAr?'حمّل فيديوهات وصور TikTok المتاحة أونلاين. الصق رابط المنشور واستخدم خيار التحميل المتاح، بدون تسجيل أو تثبيت تطبيق.':'Download available TikTok videos and photos online. Paste a TikTok post URL and use the available download option, with no registration or app installation.';if(!resultSection.classList.contains('hidden')){if(mediaCard?.classList.contains('photo-result')){const count=currentPhotoImages.length||photoGallery?.querySelectorAll('.photo-item').length||1;setResultTitle(`${t('photosReady')} (${count})`);downloadStd.setAttribute('aria-label',t('downloadAll'));const downloadLabel=downloadStd.querySelector('[data-i18n]');if(downloadLabel)downloadLabel.textContent=t('downloadAll')}else{setResultTitle(t('resultTitle'));downloadStd.setAttribute('aria-label',t('downloadMp4'));if(!downloadHd.classList.contains('hidden'))downloadHd.setAttribute('aria-label',t('downloadHd'))}}}

  languageBtn.addEventListener('click',()=>{lang=lang==='en'?'ar':'en';localStorage.setItem('nexus-language',lang);location.href=lang==='ar'?'/ar/':'/'});
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
    photoLightbox.classList.add('hidden');
    photoLightbox.setAttribute('aria-hidden','true');
    document.body.classList.remove('lightbox-open');
    if(photoLightboxImage)photoLightboxImage.removeAttribute('src');
    if(photoLightboxDownload){photoLightboxDownload.removeAttribute('href');photoLightboxDownload.removeAttribute('download')}
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
    if(author.avatar)resAvatar.src=author.avatar;else resAvatar.removeAttribute('src');
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
        item.setAttribute('role','button');
        item.setAttribute('tabindex','0');
        item.setAttribute('aria-label',`${t('viewFullscreen')} ${i+1}`);
        item.addEventListener('click',()=>openPhotoLightbox(i));
        item.addEventListener('keydown',event=>{
          if(event.key==='Enter'||event.key===' '){
            event.preventDefault();
            openPhotoLightbox(i);
          }
        });

        const image=document.createElement('img');
        image.src=images[i];
        image.alt=`${t('photo')} ${i+1}`;
        image.loading=i<3?'eager':'lazy';
        image.referrerPolicy='no-referrer';

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
        item.append(image,viewButton,index);
        photoGallery.append(item);
      }
      photoGallery.classList.remove('hidden');
    }
  }
  function renderVideoResult(data){
    mediaCard?.classList.remove('photo-result');
    mediaThumbnailContainer?.classList.remove('hidden');
    currentPhotoImages=[];
    currentPhotoDownloads=[];
    if(photoGallery){photoGallery.innerHTML='';photoGallery.classList.add('hidden')}
    resDuration.classList.remove('hidden');
    resThumbnail.classList.remove('hidden');
    resThumbnail.alt=lang==='ar'?'صورة مصغرة للفيديو':'Video thumbnail';
    if(data.thumbnail)resThumbnail.src=data.thumbnail;else resThumbnail.removeAttribute('src');
    if(typeof data.videoDuration==='number' && data.videoDuration>0){const totalSeconds=Math.round(data.videoDuration);const minutes=Math.floor(totalSeconds/60);const seconds=String(totalSeconds%60).padStart(2,'0');resDuration.textContent=`${minutes}:${seconds}`}else resDuration.textContent='';
    setAuthor(data);
    resTitle.textContent=data.title || (lang==='ar'?'فيديو تيك توك':'TikTok Video');
    downloadStd.href=data.downloadUrl;
    downloadStd.setAttribute('download','tikvideo.mp4');
    downloadStd.classList.remove('hidden');
    const standardLabel=downloadStd.querySelector('[data-i18n]');
    if(standardLabel)standardLabel.textContent=t('downloadMp4');
    downloadStd.setAttribute('aria-label',t('downloadMp4'));
    if(data.hdDownloadUrl){downloadHd.href=data.hdDownloadUrl;downloadHd.setAttribute('download','tikvideo-hd.mp4');downloadHd.classList.remove('hidden');downloadHd.setAttribute('aria-label',t('downloadHd'))}else{downloadHd.removeAttribute('href');downloadHd.removeAttribute('download');downloadHd.classList.add('hidden')}
    setResultTitle(t('resultTitle'));
  }
  function setLoading(loading){submitBtn.disabled=loading;const buttonText=submitBtn.querySelector('.btn-text');if(buttonText)buttonText.textContent=loading?t('retrieving'):t('getVideo')}
  function isTikTokUrl(value){try{const parsed=new URL(value);const hostname=parsed.hostname.toLowerCase().replace(/^www\./,'');const allowedHosts=['tiktok.com','vm.tiktok.com','vt.tiktok.com','m.tiktok.com','douyin.com','www.douyin.com'];return allowedHosts.some(host=>hostname===host || hostname.endsWith(`.${host}`))}catch{return false}}
  async function readJson(response){const contentType=response.headers.get('content-type') || '';if(!contentType.includes('application/json'))throw new Error(`${t('unexpected')} (${response.status}).`);let data;try{data=await response.json()}catch{throw new Error(t('invalidJson'))}if(!response.ok)throw new Error(data?.error?.message || `${t('requestFailed')} (${response.status}).`);return data}
  downloadStd.addEventListener('click',event=>{
    if(mediaCard?.classList.contains('photo-result')){
      event.preventDefault();
      downloadAllPhotos();
    }
  });
  photoLightboxClose?.addEventListener('click',closePhotoLightbox);
  photoLightbox?.addEventListener('click',event=>{
    if(event.target===photoLightbox)closePhotoLightbox();
  });
  photoLightboxDownload?.addEventListener('click',event=>{
    if(!photoLightboxDownload.href)event.preventDefault();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!photoLightbox?.classList.contains('hidden'))closePhotoLightbox();
  });
  pasteBtn.addEventListener('click',async()=>{hideError();try{if(!navigator.clipboard?.readText)throw new Error(t('clipboardUnavailable'));const text=await navigator.clipboard.readText();if(!text){showError(t('clipboardEmpty'));return}urlInput.value=text.trim();urlInput.focus()}catch(error){showError(error?.message || t('clipboardManual'))}});
  clearBtn.addEventListener('click',()=>{urlInput.value='';hideError();hideStatus();resetResult();urlInput.focus()});
  form.addEventListener('submit',async event=>{
    event.preventDefault();hideError();resetResult();
    const inputUrl=urlInput.value.trim();
    if(!inputUrl){showError(t('enterUrl'));urlInput.focus();return}
    if(inputUrl.length>2048){showError(t('tooLong'));return}
    if(!isTikTokUrl(inputUrl)){showError(t('invalidUrl'));urlInput.focus();return}
    setLoading(true);showStatus(t('session'));
    try{
      const tokenRes=await fetch('/api/token',{method:'POST',headers:{Accept:'application/json'},cache:'no-store'});
      const tokenData=await readJson(tokenRes);
      const sessionToken=tokenData?.data?.token;
      if(!sessionToken)throw new Error(t('serverToken'));
      showStatus(t('retrievingInfo'));
      const extractRes=await fetch(`/api/extract?url=${encodeURIComponent(inputUrl)}`,{method:'GET',headers:{Accept:'application/json',Authorization:`Bearer ${sessionToken}`},cache:'no-store'});
      const result=await readJson(extractRes);
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
      setTimeout(hideStatus,1200);
    }catch(error){
      console.error('TikVideo extraction error:',error);
      hideStatus();
      showError(error?.message || t('generic'));
    }finally{setLoading(false)}
  });
  applyLanguage();
});