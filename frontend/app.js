document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('extract-form');
  const urlInput = document.getElementById('url-input');
  const submitBtn = document.getElementById('submit-btn');
  const pasteBtn = document.getElementById('paste-btn');
  const clearBtn = document.getElementById('clear-btn');
  const statusCard = document.getElementById('status-card');
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

  pasteBtn.onclick = async () => {
    try { urlInput.value = await navigator.clipboard.readText(); } catch {}
  };
  clearBtn.onclick = () => { urlInput.value = ''; resultSection.classList.add('hidden'); };

  form.onsubmit = async (e) => {
    e.preventDefault();
    errorCard.classList.add('hidden');
    resultSection.classList.add('hidden');
    statusCard.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
      const tokenRes = await fetch('/api/token', { method: 'POST' });
      const { data: { token } } = await tokenRes.json();
      const extractRes = await fetch(`/api/extract?url=${encodeURIComponent(urlInput.value)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await extractRes.json();
      if (!resData.success) throw new Error(resData.error?.message || 'The video could not be retrieved.');
      
      resThumbnail.src = resData.data.thumbnail;
      resDuration.textContent = resData.data.videoDuration ? `${resData.data.videoDuration}s` : '';
      resAvatar.src = resData.data.author?.avatar || '';
      resAuthorName.textContent = resData.data.author?.name || 'Creator';
      resAuthorUser.textContent = `@${resData.data.author?.username || 'user'}`;
      resTitle.textContent = resData.data.title;
      downloadStd.href = resData.data.downloadUrl;
      if (resData.data.hdDownloadUrl) {
        downloadHd.href = resData.data.hdDownloadUrl;
        downloadHd.classList.remove('hidden');
      } else {
        downloadHd.classList.add('hidden');
      }
      resultSection.classList.remove('hidden');
    } catch (err) {
      errorMessage.textContent = err.message;
      errorCard.classList.remove('hidden');
    } finally {
      statusCard.classList.add('hidden');
      submitBtn.disabled = false;
    }
  };
});
