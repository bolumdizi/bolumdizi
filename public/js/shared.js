// bolumdizi - Shared Client Utility, Authentication, Watchlist, Header & UI Functions

const el = id => document.getElementById(id);

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

const TURKISH_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const TURKISH_DAYS_LONG = ["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];
const TURKISH_DAYS_SHORT = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

function getCurrentWeekInfo() {
  const now = new Date();
  const currentDayOfWeek = (now.getDay() + 6) % 7; // 0: Pazartesi ... 6: Pazar
  const monday = new Date(now);
  monday.setDate(now.getDate() - currentDayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      idx: i,
      name: TURKISH_DAYS_LONG[i],
      shortName: TURKISH_DAYS_SHORT[i],
      dateNum: d.getDate(),
      monthName: TURKISH_MONTHS[d.getMonth()],
      year: d.getFullYear(),
      isToday: (i === currentDayOfWeek),
      fullDateStr: `${d.getDate()} ${TURKISH_MONTHS[d.getMonth()]}`
    });
  }

  return {
    todayIdx: currentDayOfWeek,
    today: days[currentDayOfWeek],
    days: days
  };
}

function getD(i) {
  if (typeof PALETTES === 'undefined' || !PALETTES.length) return ["#0b3d1e,#7bb83a", ''];
  return PALETTES[Math.abs(i) % PALETTES.length];
}

function getEpTitle(ep) {
  if (!ep) return "";
  const t = (ep.t !== undefined) ? ep.t : ep;
  if (!t) return "";
  if (Array.isArray(t)) return t[0] || "";
  if (typeof t === "object") return t[0] || t.title || t.name || "";
  if (typeof t === "string") return t;
  return String(t);
}

function getCover(title) {
  if (!title) return "";
  const tNorm = title.trim().toLowerCase();
  const all = (typeof API !== 'undefined') ? API.getAllSeries() : [];
  const found = all.find(x => x[0].toLowerCase() === tNorm);
  if (found && found[4]) return found[4];
  return "";
}

function getBackdrop(title) {
  if (!title) return "";
  const tNorm = title.trim().toLowerCase();
  if (typeof API !== 'undefined' && API.data && API.data.backdrops) {
    const match = Object.keys(API.data.backdrops).find(k => k.toLowerCase() === tNorm);
    if (match && API.data.backdrops[match]) return API.data.backdrops[match];
  }
  const all = (typeof API !== 'undefined') ? API.getAllSeries() : [];
  const found = all.find(x => x[0].toLowerCase() === tNorm);
  if (found && found[5] && typeof found[5] === 'string' && found[5].startsWith('http')) return found[5];
  if (found && found[6] && typeof found[6] === 'object' && found[6].imdbId) {
    return `https://images.metahub.space/background/medium/${found[6].imdbId}/img`;
  }
  if (typeof DEFAULT_IMDB_IDS !== 'undefined' && DEFAULT_IMDB_IDS[title]) {
    return `https://images.metahub.space/background/medium/${DEFAULT_IMDB_IDS[title]}/img`;
  }
  return getCover(title);
}

function getSummary(item) {
  if (!item) return "";
  const name = item[0];
  if (typeof API !== 'undefined' && API.data && API.data.summaries && API.data.summaries[name]) {
    return API.data.summaries[name];
  }
  if (item[5] && typeof item[5] === "string" && !item[5].startsWith("http://") && !item[5].startsWith("https://") && !item[5].startsWith("data:")) {
    return item[5];
  }
  return `${name}, sürükleyici hikayesi ve yüksek IMDb puanıyla öne çıkan popüler bir ${item[1] || 'dizi'} yapımıdır. Tüm bölümleri Full HD Türkçe Dublaj ve Altyazılı olarak izleyebilirsiniz.`;
}

function formatEmbedHtml(embedVal) {
  if (!embedVal || !String(embedVal).trim()) return null;
  let code = String(embedVal).trim();
  if (code.includes("<iframe") || code.includes("<video")) {
    return code.replace(/width=["'][^"']*["']/gi, 'width="100%"')
               .replace(/height=["'][^"']*["']/gi, 'height="100%"')
               .replace(/style=["']([^"']*)["']/gi, 'style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;$1"');
  }

  let url = code.replace(/^[<"']+|[>"']+$/g, "").trim();
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
  }
  const gdMatch = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/i);
  if (gdMatch && gdMatch[1]) {
    return `<iframe src="https://drive.google.com/file/d/${gdMatch[1]}/preview" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
  }
  if (url.startsWith("//")) url = "https:" + url;
  else if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  return `<iframe src="${escapeHtml(url)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
}

function card(t, i, b) {
  const d = getD(i);
  const cover = t[4] || getCover(t[0]);
  const posterInner = cover
    ? `<div class="poster" style="background-image:url('${cover}');background-size:cover;background-position:center"></div>`
    : `<div class="poster" style="background:linear-gradient(160deg,${d[0]})"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${d[1]}</svg></div>`;
  return `<a class="p" href="dizi.html?s=${encodeURIComponent(t[0])}"><span class="badge">${b}</span><span class="rt">★ ${t[2]}</span>${posterInner}<div class="cap"><b>${t[0]}</b><span>${t[1]} · ${t[3]}</span></div></a>`;
}

function toast(msg) {
  let t = el("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "adm-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.style.display = "none", 3200);
}
window.showToast = toast;

// Global listener for watchlist toggle buttons
document.addEventListener("click", e => {
  const btn = e.target.closest(".btn-watchlist-toggle");
  if (btn) {
    const show = btn.getAttribute("data-watchlist-show");
    if (show) toggleWatchlist(show);
  }
});

// User Authentication & Roles
const ADMIN_IDENTIFIERS = ["bolumdizi", "bolumdizi2@gmail.com"];

function isAdminUser(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  const u = (user.username || "").toLowerCase();
  const e = (user.email || "").toLowerCase();
  return ADMIN_IDENTIFIERS.includes(u) || ADMIN_IDENTIFIERS.includes(e);
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function setCurrentUser(user) {
  if (user) {
    const isAdmin = isAdminUser(user);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      id: user.id || null,
      username: user.username,
      email: user.email || "",
      role: isAdmin ? "admin" : "member",
      watchlist: Array.isArray(user.watchlist) ? user.watchlist : []
    }));
    if (isAdmin) sessionStorage.setItem("bd_admin_auth", "1");
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem("bd_admin_auth");
  }
  updateAuthUI();
}

function isAdmAuth() {
  const user = getCurrentUser();
  if (user && isAdminUser(user)) return true;
  return sessionStorage.getItem("bd_admin_auth") === "1";
}

function updateAuthUI() {
  const user = getCurrentUser();
  const authBtn = el("userAuthBtn");
  const menuWrap = el("userMenuWrap");
  const navProf = el("nav_profil");
  const udName = el("ud_name");
  const udEmail = el("ud_email");
  const menuName = el("userMenuName");
  const admLink = el("dropdownAdminLink");

  if (user) {
    const isAdmin = isAdminUser(user);
    if (authBtn) authBtn.style.display = "none";
    if (menuWrap) menuWrap.style.display = "block";
    if (navProf) navProf.style.display = "inline-block";
    if (udName) udName.innerHTML = `${escapeHtml(user.username)} ${isAdmin ? '<span style="font-size:10px;background:linear-gradient(135deg,#ff3b47,#a30610);color:#fff;padding:2px 7px;border-radius:10px;font-weight:700">YÖNETİCİ</span>' : '<span style="font-size:10px;background:var(--input-bg);color:var(--mut);border:1px solid var(--line);padding:2px 7px;border-radius:10px">ÜYE</span>'}`;
    if (udEmail) udEmail.textContent = user.email || (isAdmin ? "Sistem Yöneticisi" : "Aktif Üye");
    if (menuName) menuName.textContent = user.username + (isAdmin ? " 👑" : "");
    if (admLink) admLink.style.display = isAdmin ? "flex" : "none";
  } else {
    if (authBtn) authBtn.style.display = "flex";
    if (menuWrap) menuWrap.style.display = "none";
    if (navProf) navProf.style.display = "none";
    if (admLink) admLink.style.display = "none";
  }
  updateSupabaseStatusUI();
}

function updateSupabaseStatusUI() {
  const isConn = Boolean(sbClient);
  const dot = el("authSbDot");
  const txt = el("authSbText");
  const toggleBtn = el("toggleAuthSbConfig");

  if (dot) dot.style.background = isConn ? "#4ade80" : "#ffb400";
  if (txt) txt.innerHTML = isConn ? `<span style="color:#4ade80;font-weight:600">● Supabase Bağlı</span>` : `<span style="color:#ffb400">○ Supabase Bağlı Değil</span>`;
  if (toggleBtn) toggleBtn.textContent = isConn ? "⚙️ Ayarlar" : "⚡ Supabase'e Bağla";
}

function openAuthModal(tab = "login") {
  const m = el("authModal");
  if (!m) return;
  if (!sbClient) initSupabase();
  updateSupabaseStatusUI();
  m.style.display = "flex";
  switchAuthTab(tab);
}

function closeAuthModal() {
  const m = el("authModal");
  if (m) m.style.display = "none";
}

function switchAuthTab(tab) {
  const tabLogin = el("authTabLogin");
  const tabReg = el("authTabRegister");
  const formLogin = el("loginForm");
  const formReg = el("registerForm");
  if (!tabLogin || !tabReg || !formLogin || !formReg) return;

  if (tab === "login") {
    tabLogin.classList.add("on");
    tabReg.classList.remove("on");
    formLogin.style.display = "block";
    formReg.style.display = "none";
    setTimeout(() => { const inp = el("l_user"); if (inp) inp.focus(); }, 80);
  } else {
    tabLogin.classList.remove("on");
    tabReg.classList.add("on");
    formLogin.style.display = "none";
    formReg.style.display = "block";
    setTimeout(() => { const inp = el("r_user"); if (inp) inp.focus(); }, 80);
  }
}

// Watchlist
async function toggleWatchlist(title) {
  const user = getCurrentUser();
  if (!user) {
    openAuthModal("login");
    toast("Listeye eklemek için lütfen giriş yapın.");
    return false;
  }

  if (!user.watchlist) user.watchlist = [];
  const idx = user.watchlist.findIndex(t => t.toLowerCase() === title.toLowerCase());
  let added = false;
  if (idx > -1) {
    user.watchlist.splice(idx, 1);
    toast(`"${title}" listenizden çıkarıldı.`);
    added = false;
  } else {
    user.watchlist.unshift(title);
    toast(`"${title}" listenize eklendi! ⭐`);
    added = true;
  }

  setCurrentUser(user);

  if (sbClient) {
    try {
      if (user.id) await sbClient.from("users").update({ watchlist: user.watchlist }).eq("id", user.id);
      else await sbClient.from("users").update({ watchlist: user.watchlist }).ilike("username", user.username);
    } catch (err) {}
  }

  document.querySelectorAll(`[data-watchlist-show="${title}"]`).forEach(btn => {
    btn.textContent = added ? "✓ Listemde" : "+ Listeme Ekle";
    btn.style.color = added ? "#4ade80" : "#fff";
    btn.style.borderColor = added ? "rgba(74,222,128,.4)" : "transparent";
  });

  return added;
}

function isInWatchlist(title) {
  const user = getCurrentUser();
  if (!user || !user.watchlist) return false;
  return user.watchlist.some(t => t.toLowerCase() === (title || "").toLowerCase());
}

// Watched Episodes Tracking
const WATCHED_STORAGE_KEY = "bolumdizi_watched_v3";

function getWatchedData() {
  const user = getCurrentUser();
  if (!user) return {};
  try {
    const raw = localStorage.getItem(`${WATCHED_STORAGE_KEY}_${user.username.toLowerCase()}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

function saveWatchedData(data) {
  const user = getCurrentUser();
  if (!user) return;
  try {
    localStorage.setItem(`${WATCHED_STORAGE_KEY}_${user.username.toLowerCase()}`, JSON.stringify(data));
  } catch (e) {}
}

function isEpisodeWatched(showTitle, season, episode) {
  const data = getWatchedData();
  const key = (showTitle || "").toLowerCase();
  const list = (data[key] && data[key].episodes) || [];
  return list.includes(`S${season}E${episode}`);
}

function toggleEpisodeWatched(showTitle, season, episode) {
  const user = getCurrentUser();
  if (!user) {
    openAuthModal("login");
    toast("Bölüm takibi yapmak için lütfen giriş yapın.");
    return false;
  }
  const data = getWatchedData();
  const key = (showTitle || "").toLowerCase();
  if (!data[key]) data[key] = { episodes: [], activeSeason: season };
  const epKey = `S${season}E${episode}`;
  const list = data[key].episodes || [];
  const idx = list.indexOf(epKey);
  let watched = false;
  if (idx > -1) {
    list.splice(idx, 1);
    watched = false;
  } else {
    list.push(epKey);
    watched = true;
  }
  data[key].episodes = list;
  saveWatchedData(data);
  return watched;
}

window.toggleEpisodeWatched = toggleEpisodeWatched;
window.toggleWatched = toggleEpisodeWatched;
window.showToast = toast;

function markAllSeasonWatched(showTitle, season, totalEpisodes = 8, markWatched = true) {
  const user = getCurrentUser();
  if (!user) {
    openAuthModal("login");
    return;
  }
  const data = getWatchedData();
  const key = (showTitle || "").toLowerCase();
  if (!data[key]) data[key] = { episodes: [], activeSeason: season };
  let list = data[key].episodes || [];
  for (let b = 1; b <= totalEpisodes; b++) {
    const epKey = `S${season}E${b}`;
    const idx = list.indexOf(epKey);
    if (markWatched && idx === -1) list.push(epKey);
    else if (!markWatched && idx > -1) list.splice(idx, 1);
  }
  data[key].episodes = list;
  saveWatchedData(data);
}

function markEntireShowWatched(showTitle, markWatched = true) {
  const user = getCurrentUser();
  if (!user) {
    openAuthModal("login");
    return;
  }
  const all = (typeof API !== 'undefined') ? API.getAllSeries() : [];
  const showObj = all.find(x => x[0].toLowerCase() === (showTitle || "").toLowerCase());
  const meta = showObj && showObj[6] && typeof showObj[6] === 'object' ? showObj[6] : null;
  const maxSeasons = (meta && meta.seasons) ? meta.seasons : 1;
  const data = getWatchedData();
  const key = (showTitle || "").toLowerCase();
  if (!data[key]) data[key] = { episodes: [], activeSeason: 1 };
  let list = data[key].episodes || [];

  for (let s = 1; s <= maxSeasons; s++) {
    const maxEps = (meta && meta.epMap && meta.epMap[s]) ? meta.epMap[s] : 8;
    for (let b = 1; b <= maxEps; b++) {
      const epKey = `S${s}E${b}`;
      const idx = list.indexOf(epKey);
      if (markWatched && idx === -1) list.push(epKey);
      else if (!markWatched && idx > -1) list.splice(idx, 1);
    }
  }
  data[key].episodes = list;
  saveWatchedData(data);
}

function resetEntireShowWatched(showTitle) {
  const data = getWatchedData();
  const key = (showTitle || "").toLowerCase();
  if (data[key]) {
    data[key].episodes = [];
    saveWatchedData(data);
  }
  try {
    const raw = localStorage.getItem("bd_watched_eps");
    if (raw) {
      const obj = JSON.parse(raw);
      delete obj[showTitle];
      localStorage.setItem("bd_watched_eps", JSON.stringify(obj));
    }
  } catch (e) {}
}

async function removeShowFromProfile(showTitle) {
  const user = getCurrentUser();
  if (!user) return;
  const targetTitle = (showTitle || "").toLowerCase();

  // 1. Remove from watchlist
  if (user.watchlist && Array.isArray(user.watchlist)) {
    user.watchlist = user.watchlist.filter(t => (t || "").toLowerCase() !== targetTitle);
    setCurrentUser(user);
    if (sbClient) {
      try {
        if (user.id) await sbClient.from("users").update({ watchlist: user.watchlist }).eq("id", user.id);
        else await sbClient.from("users").update({ watchlist: user.watchlist }).ilike("username", user.username);
      } catch (err) {}
    }
  }

  // 2. Completely remove watched episode data for this show
  const data = getWatchedData();
  if (data[targetTitle]) {
    delete data[targetTitle];
    saveWatchedData(data);
  }

  // 3. Clear legacy watched eps if any
  try {
    const raw = localStorage.getItem("bd_watched_eps");
    if (raw) {
      const obj = JSON.parse(raw);
      delete obj[showTitle];
      localStorage.setItem("bd_watched_eps", JSON.stringify(obj));
    }
  } catch (e) {}
}

window.resetEntireShowWatched = resetEntireShowWatched;
window.removeShowFromProfile = removeShowFromProfile;

function getShowStatus(item) {
  if (!item) return "Final Yaptı";
  const meta = item[6] && typeof item[6] === 'object' ? item[6] : null;
  if (meta && meta.status && typeof meta.status === 'string') {
    const s = meta.status.trim();
    if (s.toLowerCase() === "tamamlandı" || s.toLowerCase() === "ended") return "Final Yaptı";
    if (s.toLowerCase() === "running") return "Devam Ediyor";
    if (s.toLowerCase() === "canceled" || s.toLowerCase() === "cancelled") return "İptal Edildi";
    return s;
  }
  const title = (item[0] || "").toLowerCase().trim();
  const SEZON_FINALI = [
    "stranger things", "the last of us", "severance", "the bear", "black mirror", 
    "squid game", "demon slayer", "jujutsu kaisen"
  ];
  const DEVAM_EDENLER = [
    "one piece"
  ];
  const IPTAL_EDILENLER = [
    "1899", "westworld", "mindhunter", "shadow and bone", "the oa"
  ];
  if (SEZON_FINALI.includes(title)) return "Sezon Finali";
  if (DEVAM_EDENLER.includes(title)) return "Devam Ediyor";
  if (IPTAL_EDILENLER.includes(title)) return "İptal Edildi";
  return "Final Yaptı";
}

function getShowStatusBadgeHtml(status) {
  let bg = "rgba(59,130,246,0.18)";
  let color = "#60a5fa";
  let border = "rgba(59,130,246,0.35)";
  let icon = "🏁";

  if (status === "Sezon Finali") {
    bg = "rgba(245,158,11,0.18)";
    color = "#fbbf24";
    border = "rgba(245,158,11,0.35)";
    icon = "⏳";
  } else if (status === "Devam Ediyor") {
    bg = "rgba(34,197,94,0.18)";
    color = "#4ade80";
    border = "rgba(34,197,94,0.35)";
    icon = "🟢";
  } else if (status === "İptal Edildi") {
    bg = "rgba(239,68,68,0.18)";
    color = "#f87171";
    border = "rgba(239,68,68,0.35)";
    icon = "⛔";
  }
  return `<span class="badge" style="position:static;background:${bg};color:${color};border:1px solid ${border};font-weight:700;font-size:12px;display:inline-flex;align-items:center;gap:4px">${icon} ${escapeHtml(status)}</span>`;
}

// Live Search Dropdown
function renderSearchLive() {
  const qEl = el("q");
  const dd = el("searchDropdown");
  const clrBtn = el("searchClrBtn");
  if (!qEl || !dd) return;
  const rawVal = qEl.value;
  const qv = rawVal.trim().toLowerCase();

  if (clrBtn) clrBtn.style.display = rawVal ? "flex" : "none";

  if (!qv) {
    dd.style.display = "none";
    return;
  }

  const all = (typeof API !== 'undefined') ? API.getAllSeries() : [];
  const matches = all.filter(t => t[0].toLowerCase().includes(qv) || (t[1] && t[1].toLowerCase().includes(qv)));

  if (matches.length === 0) {
    dd.innerHTML = `<div class="sres-empty">"${escapeHtml(rawVal)}" ile eşleşen dizi veya anime bulunamadı.</div>`;
  } else {
    const topMatches = matches.slice(0, 6);
    dd.innerHTML = `
      <div class="sres-list">
        ${topMatches.map((t, idx) => {
          const cover = t[4] || getCover(t[0]);
          const d = getD(all.indexOf(t));
          const thumbHtml = cover 
            ? `<img class="sres-thumb" src="${cover}" alt="${t[0]}" loading="lazy">` 
            : `<div class="sres-thumb" style="background:linear-gradient(160deg,${d[0]});display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700">${t[0].slice(0,2)}</div>`;
          return `
            <a class="sres-item" href="dizi.html?s=${encodeURIComponent(t[0])}">
              ${thumbHtml}
              <div class="sres-info">
                <div class="sres-title">${escapeHtml(t[0])}</div>
                <div class="sres-meta">
                  <span class="sres-imdb">★ ${t[2]}</span>
                  <span>${t[1]}</span>
                  <span>·</span>
                  <span>${t[3]}</span>
                </div>
              </div>
            </a>
          `;
        }).join("")}
      </div>
      <a class="sres-footer" href="diziler.html?q=${encodeURIComponent(qv)}">Tüm sonuçları gör (${matches.length} dizi & anime) →</a>
    `;
  }
  dd.style.display = "block";
}

function doSearch() {
  const qEl = el("q");
  if (!qEl) return;
  const qv = qEl.value.trim();
  if (qv) {
    window.location.href = `diziler.html?q=${encodeURIComponent(qv)}`;
  }
}

// IMDb API Data Fetcher (TVMaze + Cinemeta Fallback)
function mapGenreToTr(genres) {
  if (!genres || !genres.length) return "Dram";
  const trDict = {
    "action": "Aksiyon", "adventure": "Macera", "animation": "Anime", "anime": "Anime",
    "comedy": "Komedi", "crime": "Suç", "documentary": "Belgesel", "drama": "Dram",
    "family": "Aile", "fantasy": "Fantastik", "history": "Tarih", "horror": "Korku",
    "music": "Müzik", "mystery": "Gizem", "romance": "Romantik", "sci-fi": "Bilim Kurgu",
    "science-fiction": "Bilim Kurgu", "thriller": "Gerilim", "war": "Savaş", "western": "Vahşi Batı"
  };
  const trList = genres.map(g => trDict[String(g).toLowerCase().trim()] || g);
  const allowed = ["Aksiyon","Suç","Dram","Bilim Kurgu","Gerilim","Komedi","Fantastik","Gizem","Romantik","Korku","Macera","Belgesel"];
  const matched = trList.find(g => allowed.includes(g));
  return matched || trList[0] || "Dram";
}

async function fetchImdbSeriesData(inputStr) {
  if (!inputStr || !inputStr.trim()) throw new Error("Lütfen bir IMDb ID veya linki girin.");
  const m = inputStr.match(/tt\d{6,10}/i);
  if (!m) throw new Error("Geçerli bir IMDb numarası (örn: tt1196946) bulunamadı.");
  const imdbId = m[0].toLowerCase();

  let result = null;
  try {
    const res = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`);
    if (res.ok) {
      const show = await res.json();
      if (show && show.id) {
        let epMap = {};
        let totalEps = 0;
        let maxSeason = 1;
        try {
          const epRes = await fetch(`https://api.tvmaze.com/shows/${show.id}/episodes`);
          if (epRes.ok) {
            const eps = await epRes.json();
            if (Array.isArray(eps)) {
              totalEps = eps.length;
              eps.forEach(e => {
                const s = parseInt(e.season) || 1;
                epMap[s] = (epMap[s] || 0) + 1;
                if (s > maxSeason) maxSeason = s;
              });
            }
          }
        } catch (e) {}

        const isAnime = Boolean((show.genres && show.genres.some(g => g.toLowerCase() === "anime")) || (show.type === "Animation" && show.network && show.network.country && show.network.country.code === "JP"));
        const cleanSummary = show.summary ? show.summary.replace(/<[^>]*>/g, '').trim() : '';
        const genreTr = mapGenreToTr(show.genres);
        const year = show.premiered ? parseInt(show.premiered.slice(0, 4)) : 2024;

        result = {
          source: "TVMaze",
          imdbId,
          title: show.name,
          rating: show.rating && show.rating.average ? parseFloat(show.rating.average) : 8.0,
          year,
          genreTr,
          poster: (show.image && (show.image.original || show.image.medium)) || '',
          summary: cleanSummary || `${show.name}, yüksek puanlı sürükleyici bir ${genreTr} yapımıdır.`,
          isAnime,
          seasons: maxSeason,
          totalEpisodes: totalEps,
          epMap
        };
      }
    }
  } catch (err) {}

  if (!result) throw new Error(`"${imdbId}" için bilgi bulunamadı.`);
  return result;
}

// Global Event Listeners (Theme, Search, Modals, Clicks)
document.addEventListener("DOMContentLoaded", () => {
  // 1. Highlight active navigation link based on current page
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll(".nav nav a").forEach(a => {
    const href = a.getAttribute("href") || "";
    const hrefFile = href.split('/').pop().split('?')[0];
    if (hrefFile === currentPath || (currentPath === '' && hrefFile === 'index.html')) {
      a.classList.add("on");
    } else {
      a.classList.remove("on");
    }
  });

  // 2. Categories Drawer
  const mb = el("ddb"), mn = el("menu");
  if (mb && mn) {
    mb.onclick = e => {
      e.stopPropagation();
      mn.classList.toggle("open");
      mb.setAttribute("aria-expanded", mn.classList.contains("open"));
    };
    document.addEventListener("click", e => {
      if (!mn.contains(e.target)) mn.classList.remove("open");
    });
  }

  // 3. Search inputs
  const qEl = el("q");
  if (qEl) {
    qEl.addEventListener("input", renderSearchLive);
    qEl.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch();
      }
    });
  }
  const sBtn = el("searchBtn");
  if (sBtn) sBtn.onclick = doSearch;
  const clrBtn = el("searchClrBtn");
  if (clrBtn) clrBtn.onclick = () => {
    if (qEl) { qEl.value = ""; renderSearchLive(); qEl.focus(); }
  };

  // 4. Theme Button
  const themeBtn = el("themeBtn");
  if (themeBtn) {
    themeBtn.onclick = () => {
      const cur = document.documentElement.getAttribute("data-theme") || "dark";
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("bd_theme", next);
      themeBtn.textContent = next === "dark" ? "🌙" : "☀️";
      toast(next === "dark" ? "Karanlık tema aktif" : "Aydınlık tema aktif");
    };
    const savedTheme = localStorage.getItem("bd_theme") || "dark";
    themeBtn.textContent = savedTheme === "dark" ? "🌙" : "☀️";
  }

  // 5. Auth Modal Buttons
  const authBtn = el("userAuthBtn");
  if (authBtn) authBtn.onclick = () => openAuthModal("login");

  const modalClose = el("authModalClose");
  if (modalClose) modalClose.onclick = closeAuthModal;

  const authBackdrop = el("authModal");
  if (authBackdrop) {
    authBackdrop.onclick = e => { if (e.target === authBackdrop) closeAuthModal(); };
  }

  const tabLog = el("authTabLogin"), tabReg = el("authTabRegister");
  if (tabLog) tabLog.onclick = () => switchAuthTab("login");
  if (tabReg) tabReg.onclick = () => switchAuthTab("register");
  const linkReg = el("linkGoRegister"), linkLog = el("linkGoLogin");
  if (linkReg) linkReg.onclick = () => switchAuthTab("register");
  if (linkLog) linkLog.onclick = () => switchAuthTab("login");

  // 6. User Dropdown Menu
  const userMenuBtn = el("userMenuBtn");
  const userDropdown = el("userDropdown");
  if (userMenuBtn && userDropdown) {
    userMenuBtn.onclick = e => {
      e.stopPropagation();
      userDropdown.style.display = userDropdown.style.display === "block" ? "none" : "block";
    };
    document.addEventListener("click", e => {
      if (!userDropdown.contains(e.target)) userDropdown.style.display = "none";
    });
  }

  const logoutBtn = el("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      setCurrentUser(null);
      toast("Başarıyla çıkış yapıldı.");
      setTimeout(() => window.location.reload(), 400);
    };
  }

  // 7. Login Form Submission
  const loginForm = el("loginForm");
  if (loginForm) {
    loginForm.onsubmit = async e => {
      e.preventDefault();
      const u = (el("l_user")?.value || "").trim().toLowerCase();
      const p = (el("l_pass")?.value || "").trim();
      if (!u || !p) return;

      if (sbClient) {
        try {
          const { data } = await sbClient.from("users").select("*").ilike("username", u).eq("password", p).limit(1);
          if (data && data.length > 0) {
            setCurrentUser(data[0]);
            closeAuthModal();
            toast(`Giriş başarılı! Hoş geldin, ${data[0].username} 🎉`);
            setTimeout(() => window.location.reload(), 300);
            return;
          }
        } catch (err) {}
      }

      // Default local admin or member
      if (u === "bolumdizi" && (p === "admin" || p === "bolumdizi" || p === "123456")) {
        setCurrentUser({ username: "bolumdizi", email: "bolumdizi2@gmail.com", role: "admin", watchlist: [] });
        closeAuthModal();
        toast("Yönetici girişi başarılı! 👑");
        setTimeout(() => window.location.reload(), 300);
        return;
      }

      alert("Hatalı kullanıcı adı veya şifre!");
    };
  }

  // 8. Register Form Submission
  const regForm = el("registerForm");
  if (regForm) {
    regForm.onsubmit = async e => {
      e.preventDefault();
      const u = (el("r_user")?.value || "").trim();
      const em = (el("r_email")?.value || "").trim().toLowerCase();
      const p = (el("r_pass")?.value || "").trim();
      const p2 = (el("r_pass2")?.value || "").trim();
      if (!u || !em || !p) return;
      if (p !== p2) { alert("Şifreler uyuşmuyor!"); return; }

      if (sbClient) {
        try {
          const { data, error } = await sbClient.from("users").insert([{ username: u, email: em, password: p, watchlist: [] }]).select();
          if (!error && data) {
            setCurrentUser(data[0]);
            closeAuthModal();
            toast(`Hesabınız oluşturuldu! Hoş geldin, ${u} ⚡`);
            setTimeout(() => window.location.reload(), 300);
            return;
          }
        } catch (err) {}
      }

      // Local save
      setCurrentUser({ username: u, email: em, role: "member", watchlist: [] });
      closeAuthModal();
      toast(`Hesabınız oluşturuldu! Hoş geldin, ${u} 🎉`);
      setTimeout(() => window.location.reload(), 300);
    };
  }

  // 9. Categories Drawer Population
  const gnEl = el("gn");
  if (gnEl) {
    const cats = ["Tümü","Aksiyon","Komedi","Dram","Gerilim","Bilim Kurgu","Suç","Gizem","Romantik","Korku","Belgesel","Anime"];
    gnEl.innerHTML = cats.map(c => `<a class="chip" href="diziler.html?genre=${encodeURIComponent(c)}">${c}</a>`).join("");
  }

  updateAuthUI();
});
