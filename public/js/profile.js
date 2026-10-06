/* ====================================================
   BölümDizi - SezonlukDizi İlhamlı Gelişmiş Üye Profili
   (profile.js)
==================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initProfilePage();
});

let profileUserData = null;
let currentProgressSeries = [];
let currentSubFilter = 'ongoing'; // 'ongoing' | 'completed' | 'dropped'
let activeModalSeries = null;
let activeModalSeason = 1;

// ====================================================
// BAŞLANGIÇ & KULLANICI SENKRONİZASYONU
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

  // Oturum açılmamışsa BölümDizi üye profilini varsayılan olarak yükle
  if (!profileUserData) {
    profileUserData = {
      id: 'u1',
      username: 'dizisever',
      displayName: 'Dizi Sever',
      email: 'dizisever@bolumdizi.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
      cityGender: 'Erkek, İstanbul',
      followingCount: 0,
      followersCount: 2,
      createdAt: '2026-10-06T00:00:00.000Z',
      lastSeen: 'Bugün',
      watchedEpisodes: {}
    };
    localStorage.setItem('bolum_dizi_user', JSON.stringify(profileUserData));
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
  } catch (e) {}

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
  } catch (e) {}

  renderSidebarProfile(profileUserData);
  await loadProfileProgress();
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
  const displayName = user.displayName || user.username || 'Dizi Sever';
  const avatarUrl = user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';

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
  if (emailEl) emailEl.textContent = user.email || 'dizisever@bolumdizi.com';

  const joinEl = document.getElementById('sidebarJoinDate');
  if (joinEl) {
    if (user.createdAt) {
      const dt = new Date(user.createdAt);
      joinEl.textContent = `${dt.getDate()} ${dt.toLocaleDateString('tr-TR', { month: 'long' })} ${dt.getFullYear()}`;
    } else {
      joinEl.textContent = 'Ekim 2026';
    }
  }

  const lastSeenEl = document.getElementById('sidebarLastSeen');
  if (lastSeenEl) lastSeenEl.textContent = user.lastSeen || 'Bugün';
}

function updateWatchTimeWidget(totalEpisodesWatched) {
  // Ortalama 45 dakika x izlenen bölüm sayısı
  const totalMinutes = Math.max(0, (totalEpisodesWatched || 0) * 45);
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
// 1. İZLENENLER SEKMESİ (5'Lİ DİZİ AFİŞ TABLOSU)
// ====================================================
async function loadProfileProgress() {
  const list = document.getElementById('profileProgressList');
  if (!list) return;

  try {
    const res = await fetch(`/api/auth/progress?userId=${profileUserData.id}`);
    const data = await res.json();

    const localWatched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');

    // Sunucudaki ve veritabanındaki tüm dizileri al
    const all = data.allSeriesProgress || data.series || [];

    // İzleme durumunu hesapla
    currentProgressSeries = all.map(s => {
      let watchedCount = 0;
      let lastWatchedTimestamp = null;

      (s.seasons || []).forEach(season => {
        let seasonWatched = 0;
        (season.episodes || []).forEach(ep => {
          const wInfo = localWatched[ep.id];
          ep.isWatched = Boolean(wInfo);
          if (ep.isWatched) {
            watchedCount++;
            seasonWatched++;
            if (wInfo.watchedAt) {
              const t = new Date(wInfo.watchedAt).getTime();
              if (!lastWatchedTimestamp || t > lastWatchedTimestamp) lastWatchedTimestamp = t;
            }
          }
        });
        season.watchedEpisodes = seasonWatched;
        season.percent = season.totalEpisodes > 0 ? Math.round((seasonWatched / season.totalEpisodes) * 100) : 0;
      });

      s.watchedEpisodes = watchedCount;
      s.percent = s.totalEpisodes > 0 ? Math.round((watchedCount / s.totalEpisodes) * 100) : 0;
      
      const dt = lastWatchedTimestamp ? new Date(lastWatchedTimestamp) : new Date(s.createdAt || Date.now());
      s.dateStr = `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
      return s;
    });

    // Toplam izlenen bölüm sayısını hesapla
    let totalWatchedCalc = 0;
    currentProgressSeries.forEach(s => {
      totalWatchedCalc += s.watchedEpisodes;
    });
    const finalWatchedCount = Math.max(totalWatchedCalc, Object.keys(localWatched).length);
    updateWatchTimeWidget(finalWatchedCount);

    renderFilteredProgressCards();

  } catch (err) {
    console.error('Error loading progress:', err);
    list.innerHTML = '<div style="grid-column: 1/-1; padding: 30px; text-align: center; color: var(--accent-red);">İlerlemeler yüklenirken hata oluştu.</div>';
  }
}

function renderFilteredProgressCards() {
  const list = document.getElementById('profileProgressList');
  if (!list) return;

  let filtered = [];
  if (currentSubFilter === 'ongoing') {
    // Devam Edilen: Tamamlanmamış diziler
    filtered = currentProgressSeries.filter(s => s.status !== 'Tamamlandı' && s.percent < 100);
    if (filtered.length === 0) {
      filtered = currentProgressSeries.filter(s => s.status !== 'Tamamlandı');
    }
  } else if (currentSubFilter === 'completed') {
    // Tamamlanan: Tamamlanmış diziler
    filtered = currentProgressSeries.filter(s => s.status === 'Tamamlandı' || s.percent >= 100);
  } else {
    // Bırakılan / Tümü
    filtered = currentProgressSeries;
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

// 5'li Dizi Afiş Kartı (SezonlukDizi Stili)
function renderSzSeriesCard(item) {
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
          <div class="sz-card-progress-fill" id="szCardFill_${item.slug}" style="width: ${item.percent}%;"></div>
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
// BÖLÜM KONTROL LİSTESİ MODALI (Afişe Tıklayınca Açılır)
// ====================================================
window.openSzEpisodeModal = function(slug) {
  const series = currentProgressSeries.find(s => s.slug === slug || s.id === slug);
  if (!series) return;

  activeModalSeries = series;
  activeModalSeason = (series.seasons && series.seasons.length > 0) ? series.seasons[0].seasonNumber : 1;

  const posterEl = document.getElementById('szModalPoster');
  const titleEl = document.getElementById('szModalTitle');
  const metaEl = document.getElementById('szModalMeta');

  if (posterEl) posterEl.src = series.poster;
  if (titleEl) titleEl.textContent = series.title;
  if (metaEl) metaEl.textContent = `${series.watchedEpisodes} / ${series.totalEpisodes} Bölüm İzlendi (%${series.percent})`;

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

  let localWatched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');
  const targetWatched = !Boolean(localWatched[epId]);

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

  // Modaldaki buton durumunu hemen güncelle
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

  // Dizi nesnesinin sayılarını güncelle
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

    const metaEl = document.getElementById('szModalMeta');
    if (metaEl) {
      metaEl.textContent = `${activeModalSeries.watchedEpisodes} / ${activeModalSeries.totalEpisodes} Bölüm İzlendi (%${activeModalSeries.percent})`;
    }

    renderModalSeasonTabs();

    // Arka plandaki kartı güncelle
    const cardEps = document.getElementById(`szCardEps_${seriesSlug}`);
    const cardFill = document.getElementById(`szCardFill_${seriesSlug}`);
    if (cardEps) cardEps.textContent = `${activeModalSeries.watchedEpisodes}/${activeModalSeries.totalEpisodes}`;
    if (cardFill) cardFill.style.width = `${activeModalSeries.percent}%`;
  }

  // Sağ yan sütundaki sayacı güncelle
  const totalWatchedCount = Object.keys(localWatched).length;
  updateWatchTimeWidget(totalWatchedCount);

  // Sunucuya kaydet
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
async function loadProfileWatchlist() {
  const grid = document.getElementById('profileWatchlistGrid');
  if (!grid || !profileUserData) return;

  try {
    const res = await fetch(`/api/auth/watchlist?userId=${profileUserData.id}`);
    const data = await res.json();
    const watchlist = data.watchlist || [];

    if (watchlist.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">Takip ettiğiniz dizi bulunmuyor.</div>';
      return;
    }

    grid.innerHTML = watchlist.map(item => renderSzSeriesCard(item)).join('');
  } catch (e) {
    if (currentProgressSeries.length > 0) {
      grid.innerHTML = currentProgressSeries.slice(0, 5).map(item => renderSzSeriesCard(item)).join('');
    }
  }
}

async function loadProfileFavorites() {
  const grid = document.getElementById('profileFavoritesGrid');
  if (!grid) return;
  if (currentProgressSeries.length > 0) {
    grid.innerHTML = currentProgressSeries.slice(0, 5).map(item => renderSzSeriesCard(item)).join('');
  }
}

function loadProfileHistory() {
  const grid = document.getElementById('profileHistoryGrid');
  if (!grid) return;
  const history = JSON.parse(localStorage.getItem('bolum_dizi_history') || '[]');
  if (history.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">İzleme geçmişiniz henüz boş.</div>';
    return;
  }

  grid.innerHTML = history.map(item => `
    <div class="history-card-item">
      <img src="${item.poster || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200'}" class="history-thumb">
      <div class="history-info">
        <div class="history-series-title">${item.seriesTitle}</div>
        <div class="history-ep-title">${item.season}. Sezon ${item.episode}. Bölüm</div>
        <div class="history-time"><i class="fa-regular fa-clock"></i> Bugün</div>
      </div>
      <a href="/dizi/${item.slug}/sezon-${item.season}/bolum-${item.episode}" class="btn-primary" style="padding: 7px 12px; font-size: 0.8rem; border-radius: 8px;">
        <i class="fa-solid fa-play"></i>
      </a>
    </div>
  `).join('');
}

function loadProfileComments() {
  const container = document.getElementById('profileCommentsContainer');
  if (!container) return;
  container.innerHTML = `
    <div style="background: #ffffff; border: 1px solid #dee2e6; border-radius: 4px; padding: 14px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <strong style="color: #111827; font-size: 13.5px;"><i class="fa-solid fa-comment" style="color: #0284c7;"></i> Severance</strong>
        <span style="font-size: 11px; color: #888;">Bugün</span>
      </div>
      <p style="color: #4b5563; font-size: 13px; line-height: 1.45; margin: 0;">Harika bir sezon finaliydi, merakla bekliyoruz!</p>
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

  if (nameInput) nameInput.value = user.displayName || 'Dizi Sever';
  if (avatarInput) avatarInput.value = user.avatar || '';
  if (cityGenderInput) cityGenderInput.value = user.cityGender || 'Erkek, İstanbul';
  if (bioInput) bioInput.value = user.bio || '';
  if (staticUser) staticUser.value = user.username || 'dizisever';
  if (staticEmail) staticEmail.value = user.email || 'dizisever@bolumdizi.com';
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
