// bolumdizi - Unified API & Data Layer (Backend REST + LocalStorage & Supabase fallback)

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

const API = {
  mode: 'local', // 'backend' or 'local'
  data: {
    series: [],
    anime: [],
    episodes: [],
    threads: [],
    summaries: {},
    backdrops: {},
    schedule: []
  },

  async init() {
    // 1. Check if backend is available
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
            return this.data;
          }
        }
      }
    } catch (err) {
      // Backend not running, use local mode (GitHub Pages compatible)
    }

    this.mode = 'local';
    console.log('📦 Local / Static Mode active (LocalStorage & Supabase)');
    return this.loadLocal();
  },

  loadLocal() {
    let local = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) local = JSON.parse(raw);
    } catch (e) {}

    // Fallback seed from data/database.json or built-in defaults
    if (!local || !local.T) {
      this.data.series = window.DEFAULT_SERIES || [];
      this.data.anime = window.DEFAULT_ANIME || [];
      this.data.threads = window.DEFAULT_THREADS || [];
      this.data.episodes = window.DEFAULT_EPISODES || [];
      this.data.summaries = window.DEFAULT_SUMMARIES || {};
      this.data.backdrops = window.DEFAULT_BACKDROPS || {};
      this.data.schedule = window.DEFAULT_SCHEDULE || [];
    } else {
      this.data.series = local.T || [];
      this.data.anime = local.AN || [];
      this.data.threads = local.TH || [];
      this.data.episodes = local.EPS || [];
      this.data.summaries = window.DEFAULT_SUMMARIES || {};
      this.data.backdrops = window.DEFAULT_BACKDROPS || {};
      this.data.schedule = window.DEFAULT_SCHEDULE || [];
    }
    return this.data;
  },

  saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        T: this.data.series,
        AN: this.data.anime,
        TH: this.data.threads,
        EPS: this.data.episodes
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
          // Update in-memory
          await this.init();
          return rJson;
        }
      } catch (err) {
        console.warn('Backend save failed, using local:', err);
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
    return { success: true, item };
  },

  async deleteSeries(title) {
    if (this.mode === 'backend') {
      try {
        const res = await fetch(`/api/series/${encodeURIComponent(title)}`, { method: 'DELETE' });
        if (res.ok) {
          await this.init();
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
    return true;
  },

  async deleteEpisode(index) {
    if (this.mode === 'backend') {
      try {
        const res = await fetch(`/api/episodes/${index}`, { method: 'DELETE' });
        if (res.ok) {
          await this.init();
          return true;
        }
      } catch (err) {}
    }

    if (index >= 0 && index < this.data.episodes.length) {
      this.data.episodes.splice(index, 1);
      this.saveLocal();
    }
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
          return true;
        }
      } catch (err) {}
    }

    this.data.threads.unshift([title, category, author, 0]);
    this.saveLocal();
    return true;
  }
};
