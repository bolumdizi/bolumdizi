/* ====================================================
   BölümDizi - Main Client Application (app.js)
==================================================== */

// Universal URL Helpers (Works identically on Express and GitHub Pages)
function formatSeriesUrl(slug) {
  if (window.location.pathname.includes('.html') || window.location.hostname.includes('github.io') || window.location.hostname.includes('.xyz')) {
    return `/dizi.html?slug=${slug}`;
  }
  return `/dizi/${slug}`;
}

function formatWatchUrl(slug, season, episode) {
  if (window.location.pathname.includes('.html') || window.location.hostname.includes('github.io') || window.location.hostname.includes('.xyz')) {
    return `/izle.html?slug=${slug}&season=${season}&episode=${episode}`;
  }
  return `/dizi/${slug}/sezon-${season}/bolum-${episode}`;
}

// Theme Toggle (Aydınlık / Karanlık Mod)
function initThemeToggle() {
  const savedTheme = localStorage.getItem('bolum_dizi_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('bolum_dizi_theme', newTheme);
      updateThemeIcon(newTheme);
    });
  });
}

function updateThemeIcon(theme) {
  document.querySelectorAll('.btn-theme-toggle i').forEach(icon => {
    if (theme === 'light') {
      icon.className = 'fa-solid fa-moon';
      icon.parentElement.title = 'Karanlık Moda Geç';
    } else {
      icon.className = 'fa-solid fa-sun';
      icon.parentElement.title = 'Aydınlık Moda Geç';
    }
  });
}

// Utility: Format time ago (Turkish)
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Az önce';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  return `${months} ay önce`;
}

// Global Search Autocomplete
function initSearch() {
  const searchInput = document.getElementById('globalSearchInput');
  const searchDropdown = document.getElementById('searchResultsDropdown');
  if (!searchInput || !searchDropdown) return;

  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();

    if (query.length < 2) {
      searchDropdown.innerHTML = '';
      searchDropdown.classList.remove('active');
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/series?search=${encodeURIComponent(query)}`);
        const series = await res.json();

        if (series.length === 0) {
          searchDropdown.innerHTML = '<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 0.88rem;">Eşleşen dizi bulunamadı.</div>';
          searchDropdown.classList.add('active');
          return;
        }

        searchDropdown.innerHTML = series.slice(0, 6).map(s => `
          <a href="${formatSeriesUrl(s.slug)}" class="search-item">
            <img src="${s.poster}" alt="${s.title}" onerror="this.src='https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500'">
            <div class="search-item-info">
              <h4>${s.title}</h4>
              <div class="search-item-meta">
                <span class="badge-imdb"><i class="fa-solid fa-star"></i> ${s.imdb}</span>
                <span><i class="fa-regular fa-calendar"></i> ${s.year}</span>
                <span>${(s.genres || []).slice(0, 2).join(', ')}</span>
              </div>
            </div>
          </a>
        `).join('');

        searchDropdown.classList.add('active');
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 250);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
      searchDropdown.classList.remove('active');
    }
  });
}

// Hero Featured Slider
let heroSliderData = [];
let currentHeroIndex = 0;
let heroTimer = null;

async function loadHeroSlider() {
  const heroContainer = document.getElementById('heroBanner');
  if (!heroContainer) return;

  try {
    const res = await fetch('/api/series?featured=true');
    heroSliderData = await res.json();

    if (!heroSliderData.length) {
      const allRes = await fetch('/api/series?sort=imdb');
      heroSliderData = (await allRes.json()).slice(0, 5);
    }

    renderHeroSlide(0);

    if (heroTimer) clearInterval(heroTimer);
    heroTimer = setInterval(() => {
      currentHeroIndex = (currentHeroIndex + 1) % heroSliderData.length;
      renderHeroSlide(currentHeroIndex);
    }, 6000);

  } catch (err) {
    console.error('Error loading hero slider:', err);
  }
}

function renderHeroSlide(index) {
  const s = heroSliderData[index];
  if (!s) return;

  const backdrop = document.getElementById('heroBackdrop');
  const title = document.getElementById('heroTitle');
  const summary = document.getElementById('heroSummary');
  const imdb = document.getElementById('heroImdb');
  const tags = document.getElementById('heroTags');
  const watchBtn = document.getElementById('heroWatchBtn');
  const detailBtn = document.getElementById('heroDetailBtn');
  const dotsContainer = document.getElementById('heroDots');

  if (backdrop) backdrop.src = s.backdrop || s.poster;
  if (title) title.textContent = s.title;
  if (summary) summary.textContent = s.summary || 'Özet bilgisi bulunmuyor.';
  if (imdb) imdb.innerHTML = `<i class="fa-solid fa-star"></i> ${s.imdb}`;
  if (tags) {
    tags.innerHTML = `
      <span class="badge-tag"><i class="fa-regular fa-calendar"></i> ${s.year}</span>
      <span class="badge-tag">${s.status}</span>
      ${(s.genres || []).map(g => `<span class="badge-tag">${g}</span>`).join('')}
    `;
  }
  if (watchBtn) watchBtn.href = formatSeriesUrl(s.slug);
  if (detailBtn) detailBtn.href = formatSeriesUrl(s.slug);

  if (dotsContainer) {
    dotsContainer.innerHTML = heroSliderData.map((_, i) => `
      <div class="hero-dot ${i === index ? 'active' : ''}" onclick="selectHeroSlide(${i})"></div>
    `).join('');
  }
}

window.selectHeroSlide = function(index) {
  currentHeroIndex = index;
  renderHeroSlide(index);
};

// Dizi Takvimi Widget (SezonlukDizi Signature)
async function loadCalendarWidget() {
  const container = document.getElementById('calendarSeriesGrid');
  const tabsContainer = document.getElementById('calendarDaysTabs');
  if (!container || !tabsContainer) return;

  try {
    const res = await fetch('/api/calendar');
    const calendar = await res.json();

    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7;
    const todayName = days[dayIndex];

    tabsContainer.innerHTML = days.map(day => `
      <div class="calendar-day-tab ${day === todayName ? 'active' : ''}" onclick="selectCalendarDay('${day}')">
        <span class="day-name">${day}</span>
        <span class="day-sub">${(calendar[day] || []).length} Dizi ${day === todayName ? '• Bugün' : ''}</span>
      </div>
    `).join('');

    window.siteCalendarData = calendar;
    selectCalendarDay(todayName);

  } catch (err) {
    console.error('Error loading calendar:', err);
  }
}

window.toggleHomeCalendar = function() {
  const calWidget = document.getElementById('homeCalendarWidget');
  const toggleBtn = document.getElementById('btnToggleCalendar');
  const toggleText = document.getElementById('calendarToggleText');
  const toggleIcon = document.getElementById('calendarToggleIcon');
  if (!calWidget) return;

  const isHidden = calWidget.style.display === 'none' || calWidget.style.display === '';
  if (isHidden) {
    calWidget.style.display = 'block';
    calWidget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (toggleText) toggleText.textContent = 'Takvimi Kapat';
    if (toggleIcon) toggleIcon.className = 'fa-solid fa-chevron-up';
    if (toggleBtn) toggleBtn.classList.add('active');
  } else {
    calWidget.style.display = 'none';
    if (toggleText) toggleText.textContent = 'Takvimi Aç';
    if (toggleIcon) toggleIcon.className = 'fa-solid fa-chevron-down';
    if (toggleBtn) toggleBtn.classList.remove('active');
  }
};

window.selectCalendarDay = function(dayName) {
  const container = document.getElementById('calendarSeriesGrid');
  if (!container || !window.siteCalendarData) return;

  document.querySelectorAll('.calendar-day-tab').forEach(el => {
    el.classList.toggle('active', el.querySelector('.day-name').textContent.trim() === dayName);
  });

  const seriesList = window.siteCalendarData[dayName] || [];
  if (seriesList.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; padding: 36px; text-align: center; color: var(--text-dim); font-size: 0.95rem;">Bu gün yayınlanan yeni dizi bölümü bulunmuyor.</div>`;
    return;
  }

  container.innerHTML = seriesList.map(s => `
    <a href="${formatSeriesUrl(s.slug)}" class="calendar-card">
      <div class="calendar-card-poster">
        <img src="${s.poster}" alt="${s.title}" onerror="this.src='https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500'">
      </div>
      <div class="calendar-card-info">
        <h4 class="calendar-card-title">${s.title}</h4>
        <div class="calendar-card-ep"><i class="fa-solid fa-circle-play"></i> ${s.latestSeason}. Sezon ${s.latestEpisode}. Bölüm</div>
      </div>
    </a>
  `).join('');
};

// Latest Episodes Grid (DiziBox Signature Feed)
async function loadLatestEpisodes(filter = 'all') {
  const container = document.getElementById('latestEpisodesGrid');
  if (!container) return;

  container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary);"></i><br><br>Bölümler yükleniyor...</div>';

  try {
    let url = '/api/episodes/latest?limit=12';
    if (filter === 'dubbed') url += '&filter=dubbed';
    if (filter === 'subtitled') url += '&filter=subtitled';

    const res = await fetch(url);
    const episodes = await res.json();

    if (episodes.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Bu kategoride bölüm bulunamadı.</div>';
      return;
    }

    container.innerHTML = episodes.map(ep => {
      const isDub = ep.flags && ep.flags.isDubbed;
      const isSub = ep.flags && ep.flags.isSubtitled;

      return `
        <a href="${formatWatchUrl(ep.seriesSlug, ep.seasonNumber, ep.episodeNumber)}" class="episode-card">
          <div class="episode-thumb-wrap">
            <img src="${ep.stillPath || ep.seriesPoster}" alt="${ep.seriesTitle}" onerror="this.src='https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500'">
            <div class="badge-season-ep">${ep.seasonNumber}. Sezon ${ep.episodeNumber}. Bölüm</div>
            <div class="flags-bar">
              ${isDub ? '<span class="flag-badge flag-dub"><i class="fa-solid fa-microphone-lines"></i> Dublaj</span>' : ''}
              ${isSub ? '<span class="flag-badge flag-sub"><i class="fa-solid fa-closed-captioning"></i> Altyazı</span>' : ''}
            </div>
            <div class="play-hover-btn"><i class="fa-solid fa-play"></i></div>
          </div>
          <div class="episode-content">
            <h3 class="episode-series-title">${ep.seriesTitle}</h3>
            <div class="episode-ep-title">${ep.title}</div>
            <div class="episode-footer">
              <span class="time-ago"><i class="fa-regular fa-clock"></i> ${timeAgo(ep.createdAt)}</span>
              <span><i class="fa-regular fa-eye"></i> ${ep.viewCount.toLocaleString()}</span>
            </div>
          </div>
        </a>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading latest episodes:', err);
    container.innerHTML = '<div style="color: var(--accent-red); padding: 20px; text-align: center;">Bölümler yüklenirken bir hata oluştu.</div>';
  }
}

// Popular / Trending Series Grid
async function loadTrendingSeries() {
  const container = document.getElementById('trendingSeriesGrid');
  if (!container) return;

  try {
    const res = await fetch('/api/series?sort=views');
    const series = await res.json();

    container.innerHTML = series.slice(0, 10).map(s => `
      <a href="${formatSeriesUrl(s.slug)}" class="series-card">
        <div class="series-poster-box">
          <img src="${s.poster}" alt="${s.title}" onerror="this.src='https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500'">
          <span class="series-badge-imdb"><i class="fa-solid fa-star"></i> ${s.imdb}</span>
          <span class="series-badge-status ${s.status === 'Devam Ediyor' ? 'ongoing' : ''}">${s.status}</span>
        </div>
        <div class="series-card-info">
          <h4 class="series-card-title">${s.title}</h4>
          <div class="series-card-meta">
            <span><i class="fa-regular fa-calendar"></i> ${s.year}</span>
            <span>${(s.genres || [])[0] || 'Dizi'}</span>
          </div>
        </div>
      </a>
    `).join('');
  } catch (err) {
    console.error('Error loading trending series:', err);
  }
}

// Continue Watching Section
function loadContinueWatching() {
  const container = document.getElementById('continueWatchingSection');
  const grid = document.getElementById('continueWatchingGrid');
  if (!container || !grid) return;

  const history = JSON.parse(localStorage.getItem('bolum_dizi_history') || '[]');
  if (!history.length) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  grid.innerHTML = history.slice(0, 4).map(item => `
    <a href="${formatWatchUrl(item.slug, item.season, item.episode)}" class="episode-card" style="border-color: rgba(0, 229, 117, 0.4);">
      <div class="episode-thumb-wrap">
        <img src="${item.poster}" alt="${item.seriesTitle}">
        <div class="badge-season-ep">${item.season}. Sezon ${item.episode}. Bölüm</div>
        <div class="play-hover-btn"><i class="fa-solid fa-play"></i></div>
      </div>
      <div class="episode-content">
        <h3 class="episode-series-title">${item.seriesTitle}</h3>
        <div class="episode-ep-title">${item.episodeTitle || 'Kaldığınız Bölüm'}</div>
        <div class="episode-footer">
          <span style="color: var(--primary); font-weight: 700;"><i class="fa-solid fa-arrow-rotate-right"></i> Kaldığın Yerden Devam Et</span>
          <span style="color: #fff;"><i class="fa-solid fa-play"></i> İzle</span>
        </div>
      </div>
    </a>
  `).join('');
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initSearch();
  loadHeroSlider();
  loadCalendarWidget();
  loadLatestEpisodes('all');
  loadTrendingSeries();
  loadContinueWatching();

  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      loadLatestEpisodes(target.dataset.filter);
    });
  });
});
