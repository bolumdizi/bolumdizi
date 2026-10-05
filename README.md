# 🎬 BölümDizi - Yabancı Dizi İzleme Platformu
### DiziBox & SezonlukDizi Hibrit Tasarım + Admin Paneli

BölümDizi, Türkiye'nin en popüler iki dizi izleme sitesi olan **DiziBox** ve **SezonlukDizi**'nin en beğenilen özelliklerini modern, reklamsız, yüksek performanslı ve tam işlevli bir web sitesinde bir araya getiren açık kaynaklı bir video akış platformudur.

---

## 🚀 Özellikler

### 1. DiziBox Esintileri:
- **Gelişmiş Çoklu Kaynaklı Oynatıcı:** VidMoly, Rapidrame, PlayRU ve fragman alternatifleri arasında anında geçiş.
- **Işıkları Kapat (Sinema Modu):** Oynatıcı harici tüm sayfayı karartıp sinema atmosferi sağlayan interaktif katman.
- **Son Eklenen Bölümler Akışı:** Türkçe Dublaj, Türkçe Altyazı veya Tümü olarak filtrelenebilen, zaman damgalı ("35 dk önce") bölüm kartları.
- **Kırık Link Bildirim Sistemi:** Bozuk veya ses kayması olan kaynakların kullanıcılardan anında toplanması.
- **Sinematik Hero Vitrini:** Trend dizileri büyük arka plan görselleriyle dönen otomatik slider.

### 2. SezonlukDizi Esintileri:
- **Haftalık Dizi Takvimi (`/takvim`):** Pazartesi'den Pazar'a gün gün hangi dizinin yeni bölümünün çıktığını gösteren, bugünü otomatik işaretleyen takvim.
- **Sezon ve Bölüm Gezgini:** Sezon sekmeleri (1. Sezon, 2. Sezon...) ve izlendi onay işaretleri.
- **Kaldığım Yerden Devam Et:** Tarayıcı hafızasında saklanan son izlenen bölümler.
- **Spoiler Korumalı Yorumlar:** Sürprizbozan içeren yorumlar bulanıklaştırılır ve sadece tıklayınca açılır.
- **Gelişmiş Keşfet (`/kesfet`):** Tür, IMDb puanı, çıkış yılı ve duruma göre anlık listeleme.

### 3. Yönetim Paneli (`/admin`):
- **Giriş:** Kullanıcı: `admin` / Şifre: `admin123`
- **İstatistikler:** Toplam dizi, bölüm, görüntülenme ve bekleyen rapor sayaçları.
- **Dizi Yönetimi:** Yeni dizi ekleme (başlık, IMDb, afiş, takvim günü, özet, fragman), düzenleme, silme ve **"Örnek Veri Doldur"** butonu.
- **Bölüm Yönetimi:** Sezon/bölüm bazlı ekleme, dublaj/altyazı seçenekleri, kaynak URL'leri.
- **Kırık Link Bildirimleri:** Kullanıcı raporlarını çözüldü olarak işaretleme.
- **Yorum Moderasyonu:** Uygunsuz yorumları tek tıkla silme.
- **Site Ayarları:** Site adı, duyuru barı metni, sosyal medya linkleri.

---

## 🛠️ Yerel Kurulum & Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Sunucuyu başlatın
npm start
```

Sunucu açıldıktan sonra:
- **Ana Sayfa:** http://localhost:3000
- **Dizi Takvimi:** http://localhost:3000/takvim
- **Dizi Keşfet:** http://localhost:3000/kesfet
- **Yönetim Paneli:** http://localhost:3000/admin (admin / admin123)

---

## 🌐 GitHub'a Yükleme ve Domainde Yayınlama

### Adım 1: GitHub'da Yeni Repository Oluşturun
1. [GitHub](https://github.com/new) adresine gidin.
2. `bolum-dizi` adında boş (README veya .gitignore eklemeden) bir repo açın.

### Adım 2: Projeyi GitHub'a Pushlayın
Terminalinizde şu komutları çalıştırın (kendi kullanıcı adınızı ve repo linkinizi yazın):
```bash
git remote add origin https://github.com/<GITHUB_KULLANICI_ADIN>/bolum-dizi.git
git branch -M main
git push -u origin main
```

### Adım 3: Domaininize Bağlama (Canlıya Alma Seçenekleri)

#### Seçenek A: Ücretsiz Cloud Hosting (Render / Railway / Koyeb) - En Kolay
1. [Render.com](https://render.com) sitesine GitHub hesabınızla giriş yapın.
2. **"New +" -> "Web Service"** seçin ve GitHub'daki `bolum-dizi` reponuzu bağlayın.
3. Build Command: `npm install` | Start Command: `npm start`.
4. **Settings -> Custom Domains** kısmından kendi domain adresinizi (örn. `www.siteniz.com`) ekleyin.
5. Domain sağlayıcınızdan (GoDaddy, Namecheap, Natro, Turhost vb.) Render'ın verdiği CNAME kaydını girin.
*Artık GitHub'a her `git push` yaptığınızda siteniz otomatik olarak domaininizde güncellenecektir!*

#### Seçenek B: Kendi VPS Sunucunuzda (Ubuntu / Nginx / PM2)
```bash
# Sunucuda repoyu çekin
git clone https://github.com/<GITHUB_KULLANICI_ADIN>/bolum-dizi.git /var/www/bolum-dizi
cd /var/www/bolum-dizi
npm install

# PM2 ile arka planda 7/24 çalıştırın
npm install -g pm2
pm2 start server.js --name "bolum-dizi"
pm2 startup
pm2 save

# Nginx ile domaininizi porta (3000) yönlendirin ve SSL (Certbot) kurun
sudo certbot --nginx -d siteniz.com -d www.siteniz.com
```
