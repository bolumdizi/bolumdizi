// bolumdizi - Unified API & Data Layer (Backend REST + Supabase Cloud Sync + LocalStorage fallback)

const STORAGE_KEY = "bolumdizi_data_v11";
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

function mergeSeriesArrays(currentList, incomingList, excludeSet) {
  const result = [...(currentList || [])];
  const seen = new Set(result.map(x => (x && x[0] ? String(x[0]).toLowerCase().trim() : '')));
  (incomingList || []).forEach(item => {
    const key = item && item[0] ? String(item[0]).toLowerCase().trim() : '';
    if (key && !seen.has(key) && (!excludeSet || !excludeSet.has(key))) {
      result.push(item);
      seen.add(key);
    }
  });
  return result;
}

function getThreadKey(t) {
  if (!t) return '';
  if (t[4]) return String(t[4]).toLowerCase().trim();
  return String(t[0] || '').toLowerCase().trim();
}

function mergeThreadArrays(currentThreads, incomingThreads) {
  const result = [...(currentThreads || [])];
  const map = new Map();
  result.forEach((t, idx) => {
    const k = getThreadKey(t);
    if (k) map.set(k, idx);
  });

  (incomingThreads || []).forEach(item => {
    const k = getThreadKey(item);
    if (!k) return;
    if (map.has(k)) {
      const idx = map.get(k);
      const existing = result[idx];
      const maxReplies = Math.max(Number(existing[3]) || 0, Number(item[3]) || 0);
      existing[3] = maxReplies;
      if (!existing[4] && item[4]) existing[4] = item[4];
      if (!existing[5] && item[5]) existing[5] = item[5];
      if (!existing[6] && item[6]) existing[6] = item[6];
    } else {
      result.push(item);
      map.set(k, result.length - 1);
    }
  });
  return result;
}

function mergeEpisodeArrays(currentEps, incomingEps) {
  const getEpKey = (ep) => {
    if (!ep) return '';
    const t = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
    const b = (ep.b !== undefined && ep.b !== null && ep.b !== '') ? ep.b : ((ep.e !== undefined && ep.e !== null && ep.e !== '') ? ep.e : 1);
    return `${(t || '').toLowerCase().trim()}_s${ep.s}_e${b}`;
  };
  const result = [...(currentEps || [])];
  const map = new Map();
  result.forEach((ep, idx) => {
    const k = getEpKey(ep);
    if (k) map.set(k, idx);
  });
  (incomingEps || []).forEach(ep => {
    const key = getEpKey(ep);
    if (!key) return;
    if (map.has(key)) {
      const idx = map.get(key);
      if (!result[idx].note && ep.note) result[idx].note = ep.note;
    } else {
      result.push(ep);
      map.set(key, result.length - 1);
    }
  });
  return result;
}

const API = {
  mode: 'local', // 'backend', 'cloud', or 'local'
  data: {
    series: [],
    anime: [],
    episodes: [],
    threads: [],
    featured: [],
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
          featured: local.FEATURED || window.DEFAULT_FEATURED || [],
          summaries: {},
          backdrops: {},
          comments: local.COMMENTS || {}
        };
      }
    } catch (e) {}
    return { series: [], anime: [], threads: [], episodes: [], featured: [], summaries: {}, backdrops: {}, comments: {} };
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
            const b = (ep.b !== undefined && ep.b !== null && ep.b !== '') ? ep.b : ((ep.e !== undefined && ep.e !== null && ep.e !== '') ? ep.e : 1);
            return `${(t || '').toLowerCase().trim()}_s${ep.s}_e${b}`;
          };

          // Build deleted episodes blacklist from cloud and local
          const delEpKeys = new Set(cloud.deletedEpisodes || []);
          try {
            const stored = JSON.parse(localStorage.getItem('bd_deleted_episodes') || '[]');
            stored.forEach(k => delEpKeys.add(k));
          } catch (e) {}
          delEpKeys.add('the punisher_s1_e1'); // permanently purge punisher episode

          // Any episode present in cloud or default episodes is active; un-blacklist it
          (cloud.episodes || []).forEach(ep => {
            const k = getEpKey(ep);
            if (k) delEpKeys.delete(k);
          });
          (window.DEFAULT_EPISODES || []).forEach(ep => {
            const k = getEpKey(ep);
            if (k && k !== 'the punisher_s1_e1') delEpKeys.delete(k);
          });

          this.data.deletedEpisodes = Array.from(delEpKeys);
          try {
            localStorage.setItem('bd_deleted_episodes', JSON.stringify(this.data.deletedEpisodes));
          } catch (e) {}

          // Cloud is the single authoritative source of truth across all devices
          this.data.series = Array.isArray(cloud.series) && cloud.series.length > 0 ? cloud.series : (window.DEFAULT_SERIES || []);
          this.data.anime = Array.isArray(cloud.anime) && cloud.anime.length > 0 ? cloud.anime : (window.DEFAULT_ANIME || []);
          this.data.episodes = (Array.isArray(cloud.episodes) ? cloud.episodes : (window.DEFAULT_EPISODES || []))
            .filter(ep => !delEpKeys.has(getEpKey(ep)));
          const localTh = this.loadLocalFromStorageOnly().threads || [];
          const cloudTh = Array.isArray(cloud.threads) ? cloud.threads : (window.DEFAULT_THREADS || []);
          this.data.threads = mergeThreadArrays(localTh, cloudTh);
          this.data.featured = Array.isArray(cloud.featured) && cloud.featured.length > 0
            ? cloud.featured
            : (this.loadLocalFromStorageOnly().featured || window.DEFAULT_FEATURED || []);
          this.data.summaries = Object.assign({}, window.DEFAULT_SUMMARIES || {}, cloud.summaries || {});
          this.data.backdrops = Object.assign({}, window.DEFAULT_BACKDROPS || {}, cloud.backdrops || {});
          this.data.schedule = cloud.schedule || window.DEFAULT_SCHEDULE || [];
          this.data.comments = Object.assign({}, window.DEFAULT_COMMENTS || {}, cloud.comments || {});
          if (this.data.comments['the punisher_s1_e1']) {
            delete this.data.comments['the punisher_s1_e1'];
          }
          
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

      // If a series was explicitly deleted or renamed, ensure old title is removed from cloud
      if (options.deletedTitle) {
        const delNorm = options.deletedTitle.trim().toLowerCase();
        cloud.series = (cloud.series || []).filter(x => x && x[0] && x[0].toLowerCase().trim() !== delNorm);
        cloud.anime = (cloud.anime || []).filter(x => x && x[0] && x[0].toLowerCase().trim() !== delNorm);
        cloud.episodes = (cloud.episodes || []).filter(ep => {
          const epTitle = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
          return !epTitle || epTitle.toLowerCase().trim() !== delNorm;
        });
      }

      const getEpKey = (ep) => {
        if (!ep) return '';
        const t = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
        const b = (ep.b !== undefined && ep.b !== null && ep.b !== '') ? ep.b : ((ep.e !== undefined && ep.e !== null && ep.e !== '') ? ep.e : 1);
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
      if (options.restoredEpisodeKey) {
        delEpKeys.delete(options.restoredEpisodeKey);
      }

      // Any episode present in this.data.episodes (unless just deleted in options) is active and un-blacklisted
      (this.data.episodes || []).forEach(ep => {
        const k = getEpKey(ep);
        if (k && k !== options.deletedEpisodeKey) {
          delEpKeys.delete(k);
        }
      });

      this.data.deletedEpisodes = Array.from(delEpKeys);
      try {
        localStorage.setItem('bd_deleted_episodes', JSON.stringify(this.data.deletedEpisodes));
      } catch (e) {}

      // Filter deleted episodes out of cloud and local lists
      cloud.episodes = (cloud.episodes || []).filter(ep => !delEpKeys.has(getEpKey(ep)));
      this.data.episodes = (this.data.episodes || []).filter(ep => !delEpKeys.has(getEpKey(ep)));

      // 2. Intelligently union-merge: Local updates take priority for matching items,
      // and items switched between anime/series won't be duplicated!
      const animeNames = new Set((this.data.anime || []).map(x => x && x[0] ? x[0].toLowerCase().trim() : ''));
      const seriesNames = new Set((this.data.series || []).map(x => x && x[0] ? x[0].toLowerCase().trim() : ''));
      if (options.deletedTitle) {
        animeNames.add(options.deletedTitle.trim().toLowerCase());
        seriesNames.add(options.deletedTitle.trim().toLowerCase());
      }

      const mergedSeries = mergeSeriesArrays(this.data.series, cloud.series, animeNames);
      const mergedAnime = mergeSeriesArrays(this.data.anime, cloud.anime, seriesNames);
      // Bölüm sıralamasını KESİNLİKLE yereldeki gibi koru.
      // Sadece yerelde hiç olmayan bir bölüm cloud'da varsa en sona eklenir.
      let mergedEpisodes = (this.data.episodes || []).filter(ep => !delEpKeys.has(getEpKey(ep)));
      if (!options.exactEpisodes && Array.isArray(cloud.episodes)) {
        const localKeys = new Set(mergedEpisodes.map(getEpKey));
        cloud.episodes.forEach(ce => {
          const k = getEpKey(ce);
          if (k && !localKeys.has(k) && !delEpKeys.has(k)) {
            mergedEpisodes.push(ce);
            localKeys.add(k);
          }
        });
      }
      this.data.episodes = mergedEpisodes;

      const mergedSummaries = Object.assign({}, cloud.summaries || {}, this.data.summaries || {});
      const mergedBackdrops = Object.assign({}, cloud.backdrops || {}, this.data.backdrops || {});
      const mergedComments = Object.assign({}, cloud.comments || {}, this.data.comments || {});
      delete mergedComments['the punisher_s1_e1'];
      if (this.data.comments) {
        delete this.data.comments['the punisher_s1_e1'];
      }

      const mergedThreads = mergeThreadArrays(this.data.threads, cloud.threads);
      let mergedFeatured;
      if (options.exactFeatured && Array.isArray(this.data.featured) && this.data.featured.length > 0) {
        mergedFeatured = this.data.featured.slice(0, 5);
      } else if (Array.isArray(cloud.featured) && cloud.featured.length > 0) {
        mergedFeatured = cloud.featured.slice(0, 5);
      } else if (Array.isArray(this.data.featured) && this.data.featured.length > 0) {
        mergedFeatured = this.data.featured.slice(0, 5);
      } else {
        mergedFeatured = (window.DEFAULT_FEATURED || []).slice(0, 5);
      }

      this.data.series = mergedSeries;
      this.data.anime = mergedAnime;
      this.data.episodes = mergedEpisodes;
      this.data.threads = mergedThreads;
      this.data.featured = mergedFeatured;
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
            threads: mergedThreads,
            featured: mergedFeatured,
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
      const b = (ep.b !== undefined && ep.b !== null && ep.b !== '') ? ep.b : ((ep.e !== undefined && ep.e !== null && ep.e !== '') ? ep.e : 1);
      return `${(t || '').toLowerCase().trim()}_s${ep.s}_e${b}`;
    };

    if (!local || !local.T) {
      this.data.series = window.DEFAULT_SERIES || [];
      this.data.anime = window.DEFAULT_ANIME || [];
      this.data.threads = window.DEFAULT_THREADS || [];
      this.data.featured = window.DEFAULT_FEATURED || [];
      this.data.episodes = (window.DEFAULT_EPISODES || []).filter(ep => !delEpKeys.has(getEpKey(ep)));
      this.data.summaries = window.DEFAULT_SUMMARIES || {};
      this.data.backdrops = window.DEFAULT_BACKDROPS || {};
      this.data.schedule = window.DEFAULT_SCHEDULE || [];
      this.data.comments = window.DEFAULT_COMMENTS || {};
    } else {
      this.data.series = local.T || [];
      this.data.anime = local.AN || [];
      this.data.threads = local.TH || [];
      this.data.featured = local.FEATURED || window.DEFAULT_FEATURED || [];
      this.data.episodes = (local.EPS || window.DEFAULT_EPISODES || []).filter(ep => !delEpKeys.has(getEpKey(ep)));
      this.data.summaries = window.DEFAULT_SUMMARIES || {};
      this.data.backdrops = window.DEFAULT_BACKDROPS || {};
      this.data.schedule = window.DEFAULT_SCHEDULE || [];
      this.data.comments = local.COMMENTS || window.DEFAULT_COMMENTS || {};
    }
    if (this.data.comments && this.data.comments['the punisher_s1_e1']) {
      delete this.data.comments['the punisher_s1_e1'];
      try { this.saveLocal(); } catch (e) {}
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
        FEATURED: this.data.featured,
        SCHEDULE: this.data.schedule || [],
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
    if (typeof type === 'string' && type.trim() && type !== 'all') {
      return this.getSeriesDetail(type);
    }
    return this.getAllSeries();
  },

  getFeaturedSeries() {
    const titles = (Array.isArray(this.data.featured) && this.data.featured.length > 0)
      ? this.data.featured
      : (window.DEFAULT_FEATURED || [
          "The Mentalist",
          "Person of Interest",
          "Avatar: The Last Airbender",
          "Avatar: Seven Havens",
          "Breaking Bad"
        ]);

    const all = this.getAllSeries();
    const list = [];
    const added = new Set();

    titles.forEach(t => {
      const s = all.find(x => x[0].toLowerCase().trim() === t.toLowerCase().trim());
      if (s && !added.has(s[0])) {
        list.push(s);
        added.add(s[0]);
      }
    });

    return list.slice(0, 5);
  },

  async saveFeatured(featuredTitles) {
    if (!Array.isArray(featuredTitles)) return false;
    this.data.featured = featuredTitles.slice(0, 5);
    this.saveLocal();

    if (this.mode === 'backend') {
      try {
        await fetch('/api/featured', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featured: this.data.featured })
        });
      } catch (err) {}
    }

    await this.syncToCloud({ exactFeatured: true });
    return true;
  },

  async saveSchedule(newSchedule) {
    if (!Array.isArray(newSchedule)) return false;
    this.data.schedule = newSchedule;
    this.saveLocal();

    if (this.mode === 'backend') {
      try {
        await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedule: this.data.schedule })
        });
      } catch (err) {}
    }

    await this.syncToCloud();
    return true;
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
        const epTitle = Array.isArray(e.t) ? e.t[0] : (typeof e.t === 'object' ? ep.t[0] : e.t);
        return epTitle && epTitle.toLowerCase() === tNorm;
      });
    }
    return eps;
  },

  async saveSeries(item, isAnime, oldTitle) {
    const deletedTitle = (oldTitle && oldTitle.toLowerCase().trim() !== item[0].toLowerCase().trim()) ? oldTitle.trim() : null;

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
          await this.syncToCloud({ deletedTitle });
          return rJson;
        }
      } catch (err) {
        console.warn('Backend save failed, using local/cloud:', err);
      }
    }

    // Local save
    const list = isAnime ? this.data.anime : this.data.series;
    if (oldTitle) {
      const idx = list.findIndex(x => x[0].toLowerCase().trim() === oldTitle.toLowerCase().trim());
      if (idx > -1) {
        list[idx] = item;
      } else {
        if (isAnime) {
          this.data.series = (this.data.series || []).filter(x => x[0].toLowerCase().trim() !== oldTitle.toLowerCase().trim());
          this.data.anime.unshift(item);
        } else {
          this.data.anime = (this.data.anime || []).filter(x => x[0].toLowerCase().trim() !== oldTitle.toLowerCase().trim());
          this.data.series.unshift(item);
        }
      }
      // Ensure it doesn't linger in the opposite list
      if (isAnime) {
        this.data.series = (this.data.series || []).filter(x => x[0].toLowerCase().trim() !== oldTitle.toLowerCase().trim() && x[0].toLowerCase().trim() !== item[0].toLowerCase().trim());
      } else {
        this.data.anime = (this.data.anime || []).filter(x => x[0].toLowerCase().trim() !== oldTitle.toLowerCase().trim() && x[0].toLowerCase().trim() !== item[0].toLowerCase().trim());
      }

      if (deletedTitle) {
        (this.data.episodes || []).forEach(ep => {
          const epTitle = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
          if (epTitle && epTitle.toLowerCase().trim() === deletedTitle.toLowerCase()) {
            if (Array.isArray(ep.t)) ep.t[0] = item[0];
            else ep.t = item[0];
          }
        });
        if (this.data.summaries && this.data.summaries[oldTitle]) {
          this.data.summaries[item[0]] = this.data.summaries[oldTitle];
          delete this.data.summaries[oldTitle];
        }
        if (this.data.backdrops && this.data.backdrops[oldTitle]) {
          this.data.backdrops[item[0]] = this.data.backdrops[oldTitle];
          delete this.data.backdrops[oldTitle];
        }
      }
    } else {
      list.unshift(item);
    }
    this.saveLocal();
    // Sync to Supabase cloud immediately and AWAIT so page reload doesn't abort the save
    await this.syncToCloud({ deletedTitle });
    return { success: true, item };
  },

  async deleteSeries(title) {
    if (this.mode === 'backend') {
      try {
        const res = await fetch(`/api/series/${encodeURIComponent(title)}`, { method: 'DELETE' });
        if (res.ok) {
          await this.init();
          await this.syncToCloud({ deletedTitle: title });
          return true;
        }
      } catch (err) {}
    }

    const tNorm = title.trim().toLowerCase();
    this.data.series = (this.data.series || []).filter(x => x[0].toLowerCase().trim() !== tNorm);
    this.data.anime = (this.data.anime || []).filter(x => x[0].toLowerCase().trim() !== tNorm);
    this.data.episodes = (this.data.episodes || []).filter(ep => {
      const epTitle = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
      return !epTitle || epTitle.toLowerCase().trim() !== tNorm;
    });
    this.saveLocal();
    await this.syncToCloud({ deletedTitle: title });
    return true;
  },

  async saveEpisode(episode, index = null) {
    if (!episode) return false;
    const epTitle = Array.isArray(episode?.t) ? episode.t[0] : (typeof episode?.t === 'object' ? (episode.t.title || episode.t[0]) : episode?.t);
    const s = Math.max(1, parseInt(episode?.s) || 1);
    const b = (episode?.b !== undefined && episode?.b !== null && episode?.b !== '') ? parseInt(episode.b) : ((episode?.e !== undefined && episode?.e !== null && episode?.e !== '') ? parseInt(episode.e) : 1);
    const normTitle = (epTitle || '').toLowerCase().trim();
    const epKey = `${normTitle}_s${s}_e${b}`;

    // Normalize episode object
    episode.s = s;
    episode.b = b;
    episode.e = b;
    episode.t = [epTitle || 'Dizi'];
    if (episode.name && !episode.title) episode.title = episode.name;
    if (episode.epTitle && !episode.title) episode.title = episode.epTitle;

    // Remove from deleted blacklist so any previously deleted episode can be freely re-added
    if (this.data.deletedEpisodes) {
      this.data.deletedEpisodes = this.data.deletedEpisodes.filter(k => k !== epKey);
    }
    try {
      const stored = JSON.parse(localStorage.getItem('bd_deleted_episodes') || '[]');
      const filteredStored = stored.filter(k => k !== epKey);
      localStorage.setItem('bd_deleted_episodes', JSON.stringify(filteredStored));
    } catch (e) {}

    // Güvenli kimlik tespiti: Dizinin adı, sezonu ve bölüm numarasıyla mevcut bölümü bul
    const episodes = this.data.episodes || [];
    let matchIdx = -1;
    if (index !== null && index !== undefined && index >= 0 && index < episodes.length) {
      const cand = episodes[index];
      const candT = Array.isArray(cand?.t) ? cand.t[0] : (typeof cand?.t === 'object' ? cand.t[0] : cand?.t);
      const candS = parseInt(cand?.s) || 1;
      const candB = (cand?.b !== undefined && cand?.b !== null && cand?.b !== '') ? parseInt(cand.b) : parseInt(cand?.e);
      if ((candT || '').toLowerCase().trim() === normTitle && candS === s && candB === b) {
        matchIdx = index;
      }
    }
    if (matchIdx === -1) {
      matchIdx = episodes.findIndex(e => {
        const et = Array.isArray(e?.t) ? e.t[0] : (typeof e?.t === 'object' ? e.t[0] : e?.t);
        const es = parseInt(e?.s) || 1;
        const eb = (e?.b !== undefined && e?.b !== null && e?.b !== '') ? parseInt(e.b) : parseInt(e?.e);
        return (et || '').toLowerCase().trim() === normTitle && es === s && eb === b;
      });
    }

    if (matchIdx !== -1) {
      episodes[matchIdx] = episode;
    } else {
      episodes.unshift(episode);
    }
    this.data.episodes = episodes;

    // Dizi metadata'sını otomatik genişlet (epMap, seasons, totalEpisodes)
    const isAnime = (this.data.anime || []).some(x => x[0].toLowerCase().trim() === normTitle);
    const targetList = isAnime ? this.data.anime : this.data.series;
    const showItem = (targetList || []).find(x => x[0].toLowerCase().trim() === normTitle);
    if (showItem) {
      if (!showItem[6] || typeof showItem[6] !== 'object') {
        showItem[6] = {};
      }
      const meta = showItem[6];
      if (!meta.epMap) meta.epMap = {};
      const curEpMapCount = parseInt(meta.epMap[s] || meta.epMap[String(s)] || 0);
      if (b > curEpMapCount) {
        meta.epMap[s] = b;
        meta.epMap[String(s)] = b;
      }
      const curSeasons = parseInt(meta.seasons || 1);
      if (s > curSeasons) {
        meta.seasons = s;
      }
      let totalEps = 0;
      for (const k in meta.epMap) {
        totalEps += (parseInt(meta.epMap[k]) || 0);
      }
      if (totalEps > (meta.totalEpisodes || 0)) {
        meta.totalEpisodes = totalEps;
      }
    }

    this.saveLocal();

    if (this.mode === 'backend') {
      try {
        const res = await fetch('/api/episodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episode, index: matchIdx !== -1 ? matchIdx : null })
        });
        if (res.ok) {
          await this.init();
          this.syncToCloud({ restoredEpisodeKey: epKey, exactEpisodes: true }).catch(() => {});
          return true;
        }
      } catch (err) {}
    }

    await this.syncToCloud({ restoredEpisodeKey: epKey, exactEpisodes: true });
    return true;
  },

  async saveEpisodesOrder(newEpisodes) {
    if (!Array.isArray(newEpisodes)) return false;
    this.data.episodes = newEpisodes;
    this.saveLocal();
    if (this.mode === 'backend') {
      try {
        await fetch('/api/episodes/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episodes: newEpisodes })
        });
      } catch (err) {}
    }
    await this.syncToCloud({ exactEpisodes: true });
    return true;
  },

  async deleteEpisode(index) {
    let deletedEpKey = null;
    if (index >= 0 && index < this.data.episodes.length) {
      const ep = this.data.episodes[index];
      const epTitle = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
      const b = (ep?.b !== undefined && ep?.b !== null && ep?.b !== '') ? ep.b : ((ep?.e !== undefined && ep?.e !== null && ep?.e !== '') ? ep.e : 1);
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

  async deleteEpisodeByNum(title, season, episodeNum) {
    const sNorm = (title || '').toLowerCase().trim();
    const sInt = parseInt(season) || 1;
    const bInt = (episodeNum !== undefined && episodeNum !== null && !isNaN(parseInt(episodeNum))) ? parseInt(episodeNum) : 1;
    const idx = (this.data.episodes || []).findIndex(e => {
      const t = Array.isArray(e.t) ? e.t[0] : (typeof e.t === 'object' ? e.t[0] : e.t);
      const epB = (e.b !== undefined && e.b !== null && e.b !== '') ? parseInt(e.b) : parseInt(e.e);
      return (t || '').toLowerCase().trim() === sNorm && parseInt(e.s) === sInt && epB === bInt;
    });
    if (idx !== -1) {
      return await this.deleteEpisode(idx);
    }
    return false;
  },

  async updateSeasonEpCount(title, season, count) {
    const sNorm = (title || '').toLowerCase().trim();
    const isAnime = (this.data.anime || []).some(x => x[0].toLowerCase().trim() === sNorm);
    const list = isAnime ? this.data.anime : this.data.series;
    const item = list.find(x => x[0].toLowerCase().trim() === sNorm);
    if (!item) return false;

    if (!item[6] || typeof item[6] !== 'object') {
      item[6] = {};
    }
    const meta = item[6];
    if (!meta.epMap) meta.epMap = {};
    const cNum = Math.max(0, parseInt(count) || 0);
    meta.epMap[season] = cNum;
    meta.epMap[String(season)] = cNum;

    let total = 0;
    for (const s in meta.epMap) {
      total += (parseInt(meta.epMap[s]) || 0);
    }
    meta.totalEpisodes = total;

    return await this.saveSeries(item, isAnime, item[0]);
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

  async addThread(title, category = "Genel", author = "sen", content = "") {
    if (!this.data.threads) this.data.threads = [];
    const id = 'th_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const createdAt = new Date().toISOString();
    const newThread = [title, category, author, 0, id, createdAt, content];
    this.data.threads.unshift(newThread);
    this.saveLocal();

    if (this.mode === 'backend') {
      try {
        await fetch('/api/forum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, category, author, content, id, createdAt })
        });
      } catch (err) {}
    }

    await this.syncToCloud();
    return newThread;
  },

  getThreadComments(threadId) {
    if (!threadId) return [];
    const cleanId = String(threadId).trim().toLowerCase();
    const key = `forum_${cleanId}`;
    const all = this.data.comments || {};
    return all[key] || [];
  },

  async addThreadComment(threadId, commentData) {
    if (!threadId) return null;
    const cleanId = String(threadId).trim().toLowerCase();
    const key = `forum_${cleanId}`;

    if (this.mode === 'backend') {
      try {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadId: cleanId,
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
            this.incrementThreadReplyCount(threadId);
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
    this.incrementThreadReplyCount(threadId);
    this.saveLocal();
    this.syncToCloud().catch(() => {});
    return newComment;
  },

  async addThreadReply(threadId, parentCommentId, replyData) {
    if (!threadId || !parentCommentId) return null;
    const cleanId = String(threadId).trim().toLowerCase();
    const key = `forum_${cleanId}`;

    if (this.mode === 'backend') {
      try {
        const res = await fetch('/api/comments/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadId: cleanId,
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
                this.incrementThreadReplyCount(threadId);
                this.saveLocal();
                this.syncToCloud().catch(() => {});
                return json.reply;
              }
            }
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
    this.incrementThreadReplyCount(threadId);
    this.saveLocal();
    this.syncToCloud().catch(() => {});
    return newReply;
  },

  incrementThreadReplyCount(threadId) {
    if (!this.data.threads) return;
    const cleanId = String(threadId).trim().toLowerCase();
    const target = this.data.threads.find(t => {
      const tid = (t[4] || (t[0] || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).toLowerCase();
      return tid === cleanId || (t[0] || '').toLowerCase().trim() === cleanId;
    });
    if (target) {
      target[3] = (Number(target[3]) || 0) + 1;
    }
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
            try {
              if (typeof window !== 'undefined' && typeof window.dispatchCommentNotification === 'function') {
                window.dispatchCommentNotification({
                  type: 'comment',
                  showTitle: showTitle,
                  season: season,
                  episode: episode,
                  author: json.comment.author || commentData.author,
                  text: json.comment.text || commentData.text,
                  comment: json.comment
                });
              }
            } catch (e) {}
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
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchCommentNotification === 'function') {
        window.dispatchCommentNotification({
          type: 'comment',
          showTitle: showTitle,
          season: season,
          episode: episode,
          author: newComment.author,
          text: newComment.text,
          comment: newComment
        });
      }
    } catch (e) {}
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
            let pAuthor = '';
            if (this.data.comments && this.data.comments[key]) {
              const p = this.data.comments[key].find(c => c.id === parentCommentId);
              if (p) {
                pAuthor = p.author || '';
                if (!p.replies) p.replies = [];
                p.replies.push(json.reply);
              }
            }
            this.saveLocal();
            this.syncToCloud().catch(() => {});
            try {
              if (typeof window !== 'undefined' && typeof window.dispatchCommentNotification === 'function') {
                window.dispatchCommentNotification({
                  type: 'reply',
                  showTitle: showTitle,
                  season: season,
                  episode: episode,
                  parentId: parentCommentId,
                  parentAuthor: pAuthor,
                  author: json.reply.author || replyData.author,
                  text: json.reply.text || replyData.text,
                  comment: json.reply
                });
              }
            } catch (e) {}
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
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchCommentNotification === 'function') {
        window.dispatchCommentNotification({
          type: 'reply',
          showTitle: showTitle,
          season: season,
          episode: episode,
          parentId: parentCommentId,
          parentAuthor: parent.author || '',
          author: newReply.author,
          text: newReply.text,
          comment: newReply
        });
      }
    } catch (e) {}
    return newReply;
  },

  async deleteComment(showTitle, season, episode, commentId, replyId = null) {
    if (!showTitle || !commentId) return false;
    const key = `${showTitle.trim().toLowerCase()}_s${season}_e${episode}`;
    if (!this.data.comments || !this.data.comments[key]) return false;

    if (replyId) {
      const parent = this.data.comments[key].find(c => c && c.id === commentId);
      if (parent && parent.replies) {
        parent.replies = parent.replies.filter(r => r && r.id !== replyId);
      }
    } else {
      this.data.comments[key] = this.data.comments[key].filter(c => c && c.id !== commentId);
    }

    this.saveLocal();
    await this.syncToCloud().catch(() => {});
    return true;
  }
};

window.API = API;
