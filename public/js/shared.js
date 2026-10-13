// bolumdizi - Shared Client Utility, Authentication, Watchlist, Header & UI Functions

const el = id => document.getElementById(id);

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

function slugify(text) {
  if (!text) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
window.slugify = slugify;

function buildEpisodeUrl(showTitle, season, episode) {
  const showSlug = slugify(showTitle);
  const sNum = parseInt(season) || 1;
  const bNum = (episode !== undefined && episode !== null && !isNaN(parseInt(episode))) ? parseInt(episode) : 1;
  if (!showSlug) return `bolum.html?s=${encodeURIComponent(showTitle || '')}&se=${sNum}&ep=${bNum}`;
  return `/${showSlug}/${sNum}-sezon-${bNum}-bolum.html`;
}
window.buildEpisodeUrl = buildEpisodeUrl;

function buildShowUrl(showTitle) {
  const showSlug = slugify(showTitle);
  if (!showSlug) return `dizi.html?s=${encodeURIComponent(showTitle || '')}`;
  return `/${showSlug}`;
}
window.buildShowUrl = buildShowUrl;

const TURKISH_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const TURKISH_DAYS_LONG = ["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];
const TURKISH_DAYS_SHORT = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

function getCurrentWeekInfo(weekOffset = 0) {
  const now = new Date();
  const currentDayOfWeek = (now.getDay() + 6) % 7; // 0: Pazartesi ... 6: Pazar
  const monday = new Date(now);
  monday.setDate(now.getDate() - currentDayOfWeek + (parseInt(weekOffset) || 0) * 7);
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
      isToday: (weekOffset === 0 && i === currentDayOfWeek),
      fullDateStr: `${d.getDate()} ${TURKISH_MONTHS[d.getMonth()]}`
    });
  }

  return {
    weekOffset: parseInt(weekOffset) || 0,
    todayIdx: currentDayOfWeek,
    today: days[currentDayOfWeek],
    days: days
  };
}
window.getCurrentWeekInfo = getCurrentWeekInfo;

function isShowEnded(item) {
  if (!item) return true;
  const status = (typeof getShowStatus === 'function') ? getShowStatus(item) : '';
  const sLower = String(status).trim().toLowerCase();
  if (sLower === 'final yaptı' || sLower === 'iptal edildi' || sLower === 'ended' || sLower === 'tamamlandı' || sLower === 'canceled' || sLower === 'cancelled') {
    return true;
  }
  return false;
}
window.isShowEnded = isShowEnded;

// Takvim için bitmiş dizileri filtreler ve ileri haftalarda (weekOffset > 0) bölüm numarasını artırır
function getFilteredScheduleForWeek(schedule, allSeries, weekOffset = 0) {
  const safeSchedule = Array.isArray(schedule) ? schedule : [];
  const safeAll = Array.isArray(allSeries) ? allSeries : [];
  const offset = parseInt(weekOffset) || 0;

  return [0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
    const rawItems = safeSchedule[dayIdx] || [];
    const activeItems = [];

    for (const item of rawItems) {
      if (!item || !item.name) continue;
      const showObj = safeAll.find(s => s && s[0] === item.name);
      
      // Eğer dizi bulunursa veya bitmişse kontrol et
      if (showObj && isShowEnded(showObj)) {
        continue; // Bitmiş dizileri gösterme!
      }

      const baseEp = parseInt(item.ep) || 1;
      const currentEp = baseEp + offset;

      activeItems.push({
        ...item,
        ep: currentEp,
        originalEp: baseEp,
        weekOffset: offset
      });
    }

    return activeItems;
  });
}
window.getFilteredScheduleForWeek = getFilteredScheduleForWeek;

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

function hasRealEpisodeVideo(ep) {
  if (!ep) return false;
  if (ep.embed && typeof ep.embed === "string" && ep.embed.trim().length > 10) return true;
  if (ep.players && Array.isArray(ep.players) && ep.players.some(p => p && p.embed && typeof p.embed === "string" && p.embed.trim().length > 10)) return true;
  return false;
}
window.hasRealEpisodeVideo = hasRealEpisodeVideo;

function getEpQuality(ep) {
  if (!ep) return "1080p";
  // 1. Doğrudan atanmış kalite değeri (örn: 1080p, 4K, 720p)
  if (ep.q && typeof ep.q === 'string' && ep.q.trim()) return ep.q.trim();
  if (ep.quality && typeof ep.quality === 'string' && ep.quality.trim()) return ep.quality.trim();

  // 2. Oynatıcı kaynaklarının isimlerinden veya linklerinden tespit
  if (ep.players && Array.isArray(ep.players)) {
    for (const p of ep.players) {
      if (p) {
        if (p.quality && typeof p.quality === 'string' && p.quality.trim()) return p.quality.trim();
        const text = ((p.name || '') + ' ' + (p.embed || '')).toLowerCase();
        if (/2160p|\b4k\b/i.test(text)) return "4K";
        if (/1080p|full\s*hd/i.test(text)) return "1080p";
        if (/720p|\bhd\b/i.test(text)) return "720p";
        if (/480p|\bsd\b/i.test(text)) return "480p";
      }
    }
  }

  // 3. Birincil embed metninden tespit
  if (ep.embed && typeof ep.embed === 'string') {
    const text = ep.embed.toLowerCase();
    if (/2160p|\b4k\b/i.test(text)) return "4K";
    if (/1080p/i.test(text)) return "1080p";
    if (/720p/i.test(text)) return "720p";
    if (/480p/i.test(text)) return "480p";
  }

  // 4. Varsayılan Full HD kalite
  return "1080p";
}
window.getEpQuality = getEpQuality;

function getEpisodeFinaleType(ep) {
  if (!ep) return null;

  // 1. Doğrudan atanmış ibare override (final veya sezon_finali)
  const explicit = String(ep.finale || ep.tag || "").toLowerCase().trim();
  if (explicit === "final") return "Final";
  if (explicit === "sezon_finali" || explicit === "sezon finali") return "Sezon Finali";
  if (explicit === "normal" || explicit === "none") return null;

  // 2. Başlık veya açıklamada geçen açık ibareler
  const textCheck = `${ep.title || ''} ${ep.desc || ''}`.toLowerCase();
  if (/\bsezon\s*finali\b/i.test(textCheck)) return "Sezon Finali";
  if (/\b(dizi\s*finali|büyük\s*final|buyuk\s*final)\b/i.test(textCheck)) return "Final";

  // 3. Dizi meta verisi ve bölüm numarası üzerinden otomatik tespit
  const sTitle = getEpTitle(ep);
  if (!sTitle) return null;

  let series = null;
  if (typeof API !== 'undefined' && API.getSeriesDetail) {
    series = API.getSeriesDetail(sTitle);
  }
  if (!series && typeof DEFAULT_SERIES !== 'undefined') {
    series = DEFAULT_SERIES.find(x => x[0].toLowerCase() === sTitle.toLowerCase());
  }
  if (!series) return null;

  const sNum = parseInt(ep.s) || 1;
  const bNum = (ep.b !== undefined && ep.b !== null && !isNaN(parseInt(ep.b))) ? parseInt(ep.b) : (parseInt(ep.e) || 1);
  const meta = (series[6] && typeof series[6] === 'object') ? series[6] : {};

  let seasonTotal = null;
  if (meta.epMap) {
    const val = meta.epMap[sNum] !== undefined ? meta.epMap[sNum] : meta.epMap[String(sNum)];
    if (val !== undefined && val !== null) {
      seasonTotal = parseInt(val);
    }
  }

  if (seasonTotal && bNum === seasonTotal) {
    const totalSeasons = (meta.seasons !== undefined && meta.seasons !== null) ? parseInt(meta.seasons) : 1;
    const status = (typeof getShowStatus === 'function') ? getShowStatus(series) : "Final Yaptı";
    const isSeriesCompleted = (status === "Final Yaptı" || status === "İptal Edildi");

    if (sNum >= totalSeasons && isSeriesCompleted) {
      return "Final";
    } else {
      return "Sezon Finali";
    }
  }

  return null;
}
window.getEpisodeFinaleType = getEpisodeFinaleType;

function getEpisodeFinaleBadge(ep) {
  const type = getEpisodeFinaleType(ep);
  if (!type) return "";
  const cls = (type === "Final") ? "tg series-final" : "tg season-finale";
  return `<span class="${cls}">${escapeHtml(type)}</span>`;
}
window.getEpisodeFinaleBadge = getEpisodeFinaleBadge;

function formatEpisodeAirDate(dateStr) {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  const trMonths = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

  // 1. Zaten Türkçe formatında bir tarih ise (örn: "20 Ocak 2008") doğrudan döndür
  const trMatch = s.match(/^(\d{1,2})\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]+)\s+(\d{4})$/);
  if (trMatch) return s;

  // 2. Saf tarih formatı: YYYY-MM-DD (örn: TVMaze airdate "2008-01-20")
  const pureMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureMatch) {
    const y = parseInt(pureMatch[1], 10);
    const m = parseInt(pureMatch[2], 10) - 1;
    const d = parseInt(pureMatch[3], 10);
    if (m >= 0 && m < 12) return `${d} ${trMonths[m]} ${y}`;
  }

  // 3. Saat içeren ISO tarih formatı (örn: Cinemeta "2008-01-21T05:00:00.000Z")
  // ABD ve küresel gece prime-time yayınları UTC saatine çevrilirken gece yarısını geçip (01:00-08:00 UTC)
  // bir sonraki güne kayar. IMDb'deki asıl yayın gününü yakalamak için 12 saat geri kaydırılır.
  const isoTimeMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/i);
  if (isoTimeMatch) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const hour = parseInt(isoTimeMatch[4], 10);
      const adjusted = (hour >= 1 && hour <= 8)
        ? new Date(d.getTime() - 12 * 3600 * 1000)
        : d;
      const day = adjusted.getUTCDate();
      const month = trMonths[adjusted.getUTCMonth()];
      const year = adjusted.getUTCFullYear();
      return `${day} ${month} ${year}`;
    }
  }

  // 4. Genel standart Date nesnesi fallback (UTC gün/ay/yıl kullanarak yerel saat dilimi kaymalarını önle)
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const day = d.getUTCDate();
      const month = trMonths[d.getUTCMonth()];
      const year = d.getUTCFullYear();
      return `${day} ${month} ${year}`;
    }
  } catch (e) {}

  return s;
}
window.formatEpisodeAirDate = formatEpisodeAirDate;

function isEpisodeAired(showObj, season, episode, epData) {
  // 1. If episode object already has video embed or was manually added with video by admin, it has aired
  if (epData && (Boolean(epData.embed) || (Array.isArray(epData.players) && epData.players.length > 0))) {
    return true;
  }

  // 2. Check explicit air date in epData or meta.epDates
  const meta = (showObj && showObj[6] && typeof showObj[6] === "object") ? showObj[6] : null;
  const sNum = parseInt(season) || 1;
  const bNum = parseInt(episode) || 1;

  let dateStr = (epData && epData.ago) ? epData.ago : null;
  if ((!dateStr || dateStr === 'Yeni' || dateStr.includes('dk')) && meta && meta.epDates) {
    dateStr = meta.epDates[`${sNum}_${bNum}`] || meta.epDates[`${sNum}x${bNum}`];
  }

  if (dateStr) {
    const timestamp = parseEpisodeDate(dateStr);
    if (timestamp > 0) {
      // If air date is in the future, it has NOT aired yet!
      return timestamp <= Date.now();
    }
  }

  // 3. If the series already finished ("Final Yaptı" / "İptal Edildi"), all its past episodes have aired
  const status = (meta && meta.status) ? meta.status : (typeof getShowStatus === 'function' ? getShowStatus(showObj) : '');
  if (status === "Final Yaptı" || status === "İptal Edildi") {
    return true;
  }

  // 4. If series is ongoing ("Devam Ediyor" / "Sezon Finali"):
  const totalSeasons = (meta && meta.seasons) ? meta.seasons : 1;
  // If it's a previous season (not the latest ongoing season), it has aired
  if (sNum < totalSeasons) {
    return true;
  }

  // For the current/latest season of an ongoing series:
  if (status === "Sezon Finali") {
    return true; // Completed current season
  }

  // For currently ongoing season without explicit future air date:
  // Episodes within epMap are considered released unless marked with future date
  return true;
}
window.isEpisodeAired = isEpisodeAired;

function parseEpisodeDate(str) {
  if (!str) return 0;
  const raw = String(str).trim();
  const d1 = new Date(raw).getTime();
  if (!isNaN(d1)) return d1;

  const trMonths = {
    'ocak': 0, 'şubat': 1, 'subat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'mayis': 4,
    'haziran': 5, 'temmuz': 6, 'ağustos': 7, 'agustos': 7, 'eylül': 8, 'eylul': 8,
    'ekim': 9, 'kasım': 10, 'kasim': 10, 'aralık': 11, 'aralik': 11
  };
  const parts = raw.toLowerCase().split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = trMonths[parts[1]];
    const year = parseInt(parts[2]);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day, 23, 59, 59).getTime();
    }
  }

  // Format: DD.MM.YYYY or DD/MM/YYYY
  const dotParts = raw.split(/[./-]/);
  if (dotParts.length === 3) {
    const p1 = parseInt(dotParts[0]);
    const p2 = parseInt(dotParts[1]);
    const p3 = parseInt(dotParts[2]);
    if (p1 > 1900 && p2 >= 1 && p2 <= 12 && p3 >= 1 && p3 <= 31) {
      return new Date(p1, p2 - 1, p3, 23, 59, 59).getTime(); // YYYY-MM-DD
    } else if (p3 > 1900 && p2 >= 1 && p2 <= 12 && p1 >= 1 && p1 <= 31) {
      return new Date(p3, p2 - 1, p1, 23, 59, 59).getTime(); // DD.MM.YYYY
    }
  }

  const low = raw.toLowerCase();
  if (low.includes('dakika önce') || low.includes('dakika once')) {
    const m = parseInt(low) || 1;
    return Date.now() - m * 60 * 1000;
  }
  if (low.includes('saat önce') || low.includes('saat once')) {
    const h = parseInt(low) || 1;
    return Date.now() - h * 3600 * 1000;
  }
  if (low.includes('gün önce') || low.includes('gun once')) {
    const d = parseInt(low) || 1;
    return Date.now() - d * 86400 * 1000;
  }
  if (low === 'yeni' || low === 'bugün' || low === 'bugun') {
    return Date.now();
  }
  return 0;
}
window.parseEpisodeDate = parseEpisodeDate;

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
  const showUrl = (typeof buildShowUrl === "function") ? buildShowUrl(t[0]) : `dizi.html?s=${encodeURIComponent(t[0])}`;
  return `<a class="p" href="${showUrl}"><span class="badge">${b}</span><span class="rt">★ ${t[2]}</span>${posterInner}<div class="cap"><b>${t[0]}</b><span>${t[1]} · ${t[3]}</span></div></a>`;
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

const SESSION_KEY = (typeof SESSION_STORAGE_KEY !== 'undefined') ? SESSION_STORAGE_KEY : "bolumdizi_session_v1";
const GUEST_WATCHLIST_KEY = "bd_guest_watchlist_v1";

function getGuestWatchlist() {
  try {
    const raw = localStorage.getItem(GUEST_WATCHLIST_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) {}
  return [];
}

function saveGuestWatchlist(list) {
  try {
    localStorage.setItem(GUEST_WATCHLIST_KEY, JSON.stringify(list || []));
  } catch (e) {}
}

function getActiveWatchlist() {
  const user = getCurrentUser();
  if (user && Array.isArray(user.watchlist)) return user.watchlist;
  return getGuestWatchlist();
}

window.getGuestWatchlist = getGuestWatchlist;
window.saveGuestWatchlist = saveGuestWatchlist;
window.getActiveWatchlist = getActiveWatchlist;

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function mergeGuestDataIntoUser(user) {
  if (!user) return user;
  const guestW = getGuestWatchlist();
  if (guestW.length > 0) {
    if (!Array.isArray(user.watchlist)) user.watchlist = [];
    guestW.forEach(gt => {
      if (!user.watchlist.some(w => (w || "").trim().toLowerCase() === gt.trim().toLowerCase())) {
        user.watchlist.unshift(gt);
      }
    });
    localStorage.removeItem(GUEST_WATCHLIST_KEY);
  }

  try {
    const guestEpsRaw = localStorage.getItem(`${WATCHED_STORAGE_KEY}_guest`) || localStorage.getItem("bd_watched_eps");
    if (guestEpsRaw) {
      const guestEps = JSON.parse(guestEpsRaw);
      const userEpsKey = `${WATCHED_STORAGE_KEY}_${user.username.toLowerCase()}`;
      let userEps = {};
      try {
        const uRaw = localStorage.getItem(userEpsKey);
        if (uRaw) userEps = JSON.parse(uRaw);
      } catch (e) {}
      Object.keys(guestEps).forEach(showKey => {
        if (!userEps[showKey]) {
          userEps[showKey] = guestEps[showKey];
        } else {
          const combined = Array.from(new Set([...(userEps[showKey].episodes || []), ...(guestEps[showKey].episodes || [])]));
          userEps[showKey].episodes = combined;
        }
      });
      localStorage.setItem(userEpsKey, JSON.stringify(userEps));
      localStorage.removeItem(`${WATCHED_STORAGE_KEY}_guest`);
      localStorage.removeItem("bd_watched_eps");
    }
  } catch (e) {}

  return user;
}

function setCurrentUser(user) {
  if (user) {
    user = mergeGuestDataIntoUser(user);
    const isAdmin = isAdminUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      id: user.id || null,
      username: user.username,
      email: user.email || "",
      role: isAdmin ? "admin" : "member",
      watchlist: Array.isArray(user.watchlist) ? user.watchlist : []
    }));
    if (isAdmin) sessionStorage.setItem("bd_admin_auth", "1");
  } else {
    localStorage.removeItem(SESSION_KEY);
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

  // ⭐ Listem / Profil bağlantısı her zaman görünür olsun
  if (navProf) navProf.style.display = "inline-block";

  if (user) {
    const isAdmin = isAdminUser(user);
    if (authBtn) authBtn.style.display = "none";
    if (menuWrap) menuWrap.style.display = "block";
    if (udName) udName.innerHTML = `${escapeHtml(user.username)} ${isAdmin ? '<span style="font-size:10px;background:linear-gradient(135deg,#ff3b47,#a30610);color:#fff;padding:2px 7px;border-radius:10px;font-weight:700">YÖNETİCİ</span>' : '<span style="font-size:10px;background:var(--input-bg);color:var(--mut);border:1px solid var(--line);padding:2px 7px;border-radius:10px">ÜYE</span>'}`;
    if (udEmail) udEmail.textContent = user.email || (isAdmin ? "Sistem Yöneticisi" : "Aktif Üye");
    if (menuName) menuName.textContent = user.username + (isAdmin ? " 👑" : "");
    if (admLink) {
      admLink.style.display = isAdmin ? "flex" : "none";
      admLink.href = "javascript:void(0)";
      admLink.innerHTML = "⚡ Hızlı Yönetim Menüsü";
      admLink.onclick = e => {
        e.preventDefault();
        const dd = el("userDropdown");
        if (dd) dd.style.display = "none";
        if (typeof openInlineAdminHubModal === "function") openInlineAdminHubModal();
      };
    }
    const oldOrderLink = el("dropdownOrderEpisodesLink");
    if (oldOrderLink) oldOrderLink.remove();
  } else {
    if (authBtn) authBtn.style.display = "flex";
    if (menuWrap) menuWrap.style.display = "none";
    if (admLink) admLink.style.display = "none";
    const oldOrderLink = el("dropdownOrderEpisodesLink");
    if (oldOrderLink) oldOrderLink.remove();
  }
  updateSupabaseStatusUI();
  updateMobileDrawerUI();
}

function openMobileDrawer() {
  const overlay = el("mobileDrawerOverlay");
  const drawer = el("mobileDrawer");
  if (overlay) overlay.classList.add("open");
  if (drawer) drawer.classList.add("open");
  document.body.style.overflow = "hidden";
  updateMobileDrawerUI();
}
window.openMobileDrawer = openMobileDrawer;

function closeMobileDrawer() {
  const overlay = el("mobileDrawerOverlay");
  const drawer = el("mobileDrawer");
  if (overlay) overlay.classList.remove("open");
  if (drawer) drawer.classList.remove("open");
  document.body.style.overflow = "";
}
window.closeMobileDrawer = closeMobileDrawer;

function toggleMobileDrawer() {
  const drawer = el("mobileDrawer");
  if (drawer && drawer.classList.contains("open")) {
    closeMobileDrawer();
  } else {
    openMobileDrawer();
  }
}
window.toggleMobileDrawer = toggleMobileDrawer;

function performLogout() {
  setCurrentUser(null);
  toast("Başarıyla çıkış yapıldı.");
  setTimeout(() => window.location.reload(), 400);
}
window.performLogout = performLogout;

function updateMobileDrawerUI() {
  const user = getCurrentUser();
  const isAdmin = user && isAdminUser(user);
  const uBox = el("drawerUserBox");
  const admItem = el("drawerAdminItem");
  const admTitle = el("drawerAdminTitle");
  const logoutItem = el("drawerLogoutItem");
  const themeText = el("drawerThemeText");
  const themeIcon = el("drawerThemeIcon");
  const mbProfText = el("mbNavProfText");

  const curTheme = document.documentElement.getAttribute("data-theme") || "dark";
  if (themeText) themeText.textContent = curTheme === "dark" ? "Karanlık Mod (Aktif)" : "Aydınlık Mod (Aktif)";
  if (themeIcon) themeIcon.textContent = curTheme === "dark" ? "🌙" : "☀️";

  if (mbProfText) {
    mbProfText.textContent = user ? "Profil" : "Giriş";
  }

  if (uBox) {
    if (user) {
      const initial = (user.username || "U").charAt(0).toUpperCase();
      uBox.innerHTML = `
        <div class="mobile-drawer-user-info">
          <div class="mobile-drawer-avatar">${escapeHtml(initial)}</div>
          <div style="flex:1;min-width:0">
            <b style="display:block;font-size:14.5px;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${escapeHtml(user.username)}
            </b>
            <span style="font-size:11.5px;color:${isAdmin ? 'var(--ac2)' : 'var(--mut)'};font-weight:${isAdmin ? '700' : '500'}">
              ${isAdmin ? '👑 Sistem Yöneticisi' : (user.email || 'Aktif Üye')}
            </span>
          </div>
        </div>
      `;
    } else {
      uBox.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="font-size:12.5px;color:var(--mut);line-height:1.45">
            Dizileri listelemek ve izleme geçmişinizi kaydetmek için giriş yapın.
          </div>
          <button type="button" class="btn" style="width:100%;font-size:13px;padding:9px 14px;justify-content:center;border-radius:10px;cursor:pointer" onclick="closeMobileDrawer();openAuthModal('login')">
            👤 Giriş Yap / Kayıt Ol
          </button>
        </div>
      `;
    }
  }

  if (admItem) admItem.style.display = isAdmin ? "flex" : "none";
  if (admTitle) admTitle.style.display = isAdmin ? "block" : "none";
  if (logoutItem) logoutItem.style.display = user ? "flex" : "none";
}
window.updateMobileDrawerUI = updateMobileDrawerUI;

function initMobileNavigation() {
  // 1. Header'a hamburger menü butonu ekle
  const navBar = document.querySelector(".w.nav");
  if (navBar && !el("mobileMenuToggle")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "mobileMenuToggle";
    btn.className = "mobile-menu-toggle";
    btn.setAttribute("aria-label", "Menüyü Aç");
    btn.title = "Menü";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;
    btn.onclick = toggleMobileDrawer;
    navBar.appendChild(btn);
  }

  // 2. Çekmece Menü Overlay & Drawer Ekle
  if (!el("mobileDrawerOverlay")) {
    const overlay = document.createElement("div");
    overlay.id = "mobileDrawerOverlay";
    overlay.className = "mobile-drawer-overlay";
    overlay.onclick = closeMobileDrawer;
    document.body.appendChild(overlay);
  }

  if (!el("mobileDrawer")) {
    const drawer = document.createElement("div");
    drawer.id = "mobileDrawer";
    drawer.className = "mobile-drawer";
    drawer.innerHTML = `
      <div class="mobile-drawer-head">
        <a href="index.html" class="logo" style="text-decoration:none" onclick="closeMobileDrawer()">
          bölüm<b>dizi</b>
        </a>
        <button type="button" class="mobile-drawer-close" aria-label="Kapat" onclick="closeMobileDrawer()">×</button>
      </div>

      <div class="mobile-drawer-user" id="drawerUserBox"></div>

      <div class="mobile-drawer-links">
        <div class="mobile-drawer-section-title">Keşfet</div>
        <a href="index.html" class="mobile-drawer-item" onclick="closeMobileDrawer()">
          <span class="item-icon">🏠</span> <span>Ana Sayfa</span>
        </a>
        <a href="diziler.html" class="mobile-drawer-item" onclick="closeMobileDrawer()">
          <span class="item-icon">🎬</span> <span>Tüm Diziler</span>
        </a>
        <a href="animeler.html" class="mobile-drawer-item" onclick="closeMobileDrawer()">
          <span class="item-icon">🎌</span> <span>Popüler Animeler</span>
        </a>
        <a href="javascript:void(0)" class="mobile-drawer-item" onclick="closeMobileDrawer();goToRandomShow(event)">
          <span class="item-icon">🎲</span> <span>Rastgele Dizi / Anime</span>
        </a>

        <div class="mobile-drawer-section-title">Topluluk & Destek</div>
        <a href="forum.html" class="mobile-drawer-item" onclick="closeMobileDrawer()">
          <span class="item-icon">💬</span> <span>Dizi Forumu</span>
        </a>
        <a href="iletisim.html" class="mobile-drawer-item" onclick="closeMobileDrawer()">
          <span class="item-icon">📬</span> <span>İletişim & İstek</span>
        </a>
        <a href="profil.html" class="mobile-drawer-item" onclick="closeMobileDrawer()">
          <span class="item-icon">⭐</span> <span>İzleme Listem & Profilim</span>
        </a>

        <div class="mobile-drawer-section-title" id="drawerAdminTitle" style="display:none">Yönetim</div>
        <a href="javascript:void(0)" id="drawerAdminItem" class="mobile-drawer-item" style="display:none;color:var(--ac2)" onclick="closeMobileDrawer();openInlineAdminHubModal()">
          <span class="item-icon">⚡</span> <span>Hızlı Yönetim Menüsü</span>
        </a>
      </div>

      <div class="mobile-drawer-foot">
        <button type="button" class="mobile-drawer-theme-btn" id="drawerThemeBtn">
          <span style="display:flex;align-items:center;gap:8px">
            <span id="drawerThemeIcon">🌙</span>
            <span id="drawerThemeText">Karanlık Mod</span>
          </span>
          <span style="font-size:12px;color:var(--mut)">Değiştir ❯</span>
        </button>

        <button type="button" id="drawerLogoutItem" class="btn g" style="display:none;width:100%;padding:10px;font-size:13px;color:#ff5252;justify-content:center;border-color:rgba(255,82,82,0.3);cursor:pointer" onclick="closeMobileDrawer();performLogout()">
          🚪 Çıkış Yap
        </button>

        <div style="font-size:11px;color:var(--mut);text-align:center;margin-top:2px">
          bölüm dizi © 2026
        </div>
      </div>
    `;
    document.body.appendChild(drawer);

    const drvThemeBtn = el("drawerThemeBtn");
    if (drvThemeBtn) {
      drvThemeBtn.onclick = () => {
        const themeBtn = el("themeBtn");
        if (themeBtn) {
          themeBtn.click();
        } else {
          const cur = document.documentElement.getAttribute("data-theme") || "dark";
          const next = cur === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", next);
          localStorage.setItem("bd_theme", next);
          toast(next === "dark" ? "Karanlık tema aktif" : "Aydınlık tema aktif");
        }
        updateMobileDrawerUI();
      };
    }
  }

  // 3. Sabit Alt Dock (Bottom Navigation Bar) Ekle
  if (!el("mobileBottomNav")) {
    const curFile = window.location.pathname.split("/").pop().split("?")[0] || "index.html";
    const isHome = curFile === "" || curFile === "index.html";
    const isSeries = curFile === "diziler.html" || curFile === "dizi.html" || curFile === "bolum.html" || curFile === "animeler.html";
    const isForum = curFile === "forum.html";
    const isProfile = curFile === "profil.html";

    const bNav = document.createElement("nav");
    bNav.id = "mobileBottomNav";
    bNav.className = "mobile-bottom-nav";
    bNav.setAttribute("aria-label", "Mobil Alt Menü");
    bNav.innerHTML = `
      <a href="index.html" class="mb-nav-item ${isHome ? 'active' : ''}">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Ana Sayfa</span>
      </a>

      <a href="diziler.html" class="mb-nav-item ${isSeries ? 'active' : ''}">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="20" height="15" x="2" y="7" rx="2" ry="2"></rect>
          <polyline points="17 2 12 7 7 2"></polyline>
        </svg>
        <span>Diziler</span>
      </a>

      <button type="button" class="mb-nav-item" onclick="goToRandomShow(event)">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
        <span>Keşfet</span>
      </button>

      <a href="forum.html" class="mb-nav-item ${isForum ? 'active' : ''}">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Forum</span>
      </a>

      <a href="profil.html" class="mb-nav-item ${isProfile ? 'active' : ''}">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span id="mbNavProfText">Profil</span>
      </a>
    `;
    document.body.appendChild(bNav);
  }

  // Escape tuşu ile çekmece kapatma
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeMobileDrawer();
  });

  updateMobileDrawerUI();
}
window.initMobileNavigation = initMobileNavigation;

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
    formReg.style.display = "none";
    formLogin.style.display = "block";
    formLogin.classList.remove("view-fade-in");
    void formLogin.offsetWidth;
    formLogin.classList.add("view-fade-in");
    setTimeout(() => { const inp = el("l_user"); if (inp) inp.focus(); }, 80);
  } else {
    tabLogin.classList.remove("on");
    tabReg.classList.add("on");
    formLogin.style.display = "none";
    formReg.style.display = "block";
    formReg.classList.remove("view-fade-in");
    void formReg.offsetWidth;
    formReg.classList.add("view-fade-in");
    setTimeout(() => { const inp = el("r_user"); if (inp) inp.focus(); }, 80);
  }
}

// Watchlist
let _watchlistToggling = false;
async function toggleWatchlist(title) {
  if (!title) return false;
  if (_watchlistToggling) return false;
  _watchlistToggling = true;
  setTimeout(() => { _watchlistToggling = false; }, 320);

  const cleanTitle = title.trim();
  const target = cleanTitle.toLowerCase();
  const user = getCurrentUser();

  let list = user ? (Array.isArray(user.watchlist) ? [...user.watchlist] : []) : getGuestWatchlist();
  const idx = list.findIndex(t => (t || "").trim().toLowerCase() === target);
  let added = false;

  if (idx > -1) {
    list.splice(idx, 1);
    toast(`"${cleanTitle}" listenizden çıkarıldı.`);
    added = false;
  } else {
    list.unshift(cleanTitle);
    toast(`"${cleanTitle}" listenize eklendi! ⭐`);
    added = true;
  }

  if (user) {
    user.watchlist = list;
    setCurrentUser(user);
    if (sbClient) {
      try {
        if (user.id) await sbClient.from("users").update({ watchlist: user.watchlist }).eq("id", user.id);
        else await sbClient.from("users").update({ watchlist: user.watchlist }).ilike("username", user.username);
      } catch (err) {}
    }
  } else {
    saveGuestWatchlist(list);
  }

  document.querySelectorAll('[data-watchlist-show]').forEach(btn => {
    const bTitle = (btn.getAttribute('data-watchlist-show') || '').trim().toLowerCase();
    if (bTitle === target) {
      btn.textContent = added ? "✓ Listemde" : "+ Listeme Ekle";
      btn.style.color = added ? "#4ade80" : "#fff";
      btn.style.borderColor = added ? "rgba(74,222,128,.4)" : "transparent";
    }
  });

  return added;
}

function isInWatchlist(title) {
  if (!title) return false;
  const target = title.trim().toLowerCase();
  const list = getActiveWatchlist();
  return list.some(t => (t || "").trim().toLowerCase() === target);
}

// Watched Episodes Tracking
const WATCHED_STORAGE_KEY = "bolumdizi_watched_v3";

function getWatchedData() {
  const user = getCurrentUser();
  const key = user ? `${WATCHED_STORAGE_KEY}_${user.username.toLowerCase()}` : `${WATCHED_STORAGE_KEY}_guest`;
  try {
    const raw = localStorage.getItem(key) || (!user ? localStorage.getItem("bd_watched_eps") : null);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

function saveWatchedData(data) {
  const user = getCurrentUser();
  const key = user ? `${WATCHED_STORAGE_KEY}_${user.username.toLowerCase()}` : `${WATCHED_STORAGE_KEY}_guest`;
  try {
    localStorage.setItem(key, JSON.stringify(data));
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
    toast("Bölümleri izlendi olarak işaretlemek için lütfen giriş yapın veya kayıt olun! 🔒");
    if (typeof openAuthModal === 'function') openAuthModal("login");
    return null;
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

function recordLastWatchedEpisode(showTitle, season, episode, alsoMarkWatched = false) {
  if (!showTitle) return;
  const data = getWatchedData();
  const key = (showTitle || "").toLowerCase();
  if (!data[key]) data[key] = { episodes: [], activeSeason: season };
  data[key].lastWatched = {
    s: parseInt(season) || 1,
    ep: parseInt(episode) || 1,
    timestamp: Date.now()
  };
  data[key].activeSeason = parseInt(season) || 1;
  if (alsoMarkWatched) {
    const epKey = `S${season}E${episode}`;
    if (!data[key].episodes) data[key].episodes = [];
    if (!data[key].episodes.includes(epKey)) data[key].episodes.push(epKey);
  }
  saveWatchedData(data);
}

function getNextEpisodeInfo(showObj, epList = [], lastWatchedObj = null) {
  if (!showObj) {
    return {
      s: 1,
      ep: 1,
      isComplete: false,
      lastS: 0,
      lastEp: 0,
      label: "1. Sezon 1. Bölüm",
      btnText: "İzlemeye Başla (1. Sezon 1. Bölüm)",
      lastLabel: null
    };
  }

  const meta = showObj[6] && typeof showObj[6] === "object" ? showObj[6] : null;
  const totalSeasons = (meta && meta.seasons) ? meta.seasons : 1;
  const epMap = (meta && meta.epMap) ? meta.epMap : {};

  // Parse watched list
  const watchedItems = (epList || []).map(str => {
    const m = String(str).match(/S(\d+)E(\d+)/i);
    return m ? { s: parseInt(m[1]), ep: parseInt(m[2]) } : null;
  }).filter(Boolean);

  let lastS = 0;
  let lastEp = 0;

  if (lastWatchedObj && lastWatchedObj.s && lastWatchedObj.ep) {
    lastS = parseInt(lastWatchedObj.s);
    lastEp = parseInt(lastWatchedObj.ep);
  } else if (watchedItems.length > 0) {
    // Sort by season ascending, then episode ascending to find the highest watched
    watchedItems.sort((a, b) => (a.s - b.s) || (a.ep - b.ep));
    const highest = watchedItems[watchedItems.length - 1];
    lastS = highest.s;
    lastEp = highest.ep;
  }

  // If no episodes have been watched yet:
  if (lastS === 0 || lastEp === 0) {
    let firstS = 1;
    let firstB = 1;
    if (typeof API !== "undefined" && API.getEpisodes) {
      const showEps = API.getEpisodes(showObj[0]).filter(e => typeof hasRealEpisodeVideo === "function" ? hasRealEpisodeVideo(e) : Boolean(e.embed || (e.players && e.players.length)));
      if (showEps.length > 0) {
        showEps.sort((a, b) => {
          const sA = parseInt(a.s) || 1;
          const sB = parseInt(b.s) || 1;
          const bA = (a.b !== undefined && a.b !== null && a.b !== '') ? parseInt(a.b) : (parseInt(a.e) || 0);
          const bB = (b.b !== undefined && b.b !== null && b.b !== '') ? parseInt(b.b) : (parseInt(b.e) || 0);
          return (sA - sB) || (bA - bB);
        });
        firstS = parseInt(showEps[0].s) || 1;
        const bVal = (showEps[0].b !== undefined && showEps[0].b !== null && showEps[0].b !== '') ? parseInt(showEps[0].b) : parseInt(showEps[0].e);
        firstB = !isNaN(bVal) ? bVal : 1;
      } else {
        const allShowEps = API.getEpisodes(showObj[0]);
        const s1Eps = allShowEps.filter(e => parseInt(e.s) === 1);
        const hasZeroInS1 = s1Eps.some(e => {
          const num = (e.b !== undefined && e.b !== null && e.b !== '') ? parseInt(e.b) : parseInt(e.e);
          return num === 0;
        });
        if (hasZeroInS1) firstB = 0;
      }
    }
    return {
      s: firstS,
      ep: firstB,
      isComplete: false,
      lastS: 0,
      lastEp: 0,
      label: `${firstS}. Sezon ${firstB}. Bölüm`,
      btnText: `İzlemeye Başla (${firstS}. Sezon ${firstB}. Bölüm)`,
      lastLabel: null
    };
  }

  // Calculate next episode from lastS, lastEp:
  let curSeasonMax = (epMap[lastS] || epMap[String(lastS)]) ? parseInt(epMap[lastS] || epMap[String(lastS)]) : 8;
  if (typeof API !== "undefined" && API.getEpisodes) {
    const addedInS = API.getEpisodes(showObj[0]).filter(e => parseInt(e.s) === lastS);
    if (addedInS.length > 0) {
      const maxB = addedInS.reduce((m, e) => {
        const num = (e.b !== undefined && e.b !== null && e.b !== '') ? parseInt(e.b) : parseInt(e.e);
        return Math.max(m, isNaN(num) ? 0 : num);
      }, 0);
      curSeasonMax = maxB;
    }
  }

  let nextS = lastS;
  let nextEp = lastEp + 1;

  if (nextEp > curSeasonMax) {
    if (lastS < totalSeasons) {
      nextS = lastS + 1;
      let nextHasZero = false;
      if (typeof API !== "undefined" && API.getEpisodes) {
        const nextSeasonEps = API.getEpisodes(showObj[0]).filter(e => parseInt(e.s) === nextS);
        nextHasZero = nextSeasonEps.some(e => {
          const num = (e.b !== undefined && e.b !== null && e.b !== '') ? parseInt(e.b) : parseInt(e.e);
          return num === 0;
        });
      }
      nextEp = nextHasZero ? 0 : 1;
    } else {
      // Completed the entire show!
      return {
        s: 1,
        ep: 1,
        isComplete: true,
        lastS,
        lastEp,
        label: "Tüm Bölümler İzlendi",
        btnText: "Tüm Bölümler Bitti (Yeniden İzle)",
        lastLabel: `${lastS}. Sezon ${lastEp}. Bölüm`
      };
    }
  }

  return {
    s: nextS,
    ep: nextEp,
    isComplete: false,
    lastS,
    lastEp,
    label: `${nextS}. Sezon ${nextEp}. Bölüm`,
    btnText: `İzlemeye Devam Et (${nextS}. Sezon ${nextEp}. Bölüm)`,
    lastLabel: `${lastS}. Sezon ${lastEp}. Bölüm`
  };
}

window.recordLastWatchedEpisode = recordLastWatchedEpisode;
window.getNextEpisodeInfo = getNextEpisodeInfo;
window.toggleEpisodeWatched = toggleEpisodeWatched;
window.toggleWatched = toggleEpisodeWatched;
window.showToast = toast;

function markAllSeasonWatched(showTitle, season, totalEpisodes = 8, markWatched = true) {
  const user = getCurrentUser();
  if (!user) {
    toast("Tüm sezonu işaretlemek için lütfen giriş yapın veya kayıt olun! 🔒");
    if (typeof openAuthModal === 'function') openAuthModal("login");
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
    toast("Tüm diziyi tamamlandı olarak işaretlemek için lütfen giriş yapın veya kayıt olun! 🔒");
    if (typeof openAuthModal === 'function') openAuthModal("login");
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
  const user = getCurrentUser();
  if (!user) {
    toast("İzleme geçmişini sıfırlamak için lütfen giriş yapın veya kayıt olun! 🔒");
    if (typeof openAuthModal === 'function') openAuthModal("login");
    return;
  }
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
  const targetTitle = (showTitle || "").toLowerCase().trim();

  // 1. Remove from watchlist
  if (user && user.watchlist && Array.isArray(user.watchlist)) {
    user.watchlist = user.watchlist.filter(t => (t || "").toLowerCase().trim() !== targetTitle);
    setCurrentUser(user);
    if (sbClient) {
      try {
        if (user.id) await sbClient.from("users").update({ watchlist: user.watchlist }).eq("id", user.id);
        else await sbClient.from("users").update({ watchlist: user.watchlist }).ilike("username", user.username);
      } catch (err) {}
    }
  } else {
    const gList = getGuestWatchlist().filter(t => (t || "").toLowerCase().trim() !== targetTitle);
    saveGuestWatchlist(gList);
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
          const showUrl = (typeof buildShowUrl === "function") ? buildShowUrl(t[0]) : `dizi.html?s=${encodeURIComponent(t[0])}`;
          return `
            <a class="sres-item" href="${showUrl}">
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

// Rastgele bir dizi veya anime sayfasına doğrudan yönlendir
function goToRandomShow(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }

  let list = [];
  if (typeof API !== 'undefined' && API.getAllSeries) {
    try {
      const fromApi = API.getAllSeries();
      if (Array.isArray(fromApi) && fromApi.length > 0) list = fromApi;
    } catch (err) {}
  }

  if (!list.length && typeof API !== 'undefined' && API.loadLocalFromStorageOnly) {
    try {
      const local = API.loadLocalFromStorageOnly();
      if (local && (local.series?.length || local.anime?.length)) {
        list = [].concat(local.series || [], local.anime || []);
      }
    } catch (err) {}
  }

  if (!list.length && typeof DATA !== 'undefined') {
    list = [].concat(DATA.dizi || [], DATA.anime || []);
  }

  if (!list.length) {
    list = [].concat(window.DEFAULT_SERIES || [], window.DEFAULT_ANIME || []);
  }

  if (!list.length) {
    try {
      const raw = localStorage.getItem('bolumdizi_data_v8');
      if (raw) {
        const parsed = JSON.parse(raw);
        list = [].concat(parsed.T || [], parsed.AN || []);
      }
    } catch (err) {}
  }

  if (list && list.length > 0) {
    const params = new URLSearchParams(window.location.search);
    let currentShow = (params.get('s') || '').trim().toLowerCase();
    
    // Also check pathname for clean slug (e.g. /breaking-bad or /breaking-bad/1-sezon-1-bolum.html)
    if (!currentShow) {
      const pathParts = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/');
      if (pathParts.length > 0 && pathParts[0] && !pathParts[0].includes('.')) {
        currentShow = pathParts[0].trim().toLowerCase();
      }
    }

    let pool = list;
    if (currentShow && list.length > 1) {
      const filtered = list.filter(item => {
        const title = (Array.isArray(item) ? item[0] : (item && (item.title || item.name))) || '';
        const titleSlug = (typeof slugify === 'function') ? slugify(title) : '';
        const titleStr = String(title).trim().toLowerCase();
        return titleStr !== currentShow && titleSlug !== currentShow;
      });
      if (filtered.length > 0) pool = filtered;
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const title = (Array.isArray(picked) ? picked[0] : (picked && (picked.title || picked.name))) || '';
    if (title) {
      const targetUrl = (typeof buildShowUrl === "function") ? buildShowUrl(title) : `/${(typeof slugify === 'function') ? slugify(title) : encodeURIComponent(title)}`;
      window.location.href = targetUrl;
      return false;
    }
  }

  window.location.href = '/diziler.html';
  return false;
}
window.goToRandomShow = goToRandomShow;

// Global Event Listeners (Theme, Search, Modals, Clicks)
document.addEventListener("DOMContentLoaded", () => {
  initMobileNavigation();

  // 1. Highlight active navigation link based on current page
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll(".nav nav a").forEach(a => {
    const href = a.getAttribute("href") || "";
    if (a.id === 'nav_random' || href.includes('kesfet') || href.startsWith('javascript:')) {
      a.classList.remove("on");
      return;
    }
    const hrefFile = href.split('/').pop().split('?')[0];
    if (hrefFile === currentPath || (currentPath === '' && hrefFile === 'index.html')) {
      a.classList.add("on");
    } else {
      a.classList.remove("on");
    }
  });

  // 1.1. Rastgele butonu tıklama dinleyicisi
  document.querySelectorAll("#nav_random").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      goToRandomShow(e);
    });
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
      document.documentElement.classList.add("theme-transitioning");
      const cur = document.documentElement.getAttribute("data-theme") || "dark";
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("bd_theme", next);
      themeBtn.textContent = next === "dark" ? "🌙" : "☀️";
      toast(next === "dark" ? "Karanlık tema aktif" : "Aydınlık tema aktif");
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 340);
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
          const { data } = await sbClient
            .from("users")
            .select("*")
            .or(`username.ilike.${u},email.ilike.${u}`)
            .eq("password", p)
            .limit(1);
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

      toast("Hatalı kullanıcı adı veya şifre!");
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
      if (p !== p2) {
        toast("Şifreler uyuşmuyor! Lütfen kontrol edin.");
        return;
      }
      if (p.length < 6) {
        toast("Şifreniz en az 6 karakter olmalıdır!");
        return;
      }

      if (sbClient) {
        try {
          const { data: existing } = await sbClient
            .from("users")
            .select("id,username,email")
            .or(`username.ilike.${u},email.ilike.${em}`)
            .limit(1);
          if (existing && existing.length > 0) {
            toast("Bu kullanıcı adı veya e-posta zaten kullanımda! Lütfen farklı bir bilgi deneyin.");
            return;
          }

          const { data, error } = await sbClient
            .from("users")
            .insert([{ username: u, email: em, password: p, watchlist: [] }])
            .select();
          if (!error && data && data.length > 0) {
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

  // 10. İletişim & Telif Modal Olayları
  const contactModal = el("contactModal");
  const contactClose = el("contactModalClose");
  if (contactClose) contactClose.onclick = closeContactModal;
  if (contactModal) {
    contactModal.onclick = e => { if (e.target === contactModal) closeContactModal(); };
  }

  updateAuthUI();
});

// İletişim & Telif Modalı Global Fonksiyonları
function openContactModal() {
  let m = el("contactModal");
  if (!m) {
    m = document.createElement("div");
    m.id = "contactModal";
    m.className = "auth-modal-backdrop";
    m.style.display = "none";
    m.innerHTML = `
      <div class="contact-modal-box">
        <button class="auth-modal-close" id="contactModalClose" onclick="closeContactModal()">×</button>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:24px">📬</span>
          <h2 style="font-size:19px;margin:0;color:var(--tx)">İletişim & Telif Hakları</h2>
        </div>
        <p style="font-size:13px;line-height:1.5;color:var(--mut);margin-bottom:12px">
          Görüş, öneri, hata bildirimi veya <b>telif hakkı (DMCA)</b> bildirimleriniz için aşağıdaki resmi e-posta adresimiz üzerinden bizimle iletişime geçebilirsiniz:
        </p>
        <div class="contact-mail-pill">
          <code id="contactMailText">bolumdizi2@gmail.com</code>
          <button type="button" class="contact-copy-btn" id="contactCopyBtn" onclick="copyContactMail()">
            📋 Kopyala
          </button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <button type="button" class="btn" style="justify-content:center;padding:10px 12px;font-size:13px;font-weight:600;border-radius:10px;background:#ea4335;color:#fff;border-color:#ea4335" onclick="sendMailViaGmail()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="flex:none"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
            Gmail ile Aç
          </button>
          <button type="button" class="btn g" style="justify-content:center;padding:10px 12px;font-size:13px;font-weight:600;border-radius:10px" onclick="sendMailViaClient()">
            ✉️ Posta Uygulaması
          </button>
        </div>
        <div class="contact-dmca-note">
          ⚖️ <b>Telif Hakkı Uyarısı:</b> Sitemiz içerik barındırmaz, yalnızca açık web servislerindeki üçüncü taraf içeriklere bağlantı sağlar. Hak sahibi olduğunuz bir içeriğin kaldırılmasını talep etmek için telif belgelerinizle birlikte yukarıdaki adrese yazabilirsiniz. Talebiniz en kısa sürede incelenerek gerekli işlem yapılacaktır.
        </div>
      </div>
    `;
    document.body.appendChild(m);
    m.onclick = e => { if (e.target === m) closeContactModal(); };
  }
  m.style.display = "flex";
}
window.openContactModal = openContactModal;

function closeContactModal() {
  const m = el("contactModal");
  if (m) m.style.display = "none";
}
window.closeContactModal = closeContactModal;

function sendMailViaGmail() {
  const to = "bolumdizi2@gmail.com";
  const subject = encodeURIComponent("Bölüm Dizi İletişim / Telif Bildirimi");
  const gmailUrl = `https://mail.google.com/mail/u/0/?fs=1&tf=cm&to=${to}&su=${subject}`;
  const win = window.open(gmailUrl, "_blank");
  if (!win || win.closed || typeof win.closed === "undefined") {
    // Açılır pencere engelleyicisi (popup blocker) varsa aynı pencerede aç veya mailto'ya yönlendir
    window.location.href = gmailUrl;
  }
}
window.sendMailViaGmail = sendMailViaGmail;

function sendMailViaClient() {
  const to = "bolumdizi2@gmail.com";
  const subject = encodeURIComponent("Bölüm Dizi İletişim / Telif Bildirimi");
  window.location.href = `mailto:${to}?subject=${subject}`;
}
window.sendMailViaClient = sendMailViaClient;

function copyContactMail() {
  const email = "bolumdizi2@gmail.com";
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(email).then(() => {
      showCopiedFeedback();
    }).catch(() => {
      fallbackCopyText(email);
    });
  } else {
    fallbackCopyText(email);
  }
}
window.copyContactMail = copyContactMail;

function fallbackCopyText(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showCopiedFeedback();
  } catch (e) {
    toast("E-posta: " + text);
  }
  document.body.removeChild(ta);
}

function showCopiedFeedback() {
  const btn = el("contactCopyBtn");
  if (btn) {
    btn.innerHTML = "✓ Kopyalandı";
    btn.style.color = "#4ade80";
    btn.style.borderColor = "#4ade80";
    setTimeout(() => {
      btn.innerHTML = "📋 Kopyala";
      btn.style.color = "var(--tx)";
      btn.style.borderColor = "var(--line)";
    }, 2000);
  }
  toast("E-posta adresi panoya kopyalandı! 📋");
}

// ==========================================================
// YERİNDE YÖNETİM MODALLARI (INLINE ADMIN SYSTEM)
// ==========================================================

function ensureInlineAdminModalContainer() {
  let m = el("inlineAdminModal");
  if (!m) {
    m = document.createElement("div");
    m.id = "inlineAdminModal";
    m.className = "auth-modal-backdrop";
    m.style.display = "none";
    m.style.zIndex = "9999";
    m.style.padding = "20px";
    m.style.overflowY = "auto";
    m.onclick = e => {
      if (e.target === m) closeInlineAdminModal();
    };
    document.body.appendChild(m);
  }
  return m;
}

function closeInlineAdminModal() {
  const m = el("inlineAdminModal");
  if (m) m.style.display = "none";
}
window.closeInlineAdminModal = closeInlineAdminModal;

// Hızlı Menü (Hub): Yeni Dizi / Bölüm / Vitrin Seçimi
function openInlineAdminHubModal() {
  if (!isAdmAuth()) return;
  const m = ensureInlineAdminModalContainer();
  m.innerHTML = `
    <div class="auth-modal-box" style="max-width:480px;width:100%;padding:26px;position:relative">
      <button class="auth-modal-close" onclick="closeInlineAdminModal()">×</button>
      <h2 style="margin:0 0 8px;font-size:20px;color:var(--tx)">⚡ Hızlı Yönetim Menüsü</h2>
      <p class="mut" style="font-size:13px;margin:0 0 18px">Bulunduğunuz sayfadan ayrılmadan işlem seçin:</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button type="button" class="btn" style="padding:12px 16px;font-size:14px;justify-content:flex-start;gap:10px" onclick="openInlineEpisodeModal()">
          <span>➕</span> <span>Yeni Bölüm / Video Ekle veya Düzenle</span>
        </button>
        <button type="button" class="btn g" style="padding:12px 16px;font-size:14px;justify-content:flex-start;gap:10px" onclick="openInlineSeriesModal()">
          <span>🎬</span> <span>Yeni Dizi / Anime Ekle</span>
        </button>
        <button type="button" class="btn g" style="padding:12px 16px;font-size:14px;justify-content:flex-start;gap:10px" onclick="openInlineFeaturedModal()">
          <span>🌟</span> <span>Ana Sayfa Vitrinini (5 Dizi) Düzenle</span>
        </button>
        <button type="button" class="btn g" style="padding:12px 16px;font-size:14px;justify-content:flex-start;gap:10px" onclick="openInlineRecentEpisodesOrderModal()">
          <span>📑</span> <span>Son Eklenen Bölümleri Sırala</span>
        </button>
      </div>
    </div>
  `;
  m.style.display = "flex";
}
window.openInlineAdminHubModal = openInlineAdminHubModal;

// 1. YERİNDE BÖLÜM EKLEME / DÜZENLEME MODALI
function openInlineEpisodeModal(showTitle, seasonNum, epNum) {
  if (!isAdmAuth()) return;
  const m = ensureInlineAdminModalContainer();
  const all = API.getAllSeries();
  if (!all.length) {
    toast("Önce bir dizi eklemelisiniz.");
    return;
  }

  let curShowTitle = showTitle || all[0][0];
  const sVal = parseInt(seasonNum) || 1;
  const bVal = (epNum !== undefined && epNum !== null && !isNaN(parseInt(epNum))) ? parseInt(epNum) : 1;

  const episodes = API.data.episodes || [];
  let editingEpIdx = episodes.findIndex(e => {
    const epShow = Array.isArray(e.t) ? e.t[0] : (typeof e.t === 'object' ? e.t[0] : e.t);
    const epB = (e.b !== undefined && e.b !== null && e.b !== '') ? parseInt(e.b) : parseInt(e.e);
    return (epShow || "").toLowerCase().trim() === curShowTitle.toLowerCase().trim() &&
           parseInt(e.s) === sVal &&
           epB === bVal;
  });

  const currEp = editingEpIdx !== -1 ? episodes[editingEpIdx] : null;
  let currentEpPlayers = [];
  if (currEp && Array.isArray(currEp.players) && currEp.players.length > 0) {
    currentEpPlayers = currEp.players.map(p => ({ name: p.name || 'Oynatıcı', embed: p.embed || '' }));
  } else if (currEp && currEp.embed && currEp.embed.trim()) {
    currentEpPlayers = [{ name: "Oynatıcı 1", embed: currEp.embed }];
  } else {
    currentEpPlayers = [{ name: "Oynatıcı 1", embed: "" }];
  }

  const lgVal = currEp ? (currEp.lg || "Altyazı") : "Altyazı";
  const qVal = currEp ? (typeof getEpQuality === "function" ? getEpQuality(currEp) : (currEp.q || "1080p")) : "1080p";
  const agoVal = currEp ? (currEp.ago || "Yeni") : "Yeni";
  const noteVal = currEp ? (currEp.note || "") : "";
  const finaleVal = currEp ? (currEp.finale || "auto") : "auto";

  const sortedAll = [...all].sort((a, b) => (a[0] || '').localeCompare(b[0] || '', 'tr'));

  m.innerHTML = `
    <div class="auth-modal-box" style="max-width:650px;width:100%;padding:24px;max-height:90vh;overflow-y:auto;position:relative">
      <button class="auth-modal-close" onclick="closeInlineAdminModal()">×</button>
      <h2 style="margin:0 0 6px;font-size:19px;color:var(--tx)">
        ${currEp ? `✏️ Bölümü Düzenle: ${escapeHtml(curShowTitle)} S${sVal}B${bVal}` : `➕ Bölüm / Video Ekle`}
      </h2>
      <p class="mut" style="font-size:12.5px;margin:0 0 16px">Bölüm oynatıcı linklerini ve detaylarını doğrudan buradan kaydedebilirsiniz.</p>

      <div style="display:grid;grid-template-columns:1fr 90px 90px;gap:10px;margin-bottom:12px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Dizi / Anime</label>
          <select id="inl_ep_series" class="auth-input" style="width:100%;padding:8px 10px">
            ${sortedAll.map(s => `<option value="${escapeHtml(s[0])}" ${s[0].toLowerCase().trim() === curShowTitle.toLowerCase().trim() ? 'selected' : ''}>${escapeHtml(s[0])}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Sezon</label>
          <input id="inl_ep_s" type="number" min="1" value="${sVal}" class="auth-input" style="width:100%;padding:8px 10px">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Bölüm</label>
          <input id="inl_ep_b" type="number" min="0" value="${bVal}" class="auth-input" style="width:100%;padding:8px 10px">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Dil</label>
          <select id="inl_ep_lg" class="auth-input" style="width:100%;padding:8px 10px">
            <option value="Altyazı" ${lgVal==='Altyazı'?'selected':''}>Altyazı</option>
            <option value="Dublaj" ${lgVal==='Dublaj'?'selected':''}>Dublaj</option>
            <option value="Dublaj & Altyazı" ${lgVal==='Dublaj & Altyazı'?'selected':''}>Dublaj & Altyazı</option>
          </select>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Kalite</label>
          <select id="inl_ep_q" class="auth-input" style="width:100%;padding:8px 10px">
            <option value="1080p" ${qVal==='1080p'?'selected':''}>1080p Full HD</option>
            <option value="4K" ${qVal==='4K'?'selected':''}>4K Ultra HD</option>
            <option value="720p" ${qVal==='720p'?'selected':''}>720p HD</option>
          </select>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Final Etiketi</label>
          <select id="inl_ep_finale" class="auth-input" style="width:100%;padding:8px 10px">
            <option value="auto" ${finaleVal==='auto'?'selected':''}>Otomatik</option>
            <option value="none" ${finaleVal==='none'?'selected':''}>Yok</option>
            <option value="Sezon Finali" ${finaleVal==='Sezon Finali'?'selected':''}>Sezon Finali</option>
            <option value="Final" ${finaleVal==='Final'?'selected':''}>Final</option>
          </select>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Yayın Tarihi</label>
          <div style="display:flex;gap:4px">
            <input id="inl_ep_ago" value="${escapeHtml(agoVal)}" class="auth-input" style="width:100%;padding:8px 8px;font-size:12px" placeholder="Örn: 12 Ekim 2024">
            <button type="button" id="inl_btn_fetch_date" class="btn g" style="padding:4px 8px;font-size:11px;flex:none" title="IMDb'den Tarihi Çek">⚡</button>
          </div>
        </div>
      </div>

      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <label style="font-size:12.5px;font-weight:700;color:var(--tx)">🎬 Video Oynatıcı Kaynakları</label>
          <button type="button" id="inl_add_player" class="btn g" style="padding:4px 10px;font-size:11.5px;color:#4ade80;border-color:rgba(74,222,128,0.3)">➕ Alternatif Oynatıcı Ekle</button>
        </div>
        <datalist id="inl_player_names_datalist">
          <option value="VidMoly"></option>
          <option value="Ok.ru"></option>
          <option value="Sibnet"></option>
          <option value="Close"></option>
          <option value="Dailymotion"></option>
          <option value="VK"></option>
          <option value="Oynatıcı 1"></option>
          <option value="Oynatıcı 2"></option>
        </datalist>
        <div id="inl_players_list" style="display:flex;flex-direction:column;gap:8px"></div>
      </div>

      <div style="margin-bottom:16px">
        <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">📝 Bölüm Notu (İsteğe Bağlı)</label>
        <textarea id="inl_ep_note" rows="2" class="auth-input" style="width:100%;resize:vertical;font-size:12.5px" placeholder="Bu bölüm için izleyicilere not...">${escapeHtml(noteVal)}</textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button type="button" class="btn g" onclick="closeInlineAdminModal()" style="padding:9px 16px">İptal</button>
        <button type="button" class="btn" id="inl_save_ep_btn" style="padding:9px 22px;font-weight:700">💾 Kaydet ve Güncelle</button>
      </div>
    </div>
  `;

  function syncPlayers() {
    const listEl = el("inl_players_list");
    if (!listEl) return;
    const rows = listEl.querySelectorAll(".inl-player-row");
    const arr = [];
    rows.forEach((r, idx) => {
      const nm = r.querySelector(".inl-p-name")?.value || `Oynatıcı ${idx + 1}`;
      const em = r.querySelector(".inl-p-embed")?.value || "";
      arr.push({ name: nm.trim(), embed: em.trim() });
    });
    if (arr.length) currentEpPlayers = arr;
  }

  function renderPlayers() {
    const listEl = el("inl_players_list");
    if (!listEl) return;
    listEl.innerHTML = currentEpPlayers.map((p, idx) => `
      <div class="inl-player-row" style="background:var(--input-bg);border:1px solid var(--line);border-radius:8px;padding:10px">
        <div style="display:flex;gap:8px;margin-bottom:6px;align-items:center;flex-wrap:wrap">
          <input class="auth-input inl-p-name" list="inl_player_names_datalist" value="${escapeHtml(p.name || '')}" placeholder="Oynatıcı Adı Seçin / Yazın" style="max-width:190px;padding:5px 8px;font-size:12px;font-weight:600">
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            ${['VidMoly', 'Ok.ru', 'Sibnet', 'Close', 'Oynatıcı 1'].map(preset => `
              <button type="button" class="btn g inl-preset-p" data-idx="${idx}" data-preset="${preset}" style="padding:2px 7px;font-size:10.5px">${preset}</button>
            `).join('')}
          </div>
          ${currentEpPlayers.length > 1 ? `<button type="button" class="btn g inl-del-p" data-idx="${idx}" style="margin-left:auto;padding:3px 8px;font-size:11px;color:#ff5252">✕ Kaldır</button>` : ''}
        </div>
        <textarea class="auth-input inl-p-embed" rows="2" style="width:100%;font-family:monospace;font-size:12px;padding:6px 8px" placeholder="https://... veya <iframe src='...'></iframe>">${escapeHtml(p.embed || '')}</textarea>
      </div>
    `).join('');

    listEl.querySelectorAll(".inl-preset-p").forEach(btn => {
      btn.onclick = () => {
        syncPlayers();
        const i = parseInt(btn.dataset.idx) || 0;
        if (currentEpPlayers[i]) {
          currentEpPlayers[i].name = btn.dataset.preset;
          renderPlayers();
        }
      };
    });

    listEl.querySelectorAll(".inl-del-p").forEach(btn => {
      btn.onclick = () => {
        syncPlayers();
        const i = parseInt(btn.dataset.idx) || 0;
        currentEpPlayers.splice(i, 1);
        renderPlayers();
      };
    });
  }

  renderPlayers();

  el("inl_add_player").onclick = () => {
    syncPlayers();
    currentEpPlayers.push({ name: `Oynatıcı ${currentEpPlayers.length + 1}`, embed: "" });
    renderPlayers();
  };

  async function autoFetchEpDate() {
    const selTitle = el("inl_ep_series")?.value || curShowTitle;
    const s = parseInt(el("inl_ep_s")?.value) || 1;
    const b = (el("inl_ep_b") && !isNaN(parseInt(el("inl_ep_b").value))) ? parseInt(el("inl_ep_b").value) : 1;
    const showObj = all.find(x => x[0].toLowerCase().trim() === selTitle.toLowerCase().trim());
    if (!showObj) return;
    const meta = showObj[6] && typeof showObj[6] === 'object' ? showObj[6] : {};
    const epKey = `${s}_${b}`;
    if (meta.epDates && meta.epDates[epKey]) {
      el("inl_ep_ago").value = meta.epDates[epKey];
      return;
    }
    const imdbId = meta.imdbId;
    if (!imdbId) return;
    const btn = el("inl_btn_fetch_date");
    if (btn) btn.textContent = "⏳";
    try {
      const r = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`);
      if (r.ok) {
        const tv = await r.json();
        if (tv && tv.id) {
          const er = await fetch(`https://api.tvmaze.com/shows/${tv.id}/episodes`);
          if (er.ok) {
            const eps = await er.json();
            const match = eps.find(x => parseInt(x.season) === s && parseInt(x.number) === b);
            if (match && (match.airdate || match.airstamp)) {
              el("inl_ep_ago").value = formatEpisodeAirDate(match.airdate || match.airstamp);
            }
          }
        }
      }
    } catch (e) {}
    if (btn) btn.textContent = "⚡";
  }

  el("inl_btn_fetch_date").onclick = autoFetchEpDate;

  // Eğer bölüm değiştirilirse ve mevcut bölüm varsa bilgilerini doldur
  function checkExistingOnSwitch() {
    const selTitle = el("inl_ep_series")?.value || curShowTitle;
    const s = parseInt(el("inl_ep_s")?.value) || 1;
    const b = (el("inl_ep_b") && !isNaN(parseInt(el("inl_ep_b").value))) ? parseInt(el("inl_ep_b").value) : 1;
    const foundIdx = (API.data.episodes || []).findIndex(e => {
      const epShow = Array.isArray(e.t) ? e.t[0] : (typeof e.t === 'object' ? e.t[0] : e.t);
      const epB = (e.b !== undefined && e.b !== null && e.b !== '') ? parseInt(e.b) : parseInt(e.e);
      return (epShow || "").toLowerCase().trim() === selTitle.toLowerCase().trim() &&
             parseInt(e.s) === s &&
             epB === b;
    });
    editingEpIdx = foundIdx;
    if (foundIdx !== -1) {
      const ex = API.data.episodes[foundIdx];
      el("inl_ep_lg").value = ex.lg || "Altyazı";
      el("inl_ep_q").value = ex.q || "1080p";
      el("inl_ep_ago").value = ex.ago || "Yeni";
      el("inl_ep_note").value = ex.note || "";
      el("inl_ep_finale").value = ex.finale || "auto";
      if (Array.isArray(ex.players) && ex.players.length) {
        currentEpPlayers = ex.players.map(p => ({ name: p.name || 'Oynatıcı', embed: p.embed || '' }));
      } else if (ex.embed) {
        currentEpPlayers = [{ name: "Oynatıcı 1", embed: ex.embed }];
      }
      renderPlayers();
    } else {
      autoFetchEpDate();
    }
  }

  el("inl_ep_series").onchange = checkExistingOnSwitch;
  el("inl_ep_s").onchange = checkExistingOnSwitch;
  el("inl_ep_b").onchange = checkExistingOnSwitch;

  if (!currEp) autoFetchEpDate();

  el("inl_save_ep_btn").onclick = async () => {
    const selTitle = el("inl_ep_series")?.value || curShowTitle;
    const s = parseInt(el("inl_ep_s")?.value) || 1;
    const b = (el("inl_ep_b") && !isNaN(parseInt(el("inl_ep_b").value))) ? parseInt(el("inl_ep_b").value) : 1;
    const lg = el("inl_ep_lg")?.value || "Altyazı";
    const q = el("inl_ep_q")?.value || "1080p";
    const ago = (el("inl_ep_ago")?.value || "Yeni").trim();
    const note = (el("inl_ep_note")?.value || "").trim();
    const finale = el("inl_ep_finale")?.value || "auto";

    syncPlayers();
    const validPlayers = currentEpPlayers.filter(p => p && (p.embed || p.name));
    const primaryEmbed = validPlayers[0]?.embed || "";

    const epObj = {
      t: [selTitle],
      s,
      b,
      e: b,
      lg,
      q,
      ago,
      embed: primaryEmbed,
      players: validPlayers.length > 0 ? validPlayers : [{ name: "Oynatıcı 1", embed: primaryEmbed }]
    };
    if (note) epObj.note = note;
    if (finale && finale !== "auto") epObj.finale = finale;

    const btn = el("inl_save_ep_btn");
    btn.disabled = true;
    btn.textContent = "⏳ Kaydediliyor...";

    await API.saveEpisode(epObj, editingEpIdx !== -1 ? editingEpIdx : null);
    toast(`${selTitle} ${s}. Sezon ${b}. Bölüm kaydedildi! ✓`);
    closeInlineAdminModal();

    if (typeof renderPlayer === "function") renderPlayer();
    if (typeof renderEpisodeList === "function") renderEpisodeList();
    if (typeof renderEpisodesList === "function") renderEpisodesList();
  };

  m.style.display = "flex";
}
window.openInlineEpisodeModal = openInlineEpisodeModal;

// 2. YERİNDE DİZİ / ANİME EKLEME & DÜZENLEME MODALI
function openInlineSeriesModal(editShowTitle) {
  if (!isAdmAuth()) return;
  const m = ensureInlineAdminModalContainer();
  const all = API.getAllSeries();
  const existing = editShowTitle
    ? all.find(x => x[0].toLowerCase().trim() === editShowTitle.toLowerCase().trim())
    : null;

  const isAnimeExisting = existing
    ? (API.data.anime || []).some(x => x[0].toLowerCase().trim() === existing[0].toLowerCase().trim())
    : false;

  const titleVal = existing ? existing[0] : "";
  const genreVal = existing ? existing[1] : "Suç, Dram";
  const imdbVal = existing ? existing[2] : "8.5";
  const yearVal = existing ? existing[3] : "2024";
  const posterVal = existing ? (existing[4] || "") : "";
  const summaryVal = existing ? (typeof getSummary === "function" ? getSummary(existing) : (existing[5] || "")) : "";
  const meta = (existing && existing[6] && typeof existing[6] === "object") ? existing[6] : {};
  const backdropVal = (API.data.backdrops && existing && API.data.backdrops[existing[0]]) || (existing && typeof existing[5] === "string" && existing[5].startsWith("http") ? existing[5] : "");
  const statusVal = meta.status || "Devam Ediyor";
  const seasonsVal = meta.seasons || 1;
  const totalEpsVal = meta.totalEpisodes || 8;
  const imdbIdVal = meta.imdbId || "";

  m.innerHTML = `
    <div class="auth-modal-box" style="max-width:650px;width:100%;padding:24px;max-height:90vh;overflow-y:auto;position:relative">
      <button class="auth-modal-close" onclick="closeInlineAdminModal()">×</button>
      <h2 style="margin:0 0 6px;font-size:19px;color:var(--tx)">
        ${existing ? `✏️ Dizi Bilgilerini Düzenle: ${escapeHtml(existing[0])}` : `🎬 Yeni Dizi / Anime Ekle`}
      </h2>
      <p class="mut" style="font-size:12.5px;margin:0 0 14px">IMDb ID veya isim girerek tüm bilgileri otomatik çekebilir veya elle düzenleyebilirsiniz.</p>

      <div style="display:flex;gap:8px;margin-bottom:14px;background:var(--input-bg);padding:10px;border-radius:10px;border:1px solid var(--line)">
        <input id="inl_sr_imdb_q" value="${escapeHtml(imdbIdVal || titleVal)}" class="auth-input" style="flex:1;padding:8px 12px" placeholder="IMDb ID (örn: tt0903747) veya Dizi Adı">
        <button type="button" id="inl_btn_fetch_imdb" class="btn" style="padding:8px 14px;font-size:12.5px;flex:none">⚡ IMDb'den Çek</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 120px;gap:10px;margin-bottom:10px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Dizi / Anime Adı</label>
          <input id="inl_sr_title" value="${escapeHtml(titleVal)}" class="auth-input" style="width:100%;padding:8px 10px">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Kategori</label>
          <select id="inl_sr_type" class="auth-input" style="width:100%;padding:8px 10px">
            <option value="dizi" ${!isAnimeExisting?'selected':''}>Dizi</option>
            <option value="anime" ${isAnimeExisting?'selected':''}>Anime</option>
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 90px 90px 140px;gap:10px;margin-bottom:10px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Türler</label>
          <input id="inl_sr_genre" value="${escapeHtml(genreVal)}" class="auth-input" style="width:100%;padding:8px 10px">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">IMDb</label>
          <input id="inl_sr_imdb" type="number" step="0.1" value="${imdbVal}" class="auth-input" style="width:100%;padding:8px 10px">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Yıl</label>
          <input id="inl_sr_year" type="number" value="${yearVal}" class="auth-input" style="width:100%;padding:8px 10px">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Durum</label>
          <select id="inl_sr_status" class="auth-input" style="width:100%;padding:8px 10px">
            <option value="Devam Ediyor" ${statusVal==='Devam Ediyor'?'selected':''}>Devam Ediyor</option>
            <option value="Final Yaptı" ${statusVal==='Final Yaptı'?'selected':''}>Final Yaptı</option>
            <option value="Sezon Finali" ${statusVal==='Sezon Finali'?'selected':''}>Sezon Finali</option>
            <option value="Mini Dizi" ${statusVal==='Mini Dizi'?'selected':''}>Mini Dizi</option>
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Toplam Sezon</label>
          <input id="inl_sr_seasons" type="number" min="1" value="${seasonsVal}" class="auth-input" style="width:100%;padding:8px 10px">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Toplam Bölüm</label>
          <input id="inl_sr_totaleps" type="number" min="1" value="${totalEpsVal}" class="auth-input" style="width:100%;padding:8px 10px">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Afiş (Poster) URL</label>
          <input id="inl_sr_poster" value="${escapeHtml(posterVal)}" class="auth-input" style="width:100%;padding:8px 10px" placeholder="https://...">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Arka Plan (Banner) URL</label>
          <input id="inl_sr_backdrop" value="${escapeHtml(backdropVal)}" class="auth-input" style="width:100%;padding:8px 10px" placeholder="https://...">
        </div>
      </div>

      <div style="margin-bottom:16px">
        <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Dizi Özeti (Türkçe)</label>
        <textarea id="inl_sr_summary" rows="3" class="auth-input" style="width:100%;resize:vertical;font-size:12.5px">${escapeHtml(summaryVal)}</textarea>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        ${existing ? `<button type="button" id="inl_del_sr_btn" class="btn g" style="color:#ff5252;border-color:rgba(255,82,82,0.3);padding:9px 14px">🗑️ Diziyi Sil</button>` : `<div></div>`}
        <div style="display:flex;gap:10px">
          <button type="button" class="btn g" onclick="closeInlineAdminModal()" style="padding:9px 16px">İptal</button>
          <button type="button" class="btn" id="inl_save_sr_btn" style="padding:9px 22px;font-weight:700">💾 Kaydet</button>
        </div>
      </div>
    </div>
  `;

  let fetchedMeta = null;

  el("inl_btn_fetch_imdb").onclick = async () => {
    const q = (el("inl_sr_imdb_q")?.value || el("inl_sr_title")?.value || "").trim();
    if (!q) {
      toast("Lütfen bir dizi adı veya IMDb ID girin.");
      return;
    }
    const btn = el("inl_btn_fetch_imdb");
    btn.textContent = "⏳...";
    btn.disabled = true;
    try {
      let imdbId = null;
      const mMatch = q.match(/tt\d{6,10}/i);
      if (mMatch) imdbId = mMatch[0].toLowerCase();
      else {
        const sr = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(q)}`);
        if (sr.ok) {
          const sObj = await sr.json();
          if (sObj?.externals?.imdb) imdbId = sObj.externals.imdb.toLowerCase();
        }
      }
      if (!imdbId) throw new Error("IMDb ID bulunamadı.");

      const res = await fetch(`https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`);
      const cJson = res.ok ? await res.json() : null;
      const cine = cJson?.meta || null;

      if (!cine) throw new Error("Veri çekilemedi.");

      const epMap = {};
      const epDates = {};
      let maxS = 1;
      let totE = 0;
      if (Array.isArray(cine.videos)) {
        cine.videos.filter(v => v.season > 0).forEach(v => {
          const s = parseInt(v.season) || 1;
          const b = parseInt(v.number || v.episode) || 1;
          epMap[s] = (epMap[s] || 0) + 1;
          totE++;
          if (s > maxS) maxS = s;
          if (v.released) epDates[`${s}_${b}`] = formatEpisodeAirDate(v.released);
        });
      }

      fetchedMeta = { imdbId, epMap, epDates, seasons: maxS, totalEpisodes: totE || 8 };
      el("inl_sr_title").value = cine.name || q;
      el("inl_sr_imdb").value = parseFloat(cine.imdbRating) || 8.5;
      el("inl_sr_year").value = parseInt(cine.year) || 2024;
      if (cine.poster) el("inl_sr_poster").value = cine.poster;
      if (cine.background) el("inl_sr_backdrop").value = cine.background;
      el("inl_sr_seasons").value = maxS;
      el("inl_sr_totaleps").value = totE || 8;
      if (cine.description && !el("inl_sr_summary").value) {
        el("inl_sr_summary").value = cine.description;
      }
      toast("IMDb bilgileri başarıyla çekildi! ⚡");
    } catch (err) {
      toast("Hata: " + (err.message || "IMDb verisi alınamadı"));
    }
    btn.textContent = "⚡ IMDb'den Çek";
    btn.disabled = false;
  };

  if (existing && el("inl_del_sr_btn")) {
    el("inl_del_sr_btn").onclick = async () => {
      if (!confirm(`"${existing[0]}" dizisini ve tüm bölümlerini silmek istediğinize emin misiniz?`)) return;
      await API.deleteSeries(existing[0]);
      toast(`"${existing[0]}" silindi.`);
      closeInlineAdminModal();
      window.location.href = "diziler.html";
    };
  }

  el("inl_save_sr_btn").onclick = async () => {
    const title = (el("inl_sr_title")?.value || "").trim();
    if (!title) {
      toast("Dizi adı boş bırakılamaz.");
      return;
    }
    const isAnime = el("inl_sr_type")?.value === "anime";
    const genre = (el("inl_sr_genre")?.value || "Dram").trim();
    const imdb = parseFloat(el("inl_sr_imdb")?.value) || 8.0;
    const year = parseInt(el("inl_sr_year")?.value) || 2024;
    const status = el("inl_sr_status")?.value || "Devam Ediyor";
    const seasons = parseInt(el("inl_sr_seasons")?.value) || 1;
    const totalEpisodes = parseInt(el("inl_sr_totaleps")?.value) || 8;
    const poster = (el("inl_sr_poster")?.value || "").trim();
    const backdrop = (el("inl_sr_backdrop")?.value || "").trim();
    const summary = (el("inl_sr_summary")?.value || "").trim();

    const newMeta = Object.assign({}, meta, fetchedMeta || {}, {
      status,
      seasons,
      totalEpisodes
    });
    if (!newMeta.epMap || Object.keys(newMeta.epMap).length === 0) {
      newMeta.epMap = { "1": totalEpisodes };
    }

    if (summary) API.data.summaries[title] = summary;
    if (backdrop) API.data.backdrops[title] = backdrop;

    const item = [title, genre, imdb, year, poster, summary || backdrop, newMeta];
    const btn = el("inl_save_sr_btn");
    btn.disabled = true;
    btn.textContent = "⏳...";

    await API.saveSeries(item, isAnime, existing ? existing[0] : null);
    toast(`"${title}" başarıyla kaydedildi! ✓`);
    closeInlineAdminModal();

    if (typeof currentShow !== "undefined" && existing) {
      window.location.reload();
    } else if (typeof renderCatalog === "function") {
      renderCatalog();
    }
  };

  m.style.display = "flex";
}
window.openInlineSeriesModal = openInlineSeriesModal;

// 3. YERİNDE VİTRİN (HERO SLIDER 5 DİZİ) DÜZENLEME MODALI
function openInlineFeaturedModal() {
  if (!isAdmAuth()) return;
  const m = ensureInlineAdminModalContainer();
  const all = API.getAllSeries();
  const sortedAll = [...all].sort((a, b) => (a[0] || '').localeCompare(b[0] || '', 'tr'));

  let currentFeatured = (Array.isArray(API.data.featured) && API.data.featured.length > 0)
    ? [...API.data.featured]
    : (window.DEFAULT_FEATURED ? [...window.DEFAULT_FEATURED] : [
        "Breaking Bad",
        "Band of Brothers",
        "Avatar: The Last Airbender",
        "The Sopranos",
        "Over the Garden Wall"
      ]);

  while (currentFeatured.length < 5 && all.length > 0) {
    const unused = all.find(s => !currentFeatured.includes(s[0]));
    if (unused) currentFeatured.push(unused[0]);
    else break;
  }
  currentFeatured = currentFeatured.slice(0, 5);

  function renderSlots() {
    m.innerHTML = `
      <div class="auth-modal-box" style="max-width:560px;width:100%;padding:24px;max-height:90vh;overflow-y:auto;position:relative">
        <button class="auth-modal-close" onclick="closeInlineAdminModal()">×</button>
        <h2 style="margin:0 0 6px;font-size:19px;color:var(--tx)">🌟 Ana Sayfa Vitrinini Düzenle (5 Dizi)</h2>
        <p class="mut" style="font-size:12.5px;margin:0 0 16px">Vitrinde yalnızca sizin seçtiğiniz 5 dizi ve sıralaması yer alır.</p>

        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">
          ${currentFeatured.map((t, idx) => `
            <div style="display:flex;align-items:center;gap:10px;background:var(--input-bg);padding:10px 12px;border-radius:10px;border:1px solid var(--line)">
              <span style="background:var(--ac);color:#fff;font-size:12px;font-weight:700;padding:3px 8px;border-radius:8px">#${idx + 1}</span>
              <select class="auth-input inl-feat-sel" data-idx="${idx}" style="flex:1;padding:7px 10px">
                ${sortedAll.map(s => `<option value="${escapeHtml(s[0])}" ${s[0].toLowerCase().trim() === (t || '').toLowerCase().trim() ? 'selected' : ''}>${escapeHtml(s[0])} (★ ${s[2]})</option>`).join('')}
              </select>
              <button type="button" class="btn g inl-feat-up" data-idx="${idx}" ${idx===0?'disabled':''} style="padding:5px 9px">▲</button>
              <button type="button" class="btn g inl-feat-dn" data-idx="${idx}" ${idx===4?'disabled':''} style="padding:5px 9px">▼</button>
            </div>
          `).join('')}
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button type="button" class="btn g" onclick="closeInlineAdminModal()" style="padding:9px 16px">İptal</button>
          <button type="button" class="btn" id="inl_save_feat_btn" style="padding:9px 22px;font-weight:700">💾 Vitrini Kaydet</button>
        </div>
      </div>
    `;

    m.querySelectorAll(".inl-feat-sel").forEach(sel => {
      sel.onchange = e => {
        currentFeatured[parseInt(e.target.dataset.idx)] = e.target.value;
      };
    });
    m.querySelectorAll(".inl-feat-up").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.idx);
        if (i > 0) {
          const tmp = currentFeatured[i];
          currentFeatured[i] = currentFeatured[i - 1];
          currentFeatured[i - 1] = tmp;
          renderSlots();
        }
      };
    });
    m.querySelectorAll(".inl-feat-dn").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.idx);
        if (i < 4) {
          const tmp = currentFeatured[i];
          currentFeatured[i] = currentFeatured[i + 1];
          currentFeatured[i + 1] = tmp;
          renderSlots();
        }
      };
    });
    el("inl_save_feat_btn").onclick = async () => {
      const btn = el("inl_save_feat_btn");
      btn.disabled = true;
      btn.textContent = "⏳...";
      await API.saveFeatured(currentFeatured);
      toast("Ana sayfa vitrini güncellendi! 🌟");
      closeInlineAdminModal();
      if (typeof renderHero === "function") {
        window.location.reload();
      }
    };
  }

  renderSlots();
  m.style.display = "flex";
}
window.openInlineFeaturedModal = openInlineFeaturedModal;

// ==========================================
// 4. SON EKLENEN BÖLÜMLERİ SIRALAMA MODALI
// ==========================================
function openInlineRecentEpisodesOrderModal() {
  if (!isAdmAuth()) return;
  const m = ensureInlineAdminModalContainer();
  let epList = [...(API.data.episodes || [])];
  let filterQ = "";

  function renderList() {
    const q = filterQ.trim().toLowerCase();
    const visibleIndices = [];
    epList.forEach((ep, idx) => {
      const title = (Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t)) || '';
      const bNum = (ep.b !== undefined && ep.b !== null && ep.b !== '') ? ep.b : ((ep.e !== undefined && ep.e !== null && ep.e !== '') ? ep.e : 1);
      const text = `${title} ${ep.s} ${bNum} ${ep.ago || ''}`.toLowerCase();
      if (!q || text.includes(q)) {
        visibleIndices.push(idx);
      }
    });

    m.innerHTML = `
      <div class="auth-modal-box" style="max-width:680px;width:100%;padding:24px;max-height:92vh;display:flex;flex-direction:column;position:relative">
        <button class="auth-modal-close" onclick="closeInlineAdminModal()">×</button>
        <div style="margin-bottom:12px">
          <h2 style="margin:0 0 6px;font-size:20px;color:var(--tx);display:flex;align-items:center;gap:8px">
            <span>📑</span> <span>Son Eklenen Bölümleri Sırala</span>
            <span style="font-size:12px;background:var(--input-bg);color:var(--mut);border:1px solid var(--line);padding:2px 8px;border-radius:10px;font-weight:600">${epList.length} Bölüm</span>
          </h2>
          <p class="mut" style="font-size:12.5px;margin:0">
            Ana sayfada en başta görünmesini istediğiniz bölümleri yukarı taşıyabilir veya tek tıkla <b>En Başa</b> alabilirsiniz.
          </p>
        </div>

        <div style="margin-bottom:12px;position:relative">
          <input type="text" id="inl_ep_order_search" value="${escapeHtml(filterQ)}" placeholder="Dizi adı veya bölüm ara (örn: Sherlock, Ezel)..." class="auth-input" style="width:100%;padding:8px 12px;font-size:13px">
          ${filterQ ? `<button type="button" id="inl_ep_order_clear_search" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;color:var(--mut);cursor:pointer;font-size:16px">×</button>` : ''}
        </div>

        <div id="inl_ep_order_scroll" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px;margin-bottom:16px;max-height:55vh">
          ${visibleIndices.length === 0 ? `
            <div style="text-align:center;padding:32px 16px;color:var(--mut);font-size:13px">Eşleşen bölüm bulunamadı.</div>
          ` : visibleIndices.map(idx => {
            const ep = epList[idx];
            const title = (Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t)) || 'Dizi';
            const bNum = (ep.b !== undefined && ep.b !== null && ep.b !== '') ? ep.b : ((ep.e !== undefined && ep.e !== null && ep.e !== '') ? ep.e : 1);
            const cover = (typeof getCover === 'function') ? getCover(title) : '';
            return `
              <div class="inl-ep-order-row" data-idx="${idx}" style="display:flex;align-items:center;gap:10px;background:var(--input-bg);padding:8px 12px;border-radius:10px;border:1px solid var(--line);transition:background 0.15s ease">
                <span style="font-size:12px;font-weight:800;color:var(--mut);min-width:32px;text-align:center;background:rgba(255,255,255,0.05);padding:3px 6px;border-radius:6px">#${idx + 1}</span>
                ${cover ? `<img src="${cover}" style="width:32px;height:46px;object-fit:cover;border-radius:5px;flex-shrink:0" alt="${escapeHtml(title)}" onerror="this.style.display='none'">` : ''}
                <div style="flex:1;min-width:0">
                  <div style="font-size:13.5px;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    ${escapeHtml(title)}
                  </div>
                  <div style="font-size:12px;color:var(--mut);margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <span style="color:var(--ac);font-weight:600">${ep.s}. Sezon ${bNum}. Bölüm</span>
                    <span>·</span>
                    <span>${ep.ago || 'Yeni'}</span>
                    <span style="font-size:10px;background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:4px">${ep.q || '1080p'}</span>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
                  <button type="button" class="btn g inl-ep-top" data-idx="${idx}" ${idx===0?'disabled':''} title="En Başa Taşı (#1 Yap)" style="padding:4px 8px;font-size:11px;font-weight:700;color:var(--ac)">🔝 En Başa</button>
                  <button type="button" class="btn g inl-ep-up" data-idx="${idx}" ${idx===0?'disabled':''} title="1 Yukarı Taşı" style="padding:4px 8px;font-size:12px">▲</button>
                  <button type="button" class="btn g inl-ep-dn" data-idx="${idx}" ${idx===epList.length-1?'disabled':''} title="1 Aşağı Taşı" style="padding:4px 8px;font-size:12px">▼</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:14px">
          <span class="mut" style="font-size:12px">Değişikliklerin geçerli olması için kaydedin.</span>
          <div style="display:flex;gap:10px">
            <button type="button" class="btn g" onclick="closeInlineAdminModal()" style="padding:8px 16px">İptal</button>
            <button type="button" class="btn" id="inl_save_ep_order_btn" style="padding:8px 22px;font-weight:700">💾 Sıralamayı Kaydet</button>
          </div>
        </div>
      </div>
    `;

    const searchInput = el("inl_ep_order_search");
    if (searchInput) {
      searchInput.oninput = e => {
        filterQ = e.target.value;
        const scrollBox = el("inl_ep_order_scroll");
        const prevScroll = scrollBox ? scrollBox.scrollTop : 0;
        renderList();
        const newBox = el("inl_ep_order_scroll");
        if (newBox) newBox.scrollTop = prevScroll;
        const newInp = el("inl_ep_order_search");
        if (newInp) {
          newInp.focus();
          newInp.selectionStart = newInp.selectionEnd = newInp.value.length;
        }
      };
    }

    const clearBtn = el("inl_ep_order_clear_search");
    if (clearBtn) {
      clearBtn.onclick = () => {
        filterQ = "";
        renderList();
      };
    }

    m.querySelectorAll(".inl-ep-top").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.idx);
        if (i > 0) {
          const item = epList.splice(i, 1)[0];
          epList.unshift(item);
          renderList();
        }
      };
    });

    m.querySelectorAll(".inl-ep-up").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.idx);
        if (i > 0) {
          const tmp = epList[i];
          epList[i] = epList[i - 1];
          epList[i - 1] = tmp;
          renderList();
        }
      };
    });

    m.querySelectorAll(".inl-ep-dn").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.idx);
        if (i < epList.length - 1) {
          const tmp = epList[i];
          epList[i] = epList[i + 1];
          epList[i + 1] = tmp;
          renderList();
        }
      };
    });

    const saveBtn = el("inl_save_ep_order_btn");
    if (saveBtn) {
      saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = "⏳ Kaydediliyor...";
        await API.saveEpisodesOrder(epList);
        toast("Son eklenen bölümlerin sıralaması kaydedildi! 📑");
        closeInlineAdminModal();
        if (typeof changeEpPage === "function" && typeof curEpPage !== "undefined") {
          changeEpPage(curEpPage);
        } else if (typeof renderEpisodesList === "function") {
          renderEpisodesList();
        } else {
          window.location.reload();
        }
      };
    }
  }

  renderList();
  m.style.display = "flex";
}
window.openInlineRecentEpisodesOrderModal = openInlineRecentEpisodesOrderModal;


// ==========================================
// BÖLÜM NOTU PUSLU PENCERE (FROSTED MODAL)
// ==========================================
function openEpisodeNoteModal(showTitle, seasonNum, epNum, noteText) {
  const raw = String(noteText || "").trim();
  if (!raw) return;

  let m = document.getElementById("epNoteFrostedModal");
  if (!m) {
    m = document.createElement("div");
    m.id = "epNoteFrostedModal";
    m.style.cssText = "display:none;position:fixed;inset:0;z-index:10050;align-items:center;justify-content:center;padding:20px;background:rgba(8,12,24,0.58);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);animation:fadeIn 0.18s ease";
    m.addEventListener("click", e => {
      if (e.target === m) closeEpisodeNoteModal();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && m.style.display !== "none") closeEpisodeNoteModal();
    });
    document.body.appendChild(m);
  }

  const epHeaderLabel = showTitle
    ? `${escapeHtml(showTitle)} — ${parseInt(seasonNum) || 1}. Sezon ${parseInt(epNum) || 1}. Bölüm`
    : "Bölüm Notu";

  m.innerHTML = `
    <div style="width:100%;max-width:580px;max-height:82vh;display:flex;flex-direction:column;background:rgba(20,27,45,0.82);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid rgba(255,180,0,0.38);border-top:4px solid #ffb400;border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,0.68);color:var(--tx);overflow:hidden">
      <div style="padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:12px;min-width:0">
          <div style="width:40px;height:40px;border-radius:10px;background:rgba(255,180,0,0.14);border:1px solid rgba(255,180,0,0.32);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📝</div>
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <b style="font-size:16px;color:#fff">Bölüm Notu</b>
              <span style="font-size:10px;background:rgba(255,180,0,0.18);color:#ffb400;padding:2px 8px;border-radius:5px;font-weight:800;letter-spacing:0.4px">YÖNETİCİ & ÇEVİRMEN NOTU</span>
            </div>
            <div style="font-size:12.5px;color:rgba(255,255,255,0.65);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${epHeaderLabel}</div>
          </div>
        </div>
        <button type="button" onclick="closeEpisodeNoteModal()" style="width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.06);color:#fff;font-size:20px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" title="Kapat">×</button>
      </div>
      <div style="padding:20px 24px;overflow-y:auto;font-size:14px;color:rgba(255,255,255,0.92);line-height:1.72;white-space:pre-line;word-break:break-word">
        ${escapeHtml(raw)}
      </div>
      <div style="padding:13px 22px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.2);display:flex;justify-content:flex-end">
        <button type="button" onclick="closeEpisodeNoteModal()" class="btn g" style="padding:7px 20px;font-size:13px;font-weight:700;border-color:rgba(255,180,0,0.35);color:#ffb400;cursor:pointer">Kapat</button>
      </div>
    </div>
  `;
  m.style.display = "flex";
}

function closeEpisodeNoteModal() {
  const m = document.getElementById("epNoteFrostedModal");
  if (m) m.style.display = "none";
}

window.openEpisodeNoteModal = openEpisodeNoteModal;
window.closeEpisodeNoteModal = closeEpisodeNoteModal;



