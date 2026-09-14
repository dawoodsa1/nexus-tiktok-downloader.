document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('extract-form');
  const urlInput = document.getElementById('url-input');
  const submitBtn = document.getElementById('submit-btn');
  const pasteBtn = document.getElementById('paste-btn');
  const clearBtn = document.getElementById('clear-btn');

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

  /* =========================
     Helpers
  ========================= */

  function showError(message) {
    errorMessage.textContent = message || 'Something went wrong.';
    errorCard.classList.remove('hidden');
  }

  function hideError() {
    errorCard.classList.add('hidden');
    errorMessage.textContent = '';
  }

  function showStatus(message) {
    statusText.textContent = message;
    statusCard.classList.remove('hidden');
  }

  function hideStatus() {
    statusCard.classList.add('hidden');
  }

  function resetResult() {
    resultSection.classList.add('hidden');

    resThumbnail.removeAttribute('src');
    resAvatar.removeAttribute('src');

    resDuration.textContent = '';
    resAuthorName.textContent = 'Creator';
    resAuthorUser.textContent = '@user';
    resTitle.textContent = 'Video Description';

    downloadStd.removeAttribute('href');
    downloadHd.removeAttribute('href');

    downloadHd.classList.add('hidden');
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;

    const buttonText = submitBtn.querySelector('.btn-text');

    if (buttonText) {
      buttonText.textContent = loading
        ? 'Retrieving...'
        : 'Get Video';
    }
  }

  function isTikTokUrl(value) {
    try {
      const parsed = new URL(value);

      const hostname = parsed.hostname
        .toLowerCase()
        .replace(/^www\./, '');

      const allowedHosts = [
        'tiktok.com',
        'vm.tiktok.com',
        'vt.tiktok.com',
        'm.tiktok.com',
        'douyin.com',
        'www.douyin.com'
      ];

      return allowedHosts.some(
        host =>
          hostname === host ||
          hostname.endsWith(`.${host}`)
      );

    } catch {
      return false;
    }
  }

  async function readJson(response) {
    const contentType =
      response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error(
        `Server returned an unexpected response (${response.status}).`
      );
    }

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error('The server returned invalid JSON.');
    }

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        `Request failed (${response.status}).`
      );
    }

    return data;
  }

  /* =========================
     Paste
  ========================= */

  pasteBtn.addEventListener('click', async () => {
    hideError();

    try {
      if (!navigator.clipboard?.readText) {
        throw new Error('Clipboard access is not available.');
      }

      const text = await navigator.clipboard.readText();

      if (!text) {
        showError('Clipboard is empty.');
        return;
      }

      urlInput.value = text.trim();
      urlInput.focus();

    } catch {
      showError(
        'Unable to read the clipboard. Please paste the TikTok URL manually.'
      );
    }
  });

  /* =========================
     Clear
  ========================= */

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';

    hideError();
    hideStatus();
    resetResult();

    urlInput.focus();
  });

  /* =========================
     Extract
  ========================= */

  form.addEventListener('submit', async event => {
    event.preventDefault();

    hideError();
    resetResult();

    const inputUrl = urlInput.value.trim();

    if (!inputUrl) {
      showError('Please enter a TikTok URL.');
      urlInput.focus();
      return;
    }

    if (inputUrl.length > 2048) {
      showError('The URL is too long.');
      return;
    }

    if (!isTikTokUrl(inputUrl)) {
      showError('Please enter a valid TikTok URL.');
      urlInput.focus();
      return;
    }

    setLoading(true);
    showStatus('Creating secure session...');

    try {

      /* =========================
         Step 1: Session Token
      ========================= */

      const tokenRes = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      const tokenData = await readJson(tokenRes);

      const sessionToken = tokenData?.data?.token;

      if (!sessionToken) {
        throw new Error(
          'The server did not return a valid session token.'
        );
      }

      /* =========================
         Step 2: Extract
      ========================= */

      showStatus('Retrieving video information...');

      const extractRes = await fetch(
        `/api/extract?url=${encodeURIComponent(inputUrl)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          cache: 'no-store'
        }
      );

      const result = await readJson(extractRes);

      if (!result?.success || !result?.data) {
        throw new Error(
          result?.error?.message ||
          'The video could not be retrieved.'
        );
      }

      const data = result.data;

      /* =========================
         Validate download URL
      ========================= */

      if (!data.downloadUrl) {
        throw new Error(
          'The server did not provide a download URL.'
        );
      }

      /* =========================
         Thumbnail
      ========================= */

      if (data.thumbnail) {
        resThumbnail.src = data.thumbnail;
      } else {
        resThumbnail.removeAttribute('src');
      }

      /* =========================
         Duration
      ========================= */

      if (
        typeof data.videoDuration === 'number' &&
        data.videoDuration > 0
      ) {
        const totalSeconds =
          Math.round(data.videoDuration);

        const minutes =
          Math.floor(totalSeconds / 60);

        const seconds =
          String(totalSeconds % 60).padStart(2, '0');

        resDuration.textContent =
          `${minutes}:${seconds}`;
      } else {
        resDuration.textContent = '';
      }

      /* =========================
         Author
      ========================= */

      const author = data.author || {};

      resAuthorName.textContent =
        author.name || 'Creator';

      resAuthorUser.textContent =
        `@${author.username || 'user'}`;

      if (author.avatar) {
        resAvatar.src = author.avatar;
      } else {
        resAvatar.removeAttribute('src');
      }

      /* =========================
         Title
      ========================= */

      resTitle.textContent =
        data.title || 'TikTok Video';

      /* =========================
         Standard Download
      ========================= */

      downloadStd.href = data.downloadUrl;

      downloadStd.setAttribute(
        'aria-label',
        'Download MP4'
      );

      /* =========================
         HD Download
      ========================= */

      if (data.hdDownloadUrl) {

        downloadHd.href =
          data.hdDownloadUrl;

        downloadHd.classList.remove('hidden');

        downloadHd.setAttribute(
          'aria-label',
          'Download HD MP4'
        );

      } else {

        downloadHd.removeAttribute('href');

        downloadHd.classList.add('hidden');

      }

      /* =========================
         Show Result
      ========================= */

      resultSection.classList.remove('hidden');

      showStatus('Video ready.');

      setTimeout(() => {
        hideStatus();
      }, 1200);

    } catch (error) {

      console.error('Nexus extraction error:', error);

      hideStatus();

      showError(
        error?.message ||
        'Unable to retrieve the video. Please try again.'
      );

    } finally {

      setLoading(false);

    }
  });
});
