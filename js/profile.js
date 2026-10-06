/* ====================================================
   BölümDizi - Comprehensive User Profile Script (profile.js)
==================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initProfilePage();
});

let profileUserData = null;
let currentProfileSeriesList = [];

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
  const tabs = ['watchlist', 'history', 'comments', 'settings'];
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

// 1. WATCHLIST LOADING & RENDERING
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
  }
};

// 2. WATCH HISTORY LOADING & RENDERING
function loadProfileHistory() {
  const grid = document.getElementById('profileHistoryGrid');
  const countBadge = document.getElementById('statHistoryCount');
  const tabCount = document.getElementById('tabCountHistory');
  const estHours = document.getElementById('statEstimatedHours');
  if (!grid) return;

  const history = JSON.parse(localStorage.getItem('bolum_dizi_history') || '[]');
  if (countBadge) countBadge.textContent = history.length;
  if (tabCount) tabCount.textContent = history.length;
  if (estHours) {
    const hours = (history.length * 0.85).toFixed(1);
    estHours.textContent = `${hours} saat`;
  }

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

// 3. COMMENTS LOADING & RENDERING
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

// 4. SETTINGS FORM POPULATION & SUBMISSION
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

  // Highlight active avatar
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

// Save Profile Info
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

// Change Password
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
