const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'database.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (CSS, JS, assets)
app.use(express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Database helpers
function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading database.json:', err);
  }
  return {
    series: [],
    anime: [],
    threads: [],
    episodes: [],
    summaries: {},
    backdrops: {},
    schedule: [],
    palettes: [],
    defaultImdbIds: {},
    comments: {}
  };
}

const DATA_JS_PATH = path.join(__dirname, 'public', 'js', 'data.js');
const SB_URL = 'https://ospayntenysjfysczduu.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcGF5bnRlbnlzamZ5c2N6ZHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTE4NzQsImV4cCI6MjEwNjg4Nzg3NH0.fBqBp_mgHitbIsNWkI97hQ0Wgv5CAzsyRGUiqjcZty8';

function saveDb(data, options = {}) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');

    // Also auto-sync public/js/data.js for static fallback
    const out = '// bolumdizi Client Initial Data & Constants (Auto-synced)\n' +
      'window.DEFAULT_SERIES = ' + JSON.stringify(data.series || [], null, 2) + ';\n\n' +
      'window.DEFAULT_ANIME = ' + JSON.stringify(data.anime || [], null, 2) + ';\n\n' +
      'window.DEFAULT_EPISODES = ' + JSON.stringify(data.episodes || [], null, 2) + ';\n\n' +
      'window.DEFAULT_THREADS = ' + JSON.stringify(data.threads || [], null, 2) + ';\n\n' +
      'window.DEFAULT_SUMMARIES = ' + JSON.stringify(data.summaries || {}, null, 2) + ';\n\n' +
      'window.DEFAULT_BACKDROPS = ' + JSON.stringify(data.backdrops || {}, null, 2) + ';\n\n' +
      'window.DEFAULT_SCHEDULE = ' + JSON.stringify(data.schedule || [], null, 2) + ';\n\n' +
      'window.DEFAULT_IMDB_IDS = ' + JSON.stringify(data.defaultImdbIds || {}, null, 2) + ';\n\n' +
      'window.PALETTES = ' + JSON.stringify(data.palettes || [], null, 2) + ';\n\n' +
      'window.DEFAULT_COMMENTS = ' + JSON.stringify(data.comments || {}, null, 2) + ';\n';
    fs.writeFileSync(DATA_JS_PATH, out, 'utf8');

    if (options.skipCloudSync) return true;

    // Background sync to Supabase with cloud merge so client additions are never lost
    (async () => {
      try {
        let cloud = { series: [], anime: [], episodes: [], threads: [], summaries: {}, backdrops: {}, schedule: [], comments: {} };
        const fRes = await fetch(SB_URL + '/rest/v1/users?username=eq.__site_content__&select=watchlist', {
          headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
        });
        if (fRes.ok) {
          const rows = await fRes.json();
          if (rows && rows[0] && rows[0].watchlist && Array.isArray(rows[0].watchlist.series)) {
            cloud = rows[0].watchlist;
          }
        }

        // Intelligently union-merge: Local updates take precedence, but keep cloud series not in data
        const mergedSeries = [...(data.series || [])];
        const seenSeries = new Set(mergedSeries.map(s => s[0].toLowerCase().trim()));
        (cloud.series || []).forEach(cs => {
          if (cs && cs[0] && !seenSeries.has(cs[0].toLowerCase().trim())) {
            mergedSeries.push(cs);
            seenSeries.add(cs[0].toLowerCase().trim());
          }
        });

        const mergedAnime = [...(data.anime || [])];
        const seenAnime = new Set(mergedAnime.map(a => a[0].toLowerCase().trim()));
        (cloud.anime || []).forEach(ca => {
          if (ca && ca[0] && !seenAnime.has(ca[0].toLowerCase().trim())) {
            mergedAnime.push(ca);
            seenAnime.add(ca[0].toLowerCase().trim());
          }
        });

        const getEpKey = (ep) => {
          if (!ep) return '';
          const t = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
          const b = ep.b || ep.e || 1;
          return `${(t || '').toLowerCase().trim()}_s${ep.s}_e${b}`;
        };

        const deletedKeys = new Set(data.deletedEpisodes || []);
        if (options.deletedEpisodeKey) deletedKeys.add(options.deletedEpisodeKey);

        let finalEps = [];
        if (options.exactEpisodes) {
          finalEps = (data.episodes || []).filter(e => !deletedKeys.has(getEpKey(e))).slice(0, 15);
        } else {
          const mergedEps = [...(data.episodes || [])];
          const seenEps = new Set(mergedEps.map(getEpKey));
          (cloud.episodes || []).forEach(ce => {
            const k = getEpKey(ce);
            if (k && !seenEps.has(k) && !deletedKeys.has(k)) {
              mergedEps.push(ce);
              seenEps.add(k);
            }
          });
          finalEps = mergedEps.filter(e => !deletedKeys.has(getEpKey(e))).slice(0, 15);
        }

        await fetch(SB_URL + '/rest/v1/users?username=eq.__site_content__', {
          method: 'PATCH',
          headers: {
            'apikey': SB_KEY,
            'Authorization': 'Bearer ' + SB_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            watchlist: {
              series: mergedSeries,
              anime: mergedAnime,
              episodes: finalEps,
              threads: data.threads || cloud.threads || [],
              summaries: mergedSummaries,
              backdrops: mergedBackdrops,
              schedule: data.schedule || cloud.schedule || [],
              comments: mergedComments,
              deletedEpisodes: Array.from(deletedKeys),
              updated_at: new Date().toISOString()
            }
          })
        });
      } catch (err) {
        console.warn('Supabase sync warning from server:', err.message);
      }
    })();

    return true;
  } catch (err) {
    console.error('Error saving database.json:', err);
    return false;
  }
}

async function syncFromCloudOnStartup() {
  try {
    const res = await fetch(SB_URL + '/rest/v1/users?username=eq.__site_content__&select=watchlist', {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows && rows[0] && rows[0].watchlist && Array.isArray(rows[0].watchlist.series)) {
        const cloud = rows[0].watchlist;
        const db = loadDb();
        let changed = false;

        const seenSeries = new Set(db.series.map(s => s[0].toLowerCase().trim()));
        (cloud.series || []).forEach(cs => {
          if (cs && cs[0] && !seenSeries.has(cs[0].toLowerCase().trim())) {
            db.series.push(cs);
            seenSeries.add(cs[0].toLowerCase().trim());
            changed = true;
          }
        });

        const seenAnime = new Set(db.anime.map(a => a[0].toLowerCase().trim()));
        (cloud.anime || []).forEach(ca => {
          if (ca && ca[0] && !seenAnime.has(ca[0].toLowerCase().trim())) {
            db.anime.push(ca);
            seenAnime.add(ca[0].toLowerCase().trim());
            changed = true;
          }
        });

        const deletedKeys = new Set(cloud.deletedEpisodes || []);
        deletedKeys.add('the punisher_s1_e1');

        const getEpKey = (ep) => {
          if (!ep) return '';
          const t = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
          const b = ep.b || ep.e || 1;
          return `${(t || '').toLowerCase().trim()}_s${ep.s}_e${b}`;
        };

        if (Array.isArray(cloud.episodes) && cloud.episodes.length > 0) {
          db.episodes = cloud.episodes.filter(ce => !deletedKeys.has(getEpKey(ce))).slice(0, 15);
          changed = true;
        } else {
          db.episodes = (db.episodes || []).filter(e => !deletedKeys.has(getEpKey(e))).slice(0, 15);
        }

        if (cloud.summaries) {
          db.summaries = Object.assign({}, cloud.summaries, db.summaries);
          changed = true;
        }
        if (cloud.backdrops) {
          db.backdrops = Object.assign({}, cloud.backdrops, db.backdrops);
          changed = true;
        }
        if (cloud.comments) {
          db.comments = Object.assign({}, cloud.comments, db.comments);
          changed = true;
        }

        if (changed) {
          console.log('🔄 Synced new cloud content into local database.json on server startup');
          saveDb(db, { skipCloudSync: true });
        }
      }
    }
  } catch (err) {
    console.warn('Startup cloud sync warning:', err.message);
  }
}
syncFromCloudOnStartup().catch(() => {});

// ==========================================
// 1. PAGE ROUTES (Traditional Multi-Page Navigation)
// ==========================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/diziler', (req, res) => res.sendFile(path.join(__dirname, 'diziler.html')));
app.get('/diziler.html', (req, res) => res.sendFile(path.join(__dirname, 'diziler.html')));
app.get('/animeler', (req, res) => res.sendFile(path.join(__dirname, 'animeler.html')));
app.get('/animeler.html', (req, res) => res.sendFile(path.join(__dirname, 'animeler.html')));
app.get('/dizi', (req, res) => res.sendFile(path.join(__dirname, 'dizi.html')));
app.get('/dizi.html', (req, res) => res.sendFile(path.join(__dirname, 'dizi.html')));
app.get('/bolum', (req, res) => res.sendFile(path.join(__dirname, 'bolum.html')));
app.get('/bolum.html', (req, res) => res.sendFile(path.join(__dirname, 'bolum.html')));
app.get('/trendler', (req, res) => res.sendFile(path.join(__dirname, 'trendler.html')));
const handleRandomRedirect = (req, res) => {
  try {
    const db = getDb();
    const list = [].concat(db.series || [], db.anime || []);
    if (list.length > 0) {
      const picked = list[Math.floor(Math.random() * list.length)];
      const title = Array.isArray(picked) ? picked[0] : (picked && (picked.title || picked.name));
      if (title) {
        return res.redirect(`/dizi.html?s=${encodeURIComponent(title)}`);
      }
    }
  } catch (e) {}
  res.sendFile(path.join(__dirname, 'kesfet.html'));
};
app.get('/kesfet', handleRandomRedirect);
app.get('/kesfet.html', handleRandomRedirect);
app.get('/rastgele', handleRandomRedirect);
app.get('/takvim', (req, res) => res.sendFile(path.join(__dirname, 'takvim.html')));
app.get('/takvim.html', (req, res) => res.sendFile(path.join(__dirname, 'takvim.html')));
app.get('/forum', (req, res) => res.sendFile(path.join(__dirname, 'forum.html')));
app.get('/forum.html', (req, res) => res.sendFile(path.join(__dirname, 'forum.html')));
app.get('/profil', (req, res) => res.sendFile(path.join(__dirname, 'profil.html')));
app.get('/profil.html', (req, res) => res.sendFile(path.join(__dirname, 'profil.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ==========================================
// 2. REST API ENDPOINTS
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), port: PORT });
});

// Full state bootstrap
app.get('/api/bootstrap', (req, res) => {
  const db = loadDb();
  res.json({
    series: db.series || [],
    anime: db.anime || [],
    episodes: db.episodes || [],
    threads: db.threads || [],
    summaries: db.summaries || {},
    backdrops: db.backdrops || {},
    schedule: db.schedule || [],
    comments: db.comments || {}
  });
});

// Series & Anime List & Filter
app.get('/api/series', (req, res) => {
  const db = loadDb();
  const type = req.query.type; // 'dizi' or 'anime'
  const genre = req.query.genre;
  const q = (req.query.q || '').trim().toLowerCase();

  let list = [];
  if (type === 'anime') {
    list = db.anime || [];
  } else if (type === 'dizi') {
    list = db.series || [];
  } else {
    list = (db.series || []).concat(db.anime || []);
  }

  if (genre && genre !== 'Tümü') {
    list = list.filter(item => item[1] && item[1].toLowerCase() === genre.toLowerCase());
  }

  if (q) {
    list = list.filter(item => item[0].toLowerCase().includes(q) || (item[1] && item[1].toLowerCase().includes(q)));
  }

  res.json(list);
});

// Get single series with its episodes
app.get('/api/series/:title', (req, res) => {
  const db = loadDb();
  const title = decodeURIComponent(req.params.title).toLowerCase();
  const all = (db.series || []).concat(db.anime || []);
  const found = all.find(x => x[0].toLowerCase() === title);

  if (!found) {
    return res.status(404).json({ error: 'Series not found' });
  }

  const episodes = (db.episodes || []).filter(ep => {
    const epTitle = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
    return epTitle && epTitle.toLowerCase() === title;
  });

  res.json({
    series: found,
    summary: db.summaries[found[0]] || found[5] || '',
    backdrop: db.backdrops[found[0]] || found[4] || '',
    episodes
  });
});

// Add or update series
app.post('/api/series', (req, res) => {
  const db = loadDb();
  const { isAnime, item, oldTitle } = req.body;

  if (!item || !item[0]) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const title = item[0];
  const targetList = isAnime ? (db.anime || []) : (db.series || []);

  if (oldTitle) {
    // Update existing
    const idx = targetList.findIndex(x => x[0].toLowerCase() === oldTitle.toLowerCase());
    if (idx > -1) {
      targetList[idx] = item;
    } else {
      // Might have changed type from anime to series or vice versa
      if (isAnime) {
        db.series = (db.series || []).filter(x => x[0].toLowerCase() !== oldTitle.toLowerCase());
        db.anime.unshift(item);
      } else {
        db.anime = (db.anime || []).filter(x => x[0].toLowerCase() !== oldTitle.toLowerCase());
        db.series.unshift(item);
      }
    }

    // Rename episodes if title changed
    if (oldTitle.toLowerCase() !== title.toLowerCase()) {
      (db.episodes || []).forEach(ep => {
        const epTitle = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
        if (epTitle && epTitle.toLowerCase() === oldTitle.toLowerCase()) {
          if (Array.isArray(ep.t)) ep.t[0] = title;
          else ep.t = title;
        }
      });
    }
  } else {
    // Create new
    targetList.unshift(item);
  }

  if (isAnime) db.anime = targetList;
  else db.series = targetList;

  if (item[5]) {
    if (!db.summaries) db.summaries = {};
    db.summaries[title] = item[5];
  }

  saveDb(db);
  res.json({ success: true, item });
});

// Delete series
app.delete('/api/series/:title', (req, res) => {
  const db = loadDb();
  const title = decodeURIComponent(req.params.title).toLowerCase();

  db.series = (db.series || []).filter(x => x[0].toLowerCase() !== title);
  db.anime = (db.anime || []).filter(x => x[0].toLowerCase() !== title);
  db.episodes = (db.episodes || []).filter(ep => {
    const epTitle = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
    return !epTitle || epTitle.toLowerCase() !== title;
  });

  saveDb(db);
  res.json({ success: true, message: `"${req.params.title}" deleted` });
});

// Episodes API
app.get('/api/episodes', (req, res) => {
  const db = loadDb();
  let list = db.episodes || [];
  const show = req.query.show;
  if (show) {
    const showLower = show.toLowerCase();
    list = list.filter(ep => {
      const epTitle = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
      return epTitle && epTitle.toLowerCase() === showLower;
    });
  }
  res.json(list);
});

// Add or update episode
app.post('/api/episodes', (req, res) => {
  const db = loadDb();
  const { episode, index } = req.body;

  if (!episode || !episode.t) {
    return res.status(400).json({ error: 'Episode data required' });
  }

  if (!db.episodes) db.episodes = [];

  if (index !== undefined && index !== null && index >= 0 && index < db.episodes.length) {
    db.episodes[index] = episode;
  } else {
    db.episodes.unshift(episode);
  }

  // Son eklenen bolumlerde en fazla 15 bolum tut (16. eklenince en eski silinsin)
  if (db.episodes.length > 15) {
    db.episodes = db.episodes.slice(0, 15);
  }

  saveDb(db);
  res.json({ success: true, episode });
});

// Reorder / update episode list
app.put('/api/episodes/reorder', (req, res) => {
  const db = loadDb();
  const { episodes } = req.body;
  if (!Array.isArray(episodes)) {
    return res.status(400).json({ error: 'Episodes array required' });
  }
  db.episodes = episodes.slice(0, 15);
  saveDb(db, { exactEpisodes: true });
  res.json({ success: true, episodes: db.episodes });
});

// Delete episode
app.delete('/api/episodes/:index', (req, res) => {
  const db = loadDb();
  const idx = parseInt(req.params.index);
  if (!db.episodes || isNaN(idx) || idx < 0 || idx >= db.episodes.length) {
    return res.status(400).json({ error: 'Invalid episode index' });
  }

  const deleted = db.episodes[idx];
  const t = Array.isArray(deleted?.t) ? deleted.t[0] : (typeof deleted?.t === 'object' ? deleted.t[0] : deleted?.t);
  const b = deleted?.b || deleted?.e || 1;
  const epKey = `${(t||'').toLowerCase().trim()}_s${deleted?.s}_e${b}`;

  if (!db.deletedEpisodes) db.deletedEpisodes = [];
  if (epKey && !db.deletedEpisodes.includes(epKey)) {
    db.deletedEpisodes.push(epKey);
  }

  db.episodes.splice(idx, 1);
  saveDb(db, { exactEpisodes: true, deletedEpisodeKey: epKey });
  res.json({ success: true, message: 'Episode deleted', deletedEpisodeKey: epKey });
});

// Forum Threads API
app.get('/api/forum', (req, res) => {
  const db = loadDb();
  res.json(db.threads || []);
});

app.post('/api/forum', (req, res) => {
  const db = loadDb();
  const { title, category, author } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const thread = [title, category || 'Genel', author || 'misafir', 0];
  if (!db.threads) db.threads = [];
  db.threads.unshift(thread);

  saveDb(db);
  res.json({ success: true, thread });
});

// Episode Comments API
app.get('/api/comments', (req, res) => {
  const db = loadDb();
  const { show, s, ep } = req.query;
  const comments = db.comments || {};
  if (show && s && ep) {
    const key = `${show.trim().toLowerCase()}_s${s}_e${ep}`;
    return res.json(comments[key] || []);
  }
  res.json(comments);
});

app.post('/api/comments', (req, res) => {
  const db = loadDb();
  const { show, s, ep, author, role, text, isSpoiler } = req.body;
  if (!show || !text) return res.status(400).json({ error: 'Show and text required' });

  const key = `${show.trim().toLowerCase()}_s${s || 1}_e${ep || 1}`;
  if (!db.comments) db.comments = {};
  if (!db.comments[key]) db.comments[key] = [];

  const newComment = {
    id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    author: author || 'Üye',
    role: role || 'member',
    text: String(text).trim(),
    isSpoiler: Boolean(isSpoiler),
    createdAt: new Date().toISOString(),
    replies: []
  };

  db.comments[key].unshift(newComment);
  saveDb(db);
  res.json({ success: true, comment: newComment });
});

app.post('/api/comments/reply', (req, res) => {
  const db = loadDb();
  const { show, s, ep, parentId, author, role, text, isSpoiler } = req.body;
  if (!show || !parentId || !text) return res.status(400).json({ error: 'Missing required fields' });

  const key = `${show.trim().toLowerCase()}_s${s || 1}_e${ep || 1}`;
  if (!db.comments || !db.comments[key]) return res.status(404).json({ error: 'Comment not found' });

  const parent = db.comments[key].find(c => c.id === parentId);
  if (!parent) return res.status(404).json({ error: 'Parent comment not found' });
  if (!parent.replies) parent.replies = [];

  const newReply = {
    id: 'r_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    author: author || 'Üye',
    role: role || 'member',
    text: String(text).trim(),
    isSpoiler: Boolean(isSpoiler),
    createdAt: new Date().toISOString()
  };

  parent.replies.push(newReply);
  saveDb(db);
  res.json({ success: true, reply: newReply });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`\n🚀 bölüm dizi sunucusu başarıyla çalışıyor!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📁 Statik sayfalar ve REST API aktif.\n`);
});
