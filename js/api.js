/* ====================================================
   BölümDizi - Universal API & Static GitHub Pages Adapter
==================================================== */

(function() {
  const originalFetch = window.fetch;
  let cachedDB = null;

  async function getStaticDB() {
    if (cachedDB) return cachedDB;
    try {
      const res = await originalFetch('/data/db.json');
      cachedDB = await res.json();
      return cachedDB;
    } catch (e) {
      console.warn('Could not load /data/db.json:', e);
      return { series: [], episodes: [], comments: [], reports: [], settings: {} };
    }
  }

  // Intercept fetch calls starting with /api/
  window.fetch = async function(resource, init) {
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
      try {
        const response = await originalFetch(resource, init);
        if (response.ok) return response;
      } catch (err) {
        // Server unreachable, fallback to static GitHub Pages adapter
      }

      // Static fallback handler
      const url = new URL(resource, window.location.origin);
      const path = url.pathname;
      const db = await getStaticDB();

      // GET /api/settings
      if (path === '/api/settings') {
        return new Response(JSON.stringify(db.settings || {}), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // GET /api/series
      if (path === '/api/series') {
        let list = [...(db.series || [])];
        const search = url.searchParams.get('search');
        const genre = url.searchParams.get('genre');
        const year = url.searchParams.get('year');
        const status = url.searchParams.get('status');
        const sort = url.searchParams.get('sort');
        const featured = url.searchParams.get('featured');

        if (search) {
          const q = search.toLowerCase();
          list = list.filter(s => s.title.toLowerCase().includes(q) || (s.originalTitle && s.originalTitle.toLowerCase().includes(q)));
        }
        if (genre && genre !== 'all') list = list.filter(s => s.genres && s.genres.includes(genre));
        if (year && year !== 'all') list = list.filter(s => String(s.year) === String(year));
        if (status && status !== 'all') list = list.filter(s => s.status === status);
        if (featured === 'true') list = list.filter(s => s.featured);

        if (sort === 'imdb') list.sort((a,b) => (b.imdb||0) - (a.imdb||0));
        else if (sort === 'views') list.sort((a,b) => (b.viewCount||0) - (a.viewCount||0));
        else list.sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));

        return new Response(JSON.stringify(list), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // GET /api/series/:slug
      const seriesSlugMatch = path.match(/^\/api\/series\/([^\/]+)$/);
      if (seriesSlugMatch) {
        const slug = seriesSlugMatch[1];
        const series = (db.series || []).find(s => s.slug === slug || s.id === slug);
        if (!series) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

        const episodes = (db.episodes || []).filter(ep => ep.seriesId === series.id || ep.seriesSlug === series.slug);
        const seasons = {};
        episodes.forEach(ep => {
          if (!seasons[ep.seasonNumber]) seasons[ep.seasonNumber] = [];
          seasons[ep.seasonNumber].push(ep);
        });

        return new Response(JSON.stringify({ ...series, seasons, episodesCount: episodes.length, totalSeasons: Object.keys(seasons).length }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      }

      // GET /api/episodes/latest (Son Eklenen Bölümler - 25 Bölüm, Final yapmış diziler hariç)
      if (path === '/api/episodes/latest') {
        const limit = parseInt(url.searchParams.get('limit')) || 25;
        let episodes = [...(db.episodes || [])];

        // Final yapmış / Tamamlanmış dizilerin bölümlerini son eklenenlere koyma
        episodes = episodes.filter(ep => {
          const s = (db.series || []).find(x => x.id === ep.seriesId || x.slug === ep.seriesSlug);
          if (!s) return true;
          const status = (s.status || '').toLowerCase();
          if (status.includes('tamamlan') || status.includes('final') || status.includes('bitti')) {
            return false;
          }
          return true;
        });

        const filter = url.searchParams.get('filter');
        if (filter === 'dubbed') episodes = episodes.filter(e => e.flags && e.flags.isDubbed);
        if (filter === 'subtitled') episodes = episodes.filter(e => e.flags && e.flags.isSubtitled);
        episodes.sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
        episodes = episodes.slice(0, limit);

        const results = episodes.map(ep => {
          const s = (db.series || []).find(x => x.id === ep.seriesId || x.slug === ep.seriesSlug) || {};
          return {
            ...ep,
            seriesTitle: s.title || '',
            seriesSlug: s.slug || '',
            seriesPoster: s.poster || ep.stillPath || '',
            seriesImdb: s.imdb || 0,
            seriesYear: s.year || 2024
          };
        });

        return new Response(JSON.stringify(results), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // GET /api/calendar
      if (path === '/api/calendar') {
        const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        const cal = {};
        days.forEach(d => cal[d] = []);
        (db.series || []).forEach(s => {
          if (s.airDay && cal[s.airDay]) {
            const eps = (db.episodes || []).filter(ep => ep.seriesId === s.id || ep.seriesSlug === s.slug);
            const latest = eps[0] || null;
            cal[s.airDay].push({
              id: s.id,
              title: s.title,
              slug: s.slug,
              poster: s.poster,
              imdb: s.imdb,
              status: s.status,
              latestSeason: latest ? latest.seasonNumber : 1,
              latestEpisode: latest ? latest.episodeNumber : 1
            });
          }
        });
        return new Response(JSON.stringify(cal), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // GET /api/watch/:slug/:season/:episode
      const watchMatch = path.match(/^\/api\/watch\/([^\/]+)\/(\d+)\/(\d+)$/);
      if (watchMatch) {
        const slug = watchMatch[1];
        const season = parseInt(watchMatch[2]);
        const episode = parseInt(watchMatch[3]);
        const series = (db.series || []).find(s => s.slug === slug || s.id === slug);
        if (!series) return new Response(JSON.stringify({ error: 'Series not found' }), { status: 404 });

        const allEps = (db.episodes || []).filter(e => e.seriesId === series.id || e.seriesSlug === series.slug);
        const idx = allEps.findIndex(e => e.seasonNumber === season && e.episodeNumber === episode);
        const currentEp = allEps[idx] || allEps[0];

        return new Response(JSON.stringify({
          series,
          episode: currentEp,
          prevEpisode: idx > 0 ? allEps[idx - 1] : null,
          nextEpisode: idx < allEps.length - 1 ? allEps[idx + 1] : null,
          allEpisodes: allEps
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // Comments API fallback (read from db + localStorage)
      if (path === '/api/comments') {
        const localComments = JSON.parse(localStorage.getItem('bolum_dizi_comments') || '[]');
        const allComments = [...localComments, ...(db.comments || [])];
        if (init && init.method === 'POST') {
          const body = JSON.parse(init.body || '{}');
          const newC = {
            id: 'c_' + Date.now(),
            ...body,
            createdAt: new Date().toISOString(),
            likes: 0
          };
          localComments.unshift(newC);
          localStorage.setItem('bolum_dizi_comments', JSON.stringify(localComments));
          return new Response(JSON.stringify(newC), { status: 201 });
        }
        return new Response(JSON.stringify(allComments), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // Reports API fallback
      if (path === '/api/reports' && init && init.method === 'POST') {
        const localReports = JSON.parse(localStorage.getItem('bolum_dizi_reports') || '[]');
        const body = JSON.parse(init.body || '{}');
        localReports.unshift({ id: 'r_' + Date.now(), ...body, status: 'Bekliyor', createdAt: new Date().toISOString() });
        localStorage.setItem('bolum_dizi_reports', JSON.stringify(localReports));
        return new Response(JSON.stringify({ success: true }), { status: 201 });
      }

      // User Auth Register Fallback
      if (path === '/api/auth/register' && init && init.method === 'POST') {
        const body = JSON.parse(init.body || '{}');
        const cleanUser = (body.username || '').trim().toLowerCase();
        const cleanEmail = (body.email || '').trim().toLowerCase();
        const users = JSON.parse(localStorage.getItem('bolum_dizi_users') || '[]');

        if (users.some(u => u.username === cleanUser)) {
          return new Response(JSON.stringify({ error: 'Bu kullanıcı adı zaten alınmış!' }), { status: 400 });
        }
        if (users.some(u => u.email === cleanEmail)) {
          return new Response(JSON.stringify({ error: 'Bu e-posta adresi ile zaten kayıt olunmuş!' }), { status: 400 });
        }

        const newUser = {
          id: 'u_' + Date.now(),
          username: cleanUser,
          displayName: body.username.trim(),
          email: cleanEmail,
          password: body.password,
          watchlist: []
        };
        users.push(newUser);
        localStorage.setItem('bolum_dizi_users', JSON.stringify(users));

        const safeUser = { id: newUser.id, username: newUser.username, displayName: newUser.displayName, email: newUser.email, watchlist: [] };
        return new Response(JSON.stringify({ success: true, user: safeUser, token: 'usr_' + newUser.id }), { status: 201 });
      }

      // User Auth Login Fallback
      if (path === '/api/auth/login' && init && init.method === 'POST') {
        const body = JSON.parse(init.body || '{}');
        const cleanInput = (body.username || '').trim().toLowerCase();
        const users = JSON.parse(localStorage.getItem('bolum_dizi_users') || '[]');
        
        // Include default demo user if empty
        if (!users.length) {
          users.push({ id: 'u1', username: 'dizisever', displayName: 'Dizi Sever', email: 'dizisever@bolumdizi.com', password: '123', watchlist: ['breaking-bad'] });
          localStorage.setItem('bolum_dizi_users', JSON.stringify(users));
        }

        const user = users.find(u => (u.username === cleanInput || u.email === cleanInput) && u.password === body.password);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Kullanıcı adı veya şifre hatalı!' }), { status: 401 });
        }
        const safeUser = { id: user.id, username: user.username, displayName: user.displayName || user.username, email: user.email, watchlist: user.watchlist || [] };
        return new Response(JSON.stringify({ success: true, user: safeUser, token: 'usr_' + user.id }), { status: 200 });
      }

      // User Auth Me Fallback
      if (path === '/api/auth/me') {
        const userId = url.searchParams.get('userId') || (init && init.headers && init.headers['x-user-id']);
        const users = JSON.parse(localStorage.getItem('bolum_dizi_users') || '[]');
        const user = users.find(u => u.id === userId);
        if (!user) return new Response(JSON.stringify({ error: 'Kullanıcı bulunamadı' }), { status: 404 });
        return new Response(JSON.stringify({ id: user.id, username: user.username, displayName: user.displayName, email: user.email, watchlist: user.watchlist || [] }), { status: 200 });
      }

      // Watchlist Toggle Fallback
      if (path === '/api/auth/watchlist/toggle' && init && init.method === 'POST') {
        const body = JSON.parse(init.body || '{}');
        const users = JSON.parse(localStorage.getItem('bolum_dizi_users') || '[]');
        const user = users.find(u => u.id === body.userId);
        if (!user) return new Response(JSON.stringify({ error: 'Kullanıcı bulunamadı' }), { status: 404 });

        user.watchlist = user.watchlist || [];
        const idx = user.watchlist.indexOf(body.seriesSlug);
        let inWatchlist = false;
        if (idx > -1) {
          user.watchlist.splice(idx, 1);
        } else {
          user.watchlist.push(body.seriesSlug);
          inWatchlist = true;
        }
        localStorage.setItem('bolum_dizi_users', JSON.stringify(users));
        return new Response(JSON.stringify({ success: true, inWatchlist, watchlist: user.watchlist }), { status: 200 });
      }

      // Watchlist Get Fallback
      if (path === '/api/auth/watchlist') {
        const userId = url.searchParams.get('userId') || (init && init.headers && init.headers['x-user-id']);
        const users = JSON.parse(localStorage.getItem('bolum_dizi_users') || '[]');
        const user = users.find(u => u.id === userId);
        if (!user) return new Response(JSON.stringify({ error: 'Kullanıcı bulunamadı' }), { status: 404 });
        const seriesSlugs = user.watchlist || [];
        const watchlistSeries = (db.series || []).filter(s => seriesSlugs.includes(s.slug));
        return new Response(JSON.stringify({ success: true, watchlist: watchlistSeries }), { status: 200 });
      }

      // Watched Episode Toggle Fallback
      if (path === '/api/auth/watched/toggle' && init && init.method === 'POST') {
        const body = JSON.parse(init.body || '{}');
        const watched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');
        const epId = body.episodeId;
        const currentlyWatched = Boolean(watched[epId]);
        const targetWatched = (typeof body.isWatched === 'boolean') ? body.isWatched : !currentlyWatched;

        if (targetWatched) {
          watched[epId] = {
            watchedAt: new Date().toISOString(),
            seriesSlug: body.seriesSlug,
            seasonNumber: body.seasonNumber,
            episodeNumber: body.episodeNumber
          };
        } else {
          delete watched[epId];
        }
        localStorage.setItem('bolum_dizi_watched_eps', JSON.stringify(watched));
        return new Response(JSON.stringify({ success: true, isWatched: targetWatched, watchedEpisodes: watched }), { status: 200 });
      }

      // Watched Episodes Sync Fallback
      if (path === '/api/auth/watched/sync' && init && init.method === 'POST') {
        const body = JSON.parse(init.body || '{}');
        const watched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');
        let finalWatched = {};
        if (body.overwrite) {
          finalWatched = body.watchedEpisodes || {};
        } else {
          finalWatched = { ...watched, ...(body.watchedEpisodes || {}) };
        }
        localStorage.setItem('bolum_dizi_watched_eps', JSON.stringify(finalWatched));
        return new Response(JSON.stringify({ success: true, watchedEpisodes: finalWatched }), { status: 200 });
      }

      // Progress Fallback
      if (path === '/api/auth/progress') {
        const watched = JSON.parse(localStorage.getItem('bolum_dizi_watched_eps') || '{}');
        const allSeries = db.series || [];
        const allEpisodes = db.episodes || [];

        const seriesEpisodesMap = {};
        allEpisodes.forEach(ep => {
          if (ep.seriesSlug) {
            if (!seriesEpisodesMap[ep.seriesSlug]) seriesEpisodesMap[ep.seriesSlug] = [];
            seriesEpisodesMap[ep.seriesSlug].push(ep);
          }
          if (ep.seriesId && ep.seriesId !== ep.seriesSlug) {
            if (!seriesEpisodesMap[ep.seriesId]) seriesEpisodesMap[ep.seriesId] = [];
            seriesEpisodesMap[ep.seriesId].push(ep);
          }
        });

        const progressList = allSeries.map(s => {
          const eps = seriesEpisodesMap[s.slug] || seriesEpisodesMap[s.id] || [];
          const totalCount = eps.length;
          const seasonsMap = {};
          let watchedCount = 0;

          eps.forEach(ep => {
            const sNum = ep.seasonNumber || 1;
            if (!seasonsMap[sNum]) {
              seasonsMap[sNum] = { seasonNumber: sNum, totalEpisodes: 0, watchedEpisodes: 0, episodes: [] };
            }
            const isEpWatched = Boolean(watched[ep.id]);
            if (isEpWatched) watchedCount++;
            seasonsMap[sNum].totalEpisodes++;
            if (isEpWatched) seasonsMap[sNum].watchedEpisodes++;
            seasonsMap[sNum].episodes.push({
              id: ep.id,
              episodeNumber: ep.episodeNumber,
              title: ep.title,
              duration: ep.duration,
              stillPath: ep.stillPath || s.poster,
              isWatched: isEpWatched
            });
          });

          const seasons = Object.values(seasonsMap).sort((a, b) => a.seasonNumber - b.seasonNumber);
          seasons.forEach(season => {
            season.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
            season.percent = season.totalEpisodes > 0 ? Math.round((season.watchedEpisodes / season.totalEpisodes) * 100) : 0;
          });

          const percent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;
          return {
            seriesId: s.id,
            title: s.title,
            slug: s.slug,
            poster: s.poster,
            imdb: s.imdb,
            year: s.year,
            status: s.status,
            genres: s.genres,
            totalEpisodes: totalCount,
            watchedEpisodes: watchedCount,
            percent,
            seasons
          };
        });

        const activeSeries = progressList.filter(p => p.watchedEpisodes > 0);
        return new Response(JSON.stringify({
          success: true,
          totalWatchedEpisodes: Object.keys(watched).length,
          completedSeriesCount: activeSeries.filter(p => p.totalEpisodes > 0 && p.watchedEpisodes >= p.totalEpisodes).length,
          series: activeSeries,
          allSeriesProgress: progressList
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // Admin Login
      if (path === '/api/admin/login' && init && init.method === 'POST') {
        const body = JSON.parse(init.body || '{}');
        if (body.username === 'admin' && body.password === 'admin123') {
          return new Response(JSON.stringify({ success: true, token: 'token_bolumdizi_admin_secret_2026', user: 'admin' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
          return new Response(JSON.stringify({ error: 'Hatalı kullanıcı adı veya şifre!' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
      }

      // Admin Stats fallback
      if (path === '/api/admin/stats') {
        return new Response(JSON.stringify({
          totalSeries: (db.series || []).length,
          totalEpisodes: (db.episodes || []).length,
          totalViews: 450000,
          pendingReports: 1
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    return originalFetch(resource, init);
  };
})();
