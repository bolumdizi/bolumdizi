/* ====================================================
   BölümDizi - SezonlukDizi Stili Gelişmiş Üye Profili Scripti
   (profile.js)
==================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initProfilePage();
});

let profileUserData = null;
let currentProgressData = null;
let currentSubFilter = 'ongoing'; // 'ongoing' | 'completed' | 'all'
let activeModalSeries = null;
let activeModalSeason = 1;

// ====================================================
// BAŞLANGIÇ & VERİ SENKRONİZASYONU
// ====================================================
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

  // Tarayıcıdaki yerel izlendi kayıtlarını sunucuyla senkronize et
  try {
    const localWatched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');
    if (Object.keys(localWatched).length > 0 && profileUserData.id) {
      await fetch('/api/auth/watched/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profileUserData.id, watchedEpisodes: localWatched })
      });
    }
  } catch (e) {
    console.warn('Sync watched error:', e);
  }

  // En güncel kullanıcı profilini sunucudan çek
  try {
    const res = await fetch(`/api/auth/me?userId=${profileUserData.id}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        profileUserData = { ...profileUserData, ...data };
        localStorage.setItem('bolum_dizi_user', JSON.stringify(profileUserData));
        if (data.watchedEpisodes && typeof data.watchedEpisodes === 'object') {
          localStorage.setItem('bolum_dizi_watched_eps', JSON.stringify(data.watchedEpisodes));
        }
      }
    }
  } catch (e) {
    console.warn('Could not sync user from server:', e);
  }

  // Bileşenleri başlat
  renderSidebarProfile(profileUserData);
  loadProfileProgress();
  loadProfileWatchlist();
  loadProfileFavorites();
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

// ====================================================
// SAĞ YAN SÜTUN: KULLANICI KARTI & DİZİ İZLEME SÜRESİ
// ====================================================
function renderSidebarProfile(user) {
  const warning = document.getElementById('profileGuestWarning');
  const main = document.getElementById('profileMainContent');
  if (warning) warning.style.display = 'none';
  if (main) main.style.display = 'block';

  const displayName = user.displayName || user.username || 'Üye';
  const avatarUrl = (user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('/')))
    ? user.avatar
    : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500';

  const avatarImg = document.getElementById('sidebarAvatarImg');
  if (avatarImg) avatarImg.src = avatarUrl;

  const nameEl = document.getElementById('sidebarDisplayName');
  if (nameEl) nameEl.textContent = displayName;

  const followingEl = document.getElementById('sidebarFollowing');
  if (followingEl) followingEl.textContent = user.followingCount !== undefined ? user.followingCount : 0;

  const followersEl = document.getElementById('sidebarFollowers');
  if (followersEl) followersEl.textContent = user.followersCount !== undefined ? user.followersCount : 2;

  const metaEl = document.getElementById('sidebarMetaLine');
  if (metaEl) metaEl.textContent = user.cityGender || 'Erkek, İstanbul';

  const emailEl = document.getElementById('sidebarEmailLine');
  if (emailEl) emailEl.textContent = user.email || 'user@example.com';

  const joinEl = document.getElementById('sidebarJoinDate');
  if (joinEl && user.createdAt) {
    const dt = new Date(user.createdAt);
    joinEl.textContent = dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const lastSeenEl = document.getElementById('sidebarLastSeen');
  if (lastSeenEl) lastSeenEl.textContent = 'Bugün';
}

function updateWatchTimeWidget(totalEpisodesWatched) {
  // Ortalama bölüm süresi 45 dakika kabul edilerek hesaplanır
  const totalMinutes = (totalEpisodesWatched || 0) * 45;
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const totalDays = Math.floor(totalHours / 24);
  const days = totalDays % 30;
  const months = Math.floor(totalDays / 30);

  const mEl = document.getElementById('wtMonths');
  const dEl = document.getElementById('wtDays');
  const hEl = document.getElementById('wtHours');
  const minEl = document.getElementById('wtMinutes');

  if (mEl) mEl.textContent = months;
  if (dEl) dEl.textContent = days;
  if (hEl) hEl.textContent = hours;
  if (minEl) minEl.textContent = minutes;
}

// ====================================================
// SEKME DEĞİŞTİRME (İzlenenler, İzlenecekler, Favoriler vb.)
// ====================================================
window.switchProfileTab = function(tabName) {
  const tabs = ['progress', 'watchlist', 'favorites', 'comments', 'history', 'settings'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn${capitalize(t)}`);
    const panel = document.getElementById(`panel${capitalize(t)}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (panel) {
      if (t === tabName) {
        panel.style.display = 'block';
        panel.classList.add('active');
      } else {
        panel.style.display = 'none';
        panel.classList.remove('active');
      }
    }
  });
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ====================================================
// 1. İZLENENLER SEKMESİ (SEZONLUKDİZİ 5'Lİ AFİŞ TABLOSU)
// ====================================================
async function loadProfileProgress() {
  const list = document.getElementById('profileProgressList');
  const tabCount = document.getElementById('tabCountProgress');
  if (!list || !profileUserData) return;

  list.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 1.6rem; color: var(--primary);"></i> Dizi ilerleme durumunuz yükleniyor...</div>';

  try {
    const res = await fetch(`/api/auth/progress?userId=${profileUserData.id}`);
    const data = await res.json();
    currentProgressData = data;

    // Senkronize yerel izlenenler haritası
    const localWatched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');

    // Dizileri birleştir ve detaylı izlenme durumlarını hesapla
    const seriesMap = new Map();
    (data.series || []).forEach(item => seriesMap.set(item.slug, item));

    if (data.allSeriesProgress) {
      data.allSeriesProgress.forEach(item => {
        if (!seriesMap.has(item.slug)) {
          const hasWatched = (item.seasons || []).some(s => (s.episodes || []).some(ep => Boolean(localWatched[ep.id])));
          if (hasWatched || item.inWatchlist) {
            seriesMap.set(item.slug, item);
          }
        }
      });
    }

    const seriesList = Array.from(seriesMap.values()).map(item => {
      let watchedCount = 0;
      let lastWatchedTimestamp = null;

      (item.seasons || []).forEach(season => {
        let seasonWatched = 0;
        (season.episodes || []).forEach(ep => {
          const wInfo = localWatched[ep.id];
          ep.isWatched = Boolean(wInfo);
          if (ep.isWatched) {
            watchedCount++;
            seasonWatched++;
            if (wInfo.watchedAt) {
              const epTime = new Date(wInfo.watchedAt).getTime();
              if (!lastWatchedTimestamp || epTime > lastWatchedTimestamp) {
                lastWatchedTimestamp = epTime;
              }
            }
          }
        });
        season.watchedEpisodes = seasonWatched;
        season.percent = season.totalEpisodes > 0 ? Math.round((seasonWatched / season.totalEpisodes) * 100) : 0;
      });

      item.watchedEpisodes = watchedCount;
      item.percent = item.totalEpisodes > 0 ? Math.round((watchedCount / item.totalEpisodes) * 100) : 0;
      item.lastWatchedDate = lastWatchedTimestamp ? new Date(lastWatchedTimestamp) : new Date(item.createdAt || '2026-06-11');
      return item;
    });

    // Toplam izlenen bölüm sayısını hesapla ve widget'ı güncelle
    let totalWatchedCalc = 0;
    seriesList.forEach(s => {
      totalWatchedCalc += s.watchedEpisodes;
    });
    const finalWatchedCount = Math.max(totalWatchedCalc, Object.keys(localWatched).length);
    updateWatchTimeWidget(finalWatchedCount);

    if (tabCount) tabCount.textContent = seriesList.filter(s => s.watchedEpisodes > 0).length;

    // Aktif alt filtreye göre afişleri çiz
    renderFilteredProgressCards(seriesList);

  } catch (err) {
    console.error('Progress load error:', err);
    list.innerHTML = '<div style="grid-column: 1 / -1; color: var(--accent-red); padding: 30px; text-align: center;">İlerleme bilgileri alınırken hata oluştu.</div>';
  }
}

function renderFilteredProgressCards(seriesList) {
  const list = document.getElementById('profileProgressList');
  if (!list) return;

  const watchedOnly = seriesList.filter(s => s.watchedEpisodes > 0);

  let filtered = [];
  if (currentSubFilter === 'ongoing') {
    // Devam Edilen: En az 1 bölüm izlenmiş ama henüz bitmemiş
    filtered = watchedOnly.filter(s => s.watchedEpisodes < s.totalEpisodes);
    if (filtered.length === 0 && watchedOnly.length > 0) {
      filtered = watchedOnly; // Yedek fallback
    }
  } else if (currentSubFilter === 'completed') {
    // Tamamlanan: Tüm bölümleri izlenmiş
    filtered = watchedOnly.filter(s => s.totalEpisodes > 0 && s.watchedEpisodes >= s.totalEpisodes);
  } else {
    // Tümü
    filtered = watchedOnly;
  }

  // Sıralama: En son izlenen ve en çok izlenenler üstte
  filtered.sort((a, b) => (b.lastWatchedDate - a.lastWatchedDate) || (b.watchedEpisodes - a.watchedEpisodes));

  if (filtered.length === 0) {
    const filterLabel = currentSubFilter === 'completed' ? 'Tamamlanan' : (currentSubFilter === 'ongoing' ? 'Devam Edilen' : 'İzlenen');
    list.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
        <i class="fa-solid fa-film" style="font-size: 2.8rem; color: var(--text-dim); margin-bottom: 12px; display: block;"></i>
        <h4 style="font-size: 1.15rem; color: #fff; margin-bottom: 8px;">Bu Filtrede Henüz Dizi Yok (${filterLabel})</h4>
        <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 460px; margin: 0 auto 18px;">
          Dizilerin bölümlerini izledikçe ya da izlendi olarak işaretledikçe burada SezonlukDizi afiş kartları listelenir.
        </p>
        <a href="/kesfet" class="btn-primary" style="display: inline-flex; padding: 9px 20px;">
          <i class="fa-solid fa-play"></i> Dizi Keşfet & Başla
        </a>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(item => renderSzSeriesCard(item)).join('');
}

// 5'li Dizi Afiş Kartı (SezonlukDizi Stili)
function renderSzSeriesCard(item) {
  const dt = item.lastWatchedDate || new Date();
  const dateStr = `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
  const poster = item.poster || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500';

  return `
    <article class="sz-series-card" id="szCard_${item.slug}" onclick="openSzEpisodeModal('${item.slug}')">
      <div class="sz-card-poster-wrap">
        <img src="${poster}" alt="${item.title}" class="sz-card-poster-img" loading="lazy">
        <div class="sz-card-hover-overlay">
          <span class="sz-card-hover-btn">
            <i class="fa-solid fa-list-check"></i> Bölümler
          </span>
        </div>
      </div>
      <div class="sz-card-body">
        <h4 class="sz-card-title" title="${item.title}">${item.title}</h4>
        <div class="sz-card-meta">
          <span class="sz-card-date">${dateStr}</span>
          <span class="sz-card-eps" id="szCardEps_${item.slug}">${item.watchedEpisodes}/${item.totalEpisodes}</span>
        </div>
        <div class="sz-card-progress-bar">
          <div class="sz-card-progress-fill" id="szCardFill_${item.slug}" style="width: ${item.percent}%;"></div>
        </div>
      </div>
    </article>
  `;
}

// Alt Filtre Butonları (Devam Edilen | Tamamlanan | Tümü)
window.setWatchedSubFilter = function(subFilter) {
  currentSubFilter = subFilter;

  const btnOngoing = document.getElementById('filterBtnOngoing');
  const btnCompleted = document.getElementById('filterBtnCompleted');
  const btnAll = document.getElementById('filterBtnAll');

  if (btnOngoing) btnOngoing.classList.toggle('active', subFilter === 'ongoing');
  if (btnCompleted) btnCompleted.classList.toggle('active', subFilter === 'completed');
  if (btnAll) btnAll.classList.toggle('active', subFilter === 'all');

  if (currentProgressData) {
    loadProfileProgress();
  }
};

// ====================================================
// BÖLÜM KONTROL LİSTESİ MODALI (SEZONLUKDİZİ POPUP)
// ====================================================
window.openSzEpisodeModal = function(slug) {
  if (!currentProgressData) return;

  const all = [...(currentProgressData.series || []), ...(currentProgressData.allSeriesProgress || [])];
  const series = all.find(s => s.slug === slug || s.id === slug);
  if (!series) return;

  activeModalSeries = series;
  activeModalSeason = (series.seasons && series.seasons.length > 0) ? series.seasons[0].seasonNumber : 1;

  // Başlık, Afiş ve Meta Bilgileri
  const posterEl = document.getElementById('szModalPoster');
  const titleEl = document.getElementById('szModalTitle');
  const metaEl = document.getElementById('szModalMeta');

  if (posterEl) posterEl.src = series.poster || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500';
  if (titleEl) titleEl.textContent = series.title;
  if (metaEl) metaEl.textContent = `${series.watchedEpisodes} / ${series.totalEpisodes} Bölüm İzlendi (%${series.percent})`;

  // Sezon Sekmelerini Oluştur
  renderModalSeasonTabs();
  // İlk Sezonun Bölümlerini Listele
  renderModalSeasonEpisodes(activeModalSeason);

  // Modalı Aç
  const modal = document.getElementById('szEpisodeModal');
  if (modal) modal.classList.add('active');
};

window.closeSzEpisodeModal = function() {
  const modal = document.getElementById('szEpisodeModal');
  if (modal) modal.classList.remove('active');
  activeModalSeries = null;
};

function renderModalSeasonTabs() {
  const tabsContainer = document.getElementById('szModalSeasonTabs');
  if (!tabsContainer || !activeModalSeries || !activeModalSeries.seasons) return;

  tabsContainer.innerHTML = activeModalSeries.seasons.map(s => `
    <button class="sz-season-tab-btn ${s.seasonNumber === activeModalSeason ? 'active' : ''}" 
      onclick="switchModalSeason(${s.seasonNumber})">
      ${s.seasonNumber}. Sezon (${s.watchedEpisodes}/${s.totalEpisodes})
    </button>
  `).join('');
}

window.switchModalSeason = function(seasonNumber) {
  activeModalSeason = seasonNumber;
  renderModalSeasonTabs();
  renderModalSeasonEpisodes(seasonNumber);
};

function renderModalSeasonEpisodes(seasonNumber) {
  const listContainer = document.getElementById('szModalEpisodeList');
  if (!listContainer || !activeModalSeries) return;

  const season = (activeModalSeries.seasons || []).find(s => s.seasonNumber === seasonNumber);
  if (!season || !season.episodes || season.episodes.length === 0) {
    listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Bu sezonda kayıtlı bölüm bulunamadı.</div>';
    return;
  }

  const localWatched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');

  listContainer.innerHTML = season.episodes.map(ep => {
    const isWatched = Boolean(localWatched[ep.id]);
    const numPill = `${seasonNumber}x${ep.episodeNumber < 10 ? '0' + ep.episodeNumber : ep.episodeNumber}`;
    const watchUrl = typeof formatWatchUrl === 'function'
      ? formatWatchUrl(activeModalSeries.slug, seasonNumber, ep.episodeNumber)
      : `/dizi/${activeModalSeries.slug}/sezon-${seasonNumber}/bolum-${ep.episodeNumber}`;

    return `
      <div class="sz-ep-row" id="szModalEpRow_${ep.id}">
        <div class="sz-ep-info">
          <span class="sz-ep-num-pill">${numPill}</span>
          <span class="sz-ep-title" title="${ep.title}">${ep.title || `${ep.episodeNumber}. Bölüm`}</span>
        </div>
        <div class="sz-ep-actions">
          <button class="sz-btn-watch-toggle ${isWatched ? 'watched' : ''}" 
            id="szModalToggleBtn_${ep.id}"
            onclick="toggleEpisodeWatchFromModal(event, '${activeModalSeries.slug}', '${ep.id}', ${seasonNumber}, ${ep.episodeNumber})">
            ${isWatched ? '<i class="fa-solid fa-check"></i> İzlendi' : '<i class="fa-solid fa-plus"></i> İzlendi Yap'}
          </button>
          <a href="${watchUrl}" class="sz-btn-play-link" title="Bölümü Oynat">
            <i class="fa-solid fa-play"></i>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleEpisodeWatchFromModal = async function(event, seriesSlug, epId, seasonNumber, episodeNumber) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  if (!profileUserData) return;

  let localWatched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');
  const isCurrentlyWatched = Boolean(localWatched[epId]);
  const targetWatched = !isCurrentlyWatched;

  if (targetWatched) {
    localWatched[epId] = {
      watchedAt: new Date().toISOString(),
      seriesSlug,
      seasonNumber,
      episodeNumber
    };
  } else {
    delete localWatched[epId];
  }
  localStorage.setItem('bolum_dizi_watched_eps', JSON.stringify(localWatched));

  // Anında Arayüz Güncellemesi (Optimistic UI)
  const toggleBtn = document.getElementById(`szModalToggleBtn_${epId}`);
  if (toggleBtn) {
    if (targetWatched) {
      toggleBtn.classList.add('watched');
      toggleBtn.innerHTML = '<i class="fa-solid fa-check"></i> İzlendi';
    } else {
      toggleBtn.classList.remove('watched');
      toggleBtn.innerHTML = '<i class="fa-solid fa-plus"></i> İzlendi Yap';
    }
  }

  // Aktif modal serisinin ve sezonunun sayılarını güncelle
  if (activeModalSeries) {
    let seriesWatched = 0;
    (activeModalSeries.seasons || []).forEach(s => {
      let sWatched = 0;
      (s.episodes || []).forEach(ep => {
        if (ep.id === epId) ep.isWatched = targetWatched;
        if (ep.isWatched) {
          seriesWatched++;
          sWatched++;
        }
      });
      s.watchedEpisodes = sWatched;
      s.percent = s.totalEpisodes > 0 ? Math.round((sWatched / s.totalEpisodes) * 100) : 0;
    });

    activeModalSeries.watchedEpisodes = seriesWatched;
    activeModalSeries.percent = activeModalSeries.totalEpisodes > 0 
      ? Math.round((seriesWatched / activeModalSeries.totalEpisodes) * 100) 
      : 0;

    // Modal başlık metasını güncelle
    const metaEl = document.getElementById('szModalMeta');
    if (metaEl) {
      metaEl.textContent = `${activeModalSeries.watchedEpisodes} / ${activeModalSeries.totalEpisodes} Bölüm İzlendi (%${activeModalSeries.percent})`;
    }

    // Sezon sekmelerini güncelle
    renderModalSeasonTabs();

    // Arka plandaki afiş kartını güncelle
    const cardEps = document.getElementById(`szCardEps_${seriesSlug}`);
    const cardFill = document.getElementById(`szCardFill_${seriesSlug}`);
    if (cardEps) cardEps.textContent = `${activeModalSeries.watchedEpisodes}/${activeModalSeries.totalEpisodes}`;
    if (cardFill) cardFill.style.width = `${activeModalSeries.percent}%`;
  }

  // Sağ yan sütundaki 4'lü Dizi İzleme Süresi sayacını hemen güncelle
  const totalWatchedCount = Object.keys(localWatched).length;
  updateWatchTimeWidget(totalWatchedCount);

  // Sunucuya asenkron kaydet
  try {
    const res = await fetch('/api/auth/watched/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: profileUserData.id,
        episodeId: epId,
        seriesSlug,
        seasonNumber,
        episodeNumber,
        isWatched: targetWatched
      })
    });
    const data = await res.json();
    if (data && data.watchedEpisodes) {
      localStorage.setItem('bolum_dizi_watched_eps', JSON.stringify(data.watchedEpisodes));
    }
  } catch (e) {
    console.warn('Server toggle watch error:', e);
  }
};

// ====================================================
// 2. İZLENECEKLER SEKMESİ (TAKİP LİSTESİ)
// ====================================================
async function loadProfileWatchlist() {
  const grid = document.getElementById('profileWatchlistGrid');
  const tabCount = document.getElementById('tabCountWatchlist');
  if (!grid || !profileUserData) return;

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary);"></i> Diziler yükleniyor...</div>';

  try {
    const res = await fetch(`/api/auth/watchlist?userId=${profileUserData.id}`);
    const data = await res.json();
    const watchlist = data.watchlist || [];

    if (tabCount) tabCount.textContent = watchlist.length;

    if (watchlist.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
          <i class="fa-regular fa-bookmark" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 14px; display: block;"></i>
          <h4 style="font-size: 1.2rem; color: #fff; margin-bottom: 8px;">Takip Ettiğiniz Dizi Bulunmuyor</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">Dizi sayfalarındaki "Listeme Ekle" butonuna basarak izlemek istediğiniz dizileri buraya ekleyebilirsiniz.</p>
          <a href="/kesfet" class="btn-primary" style="display: inline-flex; padding: 10px 22px;">
            <i class="fa-solid fa-compass"></i> Dizileri Keşfet
          </a>
        </div>
      `;
      return;
    }

    grid.innerHTML = watchlist.map(s => {
      const seriesUrl = typeof formatSeriesUrl === 'function' ? formatSeriesUrl(s.slug) : '/dizi/' + s.slug;
      return `
        <article class="sz-series-card" onclick="window.location.href='${seriesUrl}'">
          <div class="sz-card-poster-wrap">
            <img src="${s.poster}" alt="${s.title}" class="sz-card-poster-img" loading="lazy">
            <div class="sz-card-hover-overlay">
              <span class="sz-card-hover-btn"><i class="fa-solid fa-play"></i> İncele</span>
            </div>
          </div>
          <div class="sz-card-body">
            <h4 class="sz-card-title" title="${s.title}">${s.title}</h4>
            <div class="sz-card-meta">
              <span class="sz-card-date">${s.year || 2024}</span>
              <span class="sz-card-eps" style="color: var(--accent-gold);"><i class="fa-solid fa-star"></i> ${s.imdb || '8.5'}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');

  } catch (err) {
    console.error('Watchlist fetch error:', err);
    grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--accent-red); padding: 30px; text-align: center;">Listeniz yüklenirken hata oluştu.</div>';
  }
}

// ====================================================
// 3. FAVORİLER SEKMESİ
// ====================================================
async function loadProfileFavorites() {
  const grid = document.getElementById('profileFavoritesGrid');
  const tabCount = document.getElementById('tabCountFavorites');
  if (!grid || !profileUserData) return;

  try {
    const res = await fetch(`/api/auth/watchlist?userId=${profileUserData.id}`);
    const data = await res.json();
    const favorites = data.watchlist || [];

    if (tabCount) tabCount.textContent = favorites.length;

    if (favorites.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
          <i class="fa-solid fa-heart" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 14px; display: block;"></i>
          <h4 style="font-size: 1.2rem; color: #fff; margin-bottom: 8px;">Favori Diziniz Bulunmuyor</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">En sevdiğiniz yapımları favorilere ekleyerek bu sayfadan hızla erişebilirsiniz.</p>
          <a href="/kesfet" class="btn-primary" style="display: inline-flex; padding: 10px 22px;">
            <i class="fa-solid fa-compass"></i> Dizileri Keşfet
          </a>
        </div>
      `;
      return;
    }

    grid.innerHTML = favorites.map(s => {
      const seriesUrl = typeof formatSeriesUrl === 'function' ? formatSeriesUrl(s.slug) : '/dizi/' + s.slug;
      return `
        <article class="sz-series-card" onclick="window.location.href='${seriesUrl}'">
          <div class="sz-card-poster-wrap">
            <img src="${s.poster}" alt="${s.title}" class="sz-card-poster-img" loading="lazy">
            <div class="sz-card-hover-overlay">
              <span class="sz-card-hover-btn"><i class="fa-solid fa-play"></i> İzle</span>
            </div>
          </div>
          <div class="sz-card-body">
            <h4 class="sz-card-title" title="${s.title}">${s.title}</h4>
            <div class="sz-card-meta">
              <span class="sz-card-date">${s.year || 2024}</span>
              <span class="sz-card-eps" style="color: var(--accent-gold);"><i class="fa-solid fa-star"></i> ${s.imdb || '8.5'}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  } catch (e) {
    console.warn('Favorites load error:', e);
  }
}

// ====================================================
// 4. İZLEME GEÇMİŞİ SEKMESİ
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
// 5. YORUMLAR SEKMESİ
// ====================================================
async function loadProfileComments() {
  const container = document.getElementById('profileCommentsContainer');
  const tabCount = document.getElementById('tabCountComments');
  if (!container || !profileUserData) return;

  container.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fa-solid fa-spinner fa-spin"></i> Yorumlar yükleniyor...</div>';

  try {
    const res = await fetch(`/api/auth/my-comments?userId=${profileUserData.id}&username=${encodeURIComponent(profileUserData.username)}`);
    const data = await res.json();
    const comments = data.comments || [];

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
// 6. AYARLAR SEKMESİ (BİLGİ & ŞİFRE GÜNCELLEME)
// ====================================================
function populateProfileSettingsForm(user) {
  const nameInput = document.getElementById('settingDisplayName');
  const avatarInput = document.getElementById('settingAvatarUrl');
  const cityGenderInput = document.getElementById('settingCityGender');
  const bioInput = document.getElementById('settingBio');
  const staticUser = document.getElementById('settingStaticUsername');
  const staticEmail = document.getElementById('settingStaticEmail');

  if (nameInput) nameInput.value = user.displayName || user.username || '';
  if (avatarInput) avatarInput.value = user.avatar || '';
  if (cityGenderInput) cityGenderInput.value = user.cityGender || 'Erkek, İstanbul';
  if (bioInput) bioInput.value = user.bio || '';
  if (staticUser) staticUser.value = user.username || '';
  if (staticEmail) staticEmail.value = user.email || '';
}

window.handleSaveProfileInfo = async function(e) {
  e.preventDefault();
  if (!profileUserData) return;

  const displayName = document.getElementById('settingDisplayName').value.trim();
  const avatar = document.getElementById('settingAvatarUrl').value.trim();
  const cityGender = document.getElementById('settingCityGender').value.trim();
  const bio = document.getElementById('settingBio').value.trim();
  const statusBox = document.getElementById('profileSaveStatus');

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: profileUserData.id,
        displayName,
        avatar,
        cityGender,
        bio
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      profileUserData = { ...profileUserData, ...data.user };
      localStorage.setItem('bolum_dizi_user', JSON.stringify(profileUserData));

      renderSidebarProfile(profileUserData);
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
