const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');
const DATA_JS_PATH = path.join(__dirname, '..', 'public', 'js', 'data.js');
const SB_URL = 'https://ospayntenysjfysczduu.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcGF5bnRlbnlzamZ5c2N6ZHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTE4NzQsImV4cCI6MjEwNjg4Nzg3NH0.fBqBp_mgHitbIsNWkI97hQ0Wgv5CAzsyRGUiqjcZty8';

async function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

  // Ensure Ezel is included
  const hasEzel = db.series.some(s => s[0].toLowerCase() === 'ezel');
  if (!hasEzel) {
    const ezelSeries = [
      'Ezel',
      'Suç, Dram, Gerilim',
      8.6,
      2009,
      'https://images.metahub.space/poster/small/tt1534360/img',
      'https://images.metahub.space/background/medium/tt1534360/img',
      {
        epMap: { '1': 34, '2': 38 },
        imdbId: 'tt1534360',
        status: 'Final Yaptı',
        seasons: 2,
        totalEpisodes: 72
      }
    ];
    db.series.unshift(ezelSeries);
  }

  db.summaries['Ezel'] = "Ömer, en yakın arkadaşları ve aşık olduğu kadın tarafından kurulan tuzak sonucu haksız yere hapse atılır. Hapishanede tanıştığı Ramiz Dayı sayesinde bambaşka bir adama dönüşen Ömer, yüzünü ve kimliğini değiştirerek intikamını almak üzere 'Ezel' olarak geri döner.";
  db.backdrops['Ezel'] = 'https://images.metahub.space/background/medium/tt1534360/img';
  db.defaultImdbIds['Ezel'] = 'tt1534360';

  const hasEzelEp = db.episodes.some(e => {
    const t = Array.isArray(e.t) ? e.t[0] : e.t;
    return (t || '').toLowerCase() === 'ezel' && e.s === 1 && e.e === 1;
  });

  if (!hasEzelEp) {
    db.episodes.unshift({
      t: ['Ezel', '1. Sezon 1. Bölüm', '28 Eylül 2009'],
      s: 1,
      e: 1,
      p: 'https://images.metahub.space/background/medium/tt1534360/img',
      f: 'FHD',
      ago: '28 Eylül 2009',
      embed: ''
    });
  }

  // 1. Fetch current cloud database from Supabase and merge
  console.log('Fetching Supabase data for union-merge...');
  let cloudSeries = [];
  let cloudAnime = [];
  let cloudEps = [];
  let cloudSummaries = {};
  let cloudBackdrops = {};
  let cloudComments = {};

  try {
    const res = await fetch(SB_URL + '/rest/v1/users?username=eq.__site_content__&select=watchlist', {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows && rows[0] && rows[0].watchlist) {
        const w = rows[0].watchlist;
        cloudSeries = w.series || [];
        cloudAnime = w.anime || [];
        cloudEps = w.episodes || [];
        cloudSummaries = w.summaries || {};
        cloudBackdrops = w.backdrops || {};
        cloudComments = w.comments || {};
      }
    }
  } catch (err) {
    console.warn('Supabase fetch failed:', err.message);
  }

  // Intelligently merge: Preserve any series in cloud that is not in local, and keep local additions
  const seenSeries = new Set(db.series.map(s => s[0].toLowerCase().trim()));
  cloudSeries.forEach(cs => {
    if (cs && cs[0] && !seenSeries.has(cs[0].toLowerCase().trim())) {
      console.log('Adding series found in cloud to local:', cs[0]);
      db.series.push(cs);
      seenSeries.add(cs[0].toLowerCase().trim());
    }
  });

  const seenAnime = new Set(db.anime.map(a => a[0].toLowerCase().trim()));
  cloudAnime.forEach(ca => {
    if (ca && ca[0] && !seenAnime.has(ca[0].toLowerCase().trim())) {
      console.log('Adding anime found in cloud to local:', ca[0]);
      db.anime.push(ca);
      seenAnime.add(ca[0].toLowerCase().trim());
    }
  });

  const getEpKey = (ep) => {
    if (!ep) return '';
    const t = Array.isArray(ep.t) ? ep.t[0] : (typeof ep.t === 'object' ? ep.t[0] : ep.t);
    return `${(t || '').toLowerCase().trim()}_s${ep.s}_e${ep.e}`;
  };
  const seenEps = new Set(db.episodes.map(getEpKey));
  cloudEps.forEach(ce => {
    const k = getEpKey(ce);
    if (k && !seenEps.has(k)) {
      db.episodes.push(ce);
      seenEps.add(k);
    }
  });

  db.summaries = Object.assign({}, cloudSummaries, db.summaries);
  db.backdrops = Object.assign({}, cloudBackdrops, db.backdrops);
  db.comments = Object.assign({}, cloudComments, db.comments);

  // Write merged data to database.json
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Saved database.json. Series: ${db.series.length}, Anime: ${db.anime.length}, Episodes: ${db.episodes.length}`);

  // Write to public/js/data.js
  const out = '// bolumdizi Client Initial Data & Constants (Auto-synced)\n' +
    'window.DEFAULT_SERIES = ' + JSON.stringify(db.series || [], null, 2) + ';\n\n' +
    'window.DEFAULT_ANIME = ' + JSON.stringify(db.anime || [], null, 2) + ';\n\n' +
    'window.DEFAULT_EPISODES = ' + JSON.stringify(db.episodes || [], null, 2) + ';\n\n' +
    'window.DEFAULT_THREADS = ' + JSON.stringify(db.threads || [], null, 2) + ';\n\n' +
    'window.DEFAULT_SUMMARIES = ' + JSON.stringify(db.summaries || {}, null, 2) + ';\n\n' +
    'window.DEFAULT_BACKDROPS = ' + JSON.stringify(db.backdrops || {}, null, 2) + ';\n\n' +
    'window.DEFAULT_SCHEDULE = ' + JSON.stringify(db.schedule || [], null, 2) + ';\n\n' +
    'window.DEFAULT_IMDB_IDS = ' + JSON.stringify(db.defaultImdbIds || {}, null, 2) + ';\n\n' +
    'window.PALETTES = ' + JSON.stringify(db.palettes || [], null, 2) + ';\n\n' +
    'window.DEFAULT_COMMENTS = ' + JSON.stringify(db.comments || {}, null, 2) + ';\n';
  fs.writeFileSync(DATA_JS_PATH, out, 'utf8');
  console.log('Saved public/js/data.js');

  // Push merged data to Supabase
  const patchRes = await fetch(SB_URL + '/rest/v1/users?username=eq.__site_content__', {
    method: 'PATCH',
    headers: {
      apikey: SB_KEY,
      Authorization: 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      watchlist: {
        series: db.series,
        anime: db.anime,
        episodes: db.episodes,
        threads: db.threads,
        summaries: db.summaries,
        backdrops: db.backdrops,
        schedule: db.schedule,
        comments: db.comments,
        updated_at: new Date().toISOString()
      }
    })
  });

  if (patchRes.ok) {
    console.log('✅ Supabase cloud updated successfully with merged data!');
  } else {
    console.error('Failed to update Supabase:', patchRes.status, await patchRes.text());
  }
}

main().catch(console.error);
