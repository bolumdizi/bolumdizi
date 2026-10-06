/* ====================================================
   BölümDizi - Client Authentication & Membership Module
==================================================== */

let currentAuthUser = null;

// Initialize on page load
function initAuth() {
  try {
    currentAuthUser = JSON.parse(localStorage.getItem('bolum_dizi_user') || 'null');
  } catch (e) {
    currentAuthUser = null;
  }
  updateAuthUI();

  // Close user dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('authUserWrap');
    const menu = document.getElementById('userDropdownMenu');
    if (wrap && menu && !wrap.contains(e.target)) {
      menu.classList.remove('active');
    }
  });
}

// Update Header according to login state
function updateAuthUI() {
  const guestActions = document.getElementById('authGuestActions');
  const userWrap = document.getElementById('authUserWrap');
  const nameLabel = document.getElementById('userNameLabel');
  const avatarBadge = document.getElementById('userAvatarBadge');
  const dropdownUsername = document.getElementById('dropdownUsername');
  const dropdownEmail = document.getElementById('dropdownEmail');
  const countBadge = document.getElementById('userWatchlistCountBadge');

  if (currentAuthUser) {
    if (guestActions) guestActions.style.display = 'none';
    if (userWrap) userWrap.style.display = 'block';

    const displayName = currentAuthUser.displayName || currentAuthUser.username || 'Üye';
    if (nameLabel) nameLabel.textContent = displayName;
    if (avatarBadge) avatarBadge.textContent = displayName.charAt(0).toUpperCase();
    if (dropdownUsername) dropdownUsername.textContent = displayName;
    if (dropdownEmail) dropdownEmail.textContent = currentAuthUser.email || '';
    if (countBadge) countBadge.textContent = (currentAuthUser.watchlist || []).length;

    // Auto-fill comment author if on series or watch page
    const seriesAuthor = document.getElementById('seriesCommentAuthor');
    if (seriesAuthor && !seriesAuthor.value) seriesAuthor.value = displayName;
    const epAuthor = document.getElementById('commentAuthor');
    if (epAuthor && !epAuthor.value) epAuthor.value = displayName;

    // Update watchlist button state on dizi.html
    updateWatchlistButtonState();

  } else {
    if (guestActions) guestActions.style.display = 'flex';
    if (userWrap) userWrap.style.display = 'none';
  }
}

// Dropdown Menu Toggle
window.toggleUserMenu = function() {
  const menu = document.getElementById('userDropdownMenu');
  if (menu) menu.classList.toggle('active');
};

// Open / Close Auth Modal
window.openAuthModal = function(tab = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.add('active');
  switchAuthTab(tab);
};

window.closeAuthModal = function() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
  const logErr = document.getElementById('loginAuthError');
  if (logErr) logErr.style.display = 'none';
  const regErr = document.getElementById('registerAuthError');
  if (regErr) regErr.style.display = 'none';
};

window.switchAuthTab = function(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');

  if (tab === 'login') {
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (tabLoginBtn) tabLoginBtn.classList.add('active');
    if (tabRegisterBtn) tabRegisterBtn.classList.remove('active');
  } else {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (tabLoginBtn) tabLoginBtn.classList.remove('active');
    if (tabRegisterBtn) tabRegisterBtn.classList.add('active');
  }
};

// Handle Login
window.handleUserLoginForm = async function(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsernameInput').value.trim();
  const password = document.getElementById('loginPasswordInput').value;
  const errBox = document.getElementById('loginAuthError');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      if (errBox) {
        errBox.textContent = data.error || 'Giriş yapılamadı.';
        errBox.style.display = 'block';
      }
      return;
    }

    currentAuthUser = data.user;
    localStorage.setItem('bolum_dizi_user', JSON.stringify(data.user));
    if (data.token) localStorage.setItem('bolum_dizi_token', data.token);

    closeAuthModal();
    updateAuthUI();

  } catch (err) {
    console.error('Login error:', err);
    if (errBox) {
      errBox.textContent = 'Bağlantı hatası oluştu.';
      errBox.style.display = 'block';
    }
  }
};

// Handle Register
window.handleUserRegisterForm = async function(e) {
  e.preventDefault();
  const username = document.getElementById('registerUsernameInput').value.trim();
  const email = document.getElementById('registerEmailInput').value.trim();
  const password = document.getElementById('registerPasswordInput').value;
  const errBox = document.getElementById('registerAuthError');

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      if (errBox) {
        errBox.textContent = data.error || 'Kayıt işlemi başarısız.';
        errBox.style.display = 'block';
      }
      return;
    }

    currentAuthUser = data.user;
    localStorage.setItem('bolum_dizi_user', JSON.stringify(data.user));
    if (data.token) localStorage.setItem('bolum_dizi_token', data.token);

    closeAuthModal();
    updateAuthUI();

  } catch (err) {
    console.error('Register error:', err);
    if (errBox) {
      errBox.textContent = 'Bağlantı hatası oluştu.';
      errBox.style.display = 'block';
    }
  }
};

// Handle Logout
window.handleUserLogout = function() {
  currentAuthUser = null;
  localStorage.removeItem('bolum_dizi_user');
  localStorage.removeItem('bolum_dizi_token');
  const menu = document.getElementById('userDropdownMenu');
  if (menu) menu.classList.remove('active');
  updateAuthUI();
};

// Watchlist toggle (Listeme Ekle / Listemden Çıkar)
window.toggleWatchlist = async function(target) {
  if (!currentAuthUser) {
    openAuthModal('login');
    return;
  }

  const seriesSlug = (typeof target === 'object' && target !== null) ? target.slug : target;
  if (!seriesSlug) return;

  try {
    const res = await fetch('/api/auth/watchlist/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentAuthUser.id, seriesSlug })
    });

    const data = await res.json();
    if (data.success) {
      currentAuthUser.watchlist = data.watchlist;
      localStorage.setItem('bolum_dizi_user', JSON.stringify(currentAuthUser));
      updateAuthUI();
      updateWatchlistButtonState();
    }
  } catch (err) {
    console.error('Watchlist toggle error:', err);
  }
};

window.updateWatchlistButtonState = function() {
  const btn = document.getElementById('addWatchlistBtn');
  if (!btn) return;

  const urlParams = new URLSearchParams(window.location.search);
  const slug = (window.currentSeries && window.currentSeries.slug) 
    || urlParams.get('slug') 
    || window.location.pathname.split('/').filter(Boolean)[1];
  if (!slug) return;

  const inList = currentAuthUser && (currentAuthUser.watchlist || []).includes(slug);
  if (inList) {
    btn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--primary);"></i> Listemde Eklendi';
    btn.classList.add('active');
  } else {
    btn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Listeme Ekle';
    btn.classList.remove('active');
  }
}

// Watchlist Modal
window.openWatchlistModal = async function() {
  if (!currentAuthUser) {
    openAuthModal('login');
    return;
  }

  const modal = document.getElementById('watchlistModal');
  const container = document.getElementById('userWatchlistContainer');
  if (!modal || !container) return;

  modal.classList.add('active');
  container.innerHTML = '<div style="text-align: center; padding: 30px;"><i class="fa-solid fa-spinner fa-spin"></i> Listeniz yükleniyor...</div>';

  try {
    const res = await fetch(`/api/auth/watchlist?userId=${currentAuthUser.id}`);
    const data = await res.json();
    const series = data.watchlist || [];

    if (series.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-dim);">
          <i class="fa-regular fa-bookmark" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 12px; display: block;"></i>
          <h4 style="color: #fff; margin-bottom: 6px;">Henüz Takip Ettiğiniz Dizi Yok</h4>
          <p style="font-size: 0.9rem;">Dizi sayfalarındaki "Listeme Ekle" butonunu kullanarak favori dizilerinizi buraya ekleyebilirsiniz.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = series.map(s => `
      <div class="watchlist-item-row">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${s.poster}" alt="${s.title}" class="watchlist-item-thumb">
          <div>
            <h4 style="font-size: 1rem; color: #fff; font-weight: 700; margin-bottom: 4px;">${s.title}</h4>
            <div style="display: flex; gap: 8px; font-size: 0.8rem; color: var(--text-muted);">
              <span><i class="fa-solid fa-star" style="color: var(--accent-gold);"></i> ${s.imdb}</span>
              <span>• ${s.year}</span>
              <span>• ${s.status}</span>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <a href="/dizi/${s.slug}" class="btn-primary" style="padding: 6px 14px; font-size: 0.84rem;">
            <i class="fa-solid fa-play"></i> İzle
          </a>
          <button class="ctrl-btn" onclick="toggleWatchlist('${s.slug}'); openWatchlistModal();" title="Listeden Kaldır" style="padding: 6px 10px; color: var(--accent-red);">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Watchlist load error:', err);
    container.innerHTML = '<div style="color: var(--accent-red); padding: 20px;">Listeniz yüklenirken hata oluştu.</div>';
  }
};

window.closeWatchlistModal = function() {
  const modal = document.getElementById('watchlistModal');
  if (modal) modal.classList.remove('active');
};

// History Modal
window.openHistoryModal = function() {
  const modal = document.getElementById('watchlistModal');
  const container = document.getElementById('userWatchlistContainer');
  const title = modal ? modal.querySelector('.modal-title') : null;
  if (!modal || !container) return;

  if (title) title.innerHTML = '<i class="fa-solid fa-clock-rotate-left" style="color: var(--secondary);"></i> İzleme Geçmişim';
  modal.classList.add('active');

  const history = JSON.parse(localStorage.getItem('bolum_dizi_history') || '[]');
  if (history.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-dim);">
        <i class="fa-solid fa-clock-rotate-left" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 12px; display: block;"></i>
        <h4 style="color: #fff; margin-bottom: 6px;">İzleme Geçmişiniz Boş</h4>
        <p style="font-size: 0.9rem;">Bir bölüm izlemeye başladığınızda burada listelenecektir.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = history.map(item => `
    <div class="watchlist-item-row">
      <div style="display: flex; align-items: center; gap: 14px;">
        <img src="${item.poster}" alt="${item.seriesTitle}" class="watchlist-item-thumb">
        <div>
          <h4 style="font-size: 1rem; color: #fff; font-weight: 700; margin-bottom: 4px;">${item.seriesTitle}</h4>
          <div style="font-size: 0.82rem; color: var(--primary); font-weight: 600;">
            ${item.season}. Sezon ${item.episode}. Bölüm
          </div>
        </div>
      </div>
      <div>
        <a href="/dizi/${item.slug}/sezon-${item.season}/bolum-${item.episode}" class="btn-primary" style="padding: 6px 14px; font-size: 0.84rem;">
          <i class="fa-solid fa-play"></i> Devam Et
        </a>
      </div>
    </div>
  `).join('');
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initAuth);
