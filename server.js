const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Helper to read and write database
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return { series: [], episodes: [], comments: [], reports: [], settings: {} };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

// Helper: Slugify string
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/* ====================================================
   PUBLIC & USER API ENDPOINTS
==================================================== */

// Site Settings
app.get('/api/settings', (req, res) => {
  const db = readDB();
  res.json(db.settings || {});
});

// Update Site Settings (Admin)
app.put('/api/settings', (req, res) => {
  const db = readDB();
  db.settings = { ...db.settings, ...req.body };
  writeDB(db);
  res.json({ success: true, settings: db.settings });
});

// Get Series (Filter, Search, Sort)
app.get('/api/series', (req, res) => {
  const db = readDB();
  let list = [...(db.series || [])];

  const { search, genre, year, status, sort, featured } = req.query;

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.originalTitle && s.originalTitle.toLowerCase().includes(q)) ||
      (s.summary && s.summary.toLowerCase().includes(q))
    );
  }

  if (genre && genre !== 'all') {
    list = list.filter(s => s.genres && s.genres.includes(genre));
  }

  if (year && year !== 'all') {
    list = list.filter(s => String(s.year) === String(year));
  }

  if (status && status !== 'all') {
    list = list.filter(s => s.status === status);
  }

  if (featured === 'true') {
    list = list.filter(s => s.featured);
  }

  if (sort === 'imdb') {
    list.sort((a, b) => (b.imdb || 0) - (a.imdb || 0));
  } else if (sort === 'views') {
    list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  } else if (sort === 'year') {
    list.sort((a, b) => (b.year || 0) - (a.year || 0));
  } else {
    // Default: newest createdAt
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  res.json(list);
});

// Get Single Series with Seasons and Episodes
app.get('/api/series/:slug', (req, res) => {
  const db = readDB();
  const series = db.series.find(s => s.slug === req.params.slug || s.id === req.params.slug);
  if (!series) {
    return res.status(404).json({ error: 'Dizi bulunamadı' });
  }

  // Increment view count
  series.viewCount = (series.viewCount || 0) + 1;
  writeDB(db);

  // Find all episodes for this series
  const episodes = (db.episodes || [])
    .filter(ep => ep.seriesId === series.id || ep.seriesSlug === series.slug)
    .sort((a, b) => {
      if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
      return a.episodeNumber - b.episodeNumber;
    });

  // Group episodes by season
  const seasons = {};
  episodes.forEach(ep => {
    if (!seasons[ep.seasonNumber]) seasons[ep.seasonNumber] = [];
    seasons[ep.seasonNumber].push(ep);
  });

  res.json({
    ...series,
    seasons,
    episodesCount: episodes.length,
    totalSeasons: Object.keys(seasons).length
  });
});

// Latest Episodes Feed (DiziBox style son eklenenler)
app.get('/api/episodes/latest', (req, res) => {
  const db = readDB();
  const limit = parseInt(req.query.limit) || 24;
  const filter = req.query.filter; // 'dubbed', 'subtitled', or undefined

  let episodes = [...(db.episodes || [])];

  if (filter === 'dubbed') {
    episodes = episodes.filter(ep => ep.flags && ep.flags.isDubbed);
  } else if (filter === 'subtitled') {
    episodes = episodes.filter(ep => ep.flags && ep.flags.isSubtitled);
  }

  // Sort newest first
  episodes.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  episodes = episodes.slice(0, limit);

  // Join series metadata
  const results = episodes.map(ep => {
    const s = db.series.find(x => x.id === ep.seriesId || x.slug === ep.seriesSlug) || {};
    return {
      ...ep,
      seriesTitle: s.title || 'Bilinmeyen Dizi',
      seriesSlug: s.slug || '',
      seriesPoster: s.poster || ep.stillPath || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500',
      seriesImdb: s.imdb || 0,
      seriesYear: s.year || 2024
    };
  });

  res.json(results);
});

// Episode Watch Data with Prev/Next navigation (Bölüm İzleme)
app.get('/api/watch/:slug/:season/:episode', (req, res) => {
  const db = readDB();
  const { slug, season, episode } = req.params;
  const sNum = parseInt(season);
  const epNum = parseInt(episode);

  const series = db.series.find(s => s.slug === slug || s.id === slug);
  if (!series) {
    return res.status(404).json({ error: 'Dizi bulunamadı' });
  }

  const allEpisodes = (db.episodes || [])
    .filter(ep => ep.seriesId === series.id || ep.seriesSlug === series.slug)
    .sort((a, b) => {
      if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
      return a.episodeNumber - b.episodeNumber;
    });

  const currentIndex = allEpisodes.findIndex(
    ep => ep.seasonNumber === sNum && ep.episodeNumber === epNum
  );

  if (currentIndex === -1) {
    return res.status(404).json({ error: 'Bölüm bulunamadı' });
  }

  const currentEpisode = allEpisodes[currentIndex];
  currentEpisode.viewCount = (currentEpisode.viewCount || 0) + 1;
  writeDB(db);

  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  res.json({
    series: {
      id: series.id,
      title: series.title,
      slug: series.slug,
      poster: series.poster,
      backdrop: series.backdrop,
      imdb: series.imdb,
      year: series.year,
      genres: series.genres
    },
    episode: currentEpisode,
    prevEpisode: prevEpisode ? {
      seasonNumber: prevEpisode.seasonNumber,
      episodeNumber: prevEpisode.episodeNumber,
      title: prevEpisode.title
    } : null,
    nextEpisode: nextEpisode ? {
      seasonNumber: nextEpisode.seasonNumber,
      episodeNumber: nextEpisode.episodeNumber,
      title: nextEpisode.title
    } : null,
    allEpisodes: allEpisodes.map(e => ({
      id: e.id,
      seasonNumber: e.seasonNumber,
      episodeNumber: e.episodeNumber,
      title: e.title,
      duration: e.duration
    }))
  });
});

// Weekly Calendar (SezonlukDizi style Dizi Takvimi)
app.get('/api/calendar', (req, res) => {
  const db = readDB();
  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const calendar = {};

  days.forEach(day => {
    calendar[day] = [];
  });

  (db.series || []).forEach(s => {
    if (s.airDay && calendar[s.airDay]) {
      // Find latest episode if any
      const episodes = (db.episodes || [])
        .filter(ep => ep.seriesId === s.id || ep.seriesSlug === s.slug)
        .sort((a, b) => b.seasonNumber - a.seasonNumber || b.episodeNumber - a.episodeNumber);
      
      const latestEp = episodes[0] || null;

      calendar[s.airDay].push({
        id: s.id,
        title: s.title,
        slug: s.slug,
        poster: s.poster,
        imdb: s.imdb,
        status: s.status,
        latestSeason: latestEp ? latestEp.seasonNumber : 1,
        latestEpisode: latestEp ? latestEp.episodeNumber : 1
      });
    }
  });

  res.json(calendar);
});

// Comments API
app.get('/api/comments', (req, res) => {
  const db = readDB();
  const { seriesId, episodeId } = req.query;
  let comments = db.comments || [];

  if (episodeId) {
    comments = comments.filter(c => c.episodeId === episodeId);
  } else if (seriesId) {
    comments = comments.filter(c => c.seriesId === seriesId);
  }

  // Sort newest first
  comments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json(comments);
});

app.post('/api/comments', (req, res) => {
  const { seriesId, episodeId, author, text, isSpoiler } = req.body;
  if (!text || !author) {
    return res.status(400).json({ error: 'Yazar adı ve yorum metni zorunludur' });
  }

  const db = readDB();
  const newComment = {
    id: 'c_' + Date.now(),
    seriesId: seriesId || '',
    episodeId: episodeId || '',
    author: author.trim().slice(0, 30),
    text: text.trim().slice(0, 1000),
    isSpoiler: Boolean(isSpoiler),
    likes: 0,
    createdAt: new Date().toISOString(),
    approved: true
  };

  db.comments = db.comments || [];
  db.comments.push(newComment);
  writeDB(db);

  res.status(201).json(newComment);
});

app.post('/api/comments/:id/like', (req, res) => {
  const db = readDB();
  const comment = (db.comments || []).find(c => c.id === req.params.id);
  if (!comment) return res.status(404).json({ error: 'Yorum bulunamadı' });

  comment.likes = (comment.likes || 0) + 1;
  writeDB(db);
  res.json({ success: true, likes: comment.likes });
});

// Broken Link Report (Kırık Link Bildirimi)
app.post('/api/reports', (req, res) => {
  const { seriesTitle, episodeTitle, sourceName, issueType, userNote } = req.body;
  if (!seriesTitle) return res.status(400).json({ error: 'Eksik bilgi' });

  const db = readDB();
  const newReport = {
    id: 'r_' + Date.now(),
    seriesTitle: seriesTitle || 'Bilinmiyor',
    episodeTitle: episodeTitle || 'Bilinmiyor',
    sourceName: sourceName || 'Genel',
    issueType: issueType || 'Video Açılmıyor',
    userNote: (userNote || '').slice(0, 500),
    status: 'Bekliyor',
    createdAt: new Date().toISOString()
  };

  db.reports = db.reports || [];
  db.reports.push(newReport);
  writeDB(db);

  res.status(201).json({ success: true, report: newReport });
});

/* ====================================================
   USER AUTHENTICATION & MEMBERSHIP API (Üyelik Sistemi)
==================================================== */

// Kullanıcı Kaydı (Register)
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı, e-posta ve şifre zorunludur' });
  }

  const cleanUser = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  if (cleanUser.length < 3) {
    return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalıdır' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Şifre en az 4 karakter olmalıdır' });
  }

  const db = readDB();
  db.users = db.users || [];

  if (db.users.some(u => u.username === cleanUser)) {
    return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış!' });
  }
  if (db.users.some(u => u.email === cleanEmail)) {
    return res.status(400).json({ error: 'Bu e-posta adresi ile zaten kayıt olunmuş!' });
  }

  const newUser = {
    id: 'u_' + Date.now(),
    username: cleanUser,
    displayName: username.trim(),
    email: cleanEmail,
    password: password,
    watchlist: [],
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  const safeUser = {
    id: newUser.id,
    username: newUser.username,
    displayName: newUser.displayName,
    email: newUser.email,
    watchlist: newUser.watchlist
  };

  res.status(201).json({ success: true, user: safeUser, token: 'usr_' + newUser.id });
});

// Kullanıcı Girişi (Login)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir' });
  }

  const cleanInput = username.trim().toLowerCase();
  const db = readDB();
  const user = (db.users || []).find(
    u => (u.username === cleanInput || u.email === cleanInput) && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı!' });
  }

  const safeUser = {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    email: user.email,
    watchlist: user.watchlist || []
  };

  res.json({ success: true, user: safeUser, token: 'usr_' + user.id });
});

// Giriş Yapan Kullanıcı Bilgisi (Me)
app.get('/api/auth/me', (req, res) => {
  const userId = req.headers['x-user-id'] || req.query.userId;
  if (!userId) return res.status(401).json({ error: 'Oturum açılmamış' });

  const db = readDB();
  const user = (db.users || []).find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    email: user.email,
    watchlist: user.watchlist || []
  });
});

// Takip Listesi Toggle (Watchlist Ekle / Kaldır)
app.post('/api/auth/watchlist/toggle', (req, res) => {
  const { userId, seriesSlug } = req.body;
  if (!userId || !seriesSlug) return res.status(400).json({ error: 'Eksik parametre' });

  const db = readDB();
  const user = (db.users || []).find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  user.watchlist = user.watchlist || [];
  const idx = user.watchlist.indexOf(seriesSlug);
  let inWatchlist = false;

  if (idx > -1) {
    user.watchlist.splice(idx, 1);
    inWatchlist = false;
  } else {
    user.watchlist.push(seriesSlug);
    inWatchlist = true;
  }

  writeDB(db);
  res.json({ success: true, inWatchlist, watchlist: user.watchlist });
});

// Takip Listesi Getir (Watchlist Series List)
app.get('/api/auth/watchlist', (req, res) => {
  const userId = req.headers['x-user-id'] || req.query.userId;
  if (!userId) return res.status(401).json({ error: 'Oturum açılmamış' });

  const db = readDB();
  const user = (db.users || []).find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  const seriesSlugs = user.watchlist || [];
  const watchlistSeries = (db.series || []).filter(s => seriesSlugs.includes(s.slug));

  res.json({ success: true, watchlist: watchlistSeries });
});


/* ====================================================
   ADMIN PANEL API
==================================================== */

// Admin Simple Auth
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  // Default admin login credentials: admin / admin123
  if (username === 'admin' && password === 'admin123') {
    res.json({ success: true, token: 'token_bolumdizi_admin_secret_2026', user: 'admin' });
  } else {
    res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre!' });
  }
});

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
  const db = readDB();
  const totalSeries = (db.series || []).length;
  const totalEpisodes = (db.episodes || []).length;
  const totalComments = (db.comments || []).length;
  const pendingReports = (db.reports || []).filter(r => r.status === 'Bekliyor').length;
  const totalViews = (db.series || []).reduce((acc, cur) => acc + (cur.viewCount || 0), 0) +
                     (db.episodes || []).reduce((acc, cur) => acc + (cur.viewCount || 0), 0);

  res.json({
    totalSeries,
    totalEpisodes,
    totalComments,
    pendingReports,
    totalViews
  });
});

// Admin: Series Management
app.post('/api/admin/series', (req, res) => {
  const db = readDB();
  const data = req.body;

  if (!data.title) {
    return res.status(400).json({ error: 'Dizi başlığı zorunludur' });
  }

  const slug = data.slug ? slugify(data.slug) : slugify(data.title);
  const newSeries = {
    id: 's_' + Date.now(),
    slug,
    title: data.title,
    originalTitle: data.originalTitle || data.title,
    poster: data.poster || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500',
    backdrop: data.backdrop || 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=1200',
    imdb: parseFloat(data.imdb) || 8.0,
    year: parseInt(data.year) || new Date().getFullYear(),
    country: data.country || 'ABD',
    duration: data.duration || '50 dk',
    genres: Array.isArray(data.genres) ? data.genres : (data.genres ? data.genres.split(',').map(g => g.trim()) : ['Dram']),
    status: data.status || 'Devam Ediyor',
    airDay: data.airDay || 'Pazartesi',
    summary: data.summary || '',
    cast: Array.isArray(data.cast) ? data.cast : (data.cast ? data.cast.split(',').map(c => c.trim()) : []),
    director: data.director || '',
    trailerUrl: data.trailerUrl || '',
    viewCount: 0,
    featured: Boolean(data.featured),
    createdAt: new Date().toISOString()
  };

  db.series = db.series || [];
  db.series.unshift(newSeries);
  writeDB(db);

  res.status(201).json({ success: true, series: newSeries });
});

app.put('/api/admin/series/:id', (req, res) => {
  const db = readDB();
  const index = (db.series || []).findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Dizi bulunamadı' });

  const current = db.series[index];
  const data = req.body;

  db.series[index] = {
    ...current,
    ...data,
    slug: data.slug ? slugify(data.slug) : current.slug,
    genres: Array.isArray(data.genres) ? data.genres : (data.genres ? data.genres.split(',').map(g => g.trim()) : current.genres),
    cast: Array.isArray(data.cast) ? data.cast : (data.cast ? data.cast.split(',').map(c => c.trim()) : current.cast),
    imdb: parseFloat(data.imdb) || current.imdb,
    year: parseInt(data.year) || current.year
  };

  writeDB(db);
  res.json({ success: true, series: db.series[index] });
});

app.delete('/api/admin/series/:id', (req, res) => {
  const db = readDB();
  const series = (db.series || []).find(s => s.id === req.params.id);
  if (!series) return res.status(404).json({ error: 'Dizi bulunamadı' });

  // Delete series and its episodes
  db.series = db.series.filter(s => s.id !== req.params.id);
  db.episodes = (db.episodes || []).filter(e => e.seriesId !== req.params.id && e.seriesSlug !== series.slug);
  writeDB(db);

  res.json({ success: true });
});

// Admin: Episode Management
app.post('/api/admin/episodes', (req, res) => {
  const db = readDB();
  const data = req.body;

  if (!data.seriesId || !data.seasonNumber || !data.episodeNumber) {
    return res.status(400).json({ error: 'Dizi, Sezon ve Bölüm numarası zorunludur' });
  }

  const series = db.series.find(s => s.id === data.seriesId);
  const newEpisode = {
    id: 'ep_' + Date.now(),
    seriesId: data.seriesId,
    seriesSlug: series ? series.slug : '',
    seasonNumber: parseInt(data.seasonNumber),
    episodeNumber: parseInt(data.episodeNumber),
    title: data.title || `${data.seasonNumber}. Sezon ${data.episodeNumber}. Bölüm`,
    overview: data.overview || '',
    stillPath: data.stillPath || (series ? series.backdrop : ''),
    airDate: data.airDate || new Date().toISOString().split('T')[0],
    duration: data.duration || '50 dk',
    viewCount: 0,
    flags: {
      isDubbed: Boolean(data.isDubbed),
      isSubtitled: Boolean(data.isSubtitled)
    },
    sources: Array.isArray(data.sources) && data.sources.length ? data.sources : [
      { name: 'VidMoly', url: data.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', type: 'video' }
    ],
    createdAt: new Date().toISOString()
  };

  db.episodes = db.episodes || [];
  db.episodes.unshift(newEpisode);
  writeDB(db);

  res.status(201).json({ success: true, episode: newEpisode });
});

app.put('/api/admin/episodes/:id', (req, res) => {
  const db = readDB();
  const index = (db.episodes || []).findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Bölüm bulunamadı' });

  const current = db.episodes[index];
  const data = req.body;

  db.episodes[index] = {
    ...current,
    ...data,
    seasonNumber: parseInt(data.seasonNumber) || current.seasonNumber,
    episodeNumber: parseInt(data.episodeNumber) || current.episodeNumber,
    flags: {
      isDubbed: data.isDubbed !== undefined ? Boolean(data.isDubbed) : current.flags.isDubbed,
      isSubtitled: data.isSubtitled !== undefined ? Boolean(data.isSubtitled) : current.flags.isSubtitled
    }
  };

  writeDB(db);
  res.json({ success: true, episode: db.episodes[index] });
});

app.delete('/api/admin/episodes/:id', (req, res) => {
  const db = readDB();
  db.episodes = (db.episodes || []).filter(e => e.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// Admin: Reports Management
app.get('/api/admin/reports', (req, res) => {
  const db = readDB();
  res.json(db.reports || []);
});

app.put('/api/admin/reports/:id/status', (req, res) => {
  const db = readDB();
  const report = (db.reports || []).find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Rapor bulunamadı' });

  report.status = req.body.status || 'Çözüldü';
  writeDB(db);
  res.json({ success: true, report });
});

app.delete('/api/admin/reports/:id', (req, res) => {
  const db = readDB();
  db.reports = (db.reports || []).filter(r => r.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// Admin: Comments Moderation
app.delete('/api/admin/comments/:id', (req, res) => {
  const db = readDB();
  db.comments = (db.comments || []).filter(c => c.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// Fallback HTML routing for clean URLs
app.get('/dizi/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dizi.html'));
});

app.get('/dizi/:slug/sezon-:season/bolum-:episode', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'izle.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/takvim', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'takvim.html'));
});

app.get('/kesfet', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kesfet.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎬 BölümDizi Platformu Çalışıyor!`);
  console.log(`🌐 Ana Sayfa:     http://localhost:${PORT}`);
  console.log(`⚡ Dizi Takvimi:  http://localhost:${PORT}/takvim`);
  console.log(`🔍 Keşfet:        http://localhost:${PORT}/kesfet`);
  console.log(`🔐 Admin Paneli:  http://localhost:${PORT}/admin  (admin / admin123)`);
  console.log(`====================================================`);
});
