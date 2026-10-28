// bolumdizi - Shared Client Utility, Authentication, Watchlist, Header & UI Functions

// Her sayfada ve sonradan eklenecek sayfalarda sekme logosunu (Favicon) garanti altına al
(function ensureSiteFavicon() {
  const FAVICON_SVG_DATA = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cdefs%3E%3ClinearGradient id='lg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23ff3b47'/%3E%3Cstop offset='1' stop-color='%23a30610'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='1' y='1' width='38' height='38' rx='10' fill='url(%23lg)'/%3E%3Cpath d='M15 11.5v17l14-8.5z' fill='%23fff'/%3E%3Crect x='8' y='31' width='24' height='2.5' rx='1.25' fill='%23fff' opacity='.9'/%3E%3Crect x='8' y='31' width='14' height='2.5' rx='1.25' fill='%23ffb400'/%3E%3C/svg%3E";

  function applyFavicon() {
    if (!document.head) return;
    let icon = document.querySelector("link[rel~='icon']");
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      icon.type = "image/svg+xml";
      icon.href = FAVICON_SVG_DATA;
      document.head.appendChild(icon);
    } else if (!icon.href || icon.href.includes("about:blank")) {
      icon.href = FAVICON_SVG_DATA;
    }

    if (!document.querySelector("link[rel='alternate icon'][href*='favicon.ico']")) {
      const icoLink = document.createElement("link");
      icoLink.rel = "alternate icon";
      icoLink.href = "/favicon.ico";
      document.head.appendChild(icoLink);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyFavicon);
  } else {
    applyFavicon();
  }
})();

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

// Takvim için bitmiş dizileri, geçmiş günleri ve sitede zaten yayınlanmış bölümleri filtreler
function getFilteredScheduleForWeek(schedule, allSeries, weekOffset = 0) {
  const safeSchedule = Array.isArray(schedule) ? schedule : [];
  const safeAll = Array.isArray(allSeries) ? allSeries : [];
  const offset = parseInt(weekOffset) || 0;
  const now = new Date();
  const currentDayOfWeek = (now.getDay() + 6) % 7; // 0: Pazartesi ... 6: Pazar

  return [0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
    // Bu hafta içinde bugünden önceki günlerde kalmış yayınları takvimde gösterme
    if (offset === 0 && dayIdx < currentDayOfWeek) {
      return [];
    }

    const rawItems = safeSchedule[dayIdx] || [];
    const activeItems = [];

    for (const item of rawItems) {
      if (!item || !item.name) continue;

      // Özel bir hafta offseti tanımlanmamışsa sadece bu hafta (offset === 0) için geçerlidir.
      // İleriki haftalar için yapay bölüm numarası arttırma yapılmaz.
      const itemOffset = (item.weekOffset !== undefined && item.weekOffset !== null) ? parseInt(item.weekOffset) : 0;
      if (itemOffset !== offset) {
        continue;
      }

      const showObj = safeAll.find(s => s && s[0] && s[0].toLowerCase().trim() === item.name.toLowerCase().trim());
      
      // Eğer dizi bulunursa veya bitmişse kontrol et
      if (showObj && isShowEnded(showObj)) {
        continue; // Bitmiş dizileri gösterme!
      }

      const epNum = parseInt(item.ep) || 1;

      // Sitede zaten yayınlanmış (eklenmiş) bölümleri takvimde gösterme!
      if (typeof API !== 'undefined' && API.data && Array.isArray(API.data.episodes)) {
        const alreadyPublished = API.data.episodes.some(e => {
          const t = Array.isArray(e.t) ? e.t[0] : (typeof e.t === 'object' ? e.t[0] : e.t);
          if (!t || t.toLowerCase().trim() !== item.name.toLowerCase().trim()) return false;
          if (parseInt(e.s) !== (parseInt(item.s) || 1)) return false;
          const num = (e.b !== undefined && e.b !== null && e.b !== '') ? parseInt(e.b) : parseInt(e.e);
          return num === epNum;
        });
        if (alreadyPublished) {
          continue; // Zaten sitede yayınlanmış olan bölümü takvime koyma!
        }
      }

      activeItems.push({
        ...item,
        ep: epNum
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

function formatTimeAgo(isoString) {
  if (!isoString) return "Az önce";
  const now = new Date();
  const d = new Date(isoString);
  const diffSec = Math.floor((now - d) / 1000);
  if (isNaN(diffSec) || diffSec < 60) return "Az önce";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dakika önce`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} gün önce`;
  return d.toLocaleDateString("tr-TR");
}
window.formatTimeAgo = formatTimeAgo;

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
  const isTr = (typeof isTurkishSeries === 'function') ? isTurkishSeries(item) : false;
  const langText = isTr ? '' : ' Türkçe Altyazılı';
  return `${name}, sürükleyici hikayesi ve yüksek IMDb puanıyla öne çıkan popüler bir ${item[1] || 'dizi'} yapımıdır. Tüm bölümleri Full HD${langText} olarak izleyebilirsiniz.`;
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

// Ülke Yardımcıları (Country & Flags)
const KNOWN_SHOW_COUNTRIES = {
  // Türkiye
  "ezel": "Türkiye",
  "şahsiyet": "Türkiye",
  "sahsiyet": "Türkiye",
  "leyla ile mecnun": "Türkiye",
  // Güney Kore
  "squid game": "Güney Kore",
  // Almanya
  "dark": "Almanya",
  "das boot": "Almanya",
  // Fransa
  "apocalypse: the second world war": "Fransa",
  // Polonya
  "dekalog": "Polonya",
  // Birleşik Krallık
  "sherlock": "Birleşik Krallık",
  "peaky blinders": "Birleşik Krallık",
  "black mirror": "Birleşik Krallık",
  "fleabag": "Birleşik Krallık",
  "downton abbey": "Birleşik Krallık",
  "the crown": "Birleşik Krallık",
  "fawlty towers": "Birleşik Krallık",
  "monty python's flying circus": "Birleşik Krallık",
  "pride and prejudice": "Birleşik Krallık",
  "blackadder goes forth": "Birleşik Krallık",
  "i, claudius": "Birleşik Krallık",
  "planet earth": "Birleşik Krallık",
  "planet earth ii": "Birleşik Krallık",
  "blue planet ii": "Birleşik Krallık",
  "the blue planet": "Birleşik Krallık",
  "our planet": "Birleşik Krallık",
  "the world at war": "Birleşik Krallık",
  "life": "Birleşik Krallık",
  "frozen planet": "Birleşik Krallık",
  "human planet": "Birleşik Krallık",
  "the beatles: anthology": "Birleşik Krallık",
  // ABD (Animasyon / Dizi)
  "avatar: the last airbender": "ABD",
  "the legend of korra": "ABD",
  "avatar: seven havens": "ABD"
};

function getSeriesCountry(item) {
  if (!item) return "Bilinmiyor";
  let titleStr = "";
  if (Array.isArray(item)) {
    if (Array.isArray(item[0])) {
      titleStr = String(item[0][0] || "");
    } else {
      titleStr = String(item[0] || "");
    }
  } else if (typeof item === "string") {
    titleStr = item;
  } else if (typeof item === "object") {
    titleStr = String(item.title || item.name || (Array.isArray(item.t) ? item.t[0] : item.t) || item[0] || "");
  }
  const normTitle = titleStr.toLowerCase().trim();
  if (normTitle && KNOWN_SHOW_COUNTRIES[normTitle]) {
    return KNOWN_SHOW_COUNTRIES[normTitle];
  }
  const meta = (Array.isArray(item) && item[6] && typeof item[6] === 'object') ? item[6] : null;
  if (meta && meta.country && typeof meta.country === 'string' && meta.country.trim()) {
    return meta.country.trim();
  }
  // Anime kontrolü (Sadece anime listesindekiler Japonya)
  const isAnime = (typeof API !== 'undefined' && API.data && Array.isArray(API.data.anime))
    ? API.data.anime.some(x => x && x[0] && String(x[0]).toLowerCase().trim() === normTitle)
    : false;
  if (isAnime) {
    return "Japonya";
  }
  return "ABD";
}
window.getSeriesCountry = getSeriesCountry;

function getCountryFlag(country) {
  const c = (country || '').toLowerCase().trim();
  if (c.includes('türkiye') || c === 'tr' || c === 'turkey') return '🇹🇷';
  if (c.includes('abd') || c.includes('amerika') || c === 'us' || c === 'usa' || c.includes('united states')) return '🇺🇸';
  if (c.includes('birleşik krallık') || c.includes('ingiltere') || c === 'gb' || c === 'uk' || c.includes('united kingdom')) return '🇬🇧';
  if (c.includes('japonya') || c === 'jp' || c === 'japan') return '🇯🇵';
  if (c.includes('güney kore') || c.includes('kore') || c === 'kr' || c === 'korea' || c.includes('south korea')) return '🇰🇷';
  if (c.includes('almanya') || c === 'de' || c === 'germany') return '🇩🇪';
  if (c.includes('fransa') || c === 'fr' || c === 'france') return '🇫🇷';
  if (c.includes('polonya') || c === 'pl' || c === 'poland') return '🇵🇱';
  if (c.includes('ispanya') || c === 'es' || c === 'spain') return '🇪🇸';
  if (c.includes('kanada') || c === 'ca' || c === 'canada') return '🇨🇦';
  if (c.includes('italya') || c === 'it' || c === 'italy') return '🇮🇹';
  return '🌍';
}
window.getCountryFlag = getCountryFlag;

function isTurkishSeries(titleOrItem) {
  if (!titleOrItem) return false;
  let item = null;
  let title = '';
  if (Array.isArray(titleOrItem)) {
    if (Array.isArray(titleOrItem[0])) {
      item = titleOrItem[0];
      title = String(item[0] || '');
    } else {
      item = titleOrItem;
      title = String(item[0] || '');
    }
  } else if (typeof titleOrItem === 'string') {
    title = titleOrItem;
    if (typeof API !== 'undefined' && typeof API.getSeriesDetail === 'function') {
      item = API.getSeriesDetail(title);
    } else if (typeof API !== 'undefined' && typeof API.getAllSeries === 'function') {
      const all = API.getAllSeries();
      const norm = title.toLowerCase().trim();
      item = all.find(x => x && x[0] && String(x[0]).toLowerCase().trim() === norm);
    }
  } else if (typeof titleOrItem === 'object') {
    title = titleOrItem.title || titleOrItem.name || (Array.isArray(titleOrItem.t) ? titleOrItem.t[0] : titleOrItem.t) || '';
    if (typeof API !== 'undefined' && typeof API.getSeriesDetail === 'function') {
      item = API.getSeriesDetail(title);
    }
  }
  const normTitle = (title || '').toLowerCase().trim();
  if (normTitle && KNOWN_SHOW_COUNTRIES[normTitle]) {
    const c = String(KNOWN_SHOW_COUNTRIES[normTitle]).toLowerCase();
    if (c.includes('türkiye') || c === 'tr' || c === 'turkey') return true;
  }
  if (item && Array.isArray(item)) {
    const meta = (item[6] && typeof item[6] === 'object') ? item[6] : {};
    const country = meta.country || (typeof getSeriesCountry === 'function' ? getSeriesCountry(item) : '');
    const c = String(country || '').toLowerCase().trim();
    if (c.includes('türkiye') || c === 'tr' || c === 'turkey') return true;
  }
  return false;
}
window.isTurkishSeries = isTurkishSeries;

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

function getUserWatchlistItems(user) {
  if (!user || !user.watchlist) return [];
  if (Array.isArray(user.watchlist)) return user.watchlist;
  if (typeof user.watchlist === 'object') {
    if (Array.isArray(user.watchlist.items)) return user.watchlist.items;
    if (Array.isArray(user.watchlist.shows)) return user.watchlist.shows;
  }
  return [];
}
window.getUserWatchlistItems = getUserWatchlistItems;

function getActiveWatchlist() {
  const user = getCurrentUser();
  if (user) return getUserWatchlistItems(user);
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

function mergeWatchedObjects(localObj = {}, cloudObj = {}) {
  const result = { ...(localObj || {}) };
  Object.keys(cloudObj || {}).forEach(showKey => {
    const k = showKey.toLowerCase().trim();
    if (!result[k]) {
      result[k] = cloudObj[showKey];
    } else {
      const combinedEps = Array.from(new Set([
        ...(result[k].episodes || []),
        ...(cloudObj[showKey].episodes || [])
      ]));
      result[k].episodes = combinedEps;

      const localLw = result[k].lastWatched;
      const cloudLw = cloudObj[showKey].lastWatched;
      if (cloudLw && (!localLw || (cloudLw.timestamp || 0) >= (localLw.timestamp || 0))) {
        result[k].lastWatched = cloudLw;
      }
      if (cloudObj[showKey].activeSeason) {
        result[k].activeSeason = cloudObj[showKey].activeSeason;
      }
    }
  });
  return result;
}
window.mergeWatchedObjects = mergeWatchedObjects;

function mergeGuestDataIntoUser(user) {
  if (!user) return user;
  const guestW = getGuestWatchlist();
  const currentItems = getUserWatchlistItems(user);
  if (guestW.length > 0) {
    guestW.forEach(gt => {
      if (!currentItems.some(w => (w || "").trim().toLowerCase() === gt.trim().toLowerCase())) {
        currentItems.unshift(gt);
      }
    });
    localStorage.removeItem(GUEST_WATCHLIST_KEY);
  }

  let userWatched = {};
  const userEpsKey = `${WATCHED_STORAGE_KEY}_${user.username.toLowerCase()}`;
  try {
    const uRaw = localStorage.getItem(userEpsKey);
    if (uRaw) userWatched = JSON.parse(uRaw);
  } catch (e) {}

  if (user.watchlist && typeof user.watchlist === "object" && user.watchlist.watched) {
    userWatched = mergeWatchedObjects(userWatched, user.watchlist.watched);
  }

  try {
    const guestEpsRaw = localStorage.getItem(`${WATCHED_STORAGE_KEY}_guest`) || localStorage.getItem("bd_watched_eps");
    if (guestEpsRaw) {
      const guestEps = JSON.parse(guestEpsRaw);
      userWatched = mergeWatchedObjects(userWatched, guestEps);
      localStorage.removeItem(`${WATCHED_STORAGE_KEY}_guest`);
      localStorage.removeItem("bd_watched_eps");
    }
  } catch (e) {}

  localStorage.setItem(userEpsKey, JSON.stringify(userWatched));

  user.watchlist = {
    items: currentItems,
    watched: userWatched
  };

  return user;
}

function setCurrentUser(user) {
  if (user) {
    user = mergeGuestDataIntoUser(user);
    const isAdmin = isAdminUser(user);
    const items = getUserWatchlistItems(user);
    const userEpsKey = `${WATCHED_STORAGE_KEY}_${user.username.toLowerCase()}`;
    let watched = {};
    try {
      const raw = localStorage.getItem(userEpsKey);
      if (raw) watched = JSON.parse(raw);
    } catch (e) {}
    if (user.watchlist && typeof user.watchlist === 'object' && user.watchlist.watched) {
      watched = mergeWatchedObjects(watched, user.watchlist.watched);
    }
    try {
      localStorage.setItem(userEpsKey, JSON.stringify(watched));
    } catch (e) {}

    const cleanUser = {
      id: user.id || null,
      username: user.username,
      email: user.email || "",
      role: isAdmin ? "admin" : (user.role || "member"),
      watchlist: {
        items: items,
        watched: watched
      }
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(cleanUser));
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
window.isAdmAuth = isAdmAuth;
window.isAdminUser = isAdminUser;

function updateAuthUI() {
  const user = getCurrentUser();
  const authBtn = el("userAuthBtn");
  const menuWrap = el("userMenuWrap");
  const navProf = el("nav_profil");
  if (navProf) navProf.remove();
  const udName = el("ud_name");
  const udEmail = el("ud_email");
  const menuName = el("userMenuName");
  const admLink = el("dropdownAdminLink");

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
    let comLink = el("dropdownAllCommentsLink");
    if (!comLink && admLink && admLink.parentNode) {
      comLink = document.createElement("a");
      comLink.id = "dropdownAllCommentsLink";
      comLink.className = "ud-item";
      comLink.href = "javascript:void(0)";
      comLink.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:13px;color:#c084fc;cursor:pointer";
      comLink.innerHTML = "💬 Sitedeki Tüm Yorumlar";
      comLink.onclick = e => {
        e.preventDefault();
        const dd = el("userDropdown");
        if (dd) dd.style.display = "none";
        if (typeof openInlineCommentsManagerModal === "function") openInlineCommentsManagerModal();
      };
      admLink.parentNode.insertBefore(comLink, admLink.nextSibling);
    }
    if (comLink) comLink.style.display = isAdmin ? "flex" : "none";
    const oldOrderLink = el("dropdownOrderEpisodesLink");
    if (oldOrderLink) oldOrderLink.remove();
  } else {
    if (authBtn) authBtn.style.display = "flex";
    if (menuWrap) menuWrap.style.display = "none";
    if (admLink) admLink.style.display = "none";
    const comLink = el("dropdownAllCommentsLink");
    if (comLink) comLink.style.display = "none";
    const oldOrderLink = el("dropdownOrderEpisodesLink");
    if (oldOrderLink) oldOrderLink.remove();
  }
  const isAdm = isAdmAuth();
  const admEpBtn = el("adm_ep_add_btn") || el("adm_add_ep_btn");
  if (admEpBtn) admEpBtn.style.display = isAdm ? "inline-flex" : "none";
  updateSupabaseStatusUI();
  updateMobileDrawerUI();
  if (typeof ensureNotificationBellUI === "function") ensureNotificationBellUI();
  if (typeof updateNotificationBadge === "function") updateNotificationBadge();
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
  const admComItem = el("drawerAdminCommentsItem");
  if (admComItem) admComItem.style.display = isAdmin ? "flex" : "none";
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
        <a href="javascript:void(0)" class="mobile-drawer-item" onclick="closeMobileDrawer();openNotificationCenterModal()">
          <span class="item-icon">🔔</span> <span>Yorum Bildirimleri</span>
          <span id="drawerNotifBadge" class="notif-badge" style="position:static;display:none;margin-left:auto">0</span>
        </a>

        <div class="mobile-drawer-section-title" id="drawerAdminTitle" style="display:none">Yönetim</div>
        <a href="javascript:void(0)" id="drawerAdminItem" class="mobile-drawer-item" style="display:none;color:var(--ac2)" onclick="closeMobileDrawer();openInlineAdminHubModal()">
          <span class="item-icon">⚡</span> <span>Hızlı Yönetim Menüsü</span>
        </a>
        <a href="javascript:void(0)" id="drawerAdminCommentsItem" class="mobile-drawer-item" style="display:none;color:#c084fc" onclick="closeMobileDrawer();openInlineCommentsManagerModal()">
          <span class="item-icon">💬</span> <span>Sitedeki Tüm Yorumlar</span>
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

let _syncUserCloudTimer = null;
async function syncUserCloudData(user) {
  if (!user) user = getCurrentUser();
  if (!user) return;
  if (!sbClient) initSupabase();
  if (!sbClient) return;

  const currentWatched = getWatchedData();
  const items = getUserWatchlistItems(user);

  const payload = {
    watchlist: {
      items: items,
      watched: currentWatched
    }
  };

  clearTimeout(_syncUserCloudTimer);
  _syncUserCloudTimer = setTimeout(async () => {
    try {
      if (user.id) {
        await sbClient.from("users").update(payload).eq("id", user.id);
      } else {
        await sbClient.from("users").update(payload).ilike("username", user.username);
      }
    } catch (err) {
      console.warn("User cloud sync error:", err);
    }
  }, 350);
}
window.syncUserCloudData = syncUserCloudData;

async function pullUserCloudData() {
  const user = getCurrentUser();
  if (!user) return false;
  if (!sbClient) initSupabase();
  if (!sbClient) return false;

  try {
    let query = sbClient.from("users").select("id, username, email, watchlist");
    if (user.id) query = query.eq("id", user.id);
    else query = query.ilike("username", user.username);
    const { data, error } = await query.limit(1);

    if (!error && data && data.length > 0) {
      const remoteUser = data[0];
      const remoteW = remoteUser.watchlist;
      const remoteItems = getUserWatchlistItems(remoteUser);
      const userEpsKey = `${WATCHED_STORAGE_KEY}_${user.username.toLowerCase()}`;

      let localWatched = {};
      try {
        const raw = localStorage.getItem(userEpsKey);
        if (raw) localWatched = JSON.parse(raw);
      } catch (e) {}

      let remoteWatched = {};
      if (remoteW && typeof remoteW === "object" && remoteW.watched) {
        remoteWatched = remoteW.watched;
      }

      // Merge local with remote
      const mergedWatched = mergeWatchedObjects(localWatched, remoteWatched);
      const mergedItems = Array.from(new Set([...getUserWatchlistItems(user), ...remoteItems]));

      localStorage.setItem(userEpsKey, JSON.stringify(mergedWatched));

      user.watchlist = {
        items: mergedItems,
        watched: mergedWatched
      };
      if (remoteUser.id) user.id = remoteUser.id;
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));

      if (typeof renderProfilePage === "function") {
        try { renderProfilePage(); } catch (e) {}
      }
      if (typeof renderEpisodeList === "function") {
        try {
          renderEpisodeList();
          if (typeof renderSeasonsTabs === "function") renderSeasonsTabs();
        } catch (e) {}
      }

      return true;
    }
  } catch (err) {
    console.warn("Pull user cloud data warning:", err);
  }
  return false;
}
window.pullUserCloudData = pullUserCloudData;

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

  let list = getActiveWatchlist();
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
    const currentWatched = getWatchedData();
    user.watchlist = {
      items: list,
      watched: currentWatched
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (e) {}
    syncUserCloudData(user);
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
  let localData = null;
  try {
    const raw = localStorage.getItem(key) || (!user ? localStorage.getItem("bd_watched_eps") : null);
    if (raw) localData = JSON.parse(raw);
  } catch (e) {}

  if (user && user.watchlist && typeof user.watchlist === 'object' && user.watchlist.watched) {
    if (!localData || Object.keys(localData).length === 0) {
      localData = user.watchlist.watched;
      try {
        localStorage.setItem(key, JSON.stringify(localData));
      } catch (e) {}
    } else {
      localData = mergeWatchedObjects(localData, user.watchlist.watched);
    }
  }

  return localData || {};
}

function saveWatchedData(data) {
  const user = getCurrentUser();
  const key = user ? `${WATCHED_STORAGE_KEY}_${user.username.toLowerCase()}` : `${WATCHED_STORAGE_KEY}_guest`;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}

  if (user) {
    const items = getUserWatchlistItems(user);
    user.watchlist = {
      items: items,
      watched: data
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch (e) {}
    syncUserCloudData(user);
  }
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
  const sNum = parseInt(season) || 1;
  const epNum = parseInt(episode) || 1;
  if (!data[key]) data[key] = { episodes: [], activeSeason: sNum };
  const epKey = `S${sNum}E${epNum}`;
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

  if (watched) {
    data[key].lastWatched = {
      s: sNum,
      ep: epNum,
      timestamp: Date.now()
    };
    data[key].activeSeason = sNum;
  } else {
    // If unwatched and lastWatched was this episode, update lastWatched to the highest remaining watched episode
    if (data[key].lastWatched && data[key].lastWatched.s === sNum && data[key].lastWatched.ep === epNum) {
      const remaining = (list || []).map(str => {
        const m = String(str).match(/S(\d+)E(\d+)/i);
        return m ? { s: parseInt(m[1]), ep: parseInt(m[2]) } : null;
      }).filter(Boolean);
      if (remaining.length > 0) {
        remaining.sort((a, b) => (a.s - b.s) || (a.ep - b.ep));
        const highest = remaining[remaining.length - 1];
        data[key].lastWatched = { s: highest.s, ep: highest.ep, timestamp: Date.now() };
      } else {
        delete data[key].lastWatched;
      }
    }
  }

  saveWatchedData(data);
  return watched;
}

function recordLastWatchedEpisode(showTitle, season, episode, alsoMarkWatched = false) {
  if (!showTitle) return;
  const data = getWatchedData();
  const key = (showTitle || "").toLowerCase();
  const sNum = parseInt(season) || 1;
  const epNum = parseInt(episode) || 1;
  if (!data[key]) data[key] = { episodes: [], activeSeason: sNum };
  data[key].lastWatched = {
    s: sNum,
    ep: epNum,
    timestamp: Date.now()
  };
  data[key].activeSeason = sNum;
  if (alsoMarkWatched) {
    const epKey = `S${sNum}E${epNum}`;
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

  const sTitle = showObj[0];
  const meta = showObj[6] && typeof showObj[6] === "object" ? showObj[6] : null;
  const epMap = (meta && meta.epMap) ? meta.epMap : {};

  // Parse watched list into uppercase set and sorted numeric list
  const watchedSet = new Set((epList || []).map(str => String(str).toUpperCase().trim()));

  const watchedItems = (epList || []).map(str => {
    const m = String(str).match(/S(\d+)E(\d+)/i);
    return m ? { s: parseInt(m[1]), ep: parseInt(m[2]) } : null;
  }).filter(Boolean);

  // Sort by season asc, then episode asc
  watchedItems.sort((a, b) => (a.s - b.s) || (a.ep - b.ep));

  // Helper to determine the episode range for a given season
  const getSeasonEpisodesRange = (sNum) => {
    let sKnown = (epMap[sNum] !== undefined ? epMap[sNum] : epMap[String(sNum)]);
    sKnown = sKnown ? parseInt(sKnown) : 0;

    let sMaxAdded = 0;
    let sHasZero = false;
    if (typeof API !== "undefined" && API.getEpisodes) {
      const addedInS = API.getEpisodes(sTitle).filter(e => parseInt(e.s) === sNum);
      sHasZero = addedInS.some(e => {
        const num = (e.b !== undefined && e.b !== null && e.b !== '') ? parseInt(e.b) : parseInt(e.e);
        return num === 0;
      });
      sMaxAdded = addedInS.reduce((m, e) => {
        const num = (e.b !== undefined && e.b !== null && e.b !== '') ? parseInt(e.b) : parseInt(e.e);
        return Math.max(m, isNaN(num) ? 0 : num);
      }, 0);
    }

    if (watchedSet.has(`S${sNum}E0`)) sHasZero = true;
    const sMaxWatched = watchedItems.filter(item => item.s === sNum).reduce((m, item) => Math.max(m, item.ep), 0);
    const startEp = sHasZero ? 0 : 1;
    const maxEp = Math.max(sKnown, sMaxAdded, sMaxWatched, 8);
    return { startEp, maxEp };
  };

  // Determine total seasons
  let maxSeasonInAdded = 1;
  if (typeof API !== "undefined" && API.getEpisodes) {
    const allEps = API.getEpisodes(sTitle);
    maxSeasonInAdded = allEps.reduce((m, e) => Math.max(m, parseInt(e.s) || 1), 1);
  }
  const maxSeasonWatched = watchedItems.reduce((m, item) => Math.max(m, item.s), 1);
  const metaSeasons = (meta && meta.seasons) ? parseInt(meta.seasons) : 1;
  const totalSeasons = Math.max(metaSeasons, maxSeasonInAdded, maxSeasonWatched, 1);

  // If nothing watched at all
  if (watchedItems.length === 0 && (!lastWatchedObj || !lastWatchedObj.s || !lastWatchedObj.ep)) {
    let firstS = 1;
    let firstB = 1;
    if (typeof API !== "undefined" && API.getEpisodes) {
      const showEps = API.getEpisodes(sTitle).filter(e => typeof hasRealEpisodeVideo === "function" ? hasRealEpisodeVideo(e) : Boolean(e.embed || (e.players && e.players.length)));
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
        const allShowEps = API.getEpisodes(sTitle);
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

  // Determine last watched episode (where the user actually reached)
  const highestWatched = watchedItems.length > 0 ? watchedItems[watchedItems.length - 1] : null;

  let lastS = 1;
  let lastEp = 1;

  if (highestWatched) {
    lastS = highestWatched.s;
    lastEp = highestWatched.ep;

    // Only accept lastWatchedObj if it was actually watched and is valid
    if (lastWatchedObj && lastWatchedObj.s && lastWatchedObj.ep) {
      const lwS = parseInt(lastWatchedObj.s);
      const lwEp = parseInt(lastWatchedObj.ep);
      const lwKey = `S${lwS}E${lwEp}`;
      if (watchedSet.has(lwKey) && ((lwS > highestWatched.s) || (lwS === highestWatched.s && lwEp > highestWatched.ep))) {
        lastS = lwS;
        lastEp = lwEp;
      }
    }
  } else if (lastWatchedObj && lastWatchedObj.s && lastWatchedObj.ep) {
    lastS = parseInt(lastWatchedObj.s);
    lastEp = parseInt(lastWatchedObj.ep);
  }

  // Find the NEXT unwatched episode
  let nextS = lastS;
  let nextEp = lastEp + 1;
  let found = false;

  // 1. Search forward from immediately after lastS, lastEp up to totalSeasons
  for (let s = nextS; s <= totalSeasons; s++) {
    const range = getSeasonEpisodesRange(s);
    const startEp = (s === nextS) ? nextEp : range.startEp;

    for (let ep = startEp; ep <= range.maxEp; ep++) {
      const epKey = `S${s}E${ep}`;
      if (!watchedSet.has(epKey)) {
        nextS = s;
        nextEp = ep;
        found = true;
        break;
      }
    }
    if (found) break;
  }

  // 2. If not found forward, search from S1 to totalSeasons for any earlier unwatched episode
  if (!found) {
    for (let s = 1; s <= totalSeasons; s++) {
      const range = getSeasonEpisodesRange(s);
      for (let ep = range.startEp; ep <= range.maxEp; ep++) {
        const epKey = `S${s}E${ep}`;
        if (!watchedSet.has(epKey)) {
          nextS = s;
          nextEp = ep;
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  // 3. If still not found, all episodes in all seasons are completely watched!
  if (!found) {
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
  const sNum = parseInt(season) || 1;
  const totEps = parseInt(totalEpisodes) || 8;
  if (!data[key]) data[key] = { episodes: [], activeSeason: sNum };
  let list = data[key].episodes || [];
  for (let b = 1; b <= totEps; b++) {
    const epKey = `S${sNum}E${b}`;
    const idx = list.indexOf(epKey);
    if (markWatched && idx === -1) list.push(epKey);
    else if (!markWatched && idx > -1) list.splice(idx, 1);
  }
  data[key].episodes = list;

  if (markWatched) {
    data[key].lastWatched = {
      s: sNum,
      ep: totEps,
      timestamp: Date.now()
    };
    data[key].activeSeason = sNum;
  } else {
    const remaining = (list || []).map(str => {
      const m = String(str).match(/S(\d+)E(\d+)/i);
      return m ? { s: parseInt(m[1]), ep: parseInt(m[2]) } : null;
    }).filter(Boolean);
    if (remaining.length > 0) {
      remaining.sort((a, b) => (a.s - b.s) || (a.ep - b.ep));
      const highest = remaining[remaining.length - 1];
      data[key].lastWatched = { s: highest.s, ep: highest.ep, timestamp: Date.now() };
    } else {
      delete data[key].lastWatched;
    }
  }

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

  let lastMaxEps = 8;
  for (let s = 1; s <= maxSeasons; s++) {
    const maxEps = (meta && meta.epMap && meta.epMap[s]) ? parseInt(meta.epMap[s]) : 8;
    lastMaxEps = maxEps;
    for (let b = 1; b <= maxEps; b++) {
      const epKey = `S${s}E${b}`;
      const idx = list.indexOf(epKey);
      if (markWatched && idx === -1) list.push(epKey);
      else if (!markWatched && idx > -1) list.splice(idx, 1);
    }
  }
  data[key].episodes = list;

  if (markWatched) {
    data[key].lastWatched = {
      s: maxSeasons,
      ep: lastMaxEps,
      timestamp: Date.now()
    };
    data[key].activeSeason = maxSeasons;
  } else {
    delete data[key].lastWatched;
  }

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
    delete data[key].lastWatched;
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
  if (user) {
    const items = getUserWatchlistItems(user).filter(t => (t || "").toLowerCase().trim() !== targetTitle);
    user.watchlist = {
      items: items,
      watched: getWatchedData()
    };
    setCurrentUser(user);
    syncUserCloudData(user);
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
  const title = (Array.isArray(item) ? (Array.isArray(item[0]) ? String(item[0][0] || '') : String(item[0] || '')) : String(item || '')).toLowerCase().trim();
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
    dd.innerHTML = `
      <div class="sres-empty">
        <span class="sres-empty-icon">🔍</span>
        <div class="sres-empty-title">Sonuç bulunamadı</div>
        <div class="sres-empty-sub">"${escapeHtml(rawVal)}" ile eşleşen dizi veya anime yok.</div>
      </div>
    `;
  } else {
    const topMatches = matches.slice(0, 6);
    dd.innerHTML = `
      <div class="sres-header">
        <span>Arama Sonuçları</span>
        <span class="sres-header-count">${matches.length} içerik</span>
      </div>
      <div class="sres-list">
        ${topMatches.map((t, idx) => {
          const cover = t[4] || (typeof getCover === "function" ? getCover(t[0]) : "");
          const d = (typeof getD === "function") ? getD(all.indexOf(t)) : ["#222, #111", ""];
          const thumbHtml = cover 
            ? `<img class="sres-thumb" src="${cover}" alt="${escapeHtml(t[0])}" loading="lazy">` 
            : `<div class="sres-thumb sres-thumb-fallback" style="background:linear-gradient(160deg,${d[0]})">${escapeHtml(t[0].slice(0,2))}</div>`;
          const showUrl = (typeof buildShowUrl === "function") ? buildShowUrl(t[0]) : `dizi.html?s=${encodeURIComponent(t[0])}`;
          const isAnime = (typeof API !== 'undefined' && API.data && Array.isArray(API.data.anime))
            ? API.data.anime.some(x => x && x[0] && x[0].toLowerCase().trim() === t[0].toLowerCase().trim())
            : false;
          const typeBadge = isAnime ? `<span class="sres-type-pill">Anime</span>` : `<span class="sres-type-pill">Dizi</span>`;
          return `
            <a class="sres-item" href="${showUrl}">
              ${thumbHtml}
              <div class="sres-info">
                <div class="sres-title">${escapeHtml(t[0])}</div>
                <div class="sres-meta">
                  <span class="sres-imdb">★ ${t[2] || '—'}</span>
                  ${typeBadge}
                  <span class="sres-meta-text">${escapeHtml(t[1] || '')}</span>
                  ${t[3] ? `<span>·</span><span>${t[3]}</span>` : ''}
                </div>
              </div>
              <span class="sres-chevron">›</span>
            </a>
          `;
        }).join("")}
      </div>
      <a class="sres-footer" href="diziler.html?q=${encodeURIComponent(qv)}">
        <span class="sres-footer-text">Tüm sonuçları gör</span>
        <span class="sres-footer-badge">${matches.length} dizi & anime</span>
        <span class="sres-footer-arrow">→</span>
      </a>
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
        let epDates = {};
        let epTitles = {};
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
                const b = parseInt(e.number) || 1;
                const epKey = `${s}_${b}`;
                epMap[s] = (epMap[s] || 0) + 1;
                if (s > maxSeason) maxSeason = s;
                if (e.airdate || e.airstamp) epDates[epKey] = formatEpisodeAirDate(e.airdate || e.airstamp);
                if (e.name) epTitles[epKey] = e.name.trim();
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
          epMap,
          epDates,
          epTitles
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

// --- CANLI SİTEDE GEZİNENLER RADARI (REALTIME PRESENCE) ---
let _presenceChannel = null;
let _presenceHeartbeatTimer = null;
const _presenceListeners = [];

function registerPresenceListener(cb) {
  if (typeof cb === "function") {
    _presenceListeners.push(cb);
    if (_presenceChannel) {
      try { cb(_presenceChannel.presenceState()); } catch (e) {}
    }
  }
}
window.registerPresenceListener = registerPresenceListener;

function getFormattedCurrentPageName() {
  const path = window.location.pathname || "";
  const params = new URLSearchParams(window.location.search);

  if (path.includes("bolum.html") || path.includes("-bolum")) {
    const s = params.get("s") || "";
    const se = params.get("se") || "1";
    const ep = params.get("ep") || "1";
    return s ? `${s} (${se}. Sezon ${ep}. Bölüm)` : "Bölüm İzliyor";
  }
  if (path.includes("dizi.html") || (path !== "/" && !path.includes(".html") && !path.includes("/public/"))) {
    const s = params.get("s") || "";
    return s ? `${s} (Dizi Detay)` : "Dizi İnceleme";
  }
  if (path.includes("diziler.html")) return "Diziler ve Animeler";
  if (path.includes("animeler.html")) return "Animeler";
  if (path.includes("forum.html")) return "Forum";
  if (path.includes("profil.html")) return "Profil & Takip Listesi";
  if (path.includes("iletisim.html")) return "İletişim";
  return "Ana Sayfa";
}
window.getFormattedCurrentPageName = getFormattedCurrentPageName;

function getActiveVisitorsList() {
  const visitors = [];
  const currentUser = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  const myVisitorId = sessionStorage.getItem("bd_visitor_id") || "v_local";

  let state = {};
  if (_presenceChannel) {
    try {
      state = _presenceChannel.presenceState() || {};
    } catch (e) {}
  }

  const seenIds = new Set();
  for (const key in state) {
    if (Array.isArray(state[key])) {
      state[key].forEach(v => {
        if (v && v.visitorId && !seenIds.has(v.visitorId)) {
          seenIds.add(v.visitorId);
          visitors.push(v);
        }
      });
    }
  }

  // Ensure self is in the list
  if (!seenIds.has(myVisitorId)) {
    const isAdm = currentUser && (typeof isAdminUser === "function" ? isAdminUser(currentUser) : false);
    visitors.unshift({
      visitorId: myVisitorId,
      displayName: currentUser ? currentUser.username : "Misafir #" + myVisitorId.slice(-4).toUpperCase(),
      isGuest: !currentUser,
      isAdmin: isAdm,
      pageName: getFormattedCurrentPageName(),
      url: window.location.pathname + window.location.search,
      device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "Mobil" : "Masaüstü",
      joinedAt: parseInt(sessionStorage.getItem("bd_visitor_joined") || Date.now()),
      lastSeen: Date.now()
    });
  }

  // Sort: Admins first, then active members, then guests; sorted by recent activity
  visitors.sort((a, b) => {
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    if (!a.isGuest && b.isGuest) return -1;
    if (a.isGuest && !b.isGuest) return 1;
    return (b.lastSeen || 0) - (a.lastSeen || 0);
  });

  return visitors;
}
window.getActiveVisitorsList = getActiveVisitorsList;

function initSitePresence() {
  if (!sbClient && typeof initSupabase === "function") initSupabase();
  if (!sbClient) return;

  let visitorId = sessionStorage.getItem("bd_visitor_id");
  if (!visitorId) {
    visitorId = "v_" + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem("bd_visitor_id", visitorId);
  }
  if (!sessionStorage.getItem("bd_visitor_joined")) {
    sessionStorage.setItem("bd_visitor_joined", String(Date.now()));
  }

  const currentUser = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  const isAdm = currentUser && (typeof isAdminUser === "function" ? isAdminUser(currentUser) : false);
  const displayName = currentUser ? currentUser.username : ("Misafir #" + visitorId.slice(-4).toUpperCase());

  const payload = {
    visitorId,
    displayName,
    isGuest: !currentUser,
    isAdmin: isAdm,
    pageName: getFormattedCurrentPageName(),
    url: window.location.pathname + window.location.search,
    device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "Mobil" : "Masaüstü",
    joinedAt: parseInt(sessionStorage.getItem("bd_visitor_joined") || Date.now()),
    lastSeen: Date.now()
  };

  try {
    _presenceChannel = sbClient.channel("site_presence_radar", {
      config: { presence: { key: visitorId } }
    });

    const notifyListeners = () => {
      try {
        const state = _presenceChannel.presenceState();
        _presenceListeners.forEach(fn => { try { fn(state); } catch (e) {} });
      } catch (e) {}
    };

    _presenceChannel
      .on("presence", { event: "sync" }, notifyListeners)
      .on("presence", { event: "join" }, notifyListeners)
      .on("presence", { event: "leave" }, notifyListeners);

    _presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await _presenceChannel.track(payload);
          notifyListeners();
        } catch (e) {}
      }
    });

    // Heartbeat every 20s
    clearInterval(_presenceHeartbeatTimer);
    _presenceHeartbeatTimer = setInterval(() => {
      if (_presenceChannel && document.visibilityState === "visible") {
        payload.lastSeen = Date.now();
        _presenceChannel.track(payload).catch(() => {});
      }
    }, 20000);

    document.addEventListener("visibilitychange", () => {
      if (_presenceChannel && document.visibilityState === "visible") {
        payload.lastSeen = Date.now();
        _presenceChannel.track(payload).catch(() => {});
      }
    });

    window.addEventListener("beforeunload", () => {
      if (_presenceChannel) {
        _presenceChannel.untrack().catch(() => {});
      }
    });
  } catch (err) {
    console.warn("Site presence init warning:", err);
  }
}
window.initSitePresence = initSitePresence;

// Global Event Listeners (Theme, Search, Modals, Clicks)
document.addEventListener("DOMContentLoaded", () => {
  initMobileNavigation();
  initNotificationSystem();

  if (getCurrentUser()) {
    pullUserCloudData().catch(() => {});
  }

  // Live presence radar for active visitors
  initSitePresence();

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
    qEl.addEventListener("focus", () => {
      if (qEl.value.trim()) renderSearchLive();
    });
    qEl.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch();
      } else if (e.key === "Escape") {
        const dd = el("searchDropdown");
        if (dd) dd.style.display = "none";
      }
    });
    document.addEventListener("click", e => {
      const wrap = qEl.closest(".search-wrap");
      const dd = el("searchDropdown");
      if (dd && wrap && !wrap.contains(e.target)) {
        dd.style.display = "none";
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
          // Check public.users to find their exact user record
          const { data } = await sbClient
            .from("users")
            .select("*")
            .or(`username.ilike.${u},email.ilike.${u}`)
            .eq("password", p)
            .limit(1);

          if (data && data.length > 0) {
            const fetchedUser = data[0];
            setCurrentUser(fetchedUser);

            // In background, ensure user is registered in Supabase Auth (Authentication > Users)
            if (fetchedUser.email) {
              try {
                const uVal = fetchedUser.username;
                sbClient.auth.signUp({
                  email: fetchedUser.email,
                  password: p,
                  options: {
                    data: {
                      username: uVal,
                      user_name: uVal,
                      name: uVal,
                      full_name: uVal,
                      display_name: uVal,
                      role: (uVal === 'bolumdizi' || fetchedUser.email === 'bolumdizi2@gmail.com') ? 'admin' : 'member'
                    }
                  }
                }).catch(() => {});
              } catch (e) {}
            }

            try {
              await syncUserCloudData(fetchedUser);
            } catch (err) {}
            closeAuthModal();
            toast(`Giriş başarılı! Hoş geldin, ${fetchedUser.username} 🎉`);
            setTimeout(() => window.location.reload(), 300);
            return;
          }

          // If not matched in public.users, attempt direct Supabase Auth login if email provided
          if (u.includes("@")) {
            try {
              const { data: aData, error: aErr } = await sbClient.auth.signInWithPassword({ email: u, password: p });
              if (!aErr && aData && aData.user) {
                const uname = aData.user.user_metadata?.username || u.split('@')[0];
                const newUser = {
                  id: aData.user.id,
                  username: uname,
                  email: aData.user.email,
                  role: (uname.toLowerCase() === 'bolumdizi' || u.toLowerCase() === 'bolumdizi2@gmail.com') ? 'admin' : 'member',
                  watchlist: { items: [], watched: {} }
                };
                try {
                  await sbClient.from("users").insert([newUser]);
                } catch (e) {}
                setCurrentUser(newUser);
                closeAuthModal();
                toast(`Giriş başarılı! Hoş geldin, ${uname} 🎉`);
                setTimeout(() => window.location.reload(), 300);
                return;
              }
            } catch (e) {}
          }
        } catch (err) {}
      }

      // Default local admin fallback
      if (u === "bolumdizi" && (p === "admin" || p === "bolumdizi" || p === "123456")) {
        setCurrentUser({ username: "bolumdizi", email: "bolumdizi2@gmail.com", role: "admin", watchlist: { items: [], watched: {} } });
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
          // 1. Check if username or email already registered in public.users
          const { data: existing } = await sbClient
            .from("users")
            .select("id,username,email")
            .or(`username.ilike.${u},email.ilike.${em}`)
            .limit(1);
          if (existing && existing.length > 0) {
            toast("Bu kullanıcı adı veya e-posta zaten kullanımda! Lütfen farklı bir bilgi deneyin.");
            return;
          }

          // 2. Register user in Supabase Auth (Authentication > Users dashboard)
          let authUserId = null;
          try {
            const { data: authData, error: authErr } = await sbClient.auth.signUp({
              email: em,
              password: p,
              options: {
                data: {
                  username: u,
                  user_name: u,
                  name: u,
                  full_name: u,
                  display_name: u,
                  role: (u.toLowerCase() === 'bolumdizi' || em.toLowerCase() === 'bolumdizi2@gmail.com') ? 'admin' : 'member'
                }
              }
            });
            if (authData && authData.user && authData.user.id) {
              authUserId = authData.user.id;
            }
            if (authErr) {
              console.warn("Supabase auth.signUp:", authErr.message || authErr);
            }
          } catch (aErr) {
            console.warn("Supabase auth.signUp exception:", aErr);
          }

          // 3. Save to public.users table for profile & watchlist data sync
          const initialWatchlist = {
            items: (typeof getGuestWatchlist === "function") ? getGuestWatchlist() : [],
            watched: (typeof getWatchedData === "function") ? getWatchedData() : {}
          };

          const userRow = {
            username: u,
            email: em,
            password: p,
            watchlist: initialWatchlist
          };
          if (authUserId) {
            userRow.id = authUserId;
          }

          const { data, error } = await sbClient
            .from("users")
            .insert([userRow])
            .select();

          if (!error && data && data.length > 0) {
            setCurrentUser(data[0]);
            closeAuthModal();
            toast(`Hesabınız oluşturuldu! Hoş geldin, ${u} ⚡`);
            setTimeout(() => window.location.reload(), 300);
            return;
          } else if (authUserId) {
            const fallbackUser = {
              id: authUserId,
              username: u,
              email: em,
              role: "member",
              watchlist: initialWatchlist
            };
            setCurrentUser(fallbackUser);
            closeAuthModal();
            toast(`Hesabınız oluşturuldu! Hoş geldin, ${u} ⚡`);
            setTimeout(() => window.location.reload(), 300);
            return;
          }
        } catch (err) {
          console.error("Registration error:", err);
        }
      }

      // Local save fallback
      setCurrentUser({ username: u, email: em, role: "member", watchlist: [] });
      closeAuthModal();
      toast(`Hesabınız oluşturuldu! Hoş geldin, ${u} 🎉`);
      setTimeout(() => window.location.reload(), 300);
    };
  }

  // Supabase Auth Toplu Senkronizasyon Yardımcısı (Mevcut üyeleri Authentication > Users'a aktarma)
  async function syncExistingUsersToSupabaseAuth() {
    if (!sbClient) return { success: false, message: "Supabase istemcisi aktif değil!" };
    try {
      const { data: rows, error } = await sbClient.from("users").select("id, username, email, password");
      if (error || !rows) return { success: false, message: error?.message || "Kullanıcılar okunamadı" };

      let synced = 0;
      let failed = 0;
      for (const r of rows) {
        if (!r.email || !r.password || r.username === "__site_content__") continue;
        try {
          const uVal = r.username;
          const { data, error: sErr } = await sbClient.auth.signUp({
            email: r.email,
            password: r.password,
            options: {
              data: {
                username: uVal,
                user_name: uVal,
                name: uVal,
                full_name: uVal,
                display_name: uVal,
                role: (uVal === 'bolumdizi' || r.email === 'bolumdizi2@gmail.com') ? 'admin' : 'member'
              }
            }
          });
          if (data && data.user) synced++;
          else failed++;
        } catch (e) {
          failed++;
        }
      }
      return { success: true, synced, failed };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
  window.syncExistingUsersToSupabaseAuth = syncExistingUsersToSupabaseAuth;

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
        <button type="button" class="btn g" style="padding:12px 16px;font-size:14px;justify-content:flex-start;gap:10px" onclick="openInlineScheduleModal()">
          <span>📅</span> <span>Yayın Takvimini Düzenle</span>
        </button>
        <button type="button" class="btn g" style="padding:12px 16px;font-size:14px;justify-content:flex-start;gap:10px;border-color:rgba(168,85,247,0.4);color:#c084fc" onclick="openInlineCommentsManagerModal()">
          <span>💬</span> <span>Sitedeki Tüm Yorumları İncele & Yönet</span>
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
  const sVal = Math.max(1, parseInt(seasonNum) || 1);

  // Eğer bölüm numarası belirtilmemişse o sezonun en son bölümünün bir fazlasını öner
  let bVal = 1;
  if (epNum !== undefined && epNum !== null && !isNaN(parseInt(epNum))) {
    bVal = parseInt(epNum);
  } else {
    const existingForShow = (API.data.episodes || []).filter(e => {
      const et = Array.isArray(e.t) ? e.t[0] : (typeof e.t === 'object' ? (e.t.title || e.t[0]) : e.t);
      return (et || '').toLowerCase().trim() === curShowTitle.toLowerCase().trim() && parseInt(e.s) === sVal;
    });
    const maxEpFound = existingForShow.reduce((max, e) => Math.max(max, parseInt(e.b !== undefined ? e.b : (e.e || 0))), 0);
    const metaObj = (all.find(x => x[0].toLowerCase().trim() === curShowTitle.toLowerCase().trim()) || [])[6] || {};
    const knownCount = (metaObj.epMap && (metaObj.epMap[sVal] || metaObj.epMap[String(sVal)])) ? parseInt(metaObj.epMap[sVal] || metaObj.epMap[String(sVal)]) : 0;
    bVal = Math.max(maxEpFound, knownCount, 0) + 1;
  }

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

  const isTrInitial = (typeof isTurkishSeries === 'function') ? isTurkishSeries(curShowTitle) : false;
  const lgVal = isTrInitial ? "" : "Altyazı";
  const qVal = currEp ? (typeof getEpQuality === "function" ? getEpQuality(currEp) : (currEp.q || "1080p")) : "1080p";
  const agoVal = currEp ? (currEp.ago || "Yeni") : "Yeni";
  const noteVal = currEp ? (currEp.note || "") : "";
  const finaleVal = currEp ? (currEp.finale || "auto") : "auto";
  const titleVal = currEp ? (currEp.title || currEp.epTitle || currEp.name || "") : "";

  const sortedAll = [...all].sort((a, b) => (a[0] || '').localeCompare(b[0] || '', 'tr'));

  m.innerHTML = `
    <div class="auth-modal-box" style="max-width:650px;width:100%;padding:24px;max-height:90vh;overflow-y:auto;position:relative">
      <button class="auth-modal-close" onclick="closeInlineAdminModal()">×</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <h2 id="inl_ep_modal_title" style="margin:0;font-size:19px;color:var(--tx)">
          ${currEp ? `✏️ Bölümü Düzenle: ${escapeHtml(curShowTitle)} S${sVal}B${bVal}` : `➕ Yeni Bölüm Ekle: ${escapeHtml(curShowTitle)} S${sVal}B${bVal}`}
        </h2>
        <span id="inl_ep_status_badge" style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:6px;background:${currEp?'rgba(255,180,0,0.18)':'rgba(74,222,128,0.18)'};color:${currEp?'#ffb400':'#4ade80'}">
          ${currEp ? 'MEVCUT BÖLÜM' : 'YENİ BÖLÜM'}
        </span>
      </div>
      <p class="mut" style="font-size:12.5px;margin:0 0 16px">Dizi, sezon, bölüm ve oynatıcı video linklerini buradan kolayca ekleyip güncelleyebilirsiniz.</p>

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

      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <label style="font-size:12px;font-weight:600;color:var(--mut);margin:0">Bölüm Adı / Başlığı (İsteğe Bağlı)</label>
          <button type="button" id="inl_btn_fetch_title" class="btn g" style="padding:2px 8px;font-size:11px;color:var(--accent);display:inline-flex;align-items:center;gap:4px" title="IMDb'den Bölüm Adını Çek">
            <span>⚡ IMDb'den Çek</span>
          </button>
        </div>
        <input id="inl_ep_title" value="${escapeHtml(titleVal)}" class="auth-input" style="width:100%;padding:8px 10px" placeholder="Örn: Pilot, Felina, Ozymandias...">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Dil</label>
          <select id="inl_ep_lg" class="auth-input" style="width:100%;padding:8px 10px" ${isTrInitial ? 'disabled' : ''}>
            ${isTrInitial ? '<option value="">Orijinal (Türkçe)</option>' : '<option value="Altyazı" selected>Altyazı</option>'}
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
            <button type="button" id="inl_btn_fetch_date" class="btn g" style="padding:4px 8px;font-size:11px;flex:none" title="IMDb'den Tarih ve Bölüm Adını Çek">⚡</button>
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
        <p class="mut" style="font-size:11.5px;margin:6px 0 0;color:var(--mut)">💡 İpucu: Bölümün ana sayfa "Son Eklenen Bölümler" listesinde çıkması için en az bir oynatıcı linki (VidMoly vb.) girilmelidir.</p>
      </div>

      <div style="margin-bottom:16px">
        <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">📝 Bölüm Notu (İsteğe Bağlı)</label>
        <textarea id="inl_ep_note" rows="2" class="auth-input" style="width:100%;resize:vertical;font-size:12.5px" placeholder="Bu bölüm için izleyicilere not...">${escapeHtml(noteVal)}</textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button type="button" class="btn g" onclick="closeInlineAdminModal()" style="padding:9px 16px">İptal</button>
        <button type="button" class="btn" id="inl_save_ep_btn" style="padding:9px 24px;font-weight:700">${currEp ? '💾 Bölümü Güncelle' : '💾 Yeni Bölümü Kaydet'}</button>
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

  async function autoFetchEpInfo(forceTitle = false, forceDate = false) {
    const selTitle = el("inl_ep_series")?.value || curShowTitle;
    const s = parseInt(el("inl_ep_s")?.value) || 1;
    const b = (el("inl_ep_b") && !isNaN(parseInt(el("inl_ep_b").value))) ? parseInt(el("inl_ep_b").value) : 1;
    const showObj = all.find(x => x[0].toLowerCase().trim() === selTitle.toLowerCase().trim());
    if (!showObj) return;

    if (!showObj[6] || typeof showObj[6] !== 'object') showObj[6] = {};
    const meta = showObj[6];
    const epKey = `${s}_${b}`;

    const titleEl = el("inl_ep_title");
    const dateEl = el("inl_ep_ago");

    const curTitle = (titleEl?.value || "").trim();
    const curDate = (dateEl?.value || "").trim();

    const needTitle = forceTitle || !curTitle;
    const needDate = forceDate || !curDate || curDate === "Yeni";

    // 1. Önbellekteki (meta.epTitles ve meta.epDates) verileri kontrol et
    if (meta.epTitles && meta.epTitles[epKey] && needTitle && !forceTitle) {
      if (titleEl) titleEl.value = meta.epTitles[epKey];
    }
    if (meta.epDates && meta.epDates[epKey] && needDate && !forceDate) {
      if (dateEl) dateEl.value = meta.epDates[epKey];
    }

    // 2. Veritabanında kayıtlı bölüm varsa oradan da başlığı yedek kontrol et
    if ((!titleEl || !titleEl.value.trim()) && needTitle && !forceTitle) {
      const matchEp = (API.data.episodes || []).find(e => {
        const et = Array.isArray(e.t) ? e.t[0] : (typeof e.t === 'object' ? (e.t.title || e.t[0]) : e.t);
        const eb = (e.b !== undefined && e.b !== null && e.b !== '') ? parseInt(e.b) : parseInt(e.e);
        return (et || '').toLowerCase().trim() === selTitle.toLowerCase().trim() && parseInt(e.s) === s && eb === b;
      });
      const exT = matchEp ? (matchEp.title || matchEp.epTitle || matchEp.name) : null;
      if (exT && titleEl) {
        titleEl.value = exT;
        if (!meta.epTitles) meta.epTitles = {};
        meta.epTitles[epKey] = exT;
      }
    }

    const stillNeedTitle = forceTitle || (titleEl && !titleEl.value.trim());
    const stillNeedDate = forceDate || (dateEl && (!dateEl.value.trim() || dateEl.value === "Yeni"));

    // İkisi de doluysa harici IMDb/TVmaze sorgusuna gerek yok
    if (!stillNeedTitle && !stillNeedDate) {
      return;
    }

    let imdbId = meta.imdbId;
    const titleBtn = el("inl_btn_fetch_title");
    const dateBtn = el("inl_btn_fetch_date");
    if (titleBtn && stillNeedTitle) titleBtn.textContent = "⏳ IMDb...";
    if (dateBtn && stillNeedDate) dateBtn.textContent = "⏳";

    let epName = null;
    let epAirDate = null;

    try {
      // 1. Adım: TVmaze Show ID'sini tespit et
      let tvShowId = null;
      if (imdbId) {
        try {
          const r = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`);
          if (r.ok) {
            const tv = await r.json();
            if (tv && tv.id) tvShowId = tv.id;
          }
        } catch (e) {}
      }

      if (!tvShowId) {
        try {
          const sr = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(selTitle)}`);
          if (sr.ok) {
            const tv = await sr.json();
            if (tv && tv.id) {
              tvShowId = tv.id;
              if (tv.externals?.imdb && !imdbId) {
                imdbId = tv.externals.imdb;
                meta.imdbId = imdbId;
              }
            }
          }
        } catch (e) {}
      }

      // 2. Adım: TVmaze'den tüm bölümleri çek ve hafızaya al
      if (tvShowId) {
        try {
          const er = await fetch(`https://api.tvmaze.com/shows/${tvShowId}/episodes`);
          if (er.ok) {
            const eps = await er.json();
            if (Array.isArray(eps)) {
              if (!meta.epTitles) meta.epTitles = {};
              if (!meta.epDates) meta.epDates = {};
              eps.forEach(x => {
                const k = `${parseInt(x.season) || 1}_${parseInt(x.number) || 1}`;
                if (x.name && !meta.epTitles[k]) meta.epTitles[k] = x.name.trim();
                if ((x.airdate || x.airstamp) && !meta.epDates[k]) meta.epDates[k] = formatEpisodeAirDate(x.airdate || x.airstamp);
              });

              const match = eps.find(x => parseInt(x.season) === s && parseInt(x.number) === b);
              if (match) {
                if (match.name) epName = match.name.trim();
                if (match.airdate || match.airstamp) epAirDate = formatEpisodeAirDate(match.airdate || match.airstamp);
              }
            }
          }
        } catch (e) {}
      }

      // 3. Adım: TVmaze'de bulunamadıysa Cinemeta üzerinden sorgula
      if ((!epName || !epAirDate) && imdbId) {
        try {
          const cr = await fetch(`https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`);
          if (cr.ok) {
            const cJson = await cr.json();
            const videos = cJson?.meta?.videos || [];
            if (Array.isArray(videos)) {
              if (!meta.epTitles) meta.epTitles = {};
              if (!meta.epDates) meta.epDates = {};
              videos.filter(v => v.season > 0).forEach(v => {
                const k = `${parseInt(v.season) || 1}_${parseInt(v.number || v.episode) || 1}`;
                if ((v.name || v.title) && !meta.epTitles[k]) meta.epTitles[k] = (v.name || v.title).trim();
                if ((v.released || v.firstAired) && !meta.epDates[k]) meta.epDates[k] = formatEpisodeAirDate(v.released || v.firstAired);
              });

              const match = videos.find(v => parseInt(v.season) === s && parseInt(v.number || v.episode) === b);
              if (match) {
                if (!epName && (match.name || match.title)) epName = (match.name || match.title).trim();
                if (!epAirDate && (match.released || match.firstAired)) epAirDate = formatEpisodeAirDate(match.released || match.firstAired);
              }
            }
          }
        } catch (e) {}
      }

      // 4. Adım: Bulunan bölüm adını ve yayın tarihini inputlara aktar
      let updatedCount = 0;
      if (epName && titleEl && stillNeedTitle) {
        titleEl.value = epName;
        if (!meta.epTitles) meta.epTitles = {};
        meta.epTitles[epKey] = epName;
        updatedCount++;
      }
      if (epAirDate && dateEl && stillNeedDate) {
        dateEl.value = epAirDate;
        if (!meta.epDates) meta.epDates = {};
        meta.epDates[epKey] = epAirDate;
        updatedCount++;
      }

      if ((forceTitle || forceDate) && updatedCount > 0) {
        toast(`IMDb'den çekildi: ${epName ? `"${epName}"` : ''} ${epAirDate ? `(${epAirDate})` : ''}`);
      } else if ((forceTitle || forceDate) && !epName && !epAirDate) {
        toast("Bu bölüm için IMDb'de bilgi bulunamadı.");
      }
    } catch (err) {
      console.warn("IMDb fetch error:", err);
      if (forceTitle || forceDate) toast("IMDb bilgileri alınırken hata oluştu.");
    } finally {
      if (titleBtn) titleBtn.textContent = "⚡ IMDb'den Çek";
      if (dateBtn) dateBtn.textContent = "⚡";
    }
  }

  const autoFetchEpDate = autoFetchEpInfo;

  const btnFetchTitle = el("inl_btn_fetch_title");
  if (btnFetchTitle) {
    btnFetchTitle.onclick = () => autoFetchEpInfo(true, false);
  }

  const btnFetchDate = el("inl_btn_fetch_date");
  if (btnFetchDate) {
    btnFetchDate.onclick = () => autoFetchEpInfo(!el("inl_ep_title")?.value?.trim(), true);
  }

  function updateLanguageOptions() {
    const selTitle = el("inl_ep_series")?.value || curShowTitle;
    const isTr = (typeof isTurkishSeries === 'function') ? isTurkishSeries(selTitle) : false;
    const lgSelect = el("inl_ep_lg");
    if (!lgSelect) return;
    if (isTr) {
      lgSelect.innerHTML = '<option value="">Orijinal (Türkçe)</option>';
      lgSelect.value = "";
      lgSelect.disabled = true;
    } else {
      lgSelect.innerHTML = '<option value="Altyazı" selected>Altyazı</option>';
      lgSelect.value = "Altyazı";
      lgSelect.disabled = false;
    }
  }

  // Dizi, Sezon veya Bölüm değiştiğinde mevcut bölüm bilgilerini akıllıca güncelle / sıfırla
  function checkExistingOnSwitch() {
    updateLanguageOptions();
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

    const titleEl = el("inl_ep_modal_title");
    const badgeEl = el("inl_ep_status_badge");
    const saveBtn = el("inl_save_ep_btn");

    if (foundIdx !== -1) {
      const ex = API.data.episodes[foundIdx];
      if (titleEl) titleEl.textContent = `✏️ Bölümü Düzenle: ${selTitle} S${s}B${b}`;
      if (badgeEl) {
        badgeEl.textContent = "MEVCUT BÖLÜM";
        badgeEl.style.background = "rgba(255,180,0,0.18)";
        badgeEl.style.color = "#ffb400";
      }
      if (saveBtn) saveBtn.textContent = "💾 Bölümü Güncelle";

      el("inl_ep_q").value = ex.q || "1080p";
      el("inl_ep_ago").value = ex.ago || "Yeni";
      el("inl_ep_note").value = ex.note || "";
      el("inl_ep_finale").value = ex.finale || "auto";
      if (el("inl_ep_title")) el("inl_ep_title").value = ex.title || ex.epTitle || ex.name || "";

      if (Array.isArray(ex.players) && ex.players.length) {
        currentEpPlayers = ex.players.map(p => ({ name: p.name || 'Oynatıcı', embed: p.embed || '' }));
      } else if (ex.embed) {
        currentEpPlayers = [{ name: "Oynatıcı 1", embed: ex.embed }];
      } else {
        currentEpPlayers = [{ name: "Oynatıcı 1", embed: "" }];
      }
      renderPlayers();
      if (!el("inl_ep_title")?.value?.trim()) {
        autoFetchEpInfo(false, false);
      }
    } else {
      if (titleEl) titleEl.textContent = `➕ Yeni Bölüm Ekle: ${selTitle} S${s}B${b}`;
      if (badgeEl) {
        badgeEl.textContent = "YENİ BÖLÜM";
        badgeEl.style.background = "rgba(74,222,128,0.18)";
        badgeEl.style.color = "#4ade80";
      }
      if (saveBtn) saveBtn.textContent = "💾 Yeni Bölümü Kaydet";

      // Önceki bölümden kalan not ve linkleri temizle (yeni bölüm için temiz form)
      el("inl_ep_note").value = "";
      el("inl_ep_finale").value = "auto";
      if (el("inl_ep_title")) el("inl_ep_title").value = "";
      currentEpPlayers = [{ name: "Oynatıcı 1", embed: "" }];
      renderPlayers();
      autoFetchEpInfo(false, false);
    }
  }

  el("inl_ep_series").onchange = checkExistingOnSwitch;
  el("inl_ep_s").onchange = checkExistingOnSwitch;
  el("inl_ep_b").onchange = checkExistingOnSwitch;
  el("inl_ep_s").oninput = checkExistingOnSwitch;
  el("inl_ep_b").oninput = checkExistingOnSwitch;

  if (!currEp) {
    autoFetchEpInfo(false, false);
  } else if (!titleVal) {
    autoFetchEpInfo(false, false);
  }

  el("inl_save_ep_btn").onclick = async () => {
    const selTitle = el("inl_ep_series")?.value || curShowTitle;
    const isTr = (typeof isTurkishSeries === 'function') ? isTurkishSeries(selTitle) : false;
    const s = Math.max(1, parseInt(el("inl_ep_s")?.value) || 1);
    const b = (el("inl_ep_b") && !isNaN(parseInt(el("inl_ep_b").value))) ? parseInt(el("inl_ep_b").value) : 1;
    const lg = isTr ? "" : "Altyazı";
    const q = el("inl_ep_q")?.value || "1080p";
    const ago = (el("inl_ep_ago")?.value || "Yeni").trim();
    const note = (el("inl_ep_note")?.value || "").trim();
    const finale = el("inl_ep_finale")?.value || "auto";
    const title = (el("inl_ep_title")?.value || "").trim();

    syncPlayers();
    const validPlayers = currentEpPlayers.filter(p => p && (p.embed || p.name));
    const primaryEmbed = validPlayers[0]?.embed || "";

    const epObj = {
      t: [selTitle],
      s,
      b,
      e: b,
      ...(lg ? { lg } : {}),
      q,
      ago,
      embed: primaryEmbed,
      players: validPlayers.length > 0 ? validPlayers : [{ name: "Oynatıcı 1", embed: primaryEmbed }]
    };
    if (note) epObj.note = note;
    if (finale && finale !== "auto") epObj.finale = finale;
    if (title) {
      epObj.title = title;
    } else {
      delete epObj.title;
      delete epObj.epTitle;
      delete epObj.name;
    }

    const btn = el("inl_save_ep_btn");
    btn.disabled = true;
    btn.textContent = "⏳ Kaydediliyor...";

    try {
      await API.saveEpisode(epObj);
      toast(`${selTitle} ${s}. Sezon ${b}. Bölüm başarıyla kaydedildi! ✓`);
      closeInlineAdminModal();

      // UI Güncellemeleri
      if (typeof currentShow !== 'undefined' && currentShow) {
        if (typeof currentSeason !== 'undefined') {
          currentSeason = s;
        }
        if (typeof renderHero === 'function') renderHero();
        if (typeof renderSeasonsTabs === 'function') renderSeasonsTabs();
        if (typeof renderEpisodeList === 'function') renderEpisodeList();
      }
      if (typeof renderPlayer === "function") renderPlayer();
      if (typeof renderEpisodeBar === "function") renderEpisodeBar();
      if (typeof renderEpisodesList === "function") renderEpisodesList();
    } catch (err) {
      console.error("Episode save error:", err);
      toast("Bölüm kaydedilirken bir hata oluştu: " + (err.message || err));
      btn.disabled = false;
      btn.textContent = "💾 Tekrar Dene";
    }
  };

  m.style.display = "flex";
}
window.openInlineEpisodeModal = openInlineEpisodeModal;

// 2. YERİNDE DİZİ / ANİME EKLEME & DÜZENLEME MODALI
function openInlineSeriesModal(editShowTitle) {
  if (!isAdmAuth()) return;
  const m = ensureInlineAdminModalContainer();
  const all = API.getAllSeries();
  const editNorm = (editShowTitle || "").toLowerCase().trim();
  const existing = editNorm
    ? (all.find(x => x && x[0] && x[0].toLowerCase().trim() === editNorm) ||
       all.find(x => {
         const sl1 = (typeof slugify === 'function') ? slugify(x[0]) : x[0].toLowerCase().replace(/[^a-z0-9]+/g, '-');
         const sl2 = (typeof slugify === 'function') ? slugify(editShowTitle) : editNorm.replace(/[^a-z0-9]+/g, '-');
         return sl1 === sl2;
       }))
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
  const countryVal = (meta && meta.country) ? meta.country : (existing ? getSeriesCountry(existing) : (isAnimeExisting ? "Japonya" : "ABD"));

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

      <div style="display:grid;grid-template-columns:1fr 110px 130px;gap:10px;margin-bottom:10px">
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
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--mut);margin-bottom:4px">Ülke</label>
          <input id="inl_sr_country" value="${escapeHtml(countryVal)}" class="auth-input" style="width:100%;padding:8px 10px" placeholder="örn: ABD, Türkiye">
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
      const epTitles = {};
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
          if (v.name || v.title) epTitles[`${s}_${b}`] = (v.name || v.title).trim();
        });
      }

      fetchedMeta = { imdbId, epMap, epDates, epTitles, seasons: maxS, totalEpisodes: totE || 8 };
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
      if (cine.country && el("inl_sr_country")) {
        const cLower = String(cine.country).toLowerCase();
        let cMapped = cine.country;
        if (cLower.includes("united states") || cLower === "usa" || cLower === "us") cMapped = "ABD";
        else if (cLower.includes("united kingdom") || cLower === "uk" || cLower === "gb") cMapped = "Birleşik Krallık";
        else if (cLower.includes("turkey") || cLower === "tr") cMapped = "Türkiye";
        else if (cLower.includes("japan") || cLower === "jp") cMapped = "Japonya";
        else if (cLower.includes("korea") || cLower === "kr") cMapped = "Güney Kore";
        else if (cLower.includes("germany") || cLower === "de") cMapped = "Almanya";
        else if (cLower.includes("france") || cLower === "fr") cMapped = "Fransa";
        el("inl_sr_country").value = cMapped;
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
      const btn = el("inl_del_sr_btn");
      if (btn) { btn.disabled = true; btn.textContent = "⏳ Siliniyor..."; }
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

    const rawImdbQ = (el("inl_sr_imdb_q")?.value || "").trim();
    const imdbMatch = rawImdbQ.match(/tt\d{6,10}/i);

    const newMeta = Object.assign({}, meta, fetchedMeta || {}, {
      status,
      seasons,
      totalEpisodes
    });
    const country = (el("inl_sr_country")?.value || "").trim();
    if (country) newMeta.country = country;

    if (imdbMatch && !newMeta.imdbId) {
      newMeta.imdbId = imdbMatch[0].toLowerCase();
    }
    if (!newMeta.epMap || Object.keys(newMeta.epMap).length === 0) {
      newMeta.epMap = { "1": totalEpisodes };
    }

    if (summary) API.data.summaries[title] = summary;
    if (backdrop) API.data.backdrops[title] = backdrop;

    const finalBackdrop = backdrop || (existing && existing[5] && typeof existing[5] === 'string' && existing[5].startsWith('http') ? existing[5] : '');
    const item = [title, genre, imdb, year, poster, finalBackdrop, newMeta];
    const btn = el("inl_save_sr_btn");
    btn.disabled = true;
    btn.textContent = "⏳ Kaydediliyor...";

    try {
      await API.saveSeries(item, isAnime, existing ? existing[0] : null);
      toast(`"${title}" başarıyla güncellendi! ✓`);
      closeInlineAdminModal();

      if (typeof currentShow !== "undefined" && existing) {
        if (existing[0].toLowerCase().trim() !== title.toLowerCase().trim()) {
          const newUrl = (typeof buildShowUrl === "function") ? buildShowUrl(title) : `dizi.html?s=${encodeURIComponent(title)}`;
          window.location.href = newUrl;
        } else {
          window.location.reload();
        }
      } else if (typeof renderCatalog === "function") {
        renderCatalog();
      } else if (typeof renderAnimeCatalog === "function") {
        renderAnimeCatalog();
      } else {
        setTimeout(() => window.location.reload(), 300);
      }
    } catch (err) {
      console.error("Save series error:", err);
      toast("Kayıt hatası: " + (err.message || err));
      btn.disabled = false;
      btn.textContent = "💾 Kaydet";
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
        "The Mentalist",
        "Person of Interest",
        "Avatar: The Last Airbender",
        "Avatar: Seven Havens",
        "Breaking Bad"
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
// 5. YERİNDE YAYIN TAKVİMİ DÜZENLEME MODALI
// ==========================================
function openInlineScheduleModal() {
  if (!isAdmAuth()) return;
  const m = ensureInlineAdminModalContainer();
  const all = API.getAllSeries();
  const sortedAll = [...all].sort((a, b) => (a[0] || '').localeCompare(b[0] || '', 'tr'));

  let currentSchedule = (API.data.schedule && Array.isArray(API.data.schedule) && API.data.schedule.length === 7)
    ? JSON.parse(JSON.stringify(API.data.schedule))
    : (window.DEFAULT_SCHEDULE ? JSON.parse(JSON.stringify(window.DEFAULT_SCHEDULE)) : [[],[],[],[],[],[],[]]);

  while (currentSchedule.length < 7) {
    currentSchedule.push([]);
  }

  const todayDow = (new Date().getDay() + 6) % 7;
  let activeWeekOffset = 0; // 0 = Bu Hafta, 1 = 1 Hafta Sonra, 2 = 2 Hafta Sonra, 3 = 3 Hafta Sonra, 4 = 4 Hafta Sonra
  let activeDayIdx = todayDow; // Varsayılan bugünün günü

  function renderScheduleModal() {
    const weekInfo = getCurrentWeekInfo(activeWeekOffset);
    const dayEpisodes = [];
    (currentSchedule[activeDayIdx] || []).forEach((item, globalIdx) => {
      const itemOffset = (item.weekOffset !== undefined && item.weekOffset !== null) ? parseInt(item.weekOffset) : 0;
      if (itemOffset === activeWeekOffset) {
        dayEpisodes.push({ ...item, globalIdx });
      }
    });

    m.innerHTML = `
      <div class="auth-modal-box" style="max-width:640px;width:100%;padding:24px;max-height:90vh;overflow-y:auto;position:relative">
        <button class="auth-modal-close" onclick="closeInlineAdminModal()">×</button>
        <h2 style="margin:0 0 6px;font-size:19px;color:var(--tx)">📅 Yayın Takvimini Düzenle</h2>
        <p class="mut" style="font-size:12.5px;margin:0 0 14px">Bu hafta veya sonraki haftalara yayın ekleyin / düzenleyin. Takvimde sadece gelecek ve planlanan bölümleri tutun.</p>

        <!-- Hafta Seçici Çubuk -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;background:var(--input-bg);padding:8px 12px;border-radius:10px;border:1px solid var(--line);margin-bottom:14px">
          <div style="font-size:12.5px;color:var(--tx);font-weight:700;display:flex;align-items:center;gap:6px">
            <span>🗓️</span> <span>Hafta:</span>
          </div>
          <div style="display:flex;gap:6px;overflow-x:auto">
            ${[0, 1, 2, 3, 4].map(w => {
              const label = w === 0 ? "Bu Hafta" : `${w} Hafta Sonra`;
              const isSel = (w === activeWeekOffset);
              return `<button type="button" class="btn ${isSel ? '' : 'g'}" data-sch-week="${w}" style="padding:5px 11px;font-size:12px;border-radius:6px;font-weight:${isSel?'700':'600'}">${label}</button>`;
            }).join('')}
          </div>
        </div>

        <!-- Gün Seçici Sekmeler (O haftanın tarihleriyle) -->
        <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:16px;border-bottom:1px solid var(--line)">
          ${weekInfo.days.map((day, dIdx) => {
            const count = (currentSchedule[dIdx] || []).filter(item => {
              const itemOffset = (item.weekOffset !== undefined && item.weekOffset !== null) ? parseInt(item.weekOffset) : 0;
              return itemOffset === activeWeekOffset;
            }).length;
            const isDaySel = (dIdx === activeDayIdx);
            return `
              <button type="button" class="btn ${isDaySel ? '' : 'g'}" data-sch-day="${dIdx}" style="padding:6px 12px;font-size:12px;white-space:nowrap;border-radius:8px">
                ${day.name} (${day.fullDateStr}) · <b>${count}</b>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Seçili Gün Başlığı -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-weight:700;font-size:14.5px;color:var(--tx)">
            📌 ${weekInfo.days[activeDayIdx].name} (${weekInfo.days[activeDayIdx].fullDateStr}) Planı
          </div>
          <span style="font-size:12px;color:var(--mut)">${dayEpisodes.length} Yayın Planlandı</span>
        </div>

        <!-- Seçili Gün Bölüm Listesi -->
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;max-height:220px;overflow-y:auto;padding-right:4px">
          ${dayEpisodes.length ? dayEpisodes.map((item) => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--input-bg);padding:10px 14px;border-radius:10px;border:1px solid var(--line)">
              <div style="min-width:0;flex:1">
                <b style="color:var(--tx);font-size:13.5px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.name)}</b>
                <span style="font-size:12px;color:var(--mut)">${item.s}. Sezon ${item.ep}. Bölüm</span>
              </div>
              <button type="button" class="btn g inl-sch-del" data-global-idx="${item.globalIdx}" style="padding:6px 10px;font-size:12px;color:#ff5b5b;border-color:rgba(255,91,91,0.3)" title="Kaldır">
                🗑 Sil
              </button>
            </div>
          `).join('') : `
            <div style="padding:20px;text-align:center;border:1px dashed var(--line);border-radius:10px;color:var(--mut);font-size:13px">
              ${weekInfo.days[activeDayIdx].name} (${weekInfo.days[activeDayIdx].fullDateStr}) için planlanan yayın bulunmuyor.
            </div>
          `}
        </div>

        <!-- Yeni Yayın Ekle Kartı -->
        <div style="background:var(--card-bg, rgba(255,255,255,0.03));border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:20px">
          <div style="font-weight:700;font-size:13px;margin-bottom:12px;color:var(--tx);display:flex;align-items:center;gap:6px">
            <span>➕</span> <span>${weekInfo.days[activeDayIdx].name} (${weekInfo.days[activeDayIdx].fullDateStr}) Gününe Yayın Ekle</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 90px 90px;gap:8px;align-items:end">
            <div>
              <label style="font-size:11.5px;color:var(--mut);display:block;margin-bottom:4px">Dizi / Anime</label>
              <select id="inl_sch_series" class="auth-input" style="width:100%;padding:7px 10px;font-size:13px">
                ${sortedAll.map(s => `<option value="${escapeHtml(s[0])}">${escapeHtml(s[0])}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:11.5px;color:var(--mut);display:block;margin-bottom:4px">Sezon</label>
              <input type="number" id="inl_sch_season" class="auth-input" value="1" min="1" max="99" style="width:100%;padding:7px 8px;font-size:13px">
            </div>
            <div>
              <label style="font-size:11.5px;color:var(--mut);display:block;margin-bottom:4px">Bölüm</label>
              <input type="number" id="inl_sch_ep" class="auth-input" value="1" min="0" max="9999" style="width:100%;padding:7px 8px;font-size:13px">
            </div>
          </div>
          <div style="margin-top:10px;display:flex;justify-content:flex-end">
            <button type="button" id="inl_sch_add_btn" class="btn" style="padding:7px 16px;font-size:12.5px">
              ➕ Bu Güne Ekle
            </button>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:16px;gap:10px">
          <button type="button" class="btn g" onclick="closeInlineAdminModal()" style="padding:9px 18px;font-size:13px">Vazgeç</button>
          <button type="button" id="inl_sch_save_btn" class="btn" style="padding:9px 24px;font-size:13.5px;font-weight:700">💾 Takvimi Kaydet</button>
        </div>
      </div>
    `;

    // Event listeners
    m.querySelectorAll("[data-sch-week]").forEach(btn => {
      btn.onclick = () => {
        activeWeekOffset = parseInt(btn.dataset.schWeek) || 0;
        renderScheduleModal();
      };
    });

    m.querySelectorAll("[data-sch-day]").forEach(btn => {
      btn.onclick = () => {
        activeDayIdx = parseInt(btn.dataset.schDay);
        renderScheduleModal();
      };
    });

    m.querySelectorAll(".inl-sch-del").forEach(btn => {
      btn.onclick = () => {
        const gIdx = parseInt(btn.dataset.globalIdx);
        if (!isNaN(gIdx) && currentSchedule[activeDayIdx] && currentSchedule[activeDayIdx][gIdx]) {
          currentSchedule[activeDayIdx].splice(gIdx, 1);
          renderScheduleModal();
        }
      };
    });

    const addBtn = m.querySelector("#inl_sch_add_btn");
    if (addBtn) {
      addBtn.onclick = () => {
        const sName = (m.querySelector("#inl_sch_series")?.value || "").trim();
        const sNum = parseInt(m.querySelector("#inl_sch_season")?.value) || 1;
        const epNum = parseInt(m.querySelector("#inl_sch_ep")?.value);

        if (!sName) {
          toast("Lütfen dizi seçin.");
          return;
        }
        if (isNaN(epNum) || epNum < 0) {
          toast("Geçerli bir bölüm numarası girin.");
          return;
        }

        if (!Array.isArray(currentSchedule[activeDayIdx])) {
          currentSchedule[activeDayIdx] = [];
        }

        currentSchedule[activeDayIdx].push({
          name: sName,
          s: sNum,
          ep: epNum,
          weekOffset: activeWeekOffset
        });

        renderScheduleModal();
      };
    }

    const saveBtn = m.querySelector("#inl_sch_save_btn");
    if (saveBtn) {
      saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = "⏳ Kaydediliyor...";
        try {
          await API.saveSchedule(currentSchedule);
          toast("Yayın takvimi başarıyla kaydedildi! 📅");
          closeInlineAdminModal();
          if (typeof renderHomeCalendar === "function") {
            renderHomeCalendar();
          } else {
            setTimeout(() => window.location.reload(), 300);
          }
        } catch (err) {
          console.error("Save schedule error:", err);
          toast("Kayıt hatası: " + (err.message || err));
          saveBtn.disabled = false;
          saveBtn.textContent = "💾 Takvimi Kaydet";
        }
      };
    }
  }

  renderScheduleModal();
  m.style.display = "flex";
}
window.openInlineScheduleModal = openInlineScheduleModal;


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

// ==========================================
// CANLI BÖLÜM YORUMLARI BİLDİRİM SİSTEMİ
// (Masaüstü, Sesli Uyarı, Dropdown, Webhook)
// ==========================================

const BD_NOTIF_LAST_READ_KEY = "bd_last_read_comments_time";
const BD_NOTIF_SOUND_KEY = "bd_notif_sound_enabled";
const BD_NOTIF_DISCORD_KEY = "bd_notif_discord_webhook";
const BD_NOTIF_TELEGRAM_TOKEN_KEY = "bd_notif_telegram_token";
const BD_NOTIF_TELEGRAM_CHATID_KEY = "bd_notif_telegram_chatid";
const BD_NOTIF_BROADCAST_KEY = "bd_last_comment_broadcast";

// 1. Sesli Uyarı Çanı (Web Audio API Synthesizer)
function playNotificationChime() {
  try {
    if (localStorage.getItem(BD_NOTIF_SOUND_KEY) === "0") return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.14); // A5
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6
    gain2.gain.setValueAtTime(0.09, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.36);
  } catch (e) {}
}
window.playNotificationChime = playNotificationChime;

// 2. HTML5 Masaüstü Bildirimi (Web Push)
function sendDesktopNotification(title, body, url) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      const notif = new Notification(title, {
        body,
        icon: "/public/images/logo.png",
        badge: "/public/images/logo.png",
        tag: "bolumdizi-notif-" + Date.now()
      });
      if (url) {
        notif.onclick = function() {
          window.focus();
          window.location.href = url;
          notif.close();
        };
      }
    } catch (e) {}
  }
}
window.sendDesktopNotification = sendDesktopNotification;

// 3. Webhook İletimi (Discord & Telegram)
async function sendWebhookNotification(data) {
  const showName = data.showTitle || "Dizi";
  const s = data.season || 1;
  const b = data.episode || 1;
  const author = data.author || "Bir üye";
  const text = data.text || "";
  const epUrl = (typeof buildEpisodeUrl === "function")
    ? (window.location.origin + buildEpisodeUrl(showName, s, b) + "#ep_comments_box")
    : (window.location.origin + `/bolum.html?s=${encodeURIComponent(showName)}&se=${s}&ep=${b}#ep_comments_box`);

  // Discord Webhook
  const discordUrl = localStorage.getItem(BD_NOTIF_DISCORD_KEY);
  if (discordUrl && discordUrl.trim().startsWith("http")) {
    try {
      fetch(discordUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: `🔔 Yeni Bölüm Yorumu: ${showName} (S${s} B${b})`,
            description: `**👤 Yazar:** ${author}\n\n**💬 Yorum:**\n${text}\n\n[▶ Bölüme Git ve Yanıtla](${epUrl})`,
            color: 15010068,
            timestamp: new Date().toISOString(),
            footer: { text: "bölüm dizi • Canlı Bildirim Sistemi" }
          }]
        })
      }).catch(err => console.warn("Discord webhook error:", err));
    } catch (e) {}
  }

  // Telegram Webhook
  const tgToken = localStorage.getItem(BD_NOTIF_TELEGRAM_TOKEN_KEY);
  const tgChatId = localStorage.getItem(BD_NOTIF_TELEGRAM_CHATID_KEY);
  if (tgToken && tgChatId) {
    try {
      const msg = `🔔 *Yeni Bölüm Yorumu Yapıldı!*\n\n🎬 *Dizi:* ${showName} (${s}. Sezon ${b}. Bölüm)\n👤 *Yazar:* ${author}\n💬 *Yorum:* ${text}\n\n🔗 [Bölüme Git ve Oku](${epUrl})`;
      fetch(`https://api.telegram.org/bot${tgToken.trim()}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChatId.trim(),
          text: msg,
          parse_mode: "Markdown"
        })
      }).catch(err => console.warn("Telegram webhook error:", err));
    } catch (e) {}
  }
}
window.sendWebhookNotification = sendWebhookNotification;

// 4. Ebeveyn Yorum Yazarını ID ile Bulma Yardımcısı
function findCommentAuthorById(parentId, showTitle, season, episode) {
  if (!parentId) return "";
  try {
    if (typeof API !== 'undefined' && API.data && API.data.comments) {
      if (showTitle && season && episode) {
        const key = `${showTitle.trim().toLowerCase()}_s${season}_e${episode}`;
        const list = API.data.comments[key] || [];
        const p = list.find(c => c && c.id === parentId);
        if (p && p.author) return p.author;
      }
      for (const k in API.data.comments) {
        const list = API.data.comments[k] || [];
        const p = list.find(c => c && c.id === parentId);
        if (p && p.author) return p.author;
      }
    }
  } catch (e) {}
  return "";
}
window.findCommentAuthorById = findCommentAuthorById;

// 5. Tüm Sitedeki Bölüm Yorumlarını Derle
function getAllSiteComments() {
  const list = [];
  const allShows = (typeof API !== 'undefined' && API.getAllSeries) ? API.getAllSeries() : [];
  const showTitleMap = new Map();
  allShows.forEach(s => {
    if (s && s[0]) showTitleMap.set(s[0].toLowerCase().trim(), s[0]);
  });

  const commentsMap = (typeof API !== 'undefined' && API.data && API.data.comments) ? API.data.comments : {};
  for (const key in commentsMap) {
    const match = key.match(/^(.*)_s(\d+)_e(\d+)$/i);
    if (!match) continue;
    const rawShow = match[1];
    const s = parseInt(match[2]) || 1;
    const b = parseInt(match[3]) || 1;
    const properTitle = showTitleMap.get(rawShow.toLowerCase().trim()) || rawShow;
    const epComments = commentsMap[key] || [];

    epComments.forEach(c => {
      list.push({
        id: c.id,
        type: 'comment',
        showTitle: properTitle,
        season: s,
        episode: b,
        author: c.author || 'Üye',
        role: c.role || 'member',
        text: c.text || '',
        isSpoiler: Boolean(c.isSpoiler),
        createdAt: c.createdAt || new Date().toISOString()
      });

      (c.replies || []).forEach(r => {
        list.push({
          id: r.id,
          parentId: c.id,
          type: 'reply',
          showTitle: properTitle,
          season: s,
          episode: b,
          author: r.author || 'Üye',
          parentAuthor: c.author || 'Üye',
          role: r.role || 'member',
          text: r.text || '',
          isSpoiler: Boolean(r.isSpoiler),
          createdAt: r.createdAt || new Date().toISOString()
        });
      });
    });
  }

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}
window.getAllSiteComments = getAllSiteComments;

// Kullanıcı Okundu Durumu Depolama Anahtarı
function getNotifLastReadKey() {
  if (isAdmAuth()) return "bd_last_read_admin";
  const user = getCurrentUser();
  if (user && user.username) return `bd_last_read_${user.username.trim().toLowerCase()}`;
  return "bd_last_read_guest";
}
window.getNotifLastReadKey = getNotifLastReadKey;

// Kullanıcı Rolüne Göre Bildirim Listesi
// - Admin Hesabı: Sitedeki TÜM bölüm yorumları ve yanıtları
// - Normal Üye: YALNIZCA kendi yorumlarına başkaları tarafından yazılan cevaplar
// - Misafir (Giriş Yapmamış): Boş liste
function getUserNotifications() {
  const all = getAllSiteComments();
  if (isAdmAuth()) {
    return all;
  }
  const user = getCurrentUser();
  if (!user || !user.username) {
    return [];
  }
  const myUsername = user.username.trim().toLowerCase();
  return all.filter(item => {
    if (item.type !== 'reply') return false;
    const pAuthor = (item.parentAuthor || '').trim().toLowerCase();
    const rAuthor = (item.author || '').trim().toLowerCase();
    return pAuthor === myUsername && rAuthor !== myUsername;
  });
}
window.getUserNotifications = getUserNotifications;

// 6. Okunmamış Yorum Sayısı & Rozet Güncelleme
function getUnreadCommentsCount() {
  const notifs = getUserNotifications();
  if (notifs.length === 0) return 0;
  const lastReadKey = getNotifLastReadKey();
  const lastReadTime = localStorage.getItem(lastReadKey) || 0;
  const lastReadMs = new Date(lastReadTime).getTime() || 0;
  return notifs.filter(c => new Date(c.createdAt).getTime() > lastReadMs).length;
}

function updateNotificationBadge() {
  const count = getUnreadCommentsCount();
  const badge = el("notifBadge");
  const drawerBadge = el("drawerNotifBadge");

  [badge, drawerBadge].forEach(b => {
    if (!b) return;
    if (count > 0) {
      b.textContent = count > 99 ? "99+" : String(count);
      b.style.display = "flex";
      b.classList.add("pulse");
    } else {
      b.style.display = "none";
      b.classList.remove("pulse");
    }
  });

  _lastKnownCommentCount = getUserNotifications().length;
}
window.updateNotificationBadge = updateNotificationBadge;

// 7. Navbar Bildirim Çanı Elementi
function ensureNotificationBellUI() {
  const authArea = el("authArea");
  if (!authArea) return;

  let wrap = el("notifBellWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "notifBellWrap";
    wrap.className = "notif-bell-wrap";
    wrap.innerHTML = `
      <button type="button" id="notifBellBtn" class="notif-bell-btn" title="Bölüm Yorumları Bildirimi" aria-label="Bildirimler">
        🔔
        <span id="notifBadge" class="notif-badge" style="display:none">0</span>
      </button>
      <div id="notifDropdown" class="notif-dropdown-menu" style="display:none"></div>
    `;

    const authBtn = el("userAuthBtn");
    const menuWrap = el("userMenuWrap");
    const ref = authBtn || menuWrap;
    if (ref && ref.parentNode === authArea) {
      authArea.insertBefore(wrap, ref);
    } else {
      authArea.appendChild(wrap);
    }

    const btn = wrap.querySelector("#notifBellBtn");
    if (btn) {
      btn.onclick = (e) => {
        e.stopPropagation();
        toggleNotificationDropdown();
      };
    }

    document.addEventListener("click", (e) => {
      const dd = el("notifDropdown");
      if (dd && dd.style.display !== "none" && !wrap.contains(e.target)) {
        dd.style.display = "none";
      }
    });
  }

  updateNotificationBadge();
}
window.ensureNotificationBellUI = ensureNotificationBellUI;

// 8. Dropdown Aç / Kapa & İçeriği Oluştur
function toggleNotificationDropdown() {
  const dd = el("notifDropdown");
  if (!dd) return;
  if (dd.style.display !== "none") {
    dd.style.display = "none";
  } else {
    dd.style.display = "block";
    renderNotificationDropdown();
  }
}
window.toggleNotificationDropdown = toggleNotificationDropdown;

function renderNotificationDropdown() {
  const dd = el("notifDropdown");
  if (!dd) return;

  const isAdm = isAdmAuth();
  const user = getCurrentUser();
  const notifs = getUserNotifications();
  const lastReadKey = getNotifLastReadKey();
  const lastReadTime = localStorage.getItem(lastReadKey) || 0;
  const lastReadMs = new Date(lastReadTime).getTime() || 0;
  const unreadCount = notifs.filter(c => new Date(c.createdAt).getTime() > lastReadMs).length;
  const perm = ("Notification" in window) ? Notification.permission : "unsupported";
  const showPermBanner = (perm === "default" && (isAdm || user));

  // Giriş Yapmamış Ziyaretçi Görünümü
  if (!user && !isAdm) {
    dd.innerHTML = `
      <div style="padding:14px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">🔔</span>
          <b style="font-size:14px;color:var(--tx)">Yorum Bildirimleri</b>
        </div>
      </div>
      <div style="padding:28px 18px;text-align:center">
        <div style="font-size:28px;margin-bottom:8px">🔒</div>
        <b style="font-size:13.5px;color:var(--tx);display:block;margin-bottom:6px">Giriş Yapmalısınız</b>
        <p style="font-size:12px;color:var(--mut);line-height:1.45;margin:0 0 14px">
          Bölümlere yaptığınız yorumlara yanıt geldiğinde anlık bildirim alabilmek için lütfen üye girişi yapın.
        </p>
        <button type="button" class="btn" onclick="openUserAuthModal('login');toggleNotificationDropdown()" style="font-size:12px;padding:7px 18px;font-weight:700">
          Giriş Yap / Kayıt Ol
        </button>
      </div>
    `;
    return;
  }

  const titleText = isAdm ? "Tüm Bölüm Yorumları (Admin)" : "Yorum Yanıtları";

  dd.innerHTML = `
    <div style="padding:14px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div style="display:flex;align-items:center;gap:8px;min-width:0">
        <span style="font-size:16px;flex-shrink:0">🔔</span>
        <b style="font-size:13.5px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${titleText}</b>
        ${unreadCount > 0 ? `<span style="font-size:10px;background:#ff3b47;color:#fff;padding:1px 6px;border-radius:10px;font-weight:700;flex-shrink:0">${unreadCount} Yeni</span>` : ''}
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        ${unreadCount > 0 ? `
          <button type="button" class="btn g" onclick="markAllNotificationsAsRead()" style="font-size:11px;padding:3px 8px;border-radius:6px" title="Tümünü Okundu İşaretle">
            ✓ Okundu
          </button>
        ` : ''}
        <button type="button" class="btn g" onclick="openNotificationSettingsModal()" style="font-size:12px;padding:3px 7px;border-radius:6px" title="Bildirim Ayarları">
          ⚙️
        </button>
      </div>
    </div>

    ${showPermBanner ? `
      <div style="background:rgba(229,9,20,0.08);border-bottom:1px solid var(--line);padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="font-size:11.5px;color:var(--tx);line-height:1.35">
          💻 <b>Masaüstü bildirimleri:</b> ${isAdm ? 'Yeni yorumlarda anında bildirim al.' : 'Yorumunuza cevap verildiğinde anında bildirim al.'}
        </div>
        <button type="button" class="btn" onclick="requestDesktopNotificationPermission()" style="font-size:11px;padding:4px 10px;white-space:nowrap;font-weight:700">
          İzin Ver
        </button>
      </div>
    ` : ''}

    <div style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column">
      ${notifs.length === 0 ? `
        <div style="padding:32px 16px;text-align:center;color:var(--mut)">
          <div style="font-size:26px;margin-bottom:8px">💬</div>
          <b style="font-size:13.5px;color:var(--tx);display:block;margin-bottom:4px">Henüz bildiriminiz yok</b>
          <span style="font-size:12px">
            ${isAdm ? 'Henüz hiçbir bölüme yorum yapılmamış.' : 'Yaptığınız yorumlara başkaları yanıt verdiğinde burada listelenir.'}
          </span>
        </div>
      ` : notifs.slice(0, 30).map(c => {
        const isUnread = new Date(c.createdAt).getTime() > lastReadMs;
        const initial = (c.author || "U").charAt(0).toUpperCase();
        const epUrl = (typeof buildEpisodeUrl === "function")
          ? buildEpisodeUrl(c.showTitle, c.season, c.episode)
          : `bolum.html?s=${encodeURIComponent(c.showTitle)}&se=${c.season}&ep=${c.episode}`;
        const targetUrl = `${epUrl}#ep_comments_box`;

        const isReply = c.type === 'reply';
        const authorLabel = isReply ? `${escapeHtml(c.author)} yorumunuza yanıt verdi:` : `${escapeHtml(c.author)} yorum yaptı:`;

        return `
          <a href="${targetUrl}" class="notif-item${isUnread ? ' unread' : ''}" onclick="onNotificationItemClick(event, '${targetUrl}')">
            <div style="width:34px;height:34px;border-radius:50%;background:${isUnread ? 'linear-gradient(135deg,#ff3b47,#a30610)' : 'var(--input-bg)'};border:1px solid var(--line);color:${isUnread ? '#fff' : 'var(--tx)'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">
              ${escapeHtml(initial)}
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:2px">
                <b style="font-size:12.5px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  ${escapeHtml(c.showTitle)} <span style="color:var(--ac);font-weight:700">S${c.season}B${c.episode}</span>
                </b>
                <span style="font-size:10.5px;color:var(--mut);flex-shrink:0">${formatTimeAgo(c.createdAt)}</span>
              </div>
              <div style="font-size:11.5px;color:var(--mut);margin-bottom:3px">
                👤 <span style="color:var(--tx);font-weight:600">${escapeHtml(c.author)}</span>
                ${isReply ? `<span style="color:var(--ac2);font-size:10.5px;margin-left:4px">cevap verdi</span>` : `<span>yorum yaptı</span>`}
              </div>
              <div style="font-size:12px;color:var(--tx);line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;background:var(--input-bg);padding:4px 8px;border-radius:6px;border:1px solid var(--line)">
                ${c.isSpoiler ? '<span style="color:#ffb400;font-weight:700">[⚠️ Spoiler] </span>' : ''}${escapeHtml(c.text)}
              </div>
            </div>
          </a>
        `;
      }).join('')}
    </div>

    <div style="padding:10px 14px;border-top:1px solid var(--line);background:var(--input-bg);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
      <span style="font-size:11px;color:var(--mut)">Toplam ${notifs.length} bildirim</span>
      <div style="display:flex;gap:6px;align-items:center">
        ${isAdm ? `
          <button type="button" class="btn g" onclick="toggleNotificationDropdown();openInlineCommentsManagerModal()" style="font-size:11px;padding:4px 8px;border-radius:6px;color:#c084fc;border-color:rgba(168,85,247,0.4)" title="Sitedeki tüm yorumları filtrele ve yönet">
            💬 Tüm Yorumlar
          </button>
        ` : ''}
        <button type="button" class="btn g" onclick="openNotificationSettingsModal()" style="font-size:11px;padding:4px 10px;border-radius:6px;color:var(--ac2)">
          ${isAdm ? '⚙️ Kanallar' : '⚙️ Bildirim Tercihleri'}
        </button>
      </div>
    </div>
  `;
}
window.renderNotificationDropdown = renderNotificationDropdown;

function onNotificationItemClick(event, targetUrl) {
  event.preventDefault();
  const key = getNotifLastReadKey();
  localStorage.setItem(key, new Date().toISOString());
  updateNotificationBadge();
  window.location.href = targetUrl;
}
window.onNotificationItemClick = onNotificationItemClick;

function markAllNotificationsAsRead() {
  const key = getNotifLastReadKey();
  localStorage.setItem(key, new Date().toISOString());
  updateNotificationBadge();
  renderNotificationDropdown();
  toast("Tüm bildirimler okundu olarak işaretlendi. ✓");
}
window.markAllNotificationsAsRead = markAllNotificationsAsRead;

async function requestDesktopNotificationPermission() {
  if (!("Notification" in window)) {
    toast("Tarayıcınız masaüstü bildirimlerini desteklemiyor.");
    return;
  }
  try {
    const res = await Notification.requestPermission();
    if (res === "granted") {
      toast("Masaüstü bildirimleri aktif edildi! 🔔");
      playNotificationChime();
      sendDesktopNotification(
        "🔔 Bildirimler Aktif!",
        "Yeni bir yorum veya yanıt geldiğinde anında bilgilendirileceksiniz.",
        window.location.href
      );
    } else if (res === "denied") {
      toast("Bildirim izni reddedildi. Tarayıcı adres çubuğundaki kilit simgesinden izin verebilirsiniz.");
    }
  } catch (e) {}
  renderNotificationDropdown();
}
window.requestDesktopNotificationPermission = requestDesktopNotificationPermission;

// 9. Mobil ve Çekmece İçin Tam Ekran Bildirim Modalı
function openNotificationCenterModal() {
  const m = ensureInlineAdminModalContainer();
  const isAdm = isAdmAuth();
  const user = getCurrentUser();
  const notifs = getUserNotifications();
  const lastReadKey = getNotifLastReadKey();
  const lastReadTime = localStorage.getItem(lastReadKey) || 0;
  const lastReadMs = new Date(lastReadTime).getTime() || 0;
  const unreadCount = notifs.filter(c => new Date(c.createdAt).getTime() > lastReadMs).length;

  if (!user && !isAdm) {
    m.innerHTML = `
      <div class="auth-modal-box" style="max-width:440px;width:100%;padding:26px;position:relative;text-align:center">
        <button class="auth-modal-close" onclick="closeInlineAdminModal()">×</button>
        <div style="font-size:32px;margin-bottom:10px">🔒</div>
        <h2 style="margin:0 0 8px;font-size:18px;color:var(--tx)">Giriş Yapmalısınız</h2>
        <p style="font-size:13px;color:var(--mut);line-height:1.5;margin:0 0 16px">
          Bölümlere yaptığınız yorumlara gelen yanıt bildirimlerini takip edebilmek için lütfen giriş yapın.
        </p>
        <div style="display:flex;gap:10px;justify-content:center">
          <button type="button" class="btn g" onclick="closeInlineAdminModal()" style="padding:8px 16px;font-size:12.5px">Kapat</button>
          <button type="button" class="btn" onclick="closeInlineAdminModal();openUserAuthModal('login')" style="padding:8px 20px;font-size:12.5px;font-weight:700">Giriş Yap</button>
        </div>
      </div>
    `;
    m.style.display = "flex";
    return;
  }

  const titleText = isAdm ? "Tüm Bölüm Yorumları (Admin)" : "Yorum Yanıtları";

  m.innerHTML = `
    <div class="auth-modal-box" style="max-width:560px;width:100%;padding:22px;position:relative;max-height:88vh;display:flex;flex-direction:column">
      <button class="auth-modal-close" onclick="closeInlineAdminModal()">×</button>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;border-bottom:1px solid var(--line);padding-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">🔔</span>
          <h2 style="margin:0;font-size:17px;color:var(--tx)">${titleText}</h2>
          ${unreadCount > 0 ? `<span style="font-size:10px;background:#ff3b47;color:#fff;padding:2px 7px;border-radius:10px;font-weight:700">${unreadCount} Yeni</span>` : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${isAdm ? `<button type="button" class="btn g" onclick="closeInlineAdminModal();openInlineCommentsManagerModal()" style="font-size:11px;padding:4px 8px;color:#c084fc;border-color:rgba(168,85,247,0.4)">💬 Tüm Yorumlar</button>` : ''}
          ${unreadCount > 0 ? `<button type="button" class="btn g" onclick="markAllNotificationsAsRead();openNotificationCenterModal()" style="font-size:11px;padding:4px 8px">✓ Okundu</button>` : ''}
          <button type="button" class="btn g" onclick="closeInlineAdminModal();openNotificationSettingsModal()" style="font-size:11px;padding:4px 8px">⚙️ Ayarlar</button>
        </div>
      </div>

      <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column">
        ${notifs.length === 0 ? `
          <div style="padding:40px 16px;text-align:center;color:var(--mut)">
            <div style="font-size:32px;margin-bottom:10px">💬</div>
            <b style="font-size:14px;color:var(--tx);display:block;margin-bottom:4px">Henüz hiç bildiriminiz yok</b>
            <span style="font-size:12.5px">${isAdm ? 'Henüz hiçbir bölüme yorum yapılmamış.' : 'Yaptığınız yorumlara cevap verildiğinde burada anında listelenir.'}</span>
          </div>
        ` : notifs.map(c => {
          const isUnread = new Date(c.createdAt).getTime() > lastReadMs;
          const initial = (c.author || "U").charAt(0).toUpperCase();
          const epUrl = (typeof buildEpisodeUrl === "function")
            ? buildEpisodeUrl(c.showTitle, c.season, c.episode)
            : `bolum.html?s=${encodeURIComponent(c.showTitle)}&se=${c.season}&ep=${c.episode}`;
          const targetUrl = `${epUrl}#ep_comments_box`;
          const isReply = c.type === 'reply';

          return `
            <a href="${targetUrl}" class="notif-item${isUnread ? ' unread' : ''}" onclick="onNotificationItemClick(event, '${targetUrl}')">
              <div style="width:36px;height:36px;border-radius:50%;background:${isUnread ? 'linear-gradient(135deg,#ff3b47,#a30610)' : 'var(--input-bg)'};border:1px solid var(--line);color:${isUnread ? '#fff' : 'var(--tx)'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">
                ${escapeHtml(initial)}
              </div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:2px">
                  <b style="font-size:13px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    ${escapeHtml(c.showTitle)} <span style="color:var(--ac);font-weight:700">S${c.season}B${c.episode}</span>
                  </b>
                  <span style="font-size:10.5px;color:var(--mut);flex-shrink:0">${formatTimeAgo(c.createdAt)}</span>
                </div>
                <div style="font-size:11.5px;color:var(--mut);margin-bottom:3px">
                  👤 <span style="color:var(--tx);font-weight:600">${escapeHtml(c.author)}</span>
                  ${isReply ? `<span style="color:var(--ac2);font-size:10.5px;margin-left:4px">cevap verdi</span>` : `<span>yorum yaptı</span>`}
                </div>
                <div style="font-size:12px;color:var(--tx);line-height:1.4;background:var(--input-bg);padding:6px 10px;border-radius:6px;border:1px solid var(--line)">
                  ${c.isSpoiler ? '<span style="color:#ffb400;font-weight:700">[⚠️ Spoiler] </span>' : ''}${escapeHtml(c.text)}
                </div>
              </div>
            </a>
          `;
        }).join('')}
      </div>

      <div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11.5px;color:var(--mut)">Toplam ${notifs.length} bildirim</span>
        <button type="button" class="btn g" onclick="closeInlineAdminModal()" style="font-size:12px;padding:6px 16px">Kapat</button>
      </div>
    </div>
  `;
  m.style.display = "flex";
}
window.openNotificationCenterModal = openNotificationCenterModal;

// 10. Bildirim Ayarları Modalı
function openNotificationSettingsModal() {
  const m = ensureInlineAdminModalContainer();
  const isAdm = isAdmAuth();
  const curSound = localStorage.getItem(BD_NOTIF_SOUND_KEY) !== "0";
  const curDiscord = localStorage.getItem(BD_NOTIF_DISCORD_KEY) || "";
  const curTgToken = localStorage.getItem(BD_NOTIF_TELEGRAM_TOKEN_KEY) || "";
  const curTgChat = localStorage.getItem(BD_NOTIF_TELEGRAM_CHATID_KEY) || "";
  const perm = ("Notification" in window) ? Notification.permission : "desteklenmiyor";

  m.innerHTML = `
    <div class="auth-modal-box" style="max-width:540px;width:100%;padding:24px;position:relative;max-height:90vh;overflow-y:auto">
      <button class="auth-modal-close" onclick="closeInlineAdminModal()">×</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="font-size:24px">🔔</div>
        <div>
          <h2 style="margin:0;font-size:18px;color:var(--tx)">${isAdm ? 'Yönetici Bildirim Ayarları' : 'Yorum Bildirim Ayarları'}</h2>
          <p class="mut" style="font-size:12px;margin:2px 0 0">
            ${isAdm ? 'Sitedeki tüm yorumlar ve harici bildirim kanalları' : 'Yorumlarınıza gelen yanıtlar için ses ve masaüstü tercihleri'}
          </p>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;margin:18px 0 20px">
        <!-- 1. Sesli Bildirim -->
        <div style="background:var(--input-bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div>
            <b style="font-size:13.5px;color:var(--tx);display:block;margin-bottom:2px">🔊 Sesli Bildirim Zili</b>
            <span style="font-size:11.5px;color:var(--mut)">Yeni bir bildirim geldiğinde tarayıcıda zarif bir zil çalar.</span>
          </div>
          <label style="position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0;cursor:pointer">
            <input type="checkbox" id="notif_set_sound" ${curSound ? 'checked' : ''} style="opacity:0;width:0;height:0">
            <span style="position:absolute;inset:0;background:${curSound ? '#ff3b47' : '#444'};border-radius:24px;transition:0.2s" id="notif_sound_track">
              <span style="position:absolute;content:'';height:18px;width:18px;left:${curSound ? '22px' : '3px'};bottom:3px;background:white;border-radius:50%;transition:0.2s" id="notif_sound_thumb"></span>
            </span>
          </label>
        </div>

        <!-- 2. Masaüstü / Tarayıcı Push Bildirimi -->
        <div style="background:var(--input-bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div>
            <b style="font-size:13.5px;color:var(--tx);display:block;margin-bottom:2px">💻 Tarayıcı / Masaüstü Bildirimi</b>
            <span style="font-size:11.5px;color:var(--mut)">Sekme arka planda olsa bile Windows / Telefon ekranında bildirim kartı gösterilir.</span>
          </div>
          <div style="flex-shrink:0">
            ${perm === "granted" ? `
              <span style="font-size:11.5px;color:#4ade80;background:rgba(74,222,128,0.12);padding:4px 10px;border-radius:6px;font-weight:700">✓ Aktif</span>
            ` : `
              <button type="button" class="btn" onclick="requestDesktopNotificationPermission()" style="font-size:11.5px;padding:5px 12px;font-weight:700">İzin Ver</button>
            `}
          </div>
        </div>

        ${isAdm ? `
          <!-- 3. Discord Webhook Bildirimi (Yalnızca Admin) -->
          <div style="background:var(--input-bg);border:1px solid var(--line);border-radius:10px;padding:14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:16px">💬</span>
              <b style="font-size:13.5px;color:var(--tx)">Discord Webhook (Yönetici)</b>
            </div>
            <p style="font-size:11.5px;color:var(--mut);margin:0 0 8px">
              Discord kanalınızın Entegrasyonlar bölümünden Webhook URL'si oluşturup buraya yapıştırırsanız, sitedeki tüm yorumlar Discord sunucunuza iletilir.
            </p>
            <input id="notif_set_discord" type="text" class="auth-input" value="${escapeHtml(curDiscord)}" placeholder="https://discord.com/api/webhooks/..." style="width:100%;font-size:12px;padding:8px 10px">
          </div>

          <!-- 4. Telegram Bot Bildirimi (Yalnızca Admin) -->
          <div style="background:var(--input-bg);border:1px solid var(--line);border-radius:10px;padding:14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:16px">✈️</span>
              <b style="font-size:13.5px;color:var(--tx)">Telegram Botu (Yönetici)</b>
            </div>
            <p style="font-size:11.5px;color:var(--mut);margin:0 0 8px">
              Telegram botunuz üzerinden anlık bildirim almak isterseniz Bot Token ve Chat ID girin.
            </p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div>
                <label style="display:block;font-size:11px;color:var(--mut);margin-bottom:3px">Bot Token</label>
                <input id="notif_set_tg_token" type="text" class="auth-input" value="${escapeHtml(curTgToken)}" placeholder="Örn: 123456:ABC-DEF..." style="width:100%;font-size:12px;padding:7px 9px">
              </div>
              <div>
                <label style="display:block;font-size:11px;color:var(--mut);margin-bottom:3px">Chat ID</label>
                <input id="notif_set_tg_chat" type="text" class="auth-input" value="${escapeHtml(curTgChat)}" placeholder="Örn: 98765432" style="width:100%;font-size:12px;padding:7px 9px">
              </div>
            </div>
          </div>
        ` : ''}
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid var(--line);padding-top:14px">
        <button type="button" class="btn g" onclick="testNotificationFlow()" style="font-size:12px;padding:8px 14px;color:var(--ac2);border-color:rgba(255,180,0,0.3)">
          ⚡ Test Bildirimi Gönder
        </button>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn g" onclick="closeInlineAdminModal()" style="padding:8px 16px;font-size:12.5px">İptal</button>
          <button type="button" class="btn" onclick="saveNotificationSettings()" style="padding:8px 20px;font-size:12.5px;font-weight:700">💾 Ayarları Kaydet</button>
        </div>
      </div>
    </div>
  `;

  const chkSound = el("notif_set_sound");
  if (chkSound) {
    chkSound.onchange = () => {
      const track = el("notif_sound_track");
      const thumb = el("notif_sound_thumb");
      if (chkSound.checked) {
        if (track) track.style.background = "#ff3b47";
        if (thumb) thumb.style.left = "22px";
        playNotificationChime();
      } else {
        if (track) track.style.background = "#444";
        if (thumb) thumb.style.left = "3px";
      }
    };
  }

  m.style.display = "flex";
}
window.openNotificationSettingsModal = openNotificationSettingsModal;

function testNotificationFlow() {
  playNotificationChime();
  const isAdm = isAdmAuth();
  toast("🔔 Test bildirimi tetiklendi!");
  if (isAdm) {
    sendDesktopNotification(
      "🔔 Test Bildirimi (Yönetici) — Bölüm Dizi",
      "Tüm site yorum bildirim sisteminiz başarıyla çalışıyor.",
      window.location.href
    );
    sendWebhookNotification({
      showTitle: "Breaking Bad",
      season: 1,
      episode: 1,
      author: "Test Bildirimi",
      text: "Tebrikler! Webhook bildirim entegrasyonu başarıyla çalışıyor. 🚀"
    });
  } else {
    sendDesktopNotification(
      "💬 Test Bildirimi (Yorum Yanıtı) — Bölüm Dizi",
      "Ahmet yorumunuza yanıt verdi: 'Harika bir bölümdü kesinlikle katılıyorum!'",
      window.location.href
    );
  }
}
window.testNotificationFlow = testNotificationFlow;

function saveNotificationSettings() {
  const chkSound = el("notif_set_sound");
  const discordInp = el("notif_set_discord");
  const tgTokenInp = el("notif_set_tg_token");
  const tgChatInp = el("notif_set_tg_chat");

  if (chkSound) localStorage.setItem(BD_NOTIF_SOUND_KEY, chkSound.checked ? "1" : "0");
  if (discordInp) localStorage.setItem(BD_NOTIF_DISCORD_KEY, discordInp.value.trim());
  if (tgTokenInp) localStorage.setItem(BD_NOTIF_TELEGRAM_TOKEN_KEY, tgTokenInp.value.trim());
  if (tgChatInp) localStorage.setItem(BD_NOTIF_TELEGRAM_CHATID_KEY, tgChatInp.value.trim());

  toast("Bildirim ayarlarınız kaydedildi! ✓");
  closeInlineAdminModal();
}
window.saveNotificationSettings = saveNotificationSettings;

// 11. Gelen Bildirimi İşleme (Kural: Admin Tümünü Alır, Üye Sadece Kendi Yorumuna Yanıt Gelince Alır)
function handleIncomingCommentNotification(payload, isLocalTrigger = false) {
  if (!payload) return;
  const isAdm = isAdmAuth();
  const user = getCurrentUser();

  const authorName = (payload.author || (payload.comment && payload.comment.author) || "Üye").trim();
  let parentAuthorName = (payload.parentAuthor || "").trim();
  if (payload.type === 'reply' && !parentAuthorName && payload.parentId) {
    parentAuthorName = findCommentAuthorById(payload.parentId, payload.showTitle, payload.season, payload.episode);
  }

  const currentUsername = (user && user.username ? user.username.trim() : "");
  const isSelf = currentUsername && (currentUsername.toLowerCase() === authorName.toLowerCase());

  // Kural Denetimi:
  // 1. Admin: Sitedeki TÜM yorumlar ve yanıtlar için bildirim alır.
  // 2. Normal Üye: SADECE kendi yorumuna başkası cevap verdiğinde bildirim alır.
  // 3. Misafir: Bildirim almaz.
  let shouldNotify = false;
  let notifType = "comment"; // "comment" | "reply" | "reply_to_me"

  if (isAdm) {
    shouldNotify = true;
    notifType = (payload.type === 'reply') ? "reply" : "comment";
  } else if (user && currentUsername) {
    if (payload.type === 'reply' && parentAuthorName) {
      if (parentAuthorName.toLowerCase() === currentUsername.toLowerCase() && !isSelf) {
        shouldNotify = true;
        notifType = "reply_to_me";
      }
    }
  } else {
    shouldNotify = false;
  }

  updateNotificationBadge();

  if (!shouldNotify) return;

  // Kullanıcı bu sekmede kendisi gönderdiyse popup sesini gereksiz çalma
  if (isLocalTrigger && isSelf) return;

  playNotificationChime();

  const showName = payload.showTitle || "Dizi";
  const s = payload.season || 1;
  const b = payload.episode || 1;
  const commentText = (payload.text || (payload.comment && payload.comment.text) || "");
  const snippet = commentText.slice(0, 45);
  const epUrl = (typeof buildEpisodeUrl === "function")
    ? buildEpisodeUrl(showName, s, b)
    : `bolum.html?s=${encodeURIComponent(showName)}&se=${s}&ep=${b}`;
  const targetUrl = `${epUrl}#ep_comments_box`;

  if (notifType === "reply_to_me") {
    toast(`💬 <b>${escapeHtml(authorName)}</b>, ${escapeHtml(showName)} S${s}B${b} yorumunuza yanıt verdi!`);
    sendDesktopNotification(
      `💬 Yorumunuza Yanıt: ${showName} S${s}B${b}`,
      `${authorName}: "${snippet}${commentText.length > 45 ? '...' : ''}"`,
      targetUrl
    );
  } else {
    // Admin Bildirimi
    if (payload.type === 'reply') {
      toast(`🔔 <b>${escapeHtml(authorName)}</b>, ${escapeHtml(showName)} S${s}B${b} bir yoruma yanıt verdi.`);
      sendDesktopNotification(
        `🔔 Yeni Yanıt — ${showName} S${s}B${b}`,
        `${authorName}: "${snippet}${commentText.length > 45 ? '...' : ''}"`,
        targetUrl
      );
    } else {
      toast(`🔔 <b>${escapeHtml(authorName)}</b>, ${escapeHtml(showName)} S${s}B${b} için yorum yaptı.`);
      sendDesktopNotification(
        `🔔 Yeni Bölüm Yorumu — ${showName} S${s}B${b}`,
        `${authorName}: "${snippet}${commentText.length > 45 ? '...' : ''}"`,
        targetUrl
      );
    }
  }
}
window.handleIncomingCommentNotification = handleIncomingCommentNotification;

// 12. Yorum Gönderildiğinde Bildirimi Dağıtma
function dispatchCommentNotification(payload) {
  if (!payload) return;
  if (!payload.author && payload.comment && payload.comment.author) {
    payload.author = payload.comment.author;
  }
  if (!payload.text && payload.comment && payload.comment.text) {
    payload.text = payload.comment.text;
  }
  if (payload.type === 'reply' && !payload.parentAuthor && payload.parentId) {
    payload.parentAuthor = findCommentAuthorById(payload.parentId, payload.showTitle, payload.season, payload.episode);
  }

  try {
    if (typeof sbClient !== 'undefined' && sbClient) {
      const channel = sbClient.channel("site_comment_notifications");
      channel.send({
        type: "broadcast",
        event: "new_comment",
        payload
      }).catch(() => {});
    }
  } catch (e) {}

  try {
    localStorage.setItem(BD_NOTIF_BROADCAST_KEY, JSON.stringify({
      payload,
      ts: Date.now()
    }));
  } catch (e) {}

  sendWebhookNotification(payload);
  handleIncomingCommentNotification(payload, true);
}
window.dispatchCommentNotification = dispatchCommentNotification;

// 13. Bildirim Sistemini Başlat (Gerçek Zamanlı Dinleyiciler & Periyodik Kontrol)
let _notifPollingTimer = null;
let _lastKnownCommentCount = -1;

function initNotificationSystem() {
  ensureNotificationBellUI();

  try {
    if (typeof sbClient !== 'undefined' && sbClient) {
      const channel = sbClient.channel("site_comment_notifications");
      channel.on("broadcast", { event: "new_comment" }, ({ payload }) => {
        if (payload) handleIncomingCommentNotification(payload, false);
      }).subscribe();
    }
  } catch (e) {}

  window.addEventListener("storage", (e) => {
    if (e.key === BD_NOTIF_BROADCAST_KEY && e.newValue) {
      try {
        const item = JSON.parse(e.newValue);
        if (item && item.payload) {
          handleIncomingCommentNotification(item.payload, false);
        }
      } catch (err) {}
    }
  });

  if (!_notifPollingTimer) {
    _lastKnownCommentCount = getUserNotifications().length;
    _notifPollingTimer = setInterval(() => {
      try {
        const prevCount = _lastKnownCommentCount;
        const curNotifs = getUserNotifications();
        _lastKnownCommentCount = curNotifs.length;

        if (prevCount !== -1 && curNotifs.length > prevCount) {
          const newest = curNotifs[0];
          const key = getNotifLastReadKey();
          const lastReadTime = localStorage.getItem(key) || 0;
          if (new Date(newest.createdAt).getTime() > new Date(lastReadTime).getTime()) {
            handleIncomingCommentNotification(newest, false);
          }
        } else {
          updateNotificationBadge();
        }
      } catch (err) {}
    }, 25000);
  }
}
window.initNotificationSystem = initNotificationSystem;

if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(initNotificationSystem, 50);
}

// ==========================================
// SİTEDEKİ TÜM YORUMLARI YÖNETME MERKEZİ (MODAL)
// ==========================================
function openInlineCommentsManagerModal(filterShow = "") {
  if (!isAdmAuth()) {
    toast("Bu alana yalnızca sistem yöneticisi erişebilir.");
    return;
  }
  const m = ensureInlineAdminModalContainer();
  const allShows = (typeof API !== 'undefined' && API.getAllSeries) ? API.getAllSeries() : [];
  const showTitles = allShows.map(s => s[0]).sort((a,b) => a.localeCompare(b, 'tr'));

  m.innerHTML = `
    <div class="auth-modal-box" style="max-width:840px;width:100%;padding:24px;position:relative;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.72)">
      <button class="auth-modal-close" onclick="closeInlineAdminModal()">×</button>
      
      <!-- Başlık -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:rgba(168,85,247,0.16);border:1px solid rgba(168,85,247,0.35);display:flex;align-items:center;justify-content:center;font-size:22px;color:#c084fc;flex-shrink:0">💬</div>
          <div>
            <div style="display:flex;align-items:center;gap:8px">
              <h2 style="margin:0;font-size:18px;color:var(--tx)">Sitedeki Tüm Yorumlar</h2>
              <span id="cm_total_badge" style="font-size:11px;background:#c084fc;color:#000;padding:2px 8px;border-radius:12px;font-weight:800">0 Yorum</span>
            </div>
            <span style="font-size:12px;color:var(--mut);display:block;margin-top:2px">Sitedeki tüm dizilere ve bölümlere yapılan yorumları inceleyin veya silin</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button type="button" class="btn g" onclick="renderCommentsManagerList()" style="font-size:12px;padding:6px 12px;border-radius:8px">🔄 Yenile</button>
          <button type="button" class="btn g" onclick="closeInlineAdminModal()" style="font-size:12px;padding:6px 14px;border-radius:8px">Kapat</button>
        </div>
      </div>

      <!-- Filtreler & Arama Barı -->
      <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:10px;margin-bottom:14px;background:var(--input-bg);padding:12px;border-radius:12px;border:1px solid var(--line)">
        <div>
          <label style="display:block;font-size:11px;color:var(--mut);margin-bottom:4px;font-weight:600">Arama (Yorum, Yazar veya Dizi)</label>
          <input type="text" id="cm_search_inp" class="auth-input" placeholder="Yorum metni veya kullanıcı adı yazın..." style="width:100%;font-size:12.5px;padding:7px 10px">
        </div>
        <div>
          <label style="display:block;font-size:11px;color:var(--mut);margin-bottom:4px;font-weight:600">Diziye Göre Filtrele</label>
          <select id="cm_show_filter" class="auth-input" style="width:100%;font-size:12.5px;padding:7px 8px;cursor:pointer">
            <option value="">Tüm Yapımlar (${showTitles.length})</option>
            ${showTitles.map(t => `<option value="${escapeHtml(t)}"${filterShow && filterShow.toLowerCase() === t.toLowerCase() ? ' selected' : ''}>${escapeHtml(t)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:11px;color:var(--mut);margin-bottom:4px;font-weight:600">Tür Filtresi</label>
          <select id="cm_type_filter" class="auth-input" style="width:100%;font-size:12.5px;padding:7px 8px;cursor:pointer">
            <option value="all">Tümü (Yorum & Yanıt)</option>
            <option value="comment">Sadece Ana Yorumlar</option>
            <option value="reply">Sadece Yanıtlar</option>
            <option value="spoiler">⚠️ Spoiler Olanlar</option>
          </select>
        </div>
      </div>

      <!-- Yorumlar Listesi Alanı -->
      <div id="cm_list_container" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding-right:4px">
        <!-- JS ile dinamik render edilir -->
      </div>
      
      <!-- Alt Bilgi Çubuğu -->
      <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <span id="cm_footer_count" style="font-size:12px;color:var(--mut)">Yükleniyor...</span>
        <button type="button" class="btn g" onclick="closeInlineAdminModal()" style="font-size:12.5px;padding:6px 18px">Kapat</button>
      </div>
    </div>
  `;

  m.style.display = "flex";

  const searchInp = el("cm_search_inp");
  const showFilter = el("cm_show_filter");
  const typeFilter = el("cm_type_filter");

  if (searchInp) searchInp.oninput = () => renderCommentsManagerList();
  if (showFilter) showFilter.onchange = () => renderCommentsManagerList();
  if (typeFilter) typeFilter.onchange = () => renderCommentsManagerList();

  renderCommentsManagerList();
}
window.openInlineCommentsManagerModal = openInlineCommentsManagerModal;

function renderCommentsManagerList() {
  const container = el("cm_list_container");
  if (!container) return;

  const searchVal = (el("cm_search_inp")?.value || "").trim().toLowerCase();
  const showVal = (el("cm_show_filter")?.value || "").trim().toLowerCase();
  const typeVal = el("cm_type_filter")?.value || "all";

  const allComments = (typeof getAllSiteComments === 'function') ? getAllSiteComments() : [];
  const badge = el("cm_total_badge");
  if (badge) badge.textContent = `${allComments.length} Yorum`;

  const filtered = allComments.filter(c => {
    if (showVal && (c.showTitle || "").toLowerCase().trim() !== showVal) return false;
    if (typeVal === "comment" && c.type !== "comment") return false;
    if (typeVal === "reply" && c.type !== "reply") return false;
    if (typeVal === "spoiler" && !c.isSpoiler) return false;

    if (searchVal) {
      const matchText = (c.text || "").toLowerCase().includes(searchVal);
      const matchAuthor = (c.author || "").toLowerCase().includes(searchVal);
      const matchShow = (c.showTitle || "").toLowerCase().includes(searchVal);
      if (!matchText && !matchAuthor && !matchShow) return false;
    }
    return true;
  });

  const footerCount = el("cm_footer_count");
  if (footerCount) {
    footerCount.textContent = `Filtrelenen: ${filtered.length} / Toplam: ${allComments.length} yorum`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding:48px 16px;text-align:center;color:var(--mut)">
        <div style="font-size:36px;margin-bottom:10px">💬</div>
        <b style="font-size:15px;color:var(--tx);display:block;margin-bottom:6px">Kriterlere uygun yorum bulunamadı</b>
        <span style="font-size:12.5px">${allComments.length === 0 ? 'Sitede henüz hiç yorum bulunmuyor.' : 'Arama filtrenizi temizleyerek tekrar deneyebilirsiniz.'}</span>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(c => {
    const isReply = c.type === 'reply';
    const initial = (c.author || "U").charAt(0).toUpperCase();
    const isAdminComment = (c.role === 'admin' || (c.author && c.author.toLowerCase() === 'bolumdizi'));
    const epUrl = (typeof buildEpisodeUrl === "function")
      ? buildEpisodeUrl(c.showTitle, c.season, c.episode)
      : `bolum.html?s=${encodeURIComponent(c.showTitle)}&se=${c.season}&ep=${c.episode}`;
    const targetUrl = `${epUrl}#ep_comments_box`;

    const cleanTitle = (c.showTitle || '').replace(/'/g, "\\'");
    const cleanId = (c.id || '').replace(/'/g, "\\'");
    const cleanParentId = (c.parentId || c.id || '').replace(/'/g, "\\'");

    return `
      <div style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:34px;height:34px;border-radius:50%;background:${isAdminComment ? 'linear-gradient(135deg,#ff3b47,#a30610)' : 'var(--input-bg)'};border:1px solid var(--line);color:${isAdminComment ? '#fff' : 'var(--tx)'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">
              ${escapeHtml(initial)}
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <b style="font-size:13px;color:var(--tx)">${escapeHtml(c.author)}</b>
                ${isAdminComment ? '<span style="font-size:9.5px;background:linear-gradient(135deg,#ff3b47,#a30610);color:#fff;padding:1px 6px;border-radius:8px;font-weight:700">YÖNETİCİ</span>' : '<span style="font-size:9.5px;background:var(--input-bg);color:var(--mut);border:1px solid var(--line);padding:1px 6px;border-radius:8px">ÜYE</span>'}
                ${isReply ? `<span style="font-size:11px;color:var(--ac2);font-weight:600">↳ ${escapeHtml(c.parentAuthor || 'Yorum')} cevabı</span>` : ''}
                ${c.isSpoiler ? '<span style="font-size:10px;background:rgba(255,180,0,0.18);color:#ffb400;border:1px solid rgba(255,180,0,0.35);padding:1px 6px;border-radius:6px;font-weight:700">⚠️ Spoiler</span>' : ''}
              </div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
                <span style="font-size:11.5px;color:var(--mut);font-weight:600">${escapeHtml(c.showTitle)}</span>
                <span style="font-size:10.5px;background:rgba(229,9,20,0.15);color:var(--ac);padding:1px 6px;border-radius:5px;font-weight:800">S${c.season}B${c.episode}</span>
                <span style="font-size:11px;color:var(--mut)">• ${formatTimeAgo(c.createdAt)}</span>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:6px;align-items:center">
            <a href="${targetUrl}" target="_blank" class="btn g" style="font-size:11px;padding:4px 10px;text-decoration:none" title="Bölüm yorumlarına git">
              ↗️ Bölüme Git
            </a>
            <button type="button" class="btn g" onclick="handleAdminDeleteComment('${cleanTitle}', ${c.season}, ${c.episode}, '${cleanParentId}', ${isReply ? `'${cleanId}'` : 'null'})" style="font-size:11px;padding:4px 10px;color:#ff5252;border-color:rgba(255,82,82,0.35)" title="Yorumu kalıcı olarak sil">
              🗑️ Sil
            </button>
          </div>
        </div>

        <div style="font-size:12.5px;color:var(--tx);line-height:1.5;background:var(--input-bg);padding:8px 12px;border-radius:8px;border:1px solid var(--line);white-space:pre-wrap;word-break:break-word">
          ${escapeHtml(c.text)}
        </div>
      </div>
    `;
  }).join('');
}
window.renderCommentsManagerList = renderCommentsManagerList;

async function handleAdminDeleteComment(showTitle, season, episode, commentId, replyId = null) {
  if (!isAdmAuth()) {
    toast("Yetkisiz işlem.");
    return;
  }
  const confirmMsg = replyId
    ? `"${showTitle}" S${season}B${episode} bölümündeki bu yanıtı silmek istediğinize emin misiniz?`
    : `"${showTitle}" S${season}B${episode} bölümündeki bu yorumu ve varsa tüm yanıtlarını silmek istediğinize emin misiniz?`;

  if (!confirm(confirmMsg)) return;

  try {
    const success = await API.deleteComment(showTitle, season, episode, commentId, replyId);
    if (success) {
      toast("Yorum başarıyla silindi. ✓");
      renderCommentsManagerList();
      if (typeof updateNotificationBadge === "function") updateNotificationBadge();
      if (typeof renderProfileCommentsList === "function") renderProfileCommentsList();
      const profStatCount = el("site_all_comments_stat_count");
      if (profStatCount && typeof getAllSiteComments === "function") {
        profStatCount.textContent = getAllSiteComments().length;
      }
    } else {
      toast("Yorum silinemedi veya bulunamadı.");
    }
  } catch (err) {
    toast(`Hata: ${err.message}`);
  }
}
window.handleAdminDeleteComment = handleAdminDeleteComment;






