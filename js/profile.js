/* ====================================================
   BölümDizi - Comprehensive User Profile Script (profile.js)
==================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initProfilePage();
});

let profileUserData = null;
let currentProfileSeriesList = [];
let currentProgressData = null;

async function initProfilePage() {
  const userStr = localStorage.getItem('bolum_dizi_user');
  if (!userStr) {
    showGuestWarning();
    return;
  }

  try {
    profileUserData = JSON.parse(userStr);
  } catch (e) {
    showGuestWarning();
    return;
  }

  // Sync local watched episodes with server if any
  try {
    const localWatched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');
    if (Object.keys(localWatched).length > 0) {
      await fetch('/api/auth/watched/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profileUserData.id, watchedEpisodes: localWatched })
      });
    }
  } catch (e) {
    console.warn('Sync watched error:', e);
  }

  // Refresh latest user data from server if possible
  try {
    const res = await fetch(`/api/auth/me?userId=${profileUserData.id}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        profileUserData = { ...profileUserData, ...data };
        localStorage.setItem('bolum_dizi_user', JSON.stringify(profileUserData));
      }
    }
  } catch (e) {
    console.warn('Could not sync user from server:', e);
  }

  renderUserProfileHero(profileUserData);
  loadProfileProgress();
  loadProfileWatchlist();
  loadProfileHistory();
  loadProfileComments();
  populateProfileSettingsForm(profileUserData);
}

function showGuestWarning() {
  const warning = document.getElementById('profileGuestWarning');
  const main = document.getElementById('profileMainContent');
  if (warning) warning.style.display = 'block';
  if (main) main.style.display = 'none';
}

function renderUserProfileHero(user) {
  const warning = document.getElementById('profileGuestWarning');
  const main = document.getElementById('profileMainContent');
  if (warning) warning.style.display = 'none';
  if (main) main.style.display = 'block';

  const displayName = user.displayName || user.username || 'Üye';
  const avatarVal = user.avatar || displayName.charAt(0).toUpperCase();

  const bigAvatar = document.getElementById('profileBigAvatar');
  if (bigAvatar) bigAvatar.innerHTML = avatarVal;

  const nameEl = document.getElementById('profileDisplayName');
  if (nameEl) nameEl.textContent = displayName;

  const usernameEl = document.getElementById('profileUsername');
  if (usernameEl) usernameEl.textContent = user.username || '';

  const emailEl = document.getElementById('profileEmail');
  if (emailEl) emailEl.textContent = user.email || '';

  const joinEl = document.getElementById('profileJoinDate');
  if (joinEl && user.createdAt) {
    const dt = new Date(user.createdAt);
    joinEl.textContent = `Üyelik: ${dt.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`;
  }

  const bioEl = document.getElementById('profileBioText');
  if (bioEl) {
    bioEl.textContent = user.bio && user.bio.trim() 
      ? user.bio 
      : 'BölümDizi film ve yabancı dizi topluluğunun aktif bir üyesi. Favori dizilerini canlı takip ediyor.';
  }
}

// Tab Switching
window.switchProfileTab = function(tabName) {
  const tabs = ['progress', 'watchlist', 'history', 'comments', 'settings'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn${capitalize(t)}`);
    const panel = document.getElementById(`panel${capitalize(t)}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (panel) panel.classList.toggle('active', t === tabName);
  });
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ====================================================
// 1. DIZI ILERLEMESI & DETAYLI BOLUM ANALIZI (PROGRESS)
// ====================================================
async function loadProfileProgress() {
  const list = document.getElementById('profileProgressList');
  const tabCount = document.getElementById('tabCountProgress');
  const statWatched = document.getElementById('statTotalWatchedEps');
  const statCompleted = document.getElementById('statCompletedSeries');
  const estHours = document.getElementById('statEstimatedHours');

  if (!list || !profileUserData) return;

  list.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 1.6rem; color: var(--primary);"></i> Dizi ilerleme durumunuz analiz ediliyor...</div>';

  try {
    const res = await fetch(`/api/auth/progress?userId=${profileUserData.id}`);
    const data = await res.json();
    currentProgressData = data;

    const seriesList = data.series || [];
    if (tabCount) tabCount.textContent = seriesList.length;
    if (statWatched) statWatched.textContent = data.totalWatchedEpisodes || 0;
    if (statCompleted) statCompleted.textContent = data.completedSeriesCount || 0;
    if (estHours) {
      const hours = ((data.totalWatchedEpisodes || 0) * 0.85).toFixed(1);
      estHours.textContent = `${hours} saat`;
    }

    if (seriesList.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
          <i class="fa-solid fa-chart-pie" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 14px; display: block;"></i>
          <h4 style="font-size: 1.25rem; color: #fff; margin-bottom: 8px;">Henüz İzleme İlerlemeniz Bulunmuyor</h4>
          <p style="color: var(--text-muted); font-size: 0.92rem; max-width: 500px; margin: 0 auto 20px;">
            Dizi bölümlerini izledikçe veya "İzlendi" olarak işaretledikçe, hangi dizide kaçta kaç bölüm izlediğiniz ve sezon detayları burada otomatik gösterilecektir.
          </p>
          <a href="/kesfet" class="btn-primary" style="display: inline-flex; padding: 10px 22px;">
            <i class="fa-solid fa-play"></i> Dizi İzlemeye Başla
          </a>
        </div>
      `;
      return;
    }

    list.innerHTML = seriesList.map((item, index) => renderSeriesProgressCard(item, index)).join('');

  } catch (err) {
    console.error('Progress load error:', err);
    list.innerHTML = '<div style="color: var(--accent-red); padding: 30px; text-align: center;">İlerleme bilgileri alınırken hata oluştu.</div>';
  }
}

function renderSeriesProgressCard(item, index) {
  const isCompleted = item.totalEpisodes > 0 && item.watchedEpisodes >= item.totalEpisodes;
  const isWatching = item.watchedEpisodes > 0 && !isCompleted;
  
  let pillHtml = '';
  if (isCompleted) {
    pillHtml = '<span class="progress-status-pill completed"><i class="fa-solid fa-check-double"></i> Tamamlandı</span>';
  } else if (isWatching) {
    pillHtml = '<span class="progress-status-pill watching"><i class="fa-solid fa-circle-play"></i> İzleniyor</span>';
  } else {
    pillHtml = '<span class="progress-status-pill not-started"><i class="fa-regular fa-clock"></i> Başlanmadı</span>';
  }

  const seriesUrl = typeof formatSeriesUrl === 'function' ? formatSeriesUrl(item.slug) : `/dizi/${item.slug}`;

  return `
    <article class="progress-series-card" id="progressCard_${item.slug}">
      <div class="progress-card-main" onclick="toggleProgressAccordion('${item.slug}')">
        <img src="${item.poster || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200'}" alt="${item.title}" class="progress-card-poster">
        
        <div class="progress-card-content">
          <div class="progress-card-title-row">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
              <h4 class="progress-card-title">${item.title}</h4>
              ${pillHtml}
            </div>
            <div style="font-weight: 800; font-size: 1.15rem; color: var(--primary);">
              %${item.percent}
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width: ${item.percent}%;"></div>
          </div>

          <div class="progress-card-meta">
            <div>
              <strong style="color: #fff; font-size: 0.95rem;">${item.watchedEpisodes}</strong>
              <span style="color: var(--text-dim);"> / ${item.totalEpisodes} Bölüm İzlendi</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span><i class="fa-solid fa-star" style="color: var(--accent-gold);"></i> ${item.imdb || '8.5'}</span>
              <span>•</span>
              <span>${item.seasons.length} Sezon</span>
              <span>•</span>
              <span style="color: var(--primary); font-weight: 600;"><i class="fa-solid fa-circle-info"></i> Detayları Göster</span>
            </div>
          </div>
        </div>

        <div class="progress-card-toggle-icon">
          <i class="fa-solid fa-chevron-down"></i>
        </div>
      </div>

      <!-- Açılır Sezon & Bölüm Detay Alanı -->
      <div class="progress-card-details">
        <div class="progress-details-header">
          <div>
            <i class="fa-solid fa-layer-group" style="color: var(--primary);"></i>
            <span>Sezon ve Bölüm Bazlı İlerleme Tablosu</span>
          </div>
          <a href="${seriesUrl}" class="btn-primary" style="padding: 6px 14px; font-size: 0.82rem;">
            <i class="fa-solid fa-play"></i> Dizi Sayfasına Git
          </a>
        </div>

        <div class="seasons-breakdown-list">
          ${item.seasons.map(season => `
            <div class="season-breakdown-block">
              <div class="season-breakdown-title-bar">
                <div class="season-breakdown-name">
                  <i class="fa-regular fa-folder-open" style="color: var(--secondary);"></i>
                  <span>${season.seasonNumber}. Sezon</span>
                </div>
                <div class="season-mini-progress">
                  <span style="color: var(--primary); font-weight: 800;">${season.watchedEpisodes}</span> / ${season.totalEpisodes} Bölüm (%${season.percent})
                </div>
              </div>

              <!-- Mini Season Progress Bar -->
              <div class="progress-bar-wrap" style="height: 5px; margin: 4px 0 10px;">
                <div class="progress-bar-fill" style="width: ${season.percent}%;"></div>
              </div>

              <!-- Bölüm Çipleri (Episode Chips) -->
              <div class="episodes-chips-grid">
                ${season.episodes.map(ep => {
                  const watchUrl = typeof formatWatchUrl === 'function'
                    ? formatWatchUrl(item.slug, season.seasonNumber, ep.episodeNumber)
                    : `/dizi/${item.slug}/sezon-${season.seasonNumber}/bolum-${ep.episodeNumber}`;

                  return `
                    <div class="episode-chip ${ep.isWatched ? 'watched' : ''}" onclick="toggleEpisodeWatchFromProfile(event, '${item.slug}', '${ep.id}', ${season.seasonNumber}, ${ep.episodeNumber})" title="${ep.isWatched ? 'İzlendi olarak işaretlendi (Tıklayarak durumu değiştir)' : 'İzlenmedi (Tıklayarak izlendi yap)'}">
                      <div class="episode-chip-status">
                        ${ep.isWatched ? '<i class="fa-solid fa-check"></i>' : ep.episodeNumber}
                      </div>
                      <div class="episode-chip-label">
                        ${season.seasonNumber}x${ep.episodeNumber < 10 ? '0' + ep.episodeNumber : ep.episodeNumber} Bölüm
                      </div>
                      <a href="${watchUrl}" onclick="event.stopPropagation();" title="Bölümü İzle" style="color: var(--text-dim); margin-left: auto; padding: 2px 4px;">
                        <i class="fa-solid fa-play" style="font-size: 0.7rem;"></i>
                      </a>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </article>
  `;
}

window.toggleProgressAccordion = function(slug) {
  const card = document.getElementById(`progressCard_${slug}`);
  if (card) {
    card.classList.toggle('expanded');
  }
};

window.toggleEpisodeWatchFromProfile = async function(event, seriesSlug, epId, seasonNumber, episodeNumber) {
  event.stopPropagation();
  if (!profileUserData) return;

  // Optimistic update locally
  let watched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');
  if (watched[epId]) {
    delete watched[epId];
  } else {
    watched[epId] = true;
  }
  localStorage.setItem('bolum_dizi_watched_eps', JSON.stringify(watched));

  try {
    await fetch('/api/auth/watched/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: profileUserData.id,
        episodeId: epId,
        seriesSlug,
        seasonNumber,
        episodeNumber
      })
    });
  } catch (e) {
    console.warn('Toggle watch error:', e);
  }

  // Reload progress data silently
  await loadProfileProgress();
  // Keep accordion open for this series
  const card = document.getElementById(`progressCard_${slug}`);
  if (card) card.classList.add('expanded');
};

// ====================================================
// 2. WATCHLIST LOADING & RENDERING
// ====================================================
async function loadProfileWatchlist() {
  const grid = document.getElementById('profileWatchlistGrid');
  const countBadge = document.getElementById('statWatchlistCount');
  const tabCount = document.getElementById('tabCountWatchlist');
  if (!grid || !profileUserData) return;

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary);"></i> Diziler yükleniyor...</div>';

  try {
    const res = await fetch(`/api/auth/watchlist?userId=${profileUserData.id}`);
    const data = await res.json();
    currentProfileSeriesList = data.watchlist || [];

    if (countBadge) countBadge.textContent = currentProfileSeriesList.length;
    if (tabCount) tabCount.textContent = currentProfileSeriesList.length;

    if (currentProfileSeriesList.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
          <i class="fa-regular fa-bookmark" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 14px; display: block;"></i>
          <h4 style="font-size: 1.2rem; color: #fff; margin-bottom: 8px;">Takip Ettiğiniz Dizi Bulunmuyor</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">Dizi detay sayfalarından "Listeme Ekle" butonuna basarak favori dizilerinizi buraya ekleyebilirsiniz.</p>
          <a href="/kesfet" class="btn-primary" style="display: inline-flex; padding: 10px 22px;">
            <i class="fa-solid fa-compass"></i> Dizileri Keşfet
          </a>
        </div>
      `;
      return;
    }

    grid.innerHTML = currentProfileSeriesList.map(s => `
      <article class="series-card">
        <a href="${typeof formatSeriesUrl === 'function' ? formatSeriesUrl(s.slug) : '/dizi/' + s.slug}">
          <div class="series-poster-box">
            <img src="${s.poster}" alt="${s.title}" loading="lazy">
            <span class="series-rating-badge"><i class="fa-solid fa-star"></i> ${s.imdb || '8.5'}</span>
            <span class="series-status-badge ${s.status === 'Tamamlandı' ? 'completed' : 'ongoing'}">${s.status || 'Devam Ediyor'}</span>
          </div>
        </a>
        <div class="series-info">
          <a href="${typeof formatSeriesUrl === 'function' ? formatSeriesUrl(s.slug) : '/dizi/' + s.slug}">
            <h3 class="series-title" title="${s.title}">${s.title}</h3>
          </a>
          <div class="series-meta">
            <span>${s.year || 2024}</span>
            <span>•</span>
            <span>${(s.genres || []).slice(0, 2).join(', ')}</span>
          </div>
          <div style="margin-top: 10px; display: flex; gap: 8px;">
            <a href="${typeof formatSeriesUrl === 'function' ? formatSeriesUrl(s.slug) : '/dizi/' + s.slug}" class="btn-primary" style="flex: 1; padding: 6px 10px; font-size: 0.8rem; justify-content: center;">
              <i class="fa-solid fa-play"></i> İzle
            </a>
            <button class="ctrl-btn" onclick="removeSeriesFromWatchlist('${s.slug}')" title="Listeden Çıkar" style="padding: 6px 10px; color: var(--accent-red); border-color: rgba(255, 51, 75, 0.3);">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </article>
    `).join('');

  } catch (err) {
    console.error('Watchlist fetch error:', err);
    grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--accent-red); padding: 30px; text-align: center;">Listeniz yüklenirken hata oluştu.</div>';
  }
}

window.removeSeriesFromWatchlist = async function(slug) {
  if (typeof toggleWatchlist === 'function') {
    await toggleWatchlist(slug);
    loadProfileWatchlist();
    loadProfileProgress();
  }
};

// ====================================================
// 3. WATCH HISTORY LOADING & RENDERING
// ====================================================
function loadProfileHistory() {
  const grid = document.getElementById('profileHistoryGrid');
  const tabCount = document.getElementById('tabCountHistory');
  if (!grid) return;

  const history = JSON.parse(localStorage.getItem('bolum_dizi_history') || '[]');
  if (tabCount) tabCount.textContent = history.length;

  if (history.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
        <i class="fa-solid fa-clock-rotate-left" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 14px; display: block;"></i>
        <h4 style="font-size: 1.2rem; color: #fff; margin-bottom: 8px;">İzleme Geçmişiniz Boş</h4>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">İzlediğiniz dizi bölümleri ve kaldığınız yerler burada otomatik tutulur.</p>
        <a href="/" class="btn-primary" style="display: inline-flex; padding: 10px 22px;">
          <i class="fa-solid fa-play"></i> Dizi İzlemeye Başla
        </a>
      </div>
    `;
    return;
  }

  grid.innerHTML = history.map(item => {
    const watchUrl = typeof formatWatchUrl === 'function' 
      ? formatWatchUrl(item.slug, item.season, item.episode)
      : `/dizi/${item.slug}/sezon-${item.season}/bolum-${item.episode}`;
    const dateFormatted = item.timestamp ? new Date(item.timestamp).toLocaleDateString('tr-TR') : 'Bugün';

    return `
      <div class="history-card-item">
        <img src="${item.poster || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200'}" alt="${item.seriesTitle}" class="history-thumb">
        <div class="history-info">
          <div class="history-series-title" title="${item.seriesTitle}">${item.seriesTitle}</div>
          <div class="history-ep-title">${item.season}. Sezon ${item.episode}. Bölüm</div>
          <div class="history-time"><i class="fa-regular fa-clock"></i> ${dateFormatted}</div>
        </div>
        <a href="${watchUrl}" class="btn-primary" style="padding: 7px 12px; font-size: 0.8rem; border-radius: 8px; flex-shrink: 0;" title="Kaldığın Yerden Devam Et">
          <i class="fa-solid fa-play"></i>
        </a>
      </div>
    `;
  }).join('');
}

window.clearWatchHistory = function() {
  if (confirm('İzleme geçmişinizi temizlemek istediğinize emin misiniz?')) {
    localStorage.removeItem('bolum_dizi_history');
    loadProfileHistory();
  }
};

// ====================================================
// 4. COMMENTS LOADING & RENDERING
// ====================================================
async function loadProfileComments() {
  const container = document.getElementById('profileCommentsContainer');
  const countBadge = document.getElementById('statCommentsCount');
  const tabCount = document.getElementById('tabCountComments');
  if (!container || !profileUserData) return;

  container.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fa-solid fa-spinner fa-spin"></i> Yorumlar yükleniyor...</div>';

  try {
    const res = await fetch(`/api/auth/my-comments?userId=${profileUserData.id}&username=${encodeURIComponent(profileUserData.username)}`);
    const data = await res.json();
    const comments = data.comments || [];

    if (countBadge) countBadge.textContent = comments.length;
    if (tabCount) tabCount.textContent = comments.length;

    if (comments.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
          <i class="fa-regular fa-comment-dots" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 14px; display: block;"></i>
          <h4 style="font-size: 1.2rem; color: #fff; margin-bottom: 8px;">Henüz Yorum Yapmadınız</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">İzlediğiniz dizi bölümlerinin altında diğer izleyicilerle düşüncelerinizi paylaşabilirsiniz.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = comments.map(c => `
      <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">
            <i class="fa-solid fa-comment" style="color: var(--primary); margin-right: 6px;"></i> ${c.seriesTitle || 'Dizi Yorumu'}
          </div>
          <span style="font-size: 0.78rem; color: var(--text-dim);">
            ${c.createdAt ? new Date(c.createdAt).toLocaleDateString('tr-TR') : 'Az önce'}
          </span>
        </div>
        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; margin: 0;">${c.text}</p>
      </div>
    `).join('');

  } catch (err) {
    console.warn('Comments fetch error:', err);
    container.innerHTML = '<div style="color: var(--text-muted); padding: 20px; text-align: center;">Henüz kayıtlı yorum bulunamadı.</div>';
  }
}

// ====================================================
// 5. SETTINGS FORM POPULATION & SUBMISSION
// ====================================================
function populateProfileSettingsForm(user) {
  const nameInput = document.getElementById('settingDisplayName');
  const bioInput = document.getElementById('settingBio');
  const avatarInput = document.getElementById('selectedAvatarInput');
  const staticUser = document.getElementById('settingStaticUsername');
  const staticEmail = document.getElementById('settingStaticEmail');

  if (nameInput) nameInput.value = user.displayName || user.username || '';
  if (bioInput) bioInput.value = user.bio || '';
  if (staticUser) staticUser.value = user.username || '';
  if (staticEmail) staticEmail.value = user.email || '';
  if (avatarInput) avatarInput.value = user.avatar || '';

  highlightAvatarButton(user.avatar || '');
}

window.selectAvatarEmoji = function(emoji) {
  const input = document.getElementById('selectedAvatarInput');
  if (input) input.value = emoji;
  highlightAvatarButton(emoji);
};

function highlightAvatarButton(emoji) {
  document.querySelectorAll('.avatar-opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim() === emoji.trim());
  });
}

window.handleSaveProfileInfo = async function(e) {
  e.preventDefault();
  if (!profileUserData) return;

  const displayName = document.getElementById('settingDisplayName').value.trim();
  const bio = document.getElementById('settingBio').value.trim();
  const avatar = document.getElementById('selectedAvatarInput').value;
  const statusBox = document.getElementById('profileSaveStatus');

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: profileUserData.id,
        displayName,
        bio,
        avatar
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      profileUserData = { ...profileUserData, ...data.user };
      localStorage.setItem('bolum_dizi_user', JSON.stringify(profileUserData));

      renderUserProfileHero(profileUserData);
      if (typeof updateAuthUI === 'function') updateAuthUI();

      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.style.background = 'rgba(0, 229, 117, 0.15)';
        statusBox.style.color = 'var(--primary)';
        statusBox.innerHTML = '<i class="fa-solid fa-check"></i> Profil bilgileriniz başarıyla güncellendi!';
        setTimeout(() => { statusBox.style.display = 'none'; }, 4000);
      }
    } else {
      throw new Error(data.error || 'Güncellenemedi');
    }
  } catch (err) {
    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.style.background = 'rgba(255, 51, 75, 0.15)';
      statusBox.style.color = 'var(--accent-red)';
      statusBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${err.message || 'Hata oluştu'}`;
    }
  }
};

window.handlePasswordChange = async function(e) {
  e.preventDefault();
  if (!profileUserData) return;

  const currentPassword = document.getElementById('settingCurrentPassword').value;
  const newPassword = document.getElementById('settingNewPassword').value;
  const statusBox = document.getElementById('passwordSaveStatus');

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: profileUserData.id,
        currentPassword,
        newPassword
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      document.getElementById('passwordChangeForm').reset();
      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.style.background = 'rgba(0, 229, 117, 0.15)';
        statusBox.style.color = 'var(--primary)';
        statusBox.innerHTML = '<i class="fa-solid fa-check"></i> Şifreniz başarıyla değiştirildi!';
        setTimeout(() => { statusBox.style.display = 'none'; }, 4000);
      }
    } else {
      throw new Error(data.error || 'Şifre güncellenemedi');
    }
  } catch (err) {
    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.style.background = 'rgba(255, 51, 75, 0.15)';
      statusBox.style.color = 'var(--accent-red)';
      statusBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${err.message || 'Hata oluştu'}`;
    }
  }
};
