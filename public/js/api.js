// bolumdizi - Unified API & Data Layer (Backend REST + Supabase Cloud Sync + LocalStorage fallback)

const STORAGE_KEY = "bolumdizi_data_v8";
const USERS_STORAGE_KEY = "bolumdizi_users_v1";
const SESSION_STORAGE_KEY = "bolumdizi_session_v1";
const SUPABASE_CONFIG_KEY = "bolumdizi_supabase_cfg_v1";

const SUPABASE_DEFAULT_CONFIG = {
  url: "https://ospayntenysjfysczduu.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcGF5bnRlbnlzamZ5c2N6ZHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTE4NzQsImV4cCI6MjEwNjg4Nzg3NH0.fBqBp_mgHitbIsNWkI97hQ0Wgv5CAzsyRGUiqjcZty8"
};

let sbClient = null;

function sanitizeSupabaseUrl(url) {
  let u = (url || "").trim();
  if (!u) return "";
  if (!u.startsWith("http://") && !u.startsWith("https://")) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

function getSupabaseConfig() {
  let cfg = null;
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (raw) cfg = JSON.parse(raw);
  } catch (e) {}
  if (!cfg || !cfg.url || !cfg.key) cfg = SUPABASE_DEFAULT_CONFIG;
  return {
    url: sanitizeSupabaseUrl(cfg.url),
    key: (cfg.key || "").trim()
  };
}

function initSupabase() {
  const cfg = getSupabaseConfig();
  if (cfg.url && cfg.key && window.supabase && window.supabase.createClient) {
    try {
      sbClient = window.supabase.createClient(cfg.url, cfg.key);
      return true;
    } catch (err) {
      console.warn("Supabase init error:", err);
      sbClient = null;
    }
  }
  sbClient = null;
  return false;
}
initSupabase();

function mergeSeriesArrays(currentList, incomingList) {
  const result = [...(currentList || [])];
  const seen = new Set(result.map(x => (x && x[0] ? String(x[0]).toLowerCase().trim() : '')));
  (incomingList || []).forEach(item => {
    const key = item && item[0] ? String(item[0]).toLowerCase().trim() : '';
    if (key && !seen.has(key)) {
      result.push(item);
      seen.add(key);
    }
  });
  return result;
}

function mergeEpisodeArrays(currentEps, incomingEps) {
  const getEpKey = (ep) => {
    if (!ep) return '';
    const t = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
    const b = ep.b || ep.e || 1;
    return `${(t || '').toLowerCase().trim()}_s${ep.s}_e${b}`;
  };
  const result = [...(currentEps || [])];
  const seen = new Set(result.map(getEpKey));
  (incomingEps || []).forEach(ep => {
    const key = getEpKey(ep);
    if (key && !seen.has(key)) {
      result.push(ep);
      seen.add(key);
    }
  });
  // Tum bolumleri sakla
  return result;
}

const API = {
  mode: 'local', // 'backend', 'cloud', or 'local'
  data: {
    series: [],
    anime: [],
    episodes: [],
    threads: [],
    summaries: {},
    backdrops: {},
    schedule: [],
    comments: {}
  },

  async init() {
    // 1. Check if local Node backend is available
    try {
      const res = await fetch('/api/health', { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'ok') {
          this.mode = 'backend';
          console.log('⚡ Backend REST API connected:', this.mode);
          const bRes = await fetch('/api/bootstrap');
          if (bRes.ok) {
            this.data = await bRes.json();
            // Sync to Supabase cloud in background with merge
            this.syncToCloud().catch(() => {});
            return this.data;
          }
        }
      }
    } catch (err) {
      // Backend not running (GitHub Pages, mobile device, or remote browser)
    }

    // 2. Try loading latest cloud database from Supabase
    const cloudSuccess = await this.loadCloud();
    if (cloudSuccess) {
      this.mode = 'cloud';
      console.log('☁️ Supabase Cloud Database active across all devices');
      return this.data;
    }

    // 3. Fallback to LocalStorage or built-in defaults
    this.mode = 'local';
    console.log('📦 Local / Static Mode active (LocalStorage fallback)');
    return this.loadLocal();
  },

  loadLocalFromStorageOnly() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const local = JSON.parse(raw);
        return {
          series: local.T || [],
          anime: local.AN || [],
          threads: local.TH || [],
          episodes: local.EPS || [],
          summaries: {},
          backdrops: {},
          comments: local.COMMENTS || {}
        };
      }
    } catch (e) {}
    return { series: [], anime: [], threads: [], episodes: [], summaries: {}, backdrops: {}, comments: {} };
  },

  async loadCloud() {
    const cfg = getSupabaseConfig();
    if (!cfg.url || !cfg.key) return false;

    try {
      const res = await fetch(cfg.url + '/rest/v1/users?username=eq.__site_content__&select=watchlist', {
        headers: {
          'apikey': cfg.key,
          'Authorization': 'Bearer ' + cfg.key
        }
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0 && rows[0].watchlist && rows[0].watchlist.series) {
          const cloud = rows[0].watchlist;

          const getEpKey = (ep) => {
            if (!ep) return '';
            const t = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
            const b = ep.b || ep.e || 1;
            return `${(t || '').toLowerCase().trim()}_s${ep.s}_e${b}`;
          };

          // Build deleted episodes blacklist from cloud and local
          const delEpKeys = new Set(cloud.deletedEpisodes || []);
          try {
            const stored = JSON.parse(localStorage.getItem('bd_deleted_episodes') || '[]');
            stored.forEach(k => delEpKeys.add(k));
          } catch (e) {}
          delEpKeys.add('the punisher_s1_e1'); // permanently purge punisher episode
          this.data.deletedEpisodes = Array.from(delEpKeys);
          try {
            localStorage.setItem('bd_deleted_episodes', JSON.stringify(this.data.deletedEpisodes));
          } catch (e) {}

          // Cloud is the single authoritative source of truth across all devices
          this.data.series = Array.isArray(cloud.series) && cloud.series.length > 0 ? cloud.series : (window.DEFAULT_SERIES || []);
          this.data.anime = Array.isArray(cloud.anime) && cloud.anime.length > 0 ? cloud.anime : (window.DEFAULT_ANIME || []);
          this.data.episodes = (Array.isArray(cloud.episodes) ? cloud.episodes : (window.DEFAULT_EPISODES || []))
            .filter(ep => !delEpKeys.has(getEpKey(ep)));
          this.data.threads = cloud.threads || window.DEFAULT_THREADS || [];
          this.data.summaries = Object.assign({}, window.DEFAULT_SUMMARIES || {}, cloud.summaries || {});
          this.data.backdrops = Object.assign({}, window.DEFAULT_BACKDROPS || {}, cloud.backdrops || {});
          this.data.schedule = cloud.schedule || window.DEFAULT_SCHEDULE || [];
          this.data.comments = Object.assign({}, window.DEFAULT_COMMENTS || {}, cloud.comments || {});
          
          // Overwrite local device cache with pristine cloud data so all devices match
          this.saveLocal();

          return true;
        }
      }
    } catch (err) {
      console.warn('Supabase cloud fetch warning:', err);
    }
    return false;
  },

  async syncToCloud(options = {}) {
    const cfg = getSupabaseConfig();
    if (!cfg.url || !cfg.key) return false;

    try {
      // 1. Fetch current cloud state first to ensure no series added on another device is overwritten
      let cloud = { series: [], anime: [], episodes: [], threads: [], summaries: {}, backdrops: {}, schedule: [], comments: {} };
      try {
        const fetchRes = await fetch(cfg.url + '/rest/v1/users?username=eq.__site_content__&select=watchlist', {
          headers: {
            'apikey': cfg.key,
            'Authorization': 'Bearer ' + cfg.key
          }
        });
        if (fetchRes.ok) {
          const rows = await fetchRes.json();
          if (rows && rows[0] && rows[0].watchlist && Array.isArray(rows[0].watchlist.series)) {
            cloud = rows[0].watchlist;
          }
        }
      } catch (e) {
        console.warn('Pre-sync fetch warning:', e);
      }

      // If a series was explicitly deleted, ensure it is removed from cloud
      if (options.deletedTitle) {
        const delNorm = options.deletedTitle.trim().toLowerCase();
        cloud.series = (cloud.series || []).filter(x => x[0].toLowerCase() !== delNorm);
        cloud.anime = (cloud.anime || []).filter(x => x[0].toLowerCase() !== delNorm);
        cloud.episodes = (cloud.episodes || []).filter(ep => {
          const epTitle = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
          return !epTitle || epTitle.toLowerCase() !== delNorm;
        });
      }

      const getEpKey = (ep) => {
        if (!ep) return '';
        const t = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
        const b = ep.b || ep.e || 1;
        return `${(t || '').toLowerCase().trim()}_s${ep.s}_e${b}`;
      };

      // Persistent deleted episodes blacklist
      const delEpKeys = new Set(cloud.deletedEpisodes || []);
      (this.data.deletedEpisodes || []).forEach(k => delEpKeys.add(k));
      try {
        const stored = JSON.parse(localStorage.getItem('bd_deleted_episodes') || '[]');
        stored.forEach(k => delEpKeys.add(k));
      } catch (e) {}
      delEpKeys.add('the punisher_s1_e1');

      if (options.deletedEpisodeKey) {
        delEpKeys.add(options.deletedEpisodeKey);
      }
      this.data.deletedEpisodes = Array.from(delEpKeys);
      try {
        localStorage.setItem('bd_deleted_episodes', JSON.stringify(this.data.deletedEpisodes));
      } catch (e) {}

      // Filter deleted episodes out of cloud and local lists
      cloud.episodes = (cloud.episodes || []).filter(ep => !delEpKeys.has(getEpKey(ep)));
      this.data.episodes = (this.data.episodes || []).filter(ep => !delEpKeys.has(getEpKey(ep)));

      // 2. Intelligently union-merge: Local updates take priority for matching items,
      // but any item that exists in cloud and not in local is preserved!
      const mergedSeries = mergeSeriesArrays(this.data.series, cloud.series);
      const mergedAnime = mergeSeriesArrays(this.data.anime, cloud.anime);
      let mergedEpisodes;
      if (options.exactEpisodes) {
        mergedEpisodes = this.data.episodes.filter(ep => !delEpKeys.has(getEpKey(ep)));
      } else {
        mergedEpisodes = mergeEpisodeArrays(this.data.episodes, cloud.episodes).filter(ep => !delEpKeys.has(getEpKey(ep)));
      }
      const mergedSummaries = Object.assign({}, cloud.summaries || {}, this.data.summaries || {});
      const mergedBackdrops = Object.assign({}, cloud.backdrops || {}, this.data.backdrops || {});
      const mergedComments = Object.assign({}, cloud.comments || {}, this.data.comments || {});

      this.data.series = mergedSeries;
      this.data.anime = mergedAnime;
      this.data.episodes = mergedEpisodes;
      this.data.summaries = mergedSummaries;
      this.data.backdrops = mergedBackdrops;
      this.data.comments = mergedComments;
      this.saveLocal();

      // 3. Write merged dataset to Supabase
      const res = await fetch(cfg.url + '/rest/v1/users?username=eq.__site_content__', {
        method: 'PATCH',
        headers: {
          'apikey': cfg.key,
          'Authorization': 'Bearer ' + cfg.key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          watchlist: {
            series: mergedSeries,
            anime: mergedAnime,
            episodes: mergedEpisodes,
            threads: this.data.threads || cloud.threads || [],
            summaries: mergedSummaries,
            backdrops: mergedBackdrops,
            schedule: this.data.schedule || cloud.schedule || [],
            comments: mergedComments,
            deletedEpisodes: Array.from(delEpKeys),
            updated_at: new Date().toISOString()
          }
        })
      });
      if (res.ok) {
        console.log('☁️ Cloud database merged & updated on Supabase! Series count:', mergedSeries.length);
        return true;
      }
    } catch (err) {
      console.warn('Supabase cloud sync warning:', err);
    }
    return false;
  },

  loadLocal() {
    let local = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) local = JSON.parse(raw);
    } catch (e) {}

    const delEpKeys = new Set(this.data.deletedEpisodes || []);
    try {
      const stored = JSON.parse(localStorage.getItem('bd_deleted_episodes') || '[]');
      stored.forEach(k => delEpKeys.add(k));
    } catch (e) {}
    delEpKeys.add('the punisher_s1_e1');
    this.data.deletedEpisodes = Array.from(delEpKeys);

    const getEpKey = (ep) => {
      if (!ep) return '';
      const t = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
      const b = ep.b || ep.e || 1;
      return `${(t || '').toLowerCase().trim()}_s${ep.s}_e${b}`;
    };

    if (!local || !local.T) {
      this.data.series = window.DEFAULT_SERIES || [];
      this.data.anime = window.DEFAULT_ANIME || [];
      this.data.threads = window.DEFAULT_THREADS || [];
      this.data.episodes = (window.DEFAULT_EPISODES || []).filter(ep => !delEpKeys.has(getEpKey(ep)));
      this.data.summaries = window.DEFAULT_SUMMARIES || {};
      this.data.backdrops = window.DEFAULT_BACKDROPS || {};
      this.data.schedule = window.DEFAULT_SCHEDULE || [];
      this.data.comments = window.DEFAULT_COMMENTS || {};
    } else {
      this.data.series = local.T || [];
      this.data.anime = local.AN || [];
      this.data.threads = local.TH || [];
      this.data.episodes = (local.EPS || window.DEFAULT_EPISODES || []).filter(ep => !delEpKeys.has(getEpKey(ep)));
      this.data.summaries = window.DEFAULT_SUMMARIES || {};
      this.data.backdrops = window.DEFAULT_BACKDROPS || {};
      this.data.schedule = window.DEFAULT_SCHEDULE || [];
      this.data.comments = local.COMMENTS || window.DEFAULT_COMMENTS || {};
    }
    return this.data;
  },

  saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        T: this.data.series,
        AN: this.data.anime,
        TH: this.data.threads,
        EPS: this.data.episodes,
        COMMENTS: this.data.comments || {}
      }));
      return true;
    } catch (e) {
      console.warn("Storage quota warning:", e);
      return false;
    }
  },

  getAllSeries() {
    return (this.data.series || []).concat(this.data.anime || []);
  },

  getSeries(type) {
    if (type === 'anime') return this.data.anime || [];
    if (type === 'dizi') return this.data.series || [];
    return this.getAllSeries();
  },

  getSeriesDetail(title) {
    if (!title) return null;
    const tNorm = title.trim().toLowerCase();
    const all = this.getAllSeries();
    return all.find(x => x[0].toLowerCase() === tNorm);
  },

  getEpisodes(title) {
    let eps = this.data.episodes || [];
    if (title) {
      const tNorm = title.trim().toLowerCase();
      eps = eps.filter(e => {
        const epTitle = Array.isArray(e.t) ? e.t[0] : (typeof e.t === 'object' ? e.t[0] : e.t);
        return epTitle && epTitle.toLowerCase() === tNorm;
      });
    }
    return eps;
  },

  async saveSeries(item, isAnime, oldTitle) {
    if (this.mode === 'backend') {
      try {
        const res = await fetch('/api/series', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item, isAnime, oldTitle })
        });
        if (res.ok) {
          const rJson = await res.json();
          await this.init();
          this.syncToCloud().catch(() => {});
          return rJson;
        }
      } catch (err) {
        console.warn('Backend save failed, using local/cloud:', err);
      }
    }

    // Local save
    const list = isAnime ? this.data.anime : this.data.series;
    if (oldTitle) {
      const idx = list.findIndex(x => x[0].toLowerCase() === oldTitle.toLowerCase());
      if (idx > -1) {
        list[idx] = item;
      } else {
        if (isAnime) {
          this.data.series = this.data.series.filter(x => x[0].toLowerCase() !== oldTitle.toLowerCase());
          this.data.anime.unshift(item);
        } else {
          this.data.anime = this.data.anime.filter(x => x[0].toLowerCase() !== oldTitle.toLowerCase());
          this.data.series.unshift(item);
        }
      }
      if (oldTitle.toLowerCase() !== item[0].toLowerCase()) {
        this.data.episodes.forEach(ep => {
          const epTitle = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
          if (epTitle && epTitle.toLowerCase() === oldTitle.toLowerCase()) {
            if (Array.isArray(ep.t)) ep.t[0] = item[0];
            else ep.t = item[0];
          }
        });
      }
    } else {
      list.unshift(item);
    }
    this.saveLocal();
    // Sync to Supabase cloud immediately so all devices see the new/updated series!
    this.syncToCloud().catch(() => {});
    return { success: true, item };
  },

  async deleteSeries(title) {
    if (this.mode === 'backend') {
      try {
        const res = await fetch(`/api/series/${encodeURIComponent(title)}`, { method: 'DELETE' });
        if (res.ok) {
          await this.init();
          this.syncToCloud({ deletedTitle: title }).catch(() => {});
          return true;
        }
      } catch (err) {}
    }

    const tNorm = title.trim().toLowerCase();
    this.data.series = this.data.series.filter(x => x[0].toLowerCase() !== tNorm);
    this.data.anime = this.data.anime.filter(x => x[0].toLowerCase() !== tNorm);
    this.data.episodes = this.data.episodes.filter(ep => {
      const epTitle = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
      return !epTitle || epTitle.toLowerCase() !== tNorm;
    });
    this.saveLocal();
    this.syncToCloud({ deletedTitle: title }).catch(() => {});
    return true;
  },

  async saveEpisode(episode, index = null) {
    if (this.mode === 'backend') {
      try {
        const res = await fetch('/api/episodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episode, index })
        });
        if (res.ok) {
          await this.init();
          this.syncToCloud().catch(() => {});
          return true;
        }
      } catch (err) {}
    }

    if (index !== null && index >= 0 && index < this.data.episodes.length) {
      this.data.episodes[index] = episode;
    } else {
      this.data.episodes.unshift(episode);
    }
    this.saveLocal();
    this.syncToCloud().catch(() => {});
    return true;
  },

  async deleteEpisode(index) {
    let deletedEpKey = null;
    if (index >= 0 && index < this.data.episodes.length) {
      const ep = this.data.episodes[index];
      const epTitle = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
      const b = ep.b || ep.e || 1;
      deletedEpKey = `${(epTitle||'').toLowerCase().trim()}_s${ep.s}_e${b}`;
    }

    if (!this.data.deletedEpisodes) this.data.deletedEpisodes = [];
    if (deletedEpKey && !this.data.deletedEpisodes.includes(deletedEpKey)) {
      this.data.deletedEpisodes.push(deletedEpKey);
      try {
        const delArr = JSON.parse(localStorage.getItem('bd_deleted_episodes') || '[]');
        if (!delArr.includes(deletedEpKey)) {
          delArr.push(deletedEpKey);
          localStorage.setItem('bd_deleted_episodes', JSON.stringify(delArr));
        }
      } catch (e) {}
    }

    if (this.mode === 'backend') {
      try {
        const res = await fetch(`/api/episodes/${index}`, { method: 'DELETE' });
        if (res.ok) {
          await this.init();
          await this.syncToCloud({ deletedEpisodeKey: deletedEpKey, exactEpisodes: true });
          return true;
        }
      } catch (err) {}
    }

    if (index >= 0 && index < this.data.episodes.length) {
      this.data.episodes.splice(index, 1);
      this.saveLocal();
      await this.syncToCloud({ deletedEpisodeKey: deletedEpKey, exactEpisodes: true });
    }
    return true;
  },

  async reorderEpisodes(newEpisodesList) {
    if (!Array.isArray(newEpisodesList)) return false;
    this.data.episodes = newEpisodesList;
    this.saveLocal();

    if (this.mode === 'backend') {
      try {
        await fetch('/api/episodes/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episodes: this.data.episodes })
        });
      } catch (err) {}
    }

    try {
      await this.syncToCloud({ exactEpisodes: true });
    } catch (err) {
      console.warn('Reorder sync error:', err);
    }
    return true;
  },

  async moveEpisode(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.data.episodes.length) return false;
    if (toIndex < 0 || toIndex >= this.data.episodes.length) return false;
    const eps = [...this.data.episodes];
    const [moved] = eps.splice(fromIndex, 1);
    eps.splice(toIndex, 0, moved);
    this.data.episodes = eps;
    this.saveLocal();

    // Background sync to backend and Supabase cloud
    if (this.mode === 'backend') {
      fetch('/api/episodes/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodes: this.data.episodes })
      }).catch(() => {});
    }
    this.syncToCloud({ exactEpisodes: true }).catch(() => {});
    return true;
  },

  async addThread(title, category = "Genel", author = "sen") {
    if (this.mode === 'backend') {
      try {
        const res = await fetch('/api/forum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, category, author })
        });
        if (res.ok) {
          await this.init();
          this.syncToCloud().catch(() => {});
          return true;
        }
      } catch (err) {}
    }

    this.data.threads.unshift([title, category, author, 0]);
    this.saveLocal();
    this.syncToCloud().catch(() => {});
    return true;
  },

  getComments(showTitle, season, episode) {
    if (!showTitle) return [];
    const key = `${showTitle.trim().toLowerCase()}_s${season}_e${episode}`;
    const all = this.data.comments || {};
    return all[key] || [];
  },

  async addComment(showTitle, season, episode, commentData) {
    if (!showTitle) return null;
    const key = `${showTitle.trim().toLowerCase()}_s${season}_e${episode}`;

    if (this.mode === 'backend') {
      try {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            show: showTitle,
            s: season,
            ep: episode,
            author: commentData.author,
            role: commentData.role,
            text: commentData.text,
            isSpoiler: commentData.isSpoiler
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.comment) {
            if (!this.data.comments) this.data.comments = {};
            if (!this.data.comments[key]) this.data.comments[key] = [];
            this.data.comments[key].unshift(json.comment);
            this.saveLocal();
            this.syncToCloud().catch(() => {});
            return json.comment;
          }
        }
      } catch (err) {}
    }

    if (!this.data.comments) this.data.comments = {};
    if (!this.data.comments[key]) this.data.comments[key] = [];

    const newComment = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      author: commentData.author || 'Üye',
      role: commentData.role || 'member',
      text: String(commentData.text || '').trim(),
      isSpoiler: Boolean(commentData.isSpoiler),
      createdAt: new Date().toISOString(),
      replies: []
    };

    this.data.comments[key].unshift(newComment);
    this.saveLocal();
    this.syncToCloud().catch(() => {});
    return newComment;
  },

  async addReply(showTitle, season, episode, parentCommentId, replyData) {
    if (!showTitle || !parentCommentId) return null;
    const key = `${showTitle.trim().toLowerCase()}_s${season}_e${episode}`;

    if (this.mode === 'backend') {
      try {
        const res = await fetch('/api/comments/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            show: showTitle,
            s: season,
            ep: episode,
            parentId: parentCommentId,
            author: replyData.author,
            role: replyData.role,
            text: replyData.text,
            isSpoiler: replyData.isSpoiler
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.reply) {
            if (this.data.comments && this.data.comments[key]) {
              const p = this.data.comments[key].find(c => c.id === parentCommentId);
              if (p) {
                if (!p.replies) p.replies = [];
                p.replies.push(json.reply);
              }
            }
            this.saveLocal();
            this.syncToCloud().catch(() => {});
            return json.reply;
          }
        }
      } catch (err) {}
    }

    if (!this.data.comments || !this.data.comments[key]) return null;
    const parent = this.data.comments[key].find(c => c.id === parentCommentId);
    if (!parent) return null;
    if (!parent.replies) parent.replies = [];

    const newReply = {
      id: 'r_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      author: replyData.author || 'Üye',
      role: replyData.role || 'member',
      text: String(replyData.text || '').trim(),
      isSpoiler: Boolean(replyData.isSpoiler),
      createdAt: new Date().toISOString()
    };

    parent.replies.push(newReply);
    this.saveLocal();
    this.syncToCloud().catch(() => {});
    return newReply;
  }
};

window.API = API;
