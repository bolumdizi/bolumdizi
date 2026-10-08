const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');
const DATA_JS_PATH = path.join(__dirname, '..', 'public', 'js', 'data.js');
const SB_URL = 'https://ospayntenysjfysczduu.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcGF5bnRlbnlzamZ5c2N6ZHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTE4NzQsImV4cCI6MjEwNjg4Nzg3NH0.fBqBp_mgHitbIsNWkI97hQ0Wgv5CAzsyRGUiqjcZty8';

// Top 100 TV Shows on IMDb
const TOP_100_IMDB = [
  { id: 'tt0903747', title: 'Breaking Bad', rating: 9.5, year: 2008, isAnime: false },
  { id: 'tt5491994', title: 'Planet Earth II', rating: 9.5, year: 2016, isAnime: false },
  { id: 'tt0795176', title: 'Planet Earth', rating: 9.4, year: 2006, isAnime: false },
  { id: 'tt0185906', title: 'Band of Brothers', rating: 9.4, year: 2001, isAnime: false },
  { id: 'tt7366338', title: 'Chernobyl', rating: 9.3, year: 2019, isAnime: false },
  { id: 'tt0306414', title: 'The Wire', rating: 9.3, year: 2002, isAnime: false },
  { id: 'tt6769208', title: 'Blue Planet II', rating: 9.3, year: 2017, isAnime: false },
  { id: 'tt9253866', title: 'Our Planet', rating: 9.2, year: 2019, isAnime: false },
  { id: 'tt0944947', title: 'Game of Thrones', rating: 9.2, year: 2011, isAnime: false },
  { id: 'tt0141842', title: 'The Sopranos', rating: 9.2, year: 1999, isAnime: false },
  { id: 'tt0417299', title: 'Avatar: The Last Airbender', rating: 9.3, year: 2005, isAnime: false },
  { id: 'tt2395695', title: 'Cosmos: A Spacetime Odyssey', rating: 9.2, year: 2014, isAnime: false },
  { id: 'tt0081846', title: 'Cosmos', rating: 9.3, year: 1980, isAnime: false },
  { id: 'tt2861424', title: 'Rick and Morty', rating: 9.1, year: 2013, isAnime: false },
  { id: 'tt1475582', title: 'Sherlock', rating: 9.1, year: 2010, isAnime: false },
  { id: 'tt1355642', title: 'Fullmetal Alchemist: Brotherhood', rating: 9.1, year: 2009, isAnime: true },
  { id: 'tt2560140', title: 'Attack on Titan', rating: 9.1, year: 2013, isAnime: true },
  { id: 'tt0071075', title: 'The World at War', rating: 9.2, year: 1973, isAnime: false },
  { id: 'tt1533395', title: 'Life', rating: 9.1, year: 2009, isAnime: false },
  { id: 'tt1877514', title: 'The Vietnam War', rating: 9.1, year: 2017, isAnime: false },
  { id: 'tt0052520', title: 'The Twilight Zone', rating: 9.1, year: 1959, isAnime: false },
  { id: 'tt0111893', title: 'The Beatles: Anthology', rating: 9.1, year: 1995, isAnime: false },
  { id: 'tt1806234', title: 'Human Planet', rating: 9.0, year: 2011, isAnime: false },
  { id: 'tt7920978', title: 'Şahsiyet', rating: 9.0, year: 2018, isAnime: false },
  { id: 'tt0296310', title: 'The Blue Planet', rating: 9.0, year: 2001, isAnime: false },
  { id: 'tt0103359', title: 'Batman: The Animated Series', rating: 9.0, year: 1992, isAnime: false },
  { id: 'tt0303461', title: 'Firefly', rating: 9.0, year: 2002, isAnime: false },
  { id: 'tt2092588', title: 'Frozen Planet', rating: 9.0, year: 2011, isAnime: false },
  { id: 'tt0092337', title: 'Dekalog', rating: 9.0, year: 1989, isAnime: false },
  { id: 'tt2356777', title: 'True Detective', rating: 8.9, year: 2014, isAnime: false },
  { id: 'tt0098769', title: 'The Civil War', rating: 9.0, year: 1990, isAnime: false },
  { id: 'tt0877057', title: 'Death Note', rating: 9.0, year: 2006, isAnime: true },
  { id: 'tt1508238', title: 'Apocalypse: The Second World War', rating: 9.0, year: 2009, isAnime: false },
  { id: 'tt2802850', title: 'Fargo', rating: 8.9, year: 2014, isAnime: false },
  { id: 'tt0213338', title: 'Cowboy Bebop', rating: 8.9, year: 1998, isAnime: true },
  { id: 'tt3032476', title: 'Better Call Saul', rating: 9.0, year: 2015, isAnime: false },
  { id: 'tt7660850', title: 'Succession', rating: 8.9, year: 2018, isAnime: false },
  { id: 'tt7137906', title: 'When They See Us', rating: 8.9, year: 2019, isAnime: false },
  { id: 'tt2098220', title: 'Hunter x Hunter', rating: 9.0, year: 2011, isAnime: true },
  { id: 'tt0108778', title: 'Friends', rating: 8.9, year: 1994, isAnime: false },
  { id: 'tt0386676', title: 'The Office', rating: 9.0, year: 2005, isAnime: false },
  { id: 'tt0063929', title: "Monty Python's Flying Circus", rating: 8.8, year: 1969, isAnime: false },
  { id: 'tt0081834', title: 'Das Boot', rating: 8.8, year: 1985, isAnime: false },
  { id: 'tt0098904', title: 'Seinfeld', rating: 8.9, year: 1989, isAnime: false },
  { id: 'tt1865718', title: 'Gravity Falls', rating: 8.9, year: 2012, isAnime: false },
  { id: 'tt0112130', title: 'Pride and Prejudice', rating: 8.8, year: 1995, isAnime: false },
  { id: 'tt2085059', title: 'Black Mirror', rating: 8.7, year: 2011, isAnime: false },
  { id: 'tt0098936', title: 'Twin Peaks', rating: 8.8, year: 1990, isAnime: false },
  { id: 'tt3718778', title: 'Over the Garden Wall', rating: 8.8, year: 2014, isAnime: false },
  { id: 'tt4508902', title: 'One Punch Man', rating: 8.7, year: 2015, isAnime: true },
  { id: 'tt2297757', title: 'Nathan for You', rating: 8.8, year: 2013, isAnime: false },
  { id: 'tt2707408', title: 'Narcos', rating: 8.8, year: 2015, isAnime: false },
  { id: 'tt2442560', title: 'Peaky Blinders', rating: 8.8, year: 2013, isAnime: false },
  { id: 'tt0096548', title: 'Blackadder Goes Forth', rating: 8.8, year: 1989, isAnime: false },
  { id: 'tt0193676', title: 'Freaks and Geeks', rating: 8.8, year: 1999, isAnime: false },
  { id: 'tt4574334', title: 'Stranger Things', rating: 8.7, year: 2016, isAnime: false },
  { id: 'tt0072500', title: 'Fawlty Towers', rating: 8.8, year: 1975, isAnime: false },
  { id: 'tt0367279', title: 'Arrested Development', rating: 8.7, year: 2003, isAnime: false },
  { id: 'tt0353049', title: "Chappelle's Show", rating: 8.8, year: 2003, isAnime: false },
  { id: 'tt0472954', title: "It's Always Sunny in Philadelphia", rating: 8.8, year: 2005, isAnime: false },
  { id: 'tt0384766', title: 'Rome', rating: 8.7, year: 2005, isAnime: false },
  { id: 'tt0121220', title: 'Dragon Ball Z', rating: 8.8, year: 1989, isAnime: true },
  { id: 'tt1856010', title: 'House of Cards', rating: 8.6, year: 2013, isAnime: false },
  { id: 'tt0118421', title: 'Oz', rating: 8.7, year: 1997, isAnime: false },
  { id: 'tt0200276', title: 'The West Wing', rating: 8.9, year: 1999, isAnime: false },
  { id: 'tt1910272', title: 'Steins;Gate', rating: 8.8, year: 2011, isAnime: true },
  { id: 'tt1831164', title: 'Leyla ile Mecnun', rating: 9.1, year: 2011, isAnime: false },
  { id: 'tt10233448', title: 'Vinland Saga', rating: 8.8, year: 2019, isAnime: true },
  { id: 'tt7221388', title: 'Cobra Kai', rating: 8.4, year: 2018, isAnime: false },
  { id: 'tt0475784', title: 'Westworld', rating: 8.5, year: 2016, isAnime: false },
  { id: 'tt0074006', title: 'I, Claudius', rating: 8.7, year: 1976, isAnime: false },
  { id: 'tt5788792', title: 'The Marvelous Mrs. Maisel', rating: 8.7, year: 2017, isAnime: false },
  { id: 'tt1190634', title: 'The Boys', rating: 8.7, year: 2019, isAnime: false },
  { id: 'tt5753856', title: 'Dark', rating: 8.7, year: 2017, isAnime: false },
  { id: 'tt0264235', title: 'Curb Your Enthusiasm', rating: 8.8, year: 2000, isAnime: false },
  { id: 'tt5687612', title: 'Fleabag', rating: 8.7, year: 2016, isAnime: false },
  { id: 'tt8111088', title: 'The Mandalorian', rating: 8.6, year: 2019, isAnime: false },
  { id: 'tt0248654', title: 'Six Feet Under', rating: 8.7, year: 2001, isAnime: false },
  { id: 'tt0121955', title: 'South Park', rating: 8.7, year: 1997, isAnime: false },
  { id: 'tt3398228', title: 'BoJack Horseman', rating: 8.8, year: 2014, isAnime: false },
  { id: 'tt9335498', title: 'Demon Slayer', rating: 8.6, year: 2019, isAnime: true },
  { id: 'tt0096697', title: 'The Simpsons', rating: 8.7, year: 1989, isAnime: false },
  { id: 'tt0412142', title: 'House M.D.', rating: 8.7, year: 2004, isAnime: false },
  { id: 'tt6763664', title: 'The Haunting of Hill House', rating: 8.6, year: 2018, isAnime: false },
  { id: 'tt0348914', title: 'Deadwood', rating: 8.7, year: 2004, isAnime: false },
  { id: 'tt0407362', title: 'Battlestar Galactica', rating: 8.7, year: 2004, isAnime: false },
  { id: 'tt4786824', title: 'The Crown', rating: 8.6, year: 2016, isAnime: false },
  { id: 'tt0286486', title: 'The Shield', rating: 8.7, year: 2002, isAnime: false },
  { id: 'tt0106179', title: 'The X-Files', rating: 8.6, year: 1993, isAnime: false },
  { id: 'tt1606375', title: 'Downton Abbey', rating: 8.7, year: 2010, isAnime: false },
  { id: 'tt0773262', title: 'Dexter', rating: 8.7, year: 2006, isAnime: false },
  { id: 'tt3322312', title: 'Daredevil', rating: 8.6, year: 2015, isAnime: false },
  { id: 'tt0804503', title: 'Mad Men', rating: 8.7, year: 2007, isAnime: false },
  { id: 'tt11126994', title: 'Arcane', rating: 9.0, year: 2021, isAnime: false },
  { id: 'tt3581920', title: 'The Last of Us', rating: 8.7, year: 2023, isAnime: false },
  { id: 'tt11280740', title: 'Severance', rating: 8.7, year: 2022, isAnime: false },
  { id: 'tt14452776', title: 'The Bear', rating: 8.6, year: 2022, isAnime: false },
  { id: 'tt5290382', title: 'Mindhunter', rating: 8.6, year: 2017, isAnime: false },
  { id: 'tt10986410', title: 'Ted Lasso', rating: 8.8, year: 2020, isAnime: false },
  { id: 'tt1534360', title: 'Ezel', rating: 8.6, year: 2009, isAnime: false }
];

const TR_GENRES_DICT = {
  action: "Aksiyon",
  adventure: "Macera",
  animation: "Animasyon",
  anime: "Anime",
  comedy: "Komedi",
  crime: "Suç",
  documentary: "Belgesel",
  drama: "Dram",
  family: "Aile",
  fantasy: "Fantastik",
  history: "Tarih",
  horror: "Korku",
  music: "Müzik",
  mystery: "Gizem",
  romance: "Romantik",
  "sci-fi": "Bilim Kurgu",
  "science fiction": "Bilim Kurgu",
  thriller: "Gerilim",
  war: "Savaş",
  western: "Vahşi Batı",
  biography: "Biyografi"
};

function formatGenres(genresList) {
  if (!genresList || !genresList.length) return "Dram";
  const mapped = genresList
    .map(g => TR_GENRES_DICT[String(g).toLowerCase().trim()] || g)
    .filter(Boolean);
  return [...new Set(mapped)].slice(0, 3).join(", ") || "Dram";
}

// Curated Turkish descriptions for key iconic top shows
const TR_SUMMARIES = {
  'Breaking Bad': "Kanser teşhisi konan lise kimya öğretmeni Walter White, ailesinin geleceğini güvence altına almak için eski öğrencisi Jesse Pinkman ile metamfetamin üretip satmaya başlar; adım adım acımasız bir suç baronuna dönüşür.",
  'Planet Earth II': "David Attenborough'nun seslendirmesiyle gezegenimizin en vahşi, el değmemiş adalarından dev dağlarına, vahşi ormanlarından çöllerine kadar hayatın muazzam döngüsünü 4K teknolojisiyle gözler önüne seren eşsiz belgesel şaheseri.",
  'Planet Earth': "Dünyanın en zorlu ekosistemlerinde hayatta kalma mücadelesi veren canlıların büyüleyici hikayelerini ve yeryüzünün nefes kesen doğal manzaralarını aktaran çığır açıcı doğa belgeseli.",
  'Band of Brothers': "II. Dünya Savaşı'nda Amerikan 101. Hava İndirme Tümeni'ne bağlı 'Easy' Bölüğü askerlerinin Normandiya Çıkarması'ndan Hitler'in Kartal Yuvası'na uzanan epik, gerçek ve sarsıcı kardeşlik destanı.",
  'Chernobyl': "1986'da Sovyetler Birliği'nde meydana gelen tarihin en büyük nükleer felaketini, patlamanın ardından canlarını feda eden kahramanları ve gerçeği ortaya çıkarmaya çalışan bilim insanlarının mücadelesini anlatan sarsıcı mini dizi.",
  'The Wire': "Baltimore şehrinde uyuşturucu ticareti, polis teşkilatı, liman işçileri, bürokrasi, eğitim sistemi ve medya arasındaki karmaşık ilişkiler üzerinden modern kentin ve sistemin yozlaşmasını anlatan gerçekçi başyapıt.",
  'Blue Planet II': "Dünyanın gizemli okyanuslarının derinliklerine inerek daha önce hiç görülmemiş deniz canlılarını, mercan resiflerini ve derin suların büyüleyici yaşamını gözler önüne seren ödüllü belgesel.",
  'Our Planet': "Gezegenimizin benzersiz doğal güzelliklerini ve küresel iklim krizinin vahşi yaşam üzerindeki etkilerini göz alıcı çekimlerle belgeleyen ilham verici yapım.",
  'Game of Thrones': "Westeros kıtasının Demir Tahtı'nı ele geçirmek isteyen soylu hanedanların kanlı taht kavgaları, entrikaları ve kuzeyden gelen kadim ölüm tehdidine karşı verilen epik mücadele.",
  'The Sopranos': "New Jersey mafya lideri Tony Soprano'nun hem suç ailesini hem de kendi ailesini ayakta tutmaya çalışırken yaşadığı panik ataklar sebebiyle bir psikiyatriste gitmesiyle başlayan televizyon tarihini değiştiren suç draması.",
  'Avatar: The Last Airbender': "Ateş Ulusu'nun dünyayı işgaline karşı dört elementi bükebilen tek kişi olan son Hava Bükücü Aang ve arkadaşlarının dünyayı kurtarmak için çıktığı unutulmaz macera.",
  'Cosmos: A Spacetime Odyssey': "Astrofizikçi Neil deGrasse Tyson'ın rehberliğinde evrenin kökenini, zamanın başlangıcını ve bilimin insanlık tarihindeki büyüleyici yolculuğunu keşfe çıkan görkemli yapım.",
  'Cosmos': "Efsanevi gökbilimci Carl Sagan'ın rehberliğinde insanlığın evrendeki yerini, bilimi ve evrenin sonsuz gizemlerini anlatan kült bilim şaheseri.",
  'Rick and Morty': "Dahi ama alkolik ve dengesiz bilim insanı dede Rick ile saf torunu Morty'nin paralel evrenlerde ve farklı boyutlarda yaşadığı çılgın, zekice ve absürt maceralar.",
  'Sherlock': "Sir Arthur Conan Doyle'un efsanevi dedektifi Sherlock Holmes ve Dr. John Watson'ın maceralarını modern Londra'ya taşıyan, zekice kurgulanmış akıl oyunları ve yüksek temposuyla öne çıkan kült yapım.",
  'Fullmetal Alchemist: Brotherhood': "Kaybettikleri annelerini diriltmek isterken bedenlerini kaybeden Edward ve Alphonse Elric kardeşlerin Felsefe Taşı'nı bularak eski bedenlerine kavuşma yolundaki felsefi ve epik arayışı.",
  'Attack on Titan': "İnsanlığı yok olmanın eşiğine getiren devasa Titanlara karşı surların ardında hayatta kalmaya çalışan Eren Yeager ve İzciler Birliği'nin özgürlük ve gerçek uğruna verdiği nefes kesen mücadele.",
  'The World at War': "II. Dünya Savaşı'nın tüm cephelerini, dönemin komutanları, askerleri ve sivillerinin tanıklıklarıyla eksiksiz şekilde anlatan tarihi belgesel anıtı.",
  'Life': "Doğadaki canlıların hayatta kalmak ve soylarını devam ettirmek için geliştirdiği inanılmaz uyum yeteneklerini ve doğanın büyüleyici döngüsünü sergileyen başyapıt.",
  'The Vietnam War': "Ken Burns ve Lynn Novick'in yönettiği, Vietnam Savaşı'nın tüm boyutlarını, Amerikan ve Vietnamlı tanıkların gözünden tarafsız ve derinlemesine inceleyen tarihi belgesel.",
  'The Twilight Zone': "Rod Serling'in yarattığı; bilim kurgu, gerilim, felsefe ve ahlak ikilemlerini beklenmedik sonlarla harmanlayan televizyon tarihinin en etkileyici antoloji serisi.",
  'The Beatles: Anthology': "Paul McCartney, George Harrison ve Ringo Starr'ın kendi anlatımlarıyla müzik tarihini değiştiren efsanevi The Beatles grubunun yükselişini ve hikayesini anlatan kapsamlı belgesel.",
  'Human Planet': "İnsanoğlunun kutuplardan çöllere, okyanuslardan balta girmemiş ormanlara kadar yeryüzünün en zorlu koşullarında doğayla kurduğu inanılmaz bağı belgeleyen yapım.",
  'Şahsiyet': "Emekli adliye memuru Agâh Beyoğlu'na Alzheimer teşhisi konmasıyla başlayan, cinayet büro amirliğindeki tek kadın polis Nevra ile yollarının kesiştiği uluslararası Emmy ödüllü sürükleyici Türk suç draması.",
  'The Blue Planet': "David Attenborough'nun anlatımıyla denizlerin ve okyanusların derinliklerindeki ekosistemleri ve gizemli canlıları ilk kez bu kadar net gözler önüne seren BBC belgeseli.",
  'Batman: The Animated Series': "Gotham City'nin karanlık atmosferinde suçlulara ve ikonik kötülere karşı mücadele eden Kara Şövalye Batman'in çığır açan animasyon serisi.",
  'Firefly': "Galaksiler arası bir iç savaşın ardından Serenity adlı uzay gemisi mürettebatının galaksinin kıyılarında hayatta kalmak için yürüttüğü kaçakçılık ve özgürlük mücadelesi.",
  'Frozen Planet': "Kuzey ve Güney Kutuplarının dondurucu soğuklarında yaşam mücadelesi veren kutup canlılarının büyüleyici dünyasını gözler önüne seren eşsiz doğa belgeseli.",
  'Dekalog': "Krzysztof Kieślowski'nin yönettiği, On Emir'den esinlenerek modern bir Varşova toplu konutunda yaşayan insanların ahlaki çıkmazlarını işleyen felsefi sinema başyapıtı.",
  'True Detective': "Louisiana'nın karanlık bataklıklarında işlenen okült cinayetleri aydınlatmaya çalışan iki zıt dedektif Rust Cohle ve Martin Hart'ın 17 yıla yayılan felsefi ve psikolojik soruşturması.",
  'The Civil War': "Amerikan İç Savaşı'nın tüm detaylarını, mektuplar, tarihi fotoğraflar ve dönemin belgeleriyle büyüleyici bir sinematografiyle aktaran dev belgesel serisi.",
  'Death Note': "Adını yazdığı kişiyi öldürebilme gücüne sahip doğaüstü bir defter bulan dahi lise öğrencisi Light Yagami ile onu yakalamaya ant içmiş gizemli dedektif L arasındaki amansız zeka savaşı.",
  'Apocalypse: The Second World War': "II. Dünya Savaşı'nın daha önce hiç görülmemiş renkli ve restore edilmiş arşiv görüntüleriyle savaşın yıkımını ve dehşetini anlatan çarpıcı belgesel.",
  'Fargo': "Minnesota'nın buz gibi kasabalarında sıradan insanların açgözlülük, hırs ve manipülasyonlar sonucu içine çekildiği sıra dışı, kara mizah yüklü ve kanlı suç hikayeleri.",
  'Cowboy Bebop': "2071 yılında güneş sisteminde ödül avcılığı yapan Spike Spiegel ve Bebop gemisi mürettebatının caz müzik eşliğinde geçmişleriyle yüzleştiği kült anime başyapıtı.",
  'Better Call Saul': "Walter White ile tanışmadan önce James McGill adıyla kendi ayakları üzerinde durmaya çalışan sebatkar avukatın 'Saul Goodman' kimliğine evrilişini anlatan ustalık eseri.",
  'Succession': "Küresel medya devi Waystar RoyCo'nun patriği Logan Roy'un koltuğunu bırakması yaklaşırken, dört hırslı çocuğunun şirketin kontrolü için verdiği acımasız güç savaşı.",
  'When They See Us': "1989 yılında New York Central Park'ta işlenen vahşi bir suçla haksız yere suçlanan beş siyahi ve hispanik gencin adalet arayışını ve yaşadığı trajediyi anlatan gerçek hikaye.",
  'Hunter x Hunter': "Kaybettiği babasını bulmak ve bir 'Avcı' olmak için tehlikeli sınavlara giren genç Gon Freecss ve dostlarının sınır tanımayan fantastik macerası.",
  'Friends': "New York'ta yaşayan altı yakın arkadaşın kariyer, aşk ve günlük hayatın komik çıkmazları arasındaki 10 yıllık sıcacık ve unutulmaz dostluk serüveni.",
  'The Office': "Dunder Mifflin kağıt şirketinin Scranton şubesinde çalışan renkli personelin ve nev-i şahsına münhasır patronları Michael Scott'ın kahkaha dolu gündelik ofis maceraları.",
  "Monty Python's Flying Circus": "İngiliz mizahının efsanevi grubu Monty Python'ın absürt komediyi ve hicvi televizyonda zirveye taşıyan efsanevi skeç programı.",
  'Das Boot': "II. Dünya Savaşı sırasında Atlantik Okyanusu'nda devriye gezen bir Alman denizaltı mürettebatının klostrofobik, gerilim dolu ve psikolojik yıpranmasını anlatan savaş klasiği.",
  'Seinfeld': "New York'ta yaşayan komedyen Jerry Seinfeld ve tuhaf arkadaşlarının günlük yaşamın sıradan detayları üzerinden ürettiği 'hiçbir şey hakkındaki' kült durum komedisi.",
  'Gravity Falls': "Gizemli Gravity Falls kasabasında amcalarının yanında tatile giden ikiz kardeşler Dipper ve Mabel'ın kasabanın paranormal sırlarını çözmeye çalıştığı zeki animasyon.",
  'Pride and Prejudice': "Jane Austen'ın ölümsüz romanından uyarlanan; gurur, önyargı ve toplumsal sınıfların gölgesinde Elizabeth Bennet ile zengin Mr. Darcy'nin unutulmaz aşkı.",
  'Black Mirror': "Modern teknolojinin, yapay zekanın ve dijital dünyanın insan doğası, toplum ve gelecek üzerindeki karanlık ve distopik yansımalarını sorgulayan antoloji dizisi.",
  'Twin Peaks': "Küçük bir kasabada lise öğrencisi Laura Palmer'ın gizemli cinayetini araştırmak için gelen FBI ajanı Dale Cooper'ın karşılaştığı tekinsiz ve sürreal olaylar.",
  'Over the Garden Wall': "Bilinmeyen adlı gizemli ve büyülü bir ormanda kaybolan iki kardeş Wirt ve Greg'in eve dönüş yolunda karşılaştıkları masalsı ve tekinsiz yolculuk.",
  'One Punch Man': "Yaptığı yoğun antrenmanlar sonucu her rakibini tek bir yumrukla yenebilecek güce ulaşan ancak bu yüzden dövüş heyecanını kaybedip sıkılan süper kahraman Saitama'nın komik hikayesi.",
  'Nathan for You': "İşletme mezunu komedyen Nathan Fielder'ın zor durumdaki küçük işletmelere sunduğu akılalmaz, absürt ve sıra dışı pazarlama fikirlerini konu alan efsanevi belgesel komedi.",
  'Narcos': "Kolombiya'nın Medellín uyuşturucu kartelinin lideri Pablo Escobar'ın yükselişi, imparatorluğu ve onu yakalamak için çalışan DEA ajanlarının soluksuz takibi.",
  'Peaky Blinders': "I. Dünya Savaşı sonrasında Birmingham sokaklarında yükselen Thomas Shelby liderliğindeki ünlü sokak çetesi Peaky Blinders'ın yeraltı dünyasındaki yükseliş savaşı.",
  'Blackadder Goes Forth': "I. Dünya Savaşı'nın siperlerinde kurnaz Kaptan Blackadder ve beceriksiz yoldaşlarının ölümcül cephe emirlerinden kurtulmak için giriştiği zekice ve absürt kaçış planları.",
  'Freaks and Geeks': "1980'lerin başında bir lisede 'ucubeler' ve 'inekler' gruplarına dahil olmaya çalışan iki kardeşin ergenlik, kimlik ve büyüme sancılarını anlatan samimi kült dizi.",
  'Stranger Things': "1980'lerde Hawkins kasabasında küçük bir çocuğun kaybolmasıyla ortaya çıkan gizemli güçler, gizli hükümet deneyleri ve 'Baş Aşağı' evreninden gelen canavarlarla mücadele.",
  'Fawlty Towers': "İngiliz sahil kasabasında otel işleten nevrotik, huysuz ve kibirli Basil Fawlty'nin otelde çıkan akılalmaz krizlerle başa çıkma çabalarını anlatan komedi şaheseri.",
  'Arrested Development': "Aile şirketinin dolandırıcılık skandalıyla batmasının ardından aileyi bir arada tutmaya çalışan aklı başında tek oğul Michael Bluth ve onun bencil, tuhaf ailesi.",
  "Chappelle's Show": "Dave Chappelle'in ırkçılık, popüler kültür ve toplum tabularını sivri dilli skeçlerle hicvettiği çığır açıcı komedi programı.",
  "It's Always Sunny in Philadelphia": "Philadelphia'da başarısız bir bar işleten, ahlaki pusulalarını tamamen kaybetmiş beş benmerkezci arkadaşın içine düştüğü skandal ve absürt durumlar.",
  'Rome': "Julius Caesar'ın yükselişi ve Roma Cumhuriyeti'nin imparatorluğa dönüşümünü iki sıradan Romalı askerin gözünden tarihi ihtişamıyla aktaran dev bütçeli tarihi drama.",
  'Dragon Ball Z': "Dünyayı ve evreni yok etmek isteyen güçlü uzaylı varlıklara karşı savaşan Saiyan savaşçısı Goku ve dostlarının sınır tanımayan güç mücadeleleri.",
  'House of Cards': "Washington D.C.'de hırslı kongre üyesi Frank Underwood ve eşi Claire'in Beyaz Saray'ın en tepesine ulaşmak için kurduğu acımasız ve manipülatif siyasi tuzaklar.",
  'Oz': "Oswald Eyalet Islahevi'nin deneysel Zümrüt Şehir koğuşunda farklı çeteler, mahkumlar ve gardiyanlar arasında yaşanan amansız güç, şiddet ve hayatta kalma savaşı.",
  'The West Wing': "Amerika Birleşik Devletleri Başkanı Josiah Bartlet ve Beyaz Saray Batı Kanadı'ndaki idealist ekibinin ulusal ve küresel krizleri yönetme serüveni.",
  'Steins;Gate': "Mikrodalga fırını kullanarak geçmişe e-posta göndermenin yolunu bulan genç bilim insanı Rintaro Okabe'nin zaman çizgilerini değiştirirken yaşadığı trajik olaylar.",
  'Leyla ile Mecnun': "Kireçburnu sahilinde yaşayan Mecnun'un Leyla'ya duyduğu aşk uğruna İsmail Abi, Erdal Bakkal, Yavuz ve Dede ile atıldığı absürt, şiirsel ve unutulmaz maceralar.",
  'Vinland Saga': "11. yüzyıl Avrupa'sında babasının intikamını almak isteyen genç Viking savaşçısı Thorfinn'in savaşın vahşeti içinde gerçek bir savaşçının anlamını keşfetme yolculuğu.",
  'Cobra Kai': "1984 Karate Kid turnuvasından 30 yıl sonra Daniel LaRusso ve Johnny Lawrence'ın dojo rekabetini ve yeni nesil gençlerin karate mücadelesini anlatan yüksek tempolu seri.",
  'Westworld': "Zenginlerin her türlü fantezilerini gerçekleştirebildiği vahşi batı temalı fütüristik bir tema parkında yapay zekalı androidlerin bilinç kazanarak başlattığı isyan.",
  'I, Claudius': "Roma İmparatorluğu'nun entrika, suikast ve ihanet dolu hanedan tarihini, kekeme ve topal olduğu için küçümsenen ancak hayatta kalmayı başaran İmparator Claudius'un gözünden anlatımı.",
  'The Marvelous Mrs. Maisel': "1950'ler New York'unda mükemmel hayatı altüst olan ev kadını Miriam Maisel'ın beklenmedik bir şekilde stand-up komedi yeteneğini keşfederek kariyer yapma serüveni.",
  'The Boys': "Süper güçlerini kötüye kullanan yozlaşmış süper kahramanlara ve arkalarındaki devasa şirkete karşı adaleti sağlamak için savaşan sıradan insanlardan kurulu ekip.",
  'Dark': "Almanya'nın Winden kasabasında kaybolan iki çocuğun ardından dört ailenin 33 yıllık döngülerle birbirine bağlanan karmaşık zaman yolculuğu ve aile sırları ağı.",
  'Curb Your Enthusiasm': "Seinfeld'in yaratıcısı Larry David'in gündelik hayatın yazılı olmayan sosyal kurallarıyla bitmek bilmeyen çatışmalarını anlatan doğaçlama komedi klasiği.",
  'Fleabag': "Londra'da yas, aile sorunları ve yalnızlıkla başa çıkmaya çalışan zeki, dobra ve özgüvensiz genç bir kadının dördüncü duvarı yıkarak seyirciyle paylaştığı iç dünyası.",
  'The Mandalorian': "İmparatorluğun çöküşünün ardından galaksinin ücra köşelerinde ödül avcılığı yapan yalnız bir Mandalorlu savaşçının gizemli bir çocuğu koruma görevi.",
  'Six Feet Under': "Los Angeles'ta bağımsız bir cenaze evi işleten Fisher ailesinin ölüm, yas, sevgi ve hayatın anlamı üzerine inşa edilmiş derinlikli ve felsefi draması.",
  'South Park': "Colorado'nun küçük bir kasabasında yaşayan Stan, Kyle, Cartman ve Kenny adlı dört çocuğun üzerinden güncel olayları ve tabuları acımasızca hicveden kült animasyon.",
  'BoJack Horseman': "90'ların ünlü televizyon yıldızı olan yarı insan yarı at BoJack'in Hollywood'un parıltılı dünyasında depresyon, bağımlılık ve varoluş sancılarıyla mücadelesi.",
  'Demon Slayer': "Ailesi iblisler tarafından katledilen ve kız kardeşi iblise dönüşen Tanjiro Kamado'nun kardeşini yeniden insana dönüştürmek için iblis avcısı olma yolculuğu.",
  'The Simpsons': "Springfield kasabasında yaşayan Simpson ailesinin 30 yılı aşkın süredir Amerikan toplumunu, popüler kültürünü ve aile yapısını hicveden efsanevi animasyon.",
  'House M.D.': "Tıbbi vakaları bir dedektif gibi çözen dahi, alaycı ve insan sevmez teşhis uzmanı Dr. Gregory House ve ekibinin ölümcül hastalıklarla savaşı.",
  'The Haunting of Hill House': "Geçmişte Tepedeki Ev'de büyüyen ve orada yaşanan trajedilerle travmatize olan beş kardeşin yıllar sonra yeniden bir araya gelerek geçmişin hayaletleriyle yüzleşmesi.",
  'Deadwood': "1870'lerde Güney Dakota'nın altına hücum kasabası Deadwood'da kanunun, ahlakın ve sınırların olmadığı vahşi batı atmosferinde güç ve hayatta kalma mücadelesi.",
  'Battlestar Galactica': "Cylon adı verilen robotların insan kolonilerini yok etmesinin ardından hayatta kalan son insanların Galactica savaş gemisi eşliğinde efsanevi Dünya'yı arayışı.",
  'The Crown': "Kraliçe II. Elizabeth'in tahta çıkışından günümüze kadar İngiliz Kraliyet Ailesi'nin siyasi krizler, kişisel çatışmalar ve tarihi dönüm noktalarıyla dolu hikayesi.",
  'The Shield': "Los Angeles sokaklarında suçla savaşırken kendi ahlaki sınırlarını çiğneyen dedektif Vic Mackey ve onun yozlaşmış Saldırı Timi'nin nefes kesen suç draması.",
  'The X-Files': "FBI özel ajanları Fox Mulder ve Dana Scully'nin açıklanamayan doğaüstü olaylar, uzaylı komploları ve gizli hükümet deneylerini içeren gizemli dosyaları araştırması.",
  'Downton Abbey': "20. yüzyılın başlarında İngiliz soylusu Crawley ailesinin ve onların köşkündeki hizmetkarların değişen dünya düzeninde yaşadığı dramatik hayatlar.",
  'Dexter': "Miami polis teşkilatında adli tıp uzmanı olarak çalışan ancak geceleri adaletin yakalayamadığı katilleri öldüren vicdanlı seri katil Dexter Morgan'ın ikili yaşamı.",
  'Daredevil': "Çocukken geçirdiği kazada görme yetisini kaybedip diğer duyuları olağanüstü gelişen avukat Matt Murdock'ın geceleri Hell's Kitchen'ın koruyucusu Daredevil olarak suçla savaşı.",
  'Mad Men': "1960'lar New York Madison Avenue'nun parıltılı reklamcılık dünyasında dahi ama karanlık geçmişe sahip Don Draper'ın kimlik, hırs ve kadınlarla dolu karmaşık hayatı.",
  'Arcane': "Zengin ütopik şehir Piltover ile ezilen yeraltı şehri Zaun arasındaki gerilimde, kaderleri büyü ve teknolojiyle ayrılan iki kız kardeş Vi ve Jinx'in efsanevi hikayesi.",
  'The Last of Us': "Ölümcül bir mantar salgınının medeniyeti yok etmesinden 20 yıl sonra, sert mizaçlı kaçakçı Joel'un insanlığın son umudu olabilecek genç kız Ellie'yi salgın harabesine dönmüş Amerika boyunca taşıma görevi.",
  'Severance': "Lumon Industries çalışanlarının iş hayatı ile kişisel hayatı arasındaki anılarını cerrahi müdahaleyle ikiye bölen 'ayrılma' prosedürünün ardındaki karanlık komplo.",
  'The Bear': "İnceleme ödüllü genç şef Carmy Berzatto'nun kardeşinin intiharının ardından Chicago'daki küçük İtalyan sandviç dükkanını yönetmek için geri dönmesiyle yaşanan kaos ve tutku.",
  'Mindhunter': "1970'lerin sonlarında FBI ajanları Holden Ford ve Bill Tench'in hapishanedeki seri katillerle görüşerek modern kriminal psikolojiyi ve suçlu profillemesini başlatma serüveni.",
  'Ted Lasso': "Amerikan futbolu koçu Ted Lasso'nun hiçbir şey bilmediği İngiliz Premier Lig futbol takımını çalıştırmak üzere Londra'ya gelerek samimiyeti ve iyimserliğiyle herkesi değiştirmesi.",
  'Ezel': "En yakın arkadaşları ve aşık olduğu kadının ihanetine uğrayıp hapse atılan Ömer'in, Ramiz Dayı'nın yardımıyla yüzünü ve kimliğini değiştirerek intikam için 'Ezel' olarak geri dönüşü."
};

async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) return await res.json();
    } catch (e) {
      if (i === maxRetries - 1) return null;
      await new Promise(r => setTimeout(r, 800));
    }
  }
  return null;
}

async function main() {
  console.log('🚀 Loading database.json and preparing Top 100 TV Shows...');
  let db = { series: [], anime: [], episodes: [], threads: [], summaries: {}, backdrops: {}, defaultImdbIds: {}, schedule: [], comments: {} };
  if (fs.existsSync(DB_PATH)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {}
  }

  const existingSeriesMap = new Map();
  (db.series || []).forEach(s => existingSeriesMap.set(s[0].toLowerCase().trim(), s));
  const existingAnimeMap = new Map();
  (db.anime || []).forEach(a => existingAnimeMap.set(a[0].toLowerCase().trim(), a));

  const newSeriesList = [];
  const newAnimeList = [];
  const addedTitles = new Set();

  console.log(`Processing ${TOP_100_IMDB.length} Top Shows...`);

  // Batch process 5 at a time
  for (let i = 0; i < TOP_100_IMDB.length; i += 5) {
    const chunk = TOP_100_IMDB.slice(i, i + 5);
    await Promise.all(chunk.map(async item => {
      const normTitle = item.title.toLowerCase().trim();
      let existing = existingSeriesMap.get(normTitle) || existingAnimeMap.get(normTitle);

      let poster = `https://images.metahub.space/poster/small/${item.id}/img`;
      let backdrop = `https://images.metahub.space/background/medium/${item.id}/img`;
      let genres = 'Dram';
      let year = item.year;
      let rating = item.rating;
      let epMap = { '1': 10 };
      let seasons = 1;
      let totalEpisodes = 10;
      let status = 'Final Yaptı';

      // If already in db and has rich metadata, keep custom details
      if (existing) {
        if (existing[4]) poster = existing[4];
        if (existing[5]) backdrop = existing[5];
        if (existing[1]) genres = existing[1];
        if (existing[2]) rating = existing[2];
        if (existing[3]) year = existing[3];
        if (existing[6] && typeof existing[6] === 'object') {
          const m = existing[6];
          if (m.epMap) epMap = m.epMap;
          if (m.seasons) seasons = m.seasons;
          if (m.totalEpisodes) totalEpisodes = m.totalEpisodes;
          if (m.status) status = m.status;
        }
      }

      // Fetch from Cinemeta
      const cData = await fetchWithRetry(`https://v3-cinemeta.strem.io/meta/series/${item.id}.json`);
      if (cData && cData.meta) {
        const m = cData.meta;
        if (m.imdbRating) rating = parseFloat(m.imdbRating) || rating;
        if (m.year) {
          const yMatch = String(m.year).match(/\d{4}/);
          if (yMatch) year = parseInt(yMatch[0]);
        }
        if (m.genres && m.genres.length) {
          genres = formatGenres(m.genres);
        }
        if (m.poster) poster = m.poster;
        if (m.background) backdrop = m.background;

        // Parse seasons and epMap from videos
        if (Array.isArray(m.videos) && m.videos.length > 0) {
          const tempMap = {};
          let maxS = 1;
          m.videos.forEach(v => {
            const s = parseInt(v.season);
            const ep = parseInt(v.episode || v.number);
            if (s && s > 0) {
              tempMap[s] = Math.max(tempMap[s] || 0, ep || 0);
              if (s > maxS) maxS = s;
            }
          });
          const keys = Object.keys(tempMap);
          if (keys.length > 0) {
            epMap = tempMap;
            seasons = maxS;
            totalEpisodes = Object.values(epMap).reduce((a, b) => a + b, 0);
          }
        }
      }

      // Status determination
      const ONGOING_LIST = ['rick and morty', 'stranger things', 'the boys', 'the mandalorian', 'south park', 'the simpsons', 'the bear', 'severance', 'arcane', 'the last of us', 'vinland saga', 'demon slayer', 'cobra kai', 'one piece'];
      if (ONGOING_LIST.includes(normTitle)) {
        status = 'Devam Ediyor';
      }

      const metaObj = {
        epMap,
        imdbId: item.id,
        status,
        seasons,
        totalEpisodes
      };

      const seriesRow = [
        item.title,
        genres,
        rating,
        year,
        poster,
        backdrop,
        metaObj
      ];

      // Summary
      let summaryText = TR_SUMMARIES[item.title];
      if (!summaryText && db.summaries && db.summaries[item.title]) {
        summaryText = db.summaries[item.title];
      }
      if (!summaryText) {
        summaryText = `${item.title}, ${year} yılında yayınlanan ve IMDb'de ${rating} puanıyla tüm zamanların en yüksek puanlı yapımları arasında yer alan başyapıt bir ${genres} dizisidir.`;
      }

      db.summaries[item.title] = summaryText;
      db.backdrops[item.title] = backdrop;
      db.defaultImdbIds[item.title] = item.id;

      if (item.isAnime) {
        newAnimeList.push(seriesRow);
      } else {
        newSeriesList.push(seriesRow);
      }
      addedTitles.add(normTitle);
    }));
    console.log(`✓ Processed ${Math.min(i + 5, TOP_100_IMDB.length)} / ${TOP_100_IMDB.length} shows`);
  }

  // Preserve any additional series/anime already in database that weren't in TOP 100
  (db.series || []).forEach(s => {
    if (!addedTitles.has(s[0].toLowerCase().trim())) {
      newSeriesList.push(s);
      addedTitles.add(s[0].toLowerCase().trim());
    }
  });
  (db.anime || []).forEach(a => {
    if (!addedTitles.has(a[0].toLowerCase().trim())) {
      newAnimeList.push(a);
      addedTitles.add(a[0].toLowerCase().trim());
    }
  });

  // Sort by rating descending (Ezel placed near top / preserved)
  newSeriesList.sort((a, b) => (b[2] || 0) - (a[2] || 0));
  newAnimeList.sort((a, b) => (b[2] || 0) - (a[2] || 0));

  // Ensure Ezel is at position 1 or 2 as user requested previously
  const ezelIdx = newSeriesList.findIndex(s => s[0].toLowerCase() === 'ezel');
  if (ezelIdx > -1) {
    const [ezelItem] = newSeriesList.splice(ezelIdx, 1);
    newSeriesList.unshift(ezelItem);
  }

  db.series = newSeriesList;
  db.anime = newAnimeList;

  console.log(`\n🎉 Completed! Total Series: ${db.series.length}, Total Anime: ${db.anime.length}`);

  // Write to data/database.json
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log('✓ Wrote updated data/database.json');

  // Write to public/js/data.js
  const dataJsContent = '// bolumdizi Client Initial Data & Constants (Auto-synced)\n' +
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

  fs.writeFileSync(DATA_JS_PATH, dataJsContent, 'utf8');
  console.log('✓ Wrote updated public/js/data.js');

  // Sync to Supabase
  console.log('☁️ Syncing to Supabase Cloud Database...');
  try {
    const patchRes = await fetch(SB_URL + '/rest/v1/users?username=eq.__site_content__', {
      method: 'PATCH',
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        watchlist: {
          series: db.series,
          anime: db.anime,
          episodes: db.episodes,
          threads: db.threads || [],
          summaries: db.summaries,
          backdrops: db.backdrops,
          schedule: db.schedule || [],
          comments: db.comments || {},
          deletedEpisodes: db.deletedEpisodes || []
        }
      })
    });
    console.log('Supabase sync response status:', patchRes.status);
    if (patchRes.ok) {
      console.log('✓ Supabase successfully synchronized!');
    }
  } catch (err) {
    console.warn('Supabase sync warning:', err.message);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
