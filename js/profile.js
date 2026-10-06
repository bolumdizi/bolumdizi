/* ====================================================
   BölümDizi - SezonlukDizi Pixel-Perfect Profile Logic
   Exact Replica of Reference Screenshot & Interactive
==================================================== */

const DEFAULT_PROFILE_SERIES = [
  {
    id: 'sz1',
    slug: 'person-of-interest',
    title: 'Person of Interest',
    poster: '/images/profile_posters/person-of-interest.png',
    dateStr: '11.06.2026',
    watchedEpisodes: 16,
    totalEpisodes: 103,
    totalSeasons: 5,
    status: 'Devam Ediyor'
  },
  {
    id: 'sz2',
    slug: 'the-bear',
    title: 'The Bear',
    poster: '/images/profile_posters/the-bear.png',
    dateStr: '3.06.2026',
    watchedEpisodes: 18,
    totalEpisodes: 47,
    totalSeasons: 3,
    status: 'Devam Ediyor'
  },
  {
    id: 'sz3',
    slug: 'hajime-no-ippo',
    title: 'Hajime No Ippo: Rising',
    poster: '/images/profile_posters/hajime-no-ippo.png',
    dateStr: '16.05.2026',
    watchedEpisodes: 23,
    totalEpisodes: 25,
    totalSeasons: 1,
    status: 'Devam Ediyor'
  },
  {
    id: 'sz4',
    slug: 'regular-show',
    title: 'Regular Show: The Lost Tapes',
    poster: '/images/profile_posters/regular-show.png',
    dateStr: '13.05.2026',
    watchedEpisodes: 5,
    totalEpisodes: 19,
    totalSeasons: 2,
    status: 'Devam Ediyor'
  },
  {
    id: 'sz5',
    slug: 'severance',
    title: 'Severance',
    poster: '/images/profile_posters/severance.png',
    dateStr: '27.01.2026',
    watchedEpisodes: 13,
    totalEpisodes: 19,
    totalSeasons: 2,
    status: 'Devam Ediyor'
  },
  {
    id: 'sz6',
    slug: 'daredevil-born-again',
    title: 'Daredevil: Born Again',
    poster: '/images/profile_posters/daredevil.png',
    dateStr: '17.04.2025',
    watchedEpisodes: 9,
    totalEpisodes: 17,
    totalSeasons: 1,
    status: 'Devam Ediyor'
  },
  {
    id: 'sz7',
    slug: 'the-good-doctor',
    title: 'The Good Doctor',
    poster: '/images/profile_posters/the-good-doctor.png',
    dateStr: '10.04.2024',
    watchedEpisodes: 117,
    totalEpisodes: 126,
    totalSeasons: 7,
    status: 'Devam Ediyor'
  },
  {
    id: 'sz8',
    slug: 'avatar-the-last-airbender',
    title: 'Avatar: The Last Airbender',
    poster: '/images/profile_posters/avatar.png',
    dateStr: '14.03.2024',
    watchedEpisodes: 2,
    totalEpisodes: 15,
    totalSeasons: 1,
    status: 'Devam Ediyor'
  },
  {
    id: 'sz9',
    slug: 'modern-family',
    title: 'Modern Family',
    poster: '/images/profile_posters/modern-family.png',
    dateStr: '12.02.2024',
    watchedEpisodes: 9,
    totalEpisodes: 250,
    totalSeasons: 11,
    status: 'Devam Ediyor'
  },
  {
    id: 'sz10',
    slug: 'seinfeld',
    title: 'Seinfeld',
    poster: '/images/profile_posters/seinfeld.png',
    dateStr: '3.02.2024',
    watchedEpisodes: 1,
    totalEpisodes: 171,
    totalSeasons: 9,
    status: 'Devam Ediyor'
  }
];

let allProfileSeries = [];
let currentSubFilter = 'ongoing'; // ongoing | completed | dropped
let activeModalSeries = null;
let activeModalSeason = 1;

document.addEventListener('DOMContentLoaded', () => {
  initProfilePage();
});

function initProfilePage() {
  // Load saved series progress from localStorage if exists
  const savedState = localStorage.getItem('sz_profile_series_state');
  if (savedState) {
    try {
      allProfileSeries = JSON.parse(savedState);
    } catch (e) {
      allProfileSeries = JSON.parse(JSON.stringify(DEFAULT_PROFILE_SERIES));
    }
  } else {
    allProfileSeries = JSON.parse(JSON.stringify(DEFAULT_PROFILE_SERIES));
  }

  // Render cards
  renderCardsGrid();
  updateWatchTimeCounter();
}

function renderCardsGrid() {
  const container = document.getElementById('szCardsGrid');
  if (!container) return;

  let filtered = allProfileSeries;
  if (currentSubFilter === 'ongoing') {
    filtered = allProfileSeries.filter(s => s.watchedEpisodes < s.totalEpisodes);
  } else if (currentSubFilter === 'completed') {
    filtered = allProfileSeries.filter(s => s.watchedEpisodes >= s.totalEpisodes);
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #64748b; font-size: 13px;">Bu filtrede henüz dizi bulunmuyor.</div>`;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const percent = Math.min(100, Math.round((item.watchedEpisodes / item.totalEpisodes) * 100));
    return `
      <article class="sz-item-card" onclick="openEpisodeModal('${item.slug}')">
        <div class="sz-item-poster">
          <img src="${item.poster}" alt="${item.title}" loading="lazy">
        </div>
        <div class="sz-item-body">
          <h4 class="sz-item-title" title="${item.title}">${item.title}</h4>
          <div class="sz-item-meta">
            <span class="sz-item-date">${item.dateStr}</span>
            <span class="sz-item-ratio">${item.watchedEpisodes}/${item.totalEpisodes}</span>
          </div>
          <div class="sz-item-progress-track">
            <div class="sz-item-progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

window.setSubFilter = function(filter) {
  currentSubFilter = filter;
  document.getElementById('subBtnOngoing').classList.toggle('active', filter === 'ongoing');
  document.getElementById('subBtnCompleted').classList.toggle('active', filter === 'completed');
  document.getElementById('subBtnDropped').classList.toggle('active', filter === 'dropped');
  renderCardsGrid();
};

window.switchProfileTab = function(tabName) {
  document.querySelectorAll('.sz-tab-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-tab') === tabName);
  });
};

function updateWatchTimeCounter() {
  // Compute total watched episodes across all tracked series
  let totalWatched = 0;
  allProfileSeries.forEach(s => {
    totalWatched += s.watchedEpisodes;
  });

  // Calculate: exactly 2 AY, 17 GÜN, 6 SAAT, 22 DAKİKA for baseline, or dynamic
  // Total baseline: 2 months (60d) + 17 days + 6 hours + 22 mins = 111,262 mins (~2472 episodes at 45m)
  // If baseline matches initial:
  const baseMinutes = (2 * 30 * 24 * 60) + (17 * 24 * 60) + (6 * 60) + 22;
  const initialWatched = DEFAULT_PROFILE_SERIES.reduce((acc, s) => acc + s.watchedEpisodes, 0); // 219
  const diffWatched = totalWatched - initialWatched;
  const totalMins = Math.max(0, baseMinutes + (diffWatched * 45));

  const minutes = totalMins % 60;
  const totalHours = Math.floor(totalMins / 60);
  const hours = totalHours % 24;
  const totalDays = Math.floor(totalHours / 24);
  const days = totalDays % 30;
  const months = Math.floor(totalDays / 30);

  document.getElementById('wtNumMonths').textContent = months;
  document.getElementById('wtNumDays').textContent = days;
  document.getElementById('wtNumHours').textContent = hours;
  document.getElementById('wtNumMins').textContent = minutes;
}

// Interactive Episode Modal
window.openEpisodeModal = function(slug) {
  const series = allProfileSeries.find(s => s.slug === slug);
  if (!series) return;
  activeModalSeries = series;
  activeModalSeason = 1;

  document.getElementById('modalHeadPoster').src = series.poster;
  document.getElementById('modalHeadTitle').textContent = series.title;
  updateModalHeaderMeta();

  renderModalSeasonTabs();
  renderModalEpisodeList();

  document.getElementById('szEpisodeModal').classList.add('active');
};

window.closeEpisodeModal = function() {
  document.getElementById('szEpisodeModal').classList.remove('active');
};

function updateModalHeaderMeta() {
  if (!activeModalSeries) return;
  const percent = Math.round((activeModalSeries.watchedEpisodes / activeModalSeries.totalEpisodes) * 100);
  document.getElementById('modalHeadMeta').textContent = `${activeModalSeries.watchedEpisodes} / ${activeModalSeries.totalEpisodes} Bölüm İzlendi (%${percent})`;
}

function renderModalSeasonTabs() {
  const tabsContainer = document.getElementById('modalSeasonTabs');
  if (!tabsContainer || !activeModalSeries) return;

  const totalSeasons = activeModalSeries.totalSeasons || 1;
  let html = '';
  for (let s = 1; s <= totalSeasons; s++) {
    html += `
      <button class="sz-modal-season-btn ${s === activeModalSeason ? 'active' : ''}" onclick="selectModalSeason(${s})">
        ${s}. Sezon
      </button>
    `;
  }
  tabsContainer.innerHTML = html;
}

window.selectModalSeason = function(seasonNum) {
  activeModalSeason = seasonNum;
  renderModalSeasonTabs();
  renderModalEpisodeList();
};

function renderModalEpisodeList() {
  const container = document.getElementById('modalEpsList');
  if (!container || !activeModalSeries) return;

  const totalSeasons = activeModalSeries.totalSeasons || 1;
  const epsPerSeason = Math.max(1, Math.round(activeModalSeries.totalEpisodes / totalSeasons));
  const seasonStartEp = (activeModalSeason - 1) * epsPerSeason + 1;
  const seasonEndEp = Math.min(activeModalSeries.totalEpisodes, activeModalSeason * epsPerSeason);

  let html = '';
  for (let ep = seasonStartEp; ep <= seasonEndEp; ep++) {
    const isWatched = ep <= activeModalSeries.watchedEpisodes;
    html += `
      <div class="sz-modal-ep-row">
        <div class="sz-modal-ep-info">
          <span class="sz-modal-ep-pill">${activeModalSeason}. Sezon ${ep - seasonStartEp + 1}. Bölüm</span>
          <span class="sz-modal-ep-name">${activeModalSeries.title} - Bölüm ${ep}</span>
        </div>
        <button class="sz-modal-ep-btn ${isWatched ? 'watched' : ''}" onclick="toggleEpisodeWatched(${ep})">
          <i class="fa-solid ${isWatched ? 'fa-check' : 'fa-plus'}"></i>
          <span>${isWatched ? 'İzlendi' : 'İzlenmedi'}</span>
        </button>
      </div>
    `;
  }
  container.innerHTML = html;
}

window.toggleEpisodeWatched = function(epNumber) {
  if (!activeModalSeries) return;

  if (epNumber <= activeModalSeries.watchedEpisodes) {
    // If clicking an already watched episode, decrement or set to epNumber - 1
    activeModalSeries.watchedEpisodes = Math.max(0, epNumber - 1);
  } else {
    // If clicking an unwatched episode, mark up to this episode
    activeModalSeries.watchedEpisodes = Math.min(activeModalSeries.totalEpisodes, epNumber);
  }

  // Persist to localStorage
  localStorage.setItem('sz_profile_series_state', JSON.stringify(allProfileSeries));

  updateModalHeaderMeta();
  renderModalEpisodeList();
  renderCardsGrid();
  updateWatchTimeCounter();
};

window.handleUserLogout = function() {
  localStorage.removeItem('bolum_dizi_user');
  window.location.href = '/';
};
