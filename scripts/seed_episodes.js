const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Sample sources
const defaultSources = [
  {
    name: 'VidMoly (Hızlı)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'video'
  },
  {
    name: 'Rapidrame',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    type: 'video'
  }
];

const episodesToAdd = [
  // Breaking Bad Season 1 remaining
  {
    id: 'ep_bb_4',
    seriesId: 's1',
    seriesSlug: 'breaking-bad',
    seasonNumber: 1,
    episodeNumber: 4,
    title: 'Cancer Man',
    overview: 'Walter kanser teşhisini ailesine açıklar. Jesse eski evine ve ailesine dönmeye çalışır.',
    airDate: '2008-02-17',
    duration: '48 dk',
    viewCount: 31200,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-02T10:00:00.000Z'
  },
  {
    id: 'ep_bb_5',
    seriesId: 's1',
    seriesSlug: 'breaking-bad',
    seasonNumber: 1,
    episodeNumber: 5,
    title: 'Gray Matter',
    overview: 'Walter ve Skyler eski dostları Gretchen ve Elliott\'ın doğum günü partisine katılır. Elliott, Walter\'a iş teklif eder.',
    airDate: '2008-02-24',
    duration: '48 dk',
    viewCount: 29500,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-03T10:00:00.000Z'
  },
  {
    id: 'ep_bb_6',
    seriesId: 's1',
    seriesSlug: 'breaking-bad',
    seasonNumber: 1,
    episodeNumber: 6,
    title: 'Crazy Handful of Nothin\'',
    overview: 'Walter kemoterapi tedavisine başlar ve saçlarını kazıtır. Heisenberg lakabını ilk kez Tuco ile yüzleşirken kullanır.',
    airDate: '2008-03-02',
    duration: '48 dk',
    viewCount: 38900,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-04T10:00:00.000Z'
  },
  {
    id: 'ep_bb_7',
    seriesId: 's1',
    seriesSlug: 'breaking-bad',
    seasonNumber: 1,
    episodeNumber: 7,
    title: 'A No-Rough-Stuff-Type Deal',
    overview: 'Walter ve Jesse, Tuco\'nun talep ettiği miktarda metamfetamin üretmek için metilamin deposunu soymayı planlar.',
    airDate: '2008-03-09',
    duration: '48 dk',
    viewCount: 36700,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-05T10:00:00.000Z'
  },

  // The Last of Us (s2)
  {
    id: 'ep_tlou_3',
    seriesId: 's2',
    seriesSlug: 'the-last-of-us',
    seasonNumber: 1,
    episodeNumber: 3,
    title: 'Long, Long Time',
    overview: 'Kıyamet sonrası hayatta kalan Bill\'in korunaklı kasabasına Frank adında bir yabancının gelmesiyle başlayan dokunaklı hikaye.',
    airDate: '2023-01-29',
    duration: '75 dk',
    viewCount: 45200,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-06T10:00:00.000Z'
  },
  {
    id: 'ep_tlou_4',
    seriesId: 's2',
    seriesSlug: 'the-last-of-us',
    seasonNumber: 1,
    episodeNumber: 4,
    title: 'Please Hold to My Hand',
    overview: 'Joel ve Ellie, Kansas City\'ye doğru yollarına devam ederken isyancıların pususuna düşer.',
    airDate: '2023-02-05',
    duration: '45 dk',
    viewCount: 39100,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-07T10:00:00.000Z'
  },

  // Stranger Things (s3)
  {
    id: 'ep_st_2',
    seriesId: 's3',
    seriesSlug: 'stranger-things',
    seasonNumber: 1,
    episodeNumber: 2,
    title: 'Chapter Two: The Weirdo on Maple Street',
    overview: 'Mike, Eleven\'ı evinde saklamaya çalışırken, Joyce kayıp oğlu Will\'den gelen gizemli telefon aramalarını araştırmaya başlar.',
    airDate: '2016-07-15',
    duration: '55 dk',
    viewCount: 34100,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-08T10:00:00.000Z'
  },
  {
    id: 'ep_st_3',
    seriesId: 's3',
    seriesSlug: 'stranger-things',
    seasonNumber: 1,
    episodeNumber: 3,
    title: 'Chapter Three: Holly, Jolly',
    overview: 'Nancy arkadaşı Barb için endişelenirken, Joyce Will\'in yılbaşı ışıklarıyla iletişim kurduğunu keşfeder.',
    airDate: '2016-07-15',
    duration: '51 dk',
    viewCount: 32800,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-09T10:00:00.000Z'
  },

  // House of the Dragon (s4) - add season 1
  {
    id: 'ep_hotd_1',
    seriesId: 's4',
    seriesSlug: 'house-of-the-dragon',
    seasonNumber: 1,
    episodeNumber: 1,
    title: 'The Heirs of the Dragon',
    overview: 'Kral Viserys, Demir Taht için veraset planlarını yaparken kraliçenin doğumunda trajik bir karar almak zorunda kalır.',
    airDate: '2022-08-21',
    duration: '66 dk',
    viewCount: 51200,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-10T10:00:00.000Z'
  },
  {
    id: 'ep_hotd_2',
    seriesId: 's4',
    seriesSlug: 'house-of-the-dragon',
    seasonNumber: 1,
    episodeNumber: 2,
    title: 'The Rogue Prince',
    overview: 'Rhaenyra küçük konseyde yer bulmaya çalışırken, Daemon Ejderha Kayası\'nı işgal ederek taht hak iddiasını sürdürür.',
    airDate: '2022-08-28',
    duration: '54 dk',
    viewCount: 46100,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-11T10:00:00.000Z'
  },

  // Severance (s5)
  {
    id: 'ep_sev_2',
    seriesId: 's5',
    seriesSlug: 'severance',
    seasonNumber: 1,
    episodeNumber: 2,
    title: 'Half Loop',
    overview: 'Helly yeni ofis ortamına uyum sağlamakta zorlanırken, Mark dışarıdaki hayatında gizemli bir yabancıyla buluşur.',
    airDate: '2022-02-18',
    duration: '53 dk',
    viewCount: 28900,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-12T10:00:00.000Z'
  },
  {
    id: 'ep_sev_3',
    seriesId: 's5',
    seriesSlug: 'severance',
    seasonNumber: 1,
    episodeNumber: 3,
    title: 'In Perpetuity',
    overview: 'Mark, Helly\'yi Lumon\'un ebediyet kanadına götürür. Petey\'nin bıraktığı ipuçları şirketin karanlık yüzünü açığa çıkarmaya başlar.',
    airDate: '2022-02-25',
    duration: '54 dk',
    viewCount: 27500,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-13T10:00:00.000Z'
  },

  // Dark (s6)
  {
    id: 'ep_dark_1',
    seriesId: 's6',
    seriesSlug: 'dark',
    seasonNumber: 1,
    episodeNumber: 1,
    title: 'Secrets',
    overview: 'Winden kasabasında küçük bir çocuğun kaybolması, dört ailenin iç içe geçmiş sırlarını ve gizemli bir mağarayı gün yüzüne çıkarır.',
    airDate: '2017-12-01',
    duration: '52 dk',
    viewCount: 39400,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-14T10:00:00.000Z'
  },
  {
    id: 'ep_dark_2',
    seriesId: 's6',
    seriesSlug: 'dark',
    seasonNumber: 1,
    episodeNumber: 2,
    title: 'Lies',
    overview: 'Ormanda 33 yıl öncesine ait kıyafetler giymiş tanınmayan bir ceset bulunur. Polis şefi Ulrich eski yaraları deşer.',
    airDate: '2017-12-01',
    duration: '45 dk',
    viewCount: 36800,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-15T10:00:00.000Z'
  },
  {
    id: 'ep_dark_3',
    seriesId: 's6',
    seriesSlug: 'dark',
    seasonNumber: 1,
    episodeNumber: 3,
    title: 'Past and Present',
    overview: 'Hikaye 1986 yılına geri döner; Winden nükleer santrali ve o dönemde kaybolan Mads Nielsen olayı incelenir.',
    airDate: '2017-12-01',
    duration: '46 dk',
    viewCount: 35100,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-16T10:00:00.000Z'
  },

  // The Boys (s7)
  {
    id: 'ep_boys_1',
    seriesId: 's7',
    seriesSlug: 'the-boys',
    seasonNumber: 1,
    episodeNumber: 1,
    title: 'The Name of the Game',
    overview: 'Hughie kız arkadaşının bir süper kahraman tarafından öldürülmesine tanık olur ve intikam peşindeki Billy Butcher ile tanışır.',
    airDate: '2019-07-26',
    duration: '60 dk',
    viewCount: 48900,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-17T10:00:00.000Z'
  },
  {
    id: 'ep_boys_2',
    seriesId: 's7',
    seriesSlug: 'the-boys',
    seasonNumber: 1,
    episodeNumber: 2,
    title: 'Cherry',
    overview: 'Butcher ve Hughie, The Seven üyesi Translucent\'ı esir alır ve Fransız lakaplı silah uzmanından yardım ister.',
    airDate: '2019-07-26',
    duration: '55 dk',
    viewCount: 44200,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-18T10:00:00.000Z'
  },
  {
    id: 'ep_boys_3',
    seriesId: 's7',
    seriesSlug: 'the-boys',
    seasonNumber: 1,
    episodeNumber: 3,
    title: 'Get Some',
    overview: 'The Boys ekibi, Vought\'un kahramanlara güç veren gizli ' + 'Bileşen V' + ' maddesini ortaya çıkarmak için yarış pistine sızar.',
    airDate: '2019-07-26',
    duration: '55 dk',
    viewCount: 41900,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-19T10:00:00.000Z'
  },

  // Wednesday (s8)
  {
    id: 'ep_wed_1',
    seriesId: 's8',
    seriesSlug: 'wednesday',
    seasonNumber: 1,
    episodeNumber: 1,
    title: 'Wednesday\'s Child is Full of Woe',
    overview: 'Wednesday Addams, ailesi tarafından Nevermore Akademisi\'ne gönderilir ve gizemli bir cinayete tanıklık eder.',
    airDate: '2022-11-23',
    duration: '59 dk',
    viewCount: 52400,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'ep_wed_2',
    seriesId: 's8',
    seriesSlug: 'wednesday',
    seasonNumber: 1,
    episodeNumber: 2,
    title: 'Woe is the Loneliest Number',
    overview: 'Wednesday gizemli canavar saldırısını araştırmaya devam ederken okulun Poe Kupası kano yarışına katılmak zorunda kalır.',
    airDate: '2022-11-23',
    duration: '48 dk',
    viewCount: 47800,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-21T10:00:00.000Z'
  },
  {
    id: 'ep_wed_3',
    seriesId: 's8',
    seriesSlug: 'wednesday',
    seasonNumber: 1,
    episodeNumber: 3,
    title: 'Friend or Woe',
    overview: 'Kasabanın Outreach Günü\'nde Wednesday, Nevermore ve kasabanın geçmişindeki gizemli tarikat bağlantısını keşfeder.',
    airDate: '2022-11-23',
    duration: '48 dk',
    viewCount: 46200,
    flags: { isDubbed: true, isSubtitled: true },
    sources: defaultSources,
    createdAt: '2026-09-22T10:00:00.000Z'
  }
];

// Add only if not already existing
episodesToAdd.forEach(newEp => {
  if (!db.episodes.some(e => e.id === newEp.id)) {
    db.episodes.push(newEp);
  }
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Successfully added episodes. Total episodes:', db.episodes.length);
