/* ====================================================
   BölümDizi - Admin Panel Controller (admin.js)
==================================================== */

let allAdminSeries = [];
let allAdminEpisodes = [];

// Check Authentication
function checkAuth() {
  const token = localStorage.getItem('bolum_dizi_admin_token');
  const loginScreen = document.getElementById('adminLoginScreen');
  const dashboard = document.getElementById('adminDashboard');

  if (token) {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'flex';
    initAdminData();
  } else {
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
  }
}

// Handle Login
async function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorMsg = document.getElementById('loginErrorMsg');

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      localStorage.setItem('bolum_dizi_admin_token', data.token);
      checkAuth();
    } else {
      errorMsg.textContent = data.error || 'Giriş başarısız!';
      errorMsg.style.display = 'block';
    }
  } catch (err) {
    errorMsg.textContent = 'Sunucuya bağlanılamadı.';
    errorMsg.style.display = 'block';
  }
}

// Handle Logout
function handleAdminLogout() {
  localStorage.removeItem('bolum_dizi_admin_token');
  checkAuth();
}

// Switch Sidebar Tabs
function switchAdminTab(tabName) {
  document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.admin-tab-pane').forEach(pane => pane.style.display = 'none');

  const titles = {
    overview: 'Genel Bakış & İstatistikler',
    series: 'Dizi Yönetimi',
    episodes: 'Bölüm Yönetimi',
    reports: 'Kırık Link & Hata Bildirimleri',
    comments: 'Yorum Moderasyonu',
    settings: 'Site Ayarları'
  };

  document.getElementById('adminTabTitle').textContent = titles[tabName] || 'Yönetim Paneli';

  const activeNav = Array.from(document.querySelectorAll('.admin-nav-item')).find(el => el.textContent.toLowerCase().includes(tabName.toLowerCase()) || el.getAttribute('onclick').includes(tabName));
  if (activeNav) activeNav.classList.add('active');

  const pane = document.getElementById(`tab-${tabName}`);
  if (pane) pane.style.display = 'block';

  // Load specific data
  if (tabName === 'overview') loadAdminStats();
  if (tabName === 'series') loadAdminSeries();
  if (tabName === 'episodes') loadAdminEpisodes();
  if (tabName === 'reports') loadAdminReports();
  if (tabName === 'comments') loadAdminComments();
  if (tabName === 'settings') loadAdminSettings();
}

// Initial Data Load
async function initAdminData() {
  await loadAdminStats();
  await loadAdminSeries();
  await populateSeriesDropdowns();
}

// Stats
async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats');
    const stats = await res.json();

    document.getElementById('statTotalSeries').textContent = stats.totalSeries;
    document.getElementById('statTotalEpisodes').textContent = stats.totalEpisodes;
    document.getElementById('statTotalViews').textContent = stats.totalViews.toLocaleString();
    document.getElementById('statPendingReports').textContent = stats.pendingReports;

    document.getElementById('badgeSeriesCount').textContent = stats.totalSeries;
    document.getElementById('badgeEpisodesCount').textContent = stats.totalEpisodes;
    document.getElementById('badgeReportsCount').textContent = stats.pendingReports;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// Series Management
async function loadAdminSeries() {
  try {
    const res = await fetch('/api/series');
    allAdminSeries = await res.json();

    const tbody = document.getElementById('adminSeriesTableBody');
    tbody.innerHTML = allAdminSeries.map(s => `
      <tr>
        <td>
          <img src="${s.poster}" alt="${s.title}" style="width: 40px; height: 55px; object-fit: cover; border-radius: 4px;">
        </td>
        <td>
          <strong style="color: #fff;">${s.title}</strong>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${s.originalTitle || ''}</div>
        </td>
        <td><span class="badge-imdb">★ ${s.imdb}</span></td>
        <td>${s.year} • <span style="color: ${s.status === 'Devam Ediyor' ? 'var(--primary)' : 'var(--text-muted)'};">${s.status}</span></td>
        <td><span style="color: var(--secondary); font-weight: 600;">${s.airDay || 'Pazartesi'}</span></td>
        <td>${(s.genres || []).slice(0, 2).join(', ')}</td>
        <td>${(s.viewCount || 0).toLocaleString()}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn-action btn-action-edit" onclick="editSeries('${s.id}')">Düzenle</button>
            <button class="btn-action btn-action-delete" onclick="deleteSeries('${s.id}')">Sil</button>
          </div>
        </td>
      </tr>
    `).join('');

    populateSeriesDropdowns();
  } catch (err) {
    console.error('Error loading series:', err);
  }
}

function openAddSeriesModal() {
  document.getElementById('editSeriesId').value = '';
  document.getElementById('seriesModalTitle').textContent = 'Yeni Dizi Ekle';
  document.getElementById('seriesFormTitle').value = '';
  document.getElementById('seriesFormOrigTitle').value = '';
  document.getElementById('seriesFormImdb').value = '8.5';
  document.getElementById('seriesFormYear').value = '2024';
  document.getElementById('seriesFormPoster').value = '';
  document.getElementById('seriesFormBackdrop').value = '';
  document.getElementById('seriesFormGenres').value = 'Dram, Gerilim';
  document.getElementById('seriesFormCast').value = '';
  document.getElementById('seriesFormTrailer').value = '';
  document.getElementById('seriesFormSummary').value = '';
  document.getElementById('seriesModal').classList.add('active');
}

function closeSeriesModal() {
  document.getElementById('seriesModal').classList.remove('active');
}

function fillSampleSeriesData() {
  document.getElementById('seriesFormTitle').value = 'Better Call Saul';
  document.getElementById('seriesFormOrigTitle').value = 'Better Call Saul';
  document.getElementById('seriesFormImdb').value = '9.0';
  document.getElementById('seriesFormYear').value = '2015';
  document.getElementById('seriesFormStatus').value = 'Tamamlandı';
  document.getElementById('seriesFormAirDay').value = 'Pazartesi';
  document.getElementById('seriesFormPoster').value = 'https://image.tmdb.org/t/p/w500/fC2HDm5t0kHapG9FEdp7MD8doMR.jpg';
  document.getElementById('seriesFormBackdrop').value = 'https://image.tmdb.org/t/p/original/hPea3Qy5Gd6z4GNumRvgRp9RuvH.jpg';
  document.getElementById('seriesFormGenres').value = 'Suç, Dram';
  document.getElementById('seriesFormCast').value = 'Bob Odenkirk, Rhea Seehorn, Jonathan Banks';
  document.getElementById('seriesFormTrailer').value = 'https://www.youtube.com/embed/HN4oyhmgopA';
  document.getElementById('seriesFormSummary').value = 'Jimmy McGill, ahlaki sınırları zorlayan kurnaz bir ceza avukatı olan Saul Goodman kimliğine doğru dönüşürken yeraltı dünyasıyla yüzleşir.';
}

function editSeries(id) {
  const s = allAdminSeries.find(item => item.id === id);
  if (!s) return;

  document.getElementById('editSeriesId').value = s.id;
  document.getElementById('seriesModalTitle').textContent = 'Diziyi Düzenle: ' + s.title;
  document.getElementById('seriesFormTitle').value = s.title;
  document.getElementById('seriesFormOrigTitle').value = s.originalTitle || '';
  document.getElementById('seriesFormImdb').value = s.imdb || 8.0;
  document.getElementById('seriesFormYear').value = s.year || 2024;
  document.getElementById('seriesFormStatus').value = s.status || 'Devam Ediyor';
  document.getElementById('seriesFormAirDay').value = s.airDay || 'Pazartesi';
  document.getElementById('seriesFormPoster').value = s.poster || '';
  document.getElementById('seriesFormBackdrop').value = s.backdrop || '';
  document.getElementById('seriesFormGenres').value = (s.genres || []).join(', ');
  document.getElementById('seriesFormCast').value = (s.cast || []).join(', ');
  document.getElementById('seriesFormTrailer').value = s.trailerUrl || '';
  document.getElementById('seriesFormSummary').value = s.summary || '';

  document.getElementById('seriesModal').classList.add('active');
}

async function handleSaveSeries(e) {
  e.preventDefault();
  const id = document.getElementById('editSeriesId').value;
  const data = {
    title: document.getElementById('seriesFormTitle').value.trim(),
    originalTitle: document.getElementById('seriesFormOrigTitle').value.trim(),
    imdb: parseFloat(document.getElementById('seriesFormImdb').value),
    year: parseInt(document.getElementById('seriesFormYear').value),
    status: document.getElementById('seriesFormStatus').value,
    airDay: document.getElementById('seriesFormAirDay').value,
    poster: document.getElementById('seriesFormPoster').value.trim(),
    backdrop: document.getElementById('seriesFormBackdrop').value.trim(),
    genres: document.getElementById('seriesFormGenres').value.split(',').map(g => g.trim()),
    cast: document.getElementById('seriesFormCast').value.split(',').map(c => c.trim()),
    trailerUrl: document.getElementById('seriesFormTrailer').value.trim(),
    summary: document.getElementById('seriesFormSummary').value.trim(),
    featured: true
  };

  const url = id ? `/api/admin/series/${id}` : '/api/admin/series';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      closeSeriesModal();
      loadAdminSeries();
      loadAdminStats();
      alert('Dizi başarıyla kaydedildi!');
    } else {
      alert('Kaydedilirken hata oluştu.');
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteSeries(id) {
  if (!confirm('Bu diziyi ve dizinin tüm bölümlerini silmek istediğinize emin misiniz?')) return;

  try {
    const res = await fetch(`/api/admin/series/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadAdminSeries();
      loadAdminStats();
    }
  } catch (err) {
    console.error(err);
  }
}

// Populate Series Dropdowns for Episode Management
function populateSeriesDropdowns() {
  const filterSelect = document.getElementById('adminEpisodeSeriesFilter');
  const epSelect = document.getElementById('epFormSeriesSelect');

  if (filterSelect) {
    filterSelect.innerHTML = '<option value="all">Tüm Diziler</option>' + allAdminSeries.map(s => `
      <option value="${s.id}">${s.title}</option>
    `).join('');
  }

  if (epSelect) {
    epSelect.innerHTML = allAdminSeries.map(s => `
      <option value="${s.id}">${s.title}</option>
    `).join('');
  }
}

// Episode Management
async function loadAdminEpisodes() {
  const filterVal = document.getElementById('adminEpisodeSeriesFilter').value;
  try {
    const res = await fetch('/api/episodes/latest?limit=100');
    let episodes = await res.json();

    if (filterVal && filterVal !== 'all') {
      episodes = episodes.filter(e => e.seriesId === filterVal);
    }

    const tbody = document.getElementById('adminEpisodesTableBody');
    if (episodes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Kayıtlı bölüm bulunamadı.</td></tr>';
      return;
    }

    tbody.innerHTML = episodes.map(ep => `
      <tr>
        <td><strong style="color: var(--primary);">${ep.seasonNumber}. Sezon ${ep.episodeNumber}. Bölüm</strong></td>
        <td>
          <div style="color: #fff; font-weight: 600;">${ep.title}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${ep.seriesTitle}</div>
        </td>
        <td>${ep.airDate || '-'}</td>
        <td>
          ${ep.flags && ep.flags.isDubbed ? '<span class="flag-badge flag-dub">Dublaj</span>' : ''}
          ${ep.flags && ep.flags.isSubtitled ? '<span class="flag-badge flag-sub">Altyazı</span>' : ''}
        </td>
        <td><span style="color: var(--secondary); font-weight: 600;">${(ep.sources || []).length} Kaynak</span></td>
        <td>
          <button class="btn-action btn-action-delete" onclick="deleteEpisode('${ep.id}')">Sil</button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
  }
}

function openAddEpisodeModal() {
  document.getElementById('epFormSeason').value = '1';
  document.getElementById('epFormEpisode').value = '1';
  document.getElementById('epFormTitle').value = '';
  document.getElementById('epFormOverview').value = '';
  document.getElementById('episodeModal').classList.add('active');
}

function closeEpisodeModal() {
  document.getElementById('episodeModal').classList.remove('active');
}

async function handleSaveEpisode(e) {
  e.preventDefault();
  const seriesId = document.getElementById('epFormSeriesSelect').value;
  const seasonNumber = parseInt(document.getElementById('epFormSeason').value);
  const episodeNumber = parseInt(document.getElementById('epFormEpisode').value);
  const title = document.getElementById('epFormTitle').value.trim();
  const videoUrl = document.getElementById('epFormVideoUrl').value.trim();
  const sourceName = document.getElementById('epFormSourceName').value.trim();
  const isDubbed = document.getElementById('epFormDubbed').checked;
  const isSubtitled = document.getElementById('epFormSubtitled').checked;
  const overview = document.getElementById('epFormOverview').value.trim();

  try {
    const res = await fetch('/api/admin/episodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seriesId,
        seasonNumber,
        episodeNumber,
        title,
        overview,
        isDubbed,
        isSubtitled,
        sources: [{ name: sourceName, url: videoUrl, type: videoUrl.endsWith('.mp4') ? 'video' : 'iframe' }]
      })
    });

    if (res.ok) {
      closeEpisodeModal();
      loadAdminEpisodes();
      loadAdminStats();
      alert('Yeni bölüm başarıyla yayınlandı!');
    } else {
      alert('Bölüm eklenirken bir hata oluştu.');
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteEpisode(id) {
  if (!confirm('Bu bölümü silmek istediğinize emin misiniz?')) return;
  try {
    const res = await fetch(`/api/admin/episodes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadAdminEpisodes();
      loadAdminStats();
    }
  } catch (err) {
    console.error(err);
  }
}

// Broken Link Reports
async function loadAdminReports() {
  try {
    const res = await fetch('/api/admin/reports');
    const reports = await res.json();

    const tbody = document.getElementById('adminReportsTableBody');
    if (reports.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">Hiç kırık link bildirimi bulunmuyor.</td></tr>';
      return;
    }

    tbody.innerHTML = reports.map(r => `
      <tr>
        <td><strong style="color: #fff;">${r.seriesTitle}</strong></td>
        <td>${r.episodeTitle}</td>
        <td><span style="color: var(--secondary);">${r.sourceName}</span></td>
        <td><span style="color: var(--accent-red); font-weight: 600;">${r.issueType}</span></td>
        <td style="max-width: 200px; font-size: 0.8rem; color: #cbd5e1;">${r.userNote || '-'}</td>
        <td>
          <span style="padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; background: ${r.status === 'Çözüldü' ? 'rgba(0,230,153,0.15); color: var(--primary);' : 'rgba(239,68,68,0.15); color: var(--accent-red);'}">
            ${r.status}
          </span>
        </td>
        <td style="font-size: 0.75rem; color: var(--text-muted);">${new Date(r.createdAt).toLocaleDateString('tr-TR')}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            ${r.status !== 'Çözüldü' ? `<button class="btn-action btn-action-resolve" onclick="resolveReport('${r.id}')">Çözüldü Yap</button>` : ''}
            <button class="btn-action btn-action-delete" onclick="deleteReport('${r.id}')">Sil</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function resolveReport(id) {
  try {
    const res = await fetch(`/api/admin/reports/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Çözüldü' })
    });
    if (res.ok) {
      loadAdminReports();
      loadAdminStats();
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteReport(id) {
  try {
    const res = await fetch(`/api/admin/reports/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadAdminReports();
      loadAdminStats();
    }
  } catch (err) {
    console.error(err);
  }
}

// Comments Moderation
async function loadAdminComments() {
  try {
    const res = await fetch('/api/comments');
    const comments = await res.json();

    const tbody = document.getElementById('adminCommentsTableBody');
    if (comments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Yorum bulunamadı.</td></tr>';
      return;
    }

    tbody.innerHTML = comments.map(c => `
      <tr>
        <td><strong style="color: #fff;">${c.author}</strong></td>
        <td style="max-width: 350px; font-size: 0.85rem; color: #cbd5e1;">${c.text}</td>
        <td>${c.isSpoiler ? '<span style="color: var(--accent-amber); font-weight: 700;">⚠️ Evet</span>' : 'Hayır'}</td>
        <td style="font-size: 0.75rem; color: var(--text-muted);">${new Date(c.createdAt).toLocaleDateString('tr-TR')}</td>
        <td>
          <button class="btn-action btn-action-delete" onclick="deleteComment('${c.id}')">Yorumu Sil</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function deleteComment(id) {
  if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
  try {
    const res = await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadAdminComments();
      loadAdminStats();
    }
  } catch (err) {
    console.error(err);
  }
}

// Site Settings
async function loadAdminSettings() {
  try {
    const res = await fetch('/api/settings');
    const s = await res.json();

    document.getElementById('settingSiteName').value = s.siteName || 'BölümDizi';
    document.getElementById('settingSiteTagline').value = s.siteTagline || '';
    document.getElementById('settingAnnouncement').value = s.announcement || '';
    document.getElementById('settingTelegramUrl').value = s.telegramUrl || '';
    document.getElementById('settingDiscordUrl').value = s.discordUrl || '';
  } catch (err) {
    console.error(err);
  }
}

async function saveSiteSettings(e) {
  e.preventDefault();
  const data = {
    siteName: document.getElementById('settingSiteName').value.trim(),
    siteTagline: document.getElementById('settingSiteTagline').value.trim(),
    announcement: document.getElementById('settingAnnouncement').value.trim(),
    telegramUrl: document.getElementById('settingTelegramUrl').value.trim(),
    discordUrl: document.getElementById('settingDiscordUrl').value.trim()
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      alert('Site ayarları başarıyla güncellendi!');
    }
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
