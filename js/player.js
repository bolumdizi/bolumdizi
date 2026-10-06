/* ====================================================
   BölümDizi - Video Player & Watch Engine (player.js)
==================================================== */

let currentWatchData = null;
let currentSourceIndex = 0;
let isCinemaMode = false;
let autoNextEnabled = true;

// Extract slug, season, episode from URL
function getWatchParams() {
  const path = window.location.pathname; // e.g. /dizi/breaking-bad/sezon-1/bolum-2
  const match = path.match(/\/dizi\/([^\/]+)\/sezon-(\d+)\/bolum-(\d+)/);
  if (match) {
    return { slug: match[1], season: parseInt(match[2]), episode: parseInt(match[3]) };
  }
  // Fallback to query params (?slug=...&season=...&episode=...)
  const urlParams = new URLSearchParams(window.location.search);
  return {
    slug: urlParams.get('slug'),
    season: parseInt(urlParams.get('season') || '1'),
    episode: parseInt(urlParams.get('episode') || '1')
  };
}

async function initPlayer() {
  const params = getWatchParams();
  if (!params.slug) {
    document.getElementById('playerLoading').innerHTML = 'Geçersiz dizi parametresi.';
    return;
  }

  try {
    const res = await fetch(`/api/watch/${params.slug}/${params.season}/${params.episode}`);
    if (!res.ok) throw new Error('Bölüm bulunamadı');

    currentWatchData = await res.json();
    renderPlayerPage(currentWatchData);

    // Save to Watch History (for continue watching feature)
    saveToHistory(currentWatchData);

    // Load episode comments
    loadComments(currentWatchData.episode.id, currentWatchData.series.id);

  } catch (err) {
    console.error('Player init error:', err);
    document.getElementById('playerLoading').innerHTML = `
      <div style="text-align: center; padding: 50px;">
        <h3>Bölüm Bulunamadı</h3>
        <p style="color: #94a3b8; margin-top: 8px;">Aradığınız bölüm henüz eklenmemiş veya kaldırılmış olabilir.</p>
        <a href="/" class="btn-primary" style="margin-top: 16px; display: inline-block;">Ana Sayfaya Dön</a>
      </div>
    `;
  }
}

function renderPlayerPage(data) {
  const { series, episode, prevEpisode, nextEpisode, allEpisodes } = data;

  // Breadcrumbs
  document.getElementById('breadcrumbSeries').textContent = series.title;
  document.getElementById('breadcrumbSeries').href = formatSeriesUrl(series.slug);
  document.getElementById('breadcrumbEpisode').textContent = `${episode.seasonNumber}. Sezon ${episode.episodeNumber}. Bölüm`;

  // Titles
  document.getElementById('watchSeriesTitle').textContent = `${series.title} - ${episode.seasonNumber}. Sezon ${episode.episodeNumber}. Bölüm`;
  document.getElementById('watchEpisodeTitle').textContent = episode.title || `${episode.seasonNumber}. Sezon ${episode.episodeNumber}. Bölüm`;
  document.getElementById('watchOverview').textContent = episode.overview || 'Bu bölüm için henüz özet eklenmemiş.';

  // Page title
  document.title = `${series.title} ${episode.seasonNumber}.Sezon ${episode.episodeNumber}.Bölüm İzle - BölümDizi`;

  // Render Video Sources Tabs
  renderSources(episode.sources || []);

  // Navigation Buttons
  const prevBtn = document.getElementById('prevEpisodeBtn');
  const nextBtn = document.getElementById('nextEpisodeBtn');

  if (prevBtn) {
    if (prevEpisode) {
      prevBtn.style.display = 'inline-flex';
      prevBtn.href = formatWatchUrl(series.slug, prevEpisode.seasonNumber, prevEpisode.episodeNumber);
      prevBtn.title = `${prevEpisode.seasonNumber}. Sezon ${prevEpisode.episodeNumber}. Bölüm: ${prevEpisode.title}`;
    } else {
      prevBtn.style.display = 'none';
    }
  }

  if (nextBtn) {
    if (nextEpisode) {
      nextBtn.style.display = 'inline-flex';
      nextBtn.href = formatWatchUrl(series.slug, nextEpisode.seasonNumber, nextEpisode.episodeNumber);
      nextBtn.title = `${nextEpisode.seasonNumber}. Sezon ${nextEpisode.episodeNumber}. Bölüm: ${nextEpisode.title}`;
    } else {
      nextBtn.style.display = 'none';
    }
  }

  // Populate Episode Drawer / Dropdown
  renderEpisodeListDropdown(allEpisodes, series.slug, episode.seasonNumber, episode.episodeNumber);

  // Check watched status
  checkWatchedStatus(episode.id);

  // Hide loading
  document.getElementById('playerLoading').style.display = 'none';
  document.getElementById('playerContent').style.display = 'block';
}

function renderSources(sources) {
  const sourcesContainer = document.getElementById('sourcesList');
  if (!sourcesContainer) return;

  if (!sources || sources.length === 0) {
    sources = [{ name: 'Varsayılan Kaynak', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', type: 'video' }];
  }

  sourcesContainer.innerHTML = sources.map((src, idx) => `
    <button class="source-btn ${idx === currentSourceIndex ? 'active' : ''}" onclick="switchSource(${idx})">
      ⚡ ${src.name}
    </button>
  `).join('');

  loadVideoSource(sources[currentSourceIndex]);
}

window.switchSource = function(idx) {
  if (!currentWatchData || !currentWatchData.episode.sources[idx]) return;
  currentSourceIndex = idx;

  document.querySelectorAll('.source-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });

  loadVideoSource(currentWatchData.episode.sources[idx]);
};

function loadVideoSource(source) {
  const playerBox = document.getElementById('videoPlayerBox');
  if (!playerBox || !source) return;

  if (source.type === 'video' || source.url.endsWith('.mp4') || source.url.endsWith('.m3u8')) {
    playerBox.innerHTML = `
      <video id="html5VideoPlayer" controls autoplay playsinline style="width: 100%; height: 100%; object-fit: contain; background: #000;">
        <source src="${source.url}" type="video/mp4">
        Tarayıcınız video oynatmayı desteklemiyor.
      </video>
    `;

    const vid = document.getElementById('html5VideoPlayer');
    if (vid) {
      vid.addEventListener('ended', () => {
        if (autoNextEnabled && currentWatchData && currentWatchData.nextEpisode) {
          const next = currentWatchData.nextEpisode;
          window.location.href = `/dizi/${currentWatchData.series.slug}/sezon-${next.seasonNumber}/bolum-${next.episodeNumber}`;
        }
      });
    }

  } else {
    // Iframe embed
    playerBox.innerHTML = `
      <iframe src="${source.url}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" frameborder="0"></iframe>
    `;
  }
}

// Cinema Mode / Lights Off Toggle
window.toggleCinemaMode = function() {
  isCinemaMode = !isCinemaMode;
  const overlay = document.getElementById('cinemaOverlay');
  const container = document.getElementById('videoPlayerContainer');
  const btn = document.getElementById('cinemaModeBtn');

  if (overlay) overlay.classList.toggle('active', isCinemaMode);
  if (container) container.classList.toggle('cinema-mode', isCinemaMode);
  if (btn) btn.classList.toggle('active', isCinemaMode);

  if (isCinemaMode) {
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

// Autoplay Toggle
window.toggleAutoNext = function() {
  autoNextEnabled = !autoNextEnabled;
  const btn = document.getElementById('autoNextBtn');
  if (btn) {
    btn.classList.toggle('active', autoNextEnabled);
    btn.innerHTML = autoNextEnabled ? '⚡ Otomatik Geçiş: Açık' : '⏸ Otomatik Geçiş: Kapalı';
  }
};

// Watched status toggle
window.toggleWatchedStatus = async function() {
  if (!currentWatchData) return;
  const ep = currentWatchData.episode;
  const epId = ep.id;
  let watched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');

  const currentlyWatched = Boolean(watched[epId]);
  const newStatus = !currentlyWatched;

  if (newStatus) {
    watched[epId] = {
      watchedAt: new Date().toISOString(),
      seriesSlug: currentWatchData.series.slug,
      seasonNumber: ep.seasonNumber,
      episodeNumber: ep.episodeNumber
    };
  } else {
    delete watched[epId];
  }
  localStorage.setItem('bolum_dizi_watched_eps', JSON.stringify(watched));
  checkWatchedStatus(epId);

  // Sync with server if logged in
  const user = JSON.parse(localStorage.getItem('bolum_dizi_user') || 'null');
  if (user && user.id) {
    try {
      const res = await fetch('/api/auth/watched/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          episodeId: epId,
          seriesSlug: currentWatchData.series.slug,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          isWatched: newStatus
        })
      });
      const data = await res.json();
      if (data && data.watchedEpisodes) {
        localStorage.setItem('bolum_dizi_watched_eps', JSON.stringify(data.watchedEpisodes));
      }
    } catch (e) {
      console.warn('Could not sync watched episode to server:', e);
    }
  }
};

function checkWatchedStatus(epId) {
  const watched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');
  const btn = document.getElementById('watchedBtn');
  if (btn) {
    if (watched[epId]) {
      btn.classList.add('active');
      btn.innerHTML = '<i class="fa-solid fa-check"></i> İzlendi';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fa-regular fa-eye"></i> İzlendi Olarak İşaretle';
    }
  }
}

// Episode Drawer rendering
function renderEpisodeListDropdown(episodes, slug, curSeason, curEpisode) {
  const select = document.getElementById('episodeSelectDropdown');
  if (!select) return;

  select.innerHTML = episodes.map(ep => `
    <option value="/dizi/${slug}/sezon-${ep.seasonNumber}/bolum-${ep.episodeNumber}" 
      ${ep.seasonNumber === curSeason && ep.episodeNumber === curEpisode ? 'selected' : ''}>
      ${ep.seasonNumber}. Sezon ${ep.episodeNumber}. Bölüm - ${ep.title} (${ep.duration || '50 dk'})
    </option>
  `).join('');

  select.addEventListener('change', (e) => {
    window.location.href = e.target.value;
  });
}

// Save to Watch History
function saveToHistory(data) {
  const { series, episode } = data;
  let history = JSON.parse(localStorage.getItem('bolum_dizi_history') || '[]');

  // Remove existing entry for this series
  history = history.filter(item => item.slug !== series.slug);

  history.unshift({
    seriesId: series.id,
    seriesTitle: series.title,
    slug: series.slug,
    poster: episode.stillPath || series.poster,
    season: episode.seasonNumber,
    episode: episode.episodeNumber,
    episodeTitle: episode.title,
    timestamp: Date.now()
  });

  // Keep last 25
  localStorage.setItem('bolum_dizi_history', JSON.stringify(history.slice(0, 25)));

  // Also auto mark episode as watched
  let watched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');
  if (!watched[episode.id]) {
    watched[episode.id] = true;
    localStorage.setItem('bolum_dizi_watched_eps', JSON.stringify(watched));
    const user = JSON.parse(localStorage.getItem('bolum_dizi_user') || 'null');
    if (user && user.id) {
      fetch('/api/auth/watched/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          episodeId: episode.id,
          seriesSlug: series.slug,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber
        })
      }).catch(e => console.warn(e));
    }
  }
}

// Report Broken Link Modal
window.openReportModal = function() {
  document.getElementById('reportModal').classList.add('active');
};
window.closeReportModal = function() {
  document.getElementById('reportModal').classList.remove('active');
};

window.submitReport = async function(e) {
  e.preventDefault();
  if (!currentWatchData) return;

  const issueType = document.getElementById('reportIssueType').value;
  const userNote = document.getElementById('reportNote').value;
  const currentSource = currentWatchData.episode.sources[currentSourceIndex] || { name: 'Genel' };

  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seriesTitle: currentWatchData.series.title,
        episodeTitle: `${currentWatchData.episode.seasonNumber}. Sezon ${currentWatchData.episode.episodeNumber}. Bölüm`,
        sourceName: currentSource.name,
        issueType,
        userNote
      })
    });

    if (res.ok) {
      alert('Bildiriminiz başarıyla iletildi. En kısa sürede kontrol edilecektir, teşekkürler!');
      closeReportModal();
      document.getElementById('reportNote').value = '';
    } else {
      alert('Bildirim gönderilirken bir hata oluştu.');
    }
  } catch (err) {
    console.error('Report error:', err);
    alert('Bağlantı hatası.');
  }
};

// Comments & Spoiler System
async function loadComments(episodeId, seriesId) {
  const container = document.getElementById('commentsContainer');
  if (!container) return;

  try {
    const res = await fetch(`/api/comments?episodeId=${episodeId}`);
    const comments = await res.json();

    const countElem = document.getElementById('commentCount');
    if (countElem) countElem.textContent = `(${comments.length})`;

    if (comments.length === 0) {
      container.innerHTML = '<div style="color: #64748b; padding: 14px 0; font-size: 0.9rem;">Bu bölüme henüz yorum yapılmamış. İlk yorumu sen yap!</div>';
      return;
    }

    container.innerHTML = comments.map(c => `
      <div class="comment-item" id="comment-${c.id}">
        <div class="comment-header">
          <div class="comment-author">💬 ${c.author}</div>
          <div class="comment-date">${timeAgo(c.createdAt)}</div>
        </div>
        ${c.isSpoiler ? `
          <div class="spoiler-warning-banner" onclick="revealSpoiler('${c.id}')">
            ⚠️ Bu yorum <b>spoiler</b> içerir. Okumak için tıklayınız.
          </div>
          <p class="comment-text spoiler-hidden" id="text-${c.id}" onclick="revealSpoiler('${c.id}')">${c.text}</p>
        ` : `
          <p class="comment-text">${c.text}</p>
        `}
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading comments:', err);
  }
}

window.revealSpoiler = function(id) {
  const textElem = document.getElementById(`text-${id}`);
  if (textElem) {
    textElem.classList.remove('spoiler-hidden');
    textElem.classList.add('spoiler-revealed');
  }
};

window.submitComment = async function(e) {
  e.preventDefault();
  if (!currentWatchData) return;

  const author = document.getElementById('commentAuthor').value.trim();
  const text = document.getElementById('commentText').value.trim();
  const isSpoiler = document.getElementById('commentIsSpoiler').checked;

  if (!author || !text) {
    alert('Lütfen adınızı ve yorumunuzu yazın.');
    return;
  }

  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seriesId: currentWatchData.series.id,
        episodeId: currentWatchData.episode.id,
        author,
        text,
        isSpoiler
      })
    });

    if (res.ok) {
      document.getElementById('commentText').value = '';
      document.getElementById('commentIsSpoiler').checked = false;
      loadComments(currentWatchData.episode.id, currentWatchData.series.id);
    } else {
      alert('Yorum eklenirken hata oluştu.');
    }
  } catch (err) {
    console.error('Submit comment error:', err);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initPlayer();
});
