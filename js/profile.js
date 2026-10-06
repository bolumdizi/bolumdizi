/* ====================================================
   BölümDizi - SezonlukDizi Stili Birebir Üye Profili
   (profile.js)
==================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initProfilePage();
});

let profileUserData = null;
let currentProgressData = null;
let currentSubFilter = 'ongoing'; // 'ongoing' | 'completed' | 'dropped'
let activeModalSeries = null;
let activeModalSeason = 1;

// Referans görseldeki 10 adet orijinal dizi ve izlenme kayıtları
const SEZONLUK_SERIES_LIST = [
  {
    slug: 'person-of-interest',
    title: 'Person of Interest',
    poster: '/images/posters/person-of-interest.png',
    dateStr: '11.06.2026',
    watchedEpisodes: 16,
    totalEpisodes: 103,
    status: 'ongoing',
    seasons: [
      {
        seasonNumber: 1,
        totalEpisodes: 23,
        watchedEpisodes: 16,
        episodes: Array.from({ length: 23 }, (_, i) => ({
          id: `poi_s1_e${i+1}`,
          episodeNumber: i + 1,
          title: i === 0 ? 'Pilot' : `${i + 1}. Bölüm`,
          isWatched: i < 16
        }))
      },
      {
        seasonNumber: 2,
        totalEpisodes: 22,
        watchedEpisodes: 0,
        episodes: Array.from({ length: 22 }, (_, i) => ({
          id: `poi_s2_e${i+1}`,
          episodeNumber: i + 1,
          title: `${i + 1}. Bölüm`,
          isWatched: false
        }))
      }
    ]
  },
  {
    slug: 'the-bear',
    title: 'The Bear',
    poster: '/images/posters/the-bear.png',
    dateStr: '3.06.2026',
    watchedEpisodes: 18,
    totalEpisodes: 47,
    status: 'ongoing',
    seasons: [
      {
        seasonNumber: 1,
        totalEpisodes: 8,
        watchedEpisodes: 8,
        episodes: Array.from({ length: 8 }, (_, i) => ({
          id: `tb_s1_e${i+1}`,
          episodeNumber: i + 1,
          title: i === 0 ? 'System' : `${i + 1}. Bölüm`,
          isWatched: true
        }))
      },
      {
        seasonNumber: 2,
        totalEpisodes: 10,
        watchedEpisodes: 10,
        episodes: Array.from({ length: 10 }, (_, i) => ({
          id: `tb_s2_e${i+1}`,
          episodeNumber: i + 1,
          title: `${i + 1}. Bölüm`,
          isWatched: true
        }))
      }
    ]
  },
  {
    slug: 'hajime-no-ippo-rising',
    title: 'Hajime No Ippo: Rising',
    poster: '/images/posters/hajime-no-ippo.png',
    dateStr: '16.05.2026',
    watchedEpisodes: 23,
    totalEpisodes: 25,
    status: 'ongoing',
    seasons: [
      {
        seasonNumber: 1,
        totalEpisodes: 25,
        watchedEpisodes: 23,
        episodes: Array.from({ length: 25 }, (_, i) => ({
          id: `hni_s1_e${i+1}`,
          episodeNumber: i + 1,
          title: `${i + 1}. Bölüm`,
          isWatched: i < 23
        }))
      }
    ]
  },
  {
    slug: 'regular-show-lost-tapes',
    title: 'Regular Show: The Lost Tapes',
    poster: '/images/posters/regular-show.png',
    dateStr: '13.05.2026',
    watchedEpisodes: 5,
    totalEpisodes: 19,
    status: 'ongoing',
    seasons: [
      {
        seasonNumber: 1,
        totalEpisodes: 19,
        watchedEpisodes: 5,
        episodes: Array.from({ length: 19 }, (_, i) => ({
          id: `rs_s1_e${i+1}`,
          episodeNumber: i + 1,
          title: `${i + 1}. Bölüm`,
          isWatched: i < 5
        }))
      }
    ]
  },
  {
    slug: 'severance',
    title: 'Severance',
    poster: '/images/posters/severance.png',
    dateStr: '27.01.2026',
    watchedEpisodes: 13,
    totalEpisodes: 19,
    status: 'ongoing',
    seasons: [
      {
        seasonNumber: 1,
        totalEpisodes: 9,
        watchedEpisodes: 9,
        episodes: Array.from({ length: 9 }, (_, i) => ({
          id: `sev_s1_e${i+1}`,
          episodeNumber: i + 1,
          title: i === 0 ? 'Good News About Hell' : `${i + 1}. Bölüm`,
          isWatched: true
        }))
      },
      {
        seasonNumber: 2,
        totalEpisodes: 10,
        watchedEpisodes: 4,
        episodes: Array.from({ length: 10 }, (_, i) => ({
          id: `sev_s2_e${i+1}`,
          episodeNumber: i + 1,
          title: `${i + 1}. Bölüm`,
          isWatched: i < 4
        }))
      }
    ]
  },
  {
    slug: 'daredevil-born-again',
    title: 'Daredevil: Born Again',
    poster: '/images/posters/daredevil-born-again.png',
    dateStr: '17.04.2025',
    watchedEpisodes: 9,
    totalEpisodes: 17,
    status: 'ongoing',
    seasons: [
      {
        seasonNumber: 1,
        totalEpisodes: 17,
        watchedEpisodes: 9,
        episodes: Array.from({ length: 17 }, (_, i) => ({
          id: `dd_s1_e${i+1}`,
          episodeNumber: i + 1,
          title: `${i + 1}. Bölüm`,
          isWatched: i < 9
        }))
      }
    ]
  },
  {
    slug: 'the-good-doctor',
    title: 'The Good Doctor',
    poster: '/images/posters/the-good-doctor.png',
    dateStr: '10.04.2024',
    watchedEpisodes: 117,
    totalEpisodes: 126,
    status: 'ongoing',
    seasons: [
      {
        seasonNumber: 1,
        totalEpisodes: 18,
        watchedEpisodes: 18,
        episodes: Array.from({ length: 18 }, (_, i) => ({
          id: `tgd_s1_e${i+1}`,
          episodeNumber: i + 1,
          title: `${i + 1}. Bölüm`,
          isWatched: true
        }))
      }
    ]
  },
  {
    slug: 'avatar-the-last-airbender',
    title: 'Avatar: The Last Airbender',
    poster: '/images/posters/avatar-the-last-airbender.png',
    dateStr: '14.03.2024',
    watchedEpisodes: 2,
    totalEpisodes: 15,
    status: 'ongoing',
    seasons: [
      {
        seasonNumber: 1,
        totalEpisodes: 8,
        watchedEpisodes: 2,
        episodes: Array.from({ length: 8 }, (_, i) => ({
          id: `atla_s1_e${i+1}`,
          episodeNumber: i + 1,
          title: `${i + 1}. Bölüm`,
          isWatched: i < 2
        }))
      }
    ]
  },
  {
    slug: 'modern-family',
    title: 'Modern Family',
    poster: '/images/posters/modern-family.png',
    dateStr: '12.02.2024',
    watchedEpisodes: 9,
    totalEpisodes: 250,
    status: 'ongoing',
    seasons: [
      {
        seasonNumber: 1,
        totalEpisodes: 24,
        watchedEpisodes: 9,
        episodes: Array.from({ length: 24 }, (_, i) => ({
          id: `mf_s1_e${i+1}`,
          episodeNumber: i + 1,
          title: `${i + 1}. Bölüm`,
          isWatched: i < 9
        }))
      }
    ]
  },
  {
    slug: 'seinfeld',
    title: 'Seinfeld',
    poster: '/images/posters/seinfeld.png',
    dateStr: '3.02.2024',
    watchedEpisodes: 1,
    totalEpisodes: 171,
    status: 'ongoing',
    seasons: [
      {
        seasonNumber: 1,
        totalEpisodes: 5,
        watchedEpisodes: 1,
        episodes: Array.from({ length: 5 }, (_, i) => ({
          id: `sein_s1_e${i+1}`,
          episodeNumber: i + 1,
          title: i === 0 ? 'The Seinfeld Chronicles' : `${i + 1}. Bölüm`,
          isWatched: i < 1
        }))
      }
    ]
  }
];

// Toplam süre başlangıcı: 2 AY, 17 GÜN, 6 SAAT, 22 DAKİKA
// = 2*30*24*60 + 17*24*60 + 6*60 + 22 = 86400 + 24480 + 360 + 22 = 111262 dakika
let currentTotalWatchMinutes = (2 * 30 * 24 * 60) + (17 * 24 * 60) + (6 * 60) + 22;

// ====================================================
// BAŞLANGIÇ & PROFİL YÜKLEME
// ====================================================
async function initProfilePage() {
  const userStr = localStorage.getItem('bolum_dizi_user');
  if (userStr) {
    try {
      profileUserData = JSON.parse(userStr);
    } catch (e) {
      profileUserData = null;
    }
  }

  // Kullanıcı yoksa görseldeki SezonlukDizi profilini varsayılan yap
  if (!profileUserData) {
    profileUserData = {
      id: 'u1',
      username: 'Gogolun_Paltosu',
      displayName: 'Gogolun_Paltosu',
      email: 'beratakkurt346@gmail.com',
      avatar: '/images/avatar_marshall.png',
      cityGender: 'Erkek, İstanbul',
      followingCount: 0,
      followersCount: 2,
      createdAt: '2016-02-22T00:00:00.000Z',
      lastSeen: 'Bugün'
    };
    localStorage.setItem('bolum_dizi_user', JSON.stringify(profileUserData));
  }

  renderSidebarProfile(profileUserData);
  updateWatchTimeDisplay(currentTotalWatchMinutes);
  loadProfileProgress();
  loadProfileWatchlist();
  loadProfileFavorites();
  loadProfileHistory();
  loadProfileComments();
  populateProfileSettingsForm(profileUserData);
}

// ====================================================
// SAĞ YAN SÜTUN: KULLANICI KARTI & DİZİ İZLEME SÜRESİ
// ====================================================
function renderSidebarProfile(user) {
  const displayName = user.displayName || user.username || 'Gogolun_Paltosu';
  const avatarUrl = user.avatar || '/images/avatar_marshall.png';

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
  if (emailEl) emailEl.textContent = user.email || 'beratakkurt346@gmail.com';

  const joinEl = document.getElementById('sidebarJoinDate');
  if (joinEl) {
    if (user.createdAt) {
      const dt = new Date(user.createdAt);
      joinEl.textContent = `${dt.getDate()} ${dt.toLocaleDateString('tr-TR', { month: 'long' })} ${dt.getFullYear()}`;
    } else {
      joinEl.textContent = '22 Şubat 2016';
    }
  }

  const lastSeenEl = document.getElementById('sidebarLastSeen');
  if (lastSeenEl) lastSeenEl.textContent = user.lastSeen || 'Bugün';
}

function updateWatchTimeDisplay(totalMinutes) {
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
  const tabs = ['progress', 'watchlist', 'favorites', 'comments', 'history', 'notifications', 'settings'];
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
// 1. İZLENENLER SEKMESİ (5'Lİ AFİŞ TABLOSU)
// ====================================================
function loadProfileProgress() {
  const list = document.getElementById('profileProgressList');
  if (!list) return;

  // Yerel hafızadaki izleme durumları
  const localWatched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');

  // Dizilerin izlenme sayılarını güncelle
  SEZONLUK_SERIES_LIST.forEach(series => {
    let watchedCount = 0;
    series.seasons.forEach(season => {
      let seasonWatched = 0;
      season.episodes.forEach(ep => {
        if (localWatched[ep.id] !== undefined) {
          ep.isWatched = Boolean(localWatched[ep.id]);
        }
        if (ep.isWatched) {
          watchedCount++;
          seasonWatched++;
        }
      });
      season.watchedEpisodes = seasonWatched;
    });
    series.watchedEpisodes = watchedCount;
  });

  renderFilteredProgressCards();
}

function renderFilteredProgressCards() {
  const list = document.getElementById('profileProgressList');
  if (!list) return;

  let filtered = [];
  if (currentSubFilter === 'ongoing') {
    filtered = SEZONLUK_SERIES_LIST.filter(s => s.watchedEpisodes < s.totalEpisodes);
  } else if (currentSubFilter === 'completed') {
    filtered = SEZONLUK_SERIES_LIST.filter(s => s.totalEpisodes > 0 && s.watchedEpisodes >= s.totalEpisodes);
  } else if (currentSubFilter === 'dropped') {
    filtered = SEZONLUK_SERIES_LIST.filter(s => s.status === 'dropped');
    if (filtered.length === 0) {
      filtered = [SEZONLUK_SERIES_LIST[SEZONLUK_SERIES_LIST.length - 1]]; // Demo için 1 tane
    }
  } else {
    filtered = SEZONLUK_SERIES_LIST;
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748b; font-size: 13px;">
        Bu kategoride henüz dizi bulunmuyor.
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(item => renderSzSeriesCard(item)).join('');
}

// 5'li Dizi Afiş Kartı (Görselle Birebir Aynı)
function renderSzSeriesCard(item) {
  const percent = item.totalEpisodes > 0 ? Math.round((item.watchedEpisodes / item.totalEpisodes) * 100) : 0;
  const poster = item.poster || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500';

  return `
    <article class="sz-series-card" id="szCard_${item.slug}" onclick="openSzEpisodeModal('${item.slug}')">
      <div class="sz-card-poster-wrap">
        <img src="${poster}" alt="${item.title}" class="sz-card-poster-img" loading="lazy">
      </div>
      <div class="sz-card-body">
        <h4 class="sz-card-title" title="${item.title}">${item.title}</h4>
        <div class="sz-card-meta">
          <span class="sz-card-date">${item.dateStr || '11.06.2026'}</span>
          <span class="sz-card-eps" id="szCardEps_${item.slug}">${item.watchedEpisodes}/${item.totalEpisodes}</span>
        </div>
        <div class="sz-card-progress-bar">
          <div class="sz-card-progress-fill" id="szCardFill_${item.slug}" style="width: ${percent}%;"></div>
        </div>
      </div>
    </article>
  `;
}

// Alt Filtre Butonları (Devam Edilen | Tamamlanan | Bırakılan)
window.setWatchedSubFilter = function(subFilter) {
  currentSubFilter = subFilter;

  const btnOngoing = document.getElementById('filterBtnOngoing');
  const btnCompleted = document.getElementById('filterBtnCompleted');
  const btnDropped = document.getElementById('filterBtnDropped');

  if (btnOngoing) btnOngoing.classList.toggle('active', subFilter === 'ongoing');
  if (btnCompleted) btnCompleted.classList.toggle('active', subFilter === 'completed');
  if (btnDropped) btnDropped.classList.toggle('active', subFilter === 'dropped');

  renderFilteredProgressCards();
};

// ====================================================
// BÖLÜM KONTROL LİSTESİ MODALI (Afişe Basınca Açılır)
// ====================================================
window.openSzEpisodeModal = function(slug) {
  const series = SEZONLUK_SERIES_LIST.find(s => s.slug === slug);
  if (!series) return;

  activeModalSeries = series;
  activeModalSeason = (series.seasons && series.seasons.length > 0) ? series.seasons[0].seasonNumber : 1;

  const posterEl = document.getElementById('szModalPoster');
  const titleEl = document.getElementById('szModalTitle');
  const metaEl = document.getElementById('szModalMeta');

  const percent = series.totalEpisodes > 0 ? Math.round((series.watchedEpisodes / series.totalEpisodes) * 100) : 0;

  if (posterEl) posterEl.src = series.poster;
  if (titleEl) titleEl.textContent = series.title;
  if (metaEl) metaEl.textContent = `${series.watchedEpisodes} / ${series.totalEpisodes} Bölüm İzlendi (%${percent})`;

  renderModalSeasonTabs();
  renderModalSeasonEpisodes(activeModalSeason);

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
  if (!season || !season.episodes) return;

  listContainer.innerHTML = season.episodes.map(ep => {
    const isWatched = Boolean(ep.isWatched);
    const numPill = `${seasonNumber}x${ep.episodeNumber < 10 ? '0' + ep.episodeNumber : ep.episodeNumber}`;
    const watchUrl = `/dizi/${activeModalSeries.slug}/sezon-${seasonNumber}/bolum-${ep.episodeNumber}`;

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

  let localWatched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');
  const targetWatched = !Boolean(localWatched[epId]);

  if (targetWatched) {
    localWatched[epId] = {
      watchedAt: new Date().toISOString(),
      seriesSlug,
      seasonNumber,
      episodeNumber
    };
    currentTotalWatchMinutes += 45;
  } else {
    delete localWatched[epId];
    currentTotalWatchMinutes = Math.max(0, currentTotalWatchMinutes - 45);
  }
  localStorage.setItem('bolum_dizi_watched_eps', JSON.stringify(localWatched));

  // Modaldaki butonu güncelle
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

  // Dizi nesnesini güncelle
  if (activeModalSeries) {
    let seriesWatched = 0;
    activeModalSeries.seasons.forEach(s => {
      let sWatched = 0;
      s.episodes.forEach(ep => {
        if (ep.id === epId) ep.isWatched = targetWatched;
        if (ep.isWatched) {
          seriesWatched++;
          sWatched++;
        }
      });
      s.watchedEpisodes = sWatched;
    });
    activeModalSeries.watchedEpisodes = seriesWatched;

    const percent = activeModalSeries.totalEpisodes > 0 
      ? Math.round((seriesWatched / activeModalSeries.totalEpisodes) * 100) 
      : 0;

    const metaEl = document.getElementById('szModalMeta');
    if (metaEl) {
      metaEl.textContent = `${activeModalSeries.watchedEpisodes} / ${activeModalSeries.totalEpisodes} Bölüm İzlendi (%${percent})`;
    }

    renderModalSeasonTabs();

    // Arka plandaki kartı güncelle
    const cardEps = document.getElementById(`szCardEps_${seriesSlug}`);
    const cardFill = document.getElementById(`szCardFill_${seriesSlug}`);
    if (cardEps) cardEps.textContent = `${activeModalSeries.watchedEpisodes}/${activeModalSeries.totalEpisodes}`;
    if (cardFill) cardFill.style.width = `${percent}%`;
  }

  // Sağ yan sütundaki sayacı güncelle
  updateWatchTimeDisplay(currentTotalWatchMinutes);

  // Sunucuyla eşitle
  try {
    if (profileUserData && profileUserData.id) {
      fetch('/api/auth/watched/toggle', {
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
    }
  } catch (e) {}
};

// ====================================================
// DİĞER SEKMELER
// ====================================================
function loadProfileWatchlist() {
  const grid = document.getElementById('profileWatchlistGrid');
  if (!grid) return;
  // İlk 5 diziyi listele
  grid.innerHTML = SEZONLUK_SERIES_LIST.slice(0, 5).map(item => renderSzSeriesCard(item)).join('');
}

function loadProfileFavorites() {
  const grid = document.getElementById('profileFavoritesGrid');
  if (!grid) return;
  // Sevilen 5 diziyi listele
  grid.innerHTML = SEZONLUK_SERIES_LIST.slice(4, 9).map(item => renderSzSeriesCard(item)).join('');
}

function loadProfileHistory() {
  const grid = document.getElementById('profileHistoryGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="history-card-item">
      <img src="/images/posters/person-of-interest.png" class="history-thumb">
      <div class="history-info">
        <div class="history-series-title">Person of Interest</div>
        <div class="history-ep-title">1. Sezon 16. Bölüm</div>
        <div class="history-time"><i class="fa-regular fa-clock"></i> 11.06.2026</div>
      </div>
      <a href="/dizi/person-of-interest/sezon-1/bolum-16" class="btn-primary" style="padding: 7px 12px; font-size: 0.8rem; border-radius: 8px;">
        <i class="fa-solid fa-play"></i>
      </a>
    </div>
    <div class="history-card-item">
      <img src="/images/posters/the-bear.png" class="history-thumb">
      <div class="history-info">
        <div class="history-series-title">The Bear</div>
        <div class="history-ep-title">2. Sezon 10. Bölüm</div>
        <div class="history-time"><i class="fa-regular fa-clock"></i> 03.06.2026</div>
      </div>
      <a href="/dizi/the-bear/sezon-2/bolum-10" class="btn-primary" style="padding: 7px 12px; font-size: 0.8rem; border-radius: 8px;">
        <i class="fa-solid fa-play"></i>
      </a>
    </div>
  `;
}

function loadProfileComments() {
  const container = document.getElementById('profileCommentsContainer');
  if (!container) return;
  container.innerHTML = `
    <div style="background: #ffffff; border: 1px solid #dee2e6; border-radius: 4px; padding: 14px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <strong style="color: #111827; font-size: 13.5px;"><i class="fa-solid fa-comment" style="color: #0284c7;"></i> Severance</strong>
        <span style="font-size: 11px; color: #888;">27.01.2026</span>
      </div>
      <p style="color: #4b5563; font-size: 13px; line-height: 1.45; margin: 0;">Final bölümü inanılmaz bir yerde bitti, ikinci sezonu iple çekiyorum!</p>
    </div>
  `;
}

function populateProfileSettingsForm(user) {
  const nameInput = document.getElementById('settingDisplayName');
  const avatarInput = document.getElementById('settingAvatarUrl');
  const cityGenderInput = document.getElementById('settingCityGender');
  const bioInput = document.getElementById('settingBio');
  const staticUser = document.getElementById('settingStaticUsername');
  const staticEmail = document.getElementById('settingStaticEmail');

  if (nameInput) nameInput.value = user.displayName || 'Gogolun_Paltosu';
  if (avatarInput) avatarInput.value = user.avatar || '/images/avatar_marshall.png';
  if (cityGenderInput) cityGenderInput.value = user.cityGender || 'Erkek, İstanbul';
  if (bioInput) bioInput.value = user.bio || '';
  if (staticUser) staticUser.value = user.username || 'Gogolun_Paltosu';
  if (staticEmail) staticEmail.value = user.email || 'beratakkurt346@gmail.com';
}

window.handleSaveProfileInfo = async function(e) {
  e.preventDefault();
  const displayName = document.getElementById('settingDisplayName').value.trim();
  const avatar = document.getElementById('settingAvatarUrl').value.trim();
  const cityGender = document.getElementById('settingCityGender').value.trim();
  const bio = document.getElementById('settingBio').value.trim();
  const statusBox = document.getElementById('profileSaveStatus');

  profileUserData = {
    ...profileUserData,
    displayName: displayName || profileUserData.displayName,
    avatar: avatar || profileUserData.avatar,
    cityGender: cityGender || profileUserData.cityGender,
    bio
  };
  localStorage.setItem('bolum_dizi_user', JSON.stringify(profileUserData));
  renderSidebarProfile(profileUserData);

  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#f0fdf4';
    statusBox.style.color = '#16a34a';
    statusBox.innerHTML = '<i class="fa-solid fa-check"></i> Profil bilgileriniz güncellendi!';
    setTimeout(() => { statusBox.style.display = 'none'; }, 3000);
  }
};

window.handlePasswordChange = async function(e) {
  e.preventDefault();
  const statusBox = document.getElementById('passwordSaveStatus');
  document.getElementById('passwordChangeForm').reset();
  if (statusBox) {
    statusBox.style.display = 'block';
    statusBox.style.background = '#f0fdf4';
    statusBox.style.color = '#16a34a';
    statusBox.innerHTML = '<i class="fa-solid fa-check"></i> Şifreniz başarıyla güncellendi!';
    setTimeout(() => { statusBox.style.display = 'none'; }, 3000);
  }
};
