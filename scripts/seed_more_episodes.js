const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Existing ongoing series
const ongoingSeries = [
  {
    id: 's2',
    slug: 'the-last-of-us',
    title: 'The Last of Us',
    backdrop: 'https://image.tmdb.org/t/p/original/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg',
    epCount: 9,
    titles: [
      'Karanlıkta Kaybolduğunda', 'Bulaşmış', 'Uzun Uzun Yıllar', 'Lütfen Elimi Tut',
      'Katlan ve Hayatta Kal', 'Akraba', 'Geride Kalan', 'İhtiyaç Anında', 'Işığı Ara'
    ]
  },
  {
    id: 's3',
    slug: 'stranger-things',
    title: 'Stranger Things',
    backdrop: 'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    epCount: 8,
    titles: [
      'Will Byers’ın Kayboluşu', 'Maple Sokağı’ndaki Ucube', 'Neşeli Noel', 'Ceset',
      'Pire ve Akrobat', 'Canavar', 'Küvet', 'Baş Aşağı Dünya'
    ]
  },
  {
    id: 's4',
    slug: 'house-of-the-dragon',
    title: 'House of the Dragon',
    backdrop: 'https://image.tmdb.org/t/p/original/etjA2mXO0XYkbRRmeII30Tw8Z3L.jpg',
    epCount: 8,
    titles: [
      'Ejderhanın Varisleri', 'Asi Prens', 'Adının İkincisi', 'Dar Deniz Kralı',
      'Yolumuzu Aydınlatıyoruz', 'Prenses ve Kraliçe', 'Sürüklenen İşaret', 'Gelgitlerin Efendisi'
    ]
  },
  {
    id: 's5',
    slug: 'severance',
    title: 'Severance',
    backdrop: 'https://image.tmdb.org/t/p/original/9iiyG8TgmPCH6n52s8sK8R7mY6x.jpg',
    epCount: 9,
    titles: [
      'Cehennem Hakkında İyi Haberler', 'Yarım Döngü', 'Sonsuza Dek', 'Kibar İntikam',
      'Optik ve Tasarımın Kasvetli Barbarlığı', 'Kötü Saklanma', 'Meydan Okuyan Caz',
      'Ne İçin Akşam Yemeği?', 'Olduğumuz Biz'
    ]
  },
  {
    id: 's7',
    slug: 'the-boys',
    title: 'The Boys',
    backdrop: 'https://image.tmdb.org/t/p/original/mGVrXeIehcvjBpmuPkrlqqBAX79.jpg',
    epCount: 8,
    titles: [
      'Oyunun Adı', 'Kiraz', 'Birazını Al', 'Türün Dişisi',
      'Ruh İçin İyi', 'Masumlar', 'Özsavunma', 'Beni Buldun'
    ]
  },
  {
    id: 's8',
    slug: 'wednesday',
    title: 'Wednesday',
    backdrop: 'https://image.tmdb.org/t/p/original/iHSwvRVsRyxpX7FE7GbviaDvgGZ.jpg',
    epCount: 8,
    titles: [
      'Çarşamba Çocuğu Kederle Doludur', 'Keder En Yalnız Numaradır', 'Keder Dost mu Düşman mı',
      'Ne Harika Bir Gece', 'Ektiğin Kederi Biçersin', 'Kederli İyilikler', 'Beni Tanımıyorsun',
      'Bir Keder Kuşatması'
    ]
  }
];

// Keep completed series episodes (Breaking Bad, Dark)
const completedSeriesIds = db.series.filter(s => {
  const status = (s.status || '').toLowerCase();
  return status.includes('tamamlan') || status.includes('final') || status.includes('bitti');
}).map(s => s.id);

let existingCompletedEpisodes = (db.episodes || []).filter(e => completedSeriesIds.includes(e.seriesId));

// Generate fresh rich episodes for ongoing series
const newOngoingEpisodes = [];
let baseTime = Date.now() - (60 * 1000); // 1 minute ago

ongoingSeries.forEach(series => {
  for (let i = 1; i <= series.epCount; i++) {
    const epTime = new Date(baseTime - (newOngoingEpisodes.length * 3600 * 1000 * 4)).toISOString();
    newOngoingEpisodes.push({
      id: `${series.id}_ep_${i}`,
      seriesId: series.id,
      seriesSlug: series.slug,
      seasonNumber: 1,
      episodeNumber: i,
      title: series.titles[i - 1] || `${i}. Bölüm`,
      overview: `${series.title} dizisinin 1. sezon ${i}. bölümü.`,
      stillPath: series.backdrop,
      airDate: '2026-05-10',
      duration: '52 dk',
      viewCount: Math.floor(Math.random() * 8000) + 1200,
      flags: {
        isDubbed: i % 2 === 0 || i % 3 === 0,
        isSubtitled: true
      },
      sources: [
        { name: 'VidMoly', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', type: 'video' },
        { name: 'UpToStream', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', type: 'video' }
      ],
      createdAt: epTime
    });
  }
});

// Combine completed episodes + ongoing episodes
db.episodes = [...newOngoingEpisodes, ...existingCompletedEpisodes];

// Sort all episodes newest first
db.episodes.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Successfully generated ${newOngoingEpisodes.length} ongoing episodes and preserved ${existingCompletedEpisodes.length} completed episodes.`);
console.log(`Total episodes in database: ${db.episodes.length}`);
