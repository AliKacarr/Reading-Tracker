# 📚 RoTaKip Okuma Takip Sistemi

Modern ve kullanıcı dostu bir okuma takip platformu. Grup üyelerinin günlük okuma alışkanlıklarını takip etmek, istatistiklerini görüntülemek ve motivasyonlarını artırmak için geliştirilmiştir.

🌐 [RoTaKip Web Uygulaması](https://rotakip.onrender.com/)

## ✨ Özellikler

### 🏠 Ana Sayfa & Grup Yönetimi

- **Grup Oluşturma**: Yeni okuma grupları oluşturma
- **Grup Katılımı**: Mevcut gruplara katılma
- **Görünürlük Ayarları**: Herkese açık veya özel gruplar
- **Grup Arama**: Grup adı ve açıklamasına göre arama
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu

### 👥 Kullanıcı Yönetimi

- **Kullanıcı Ekleme/Silme**: Grup üyelerini yönetme
- **Profil Resmi**: Kullanıcı profil resimleri
- **Yetkilendirme Sistemi**: Admin ve üye rolleri
- **Güvenli Giriş**: Şifre korumalı admin paneli

### 📊 Okuma Takibi

- **Günlük Takip**: Haftalık okuma durumu takibi
- **Lig Sistemi**: Okuma sayısına göre lig atlama
- **Seri Takibi**: Ardışık okuma günleri
- **İstatistikler**: Detaylı okuma analizleri
- **Aylık Görünüm**: Takvim formatında okuma geçmişi

### 🎯 Motivasyon Özellikleri

- **Günün Sözü**: İlham verici sözler
- **Ayet & Hadis**: Dini içerik paylaşımı
- **Dua Paylaşımı**: Günlük dualar
- **YouTube Entegrasyonu**: Eğitici videolar
- **Lig Atlama Bildirimleri**: Başarı kutlamaları

### 🔒 Güvenlik & Yönetim

- **Admin Paneli**: Kapsamlı yönetim arayüzü
- **Erişim Kayıtları**: Güvenlik logları
- **Yetkilendirme**: Rol tabanlı erişim kontrolü
- **Otomatik Yedekleme**: Veri güvenliği

### 📱 Kullanıcı Deneyimi

- **Modern UI/UX**: Şık ve kullanıcı dostu arayüz
- **Animasyonlar**: Smooth geçiş efektleri
- **Responsive**: Tüm cihazlarda uyumlu
- **Hızlı Yükleme**: Optimize edilmiş performans

## 🛠️ Teknolojiler

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL veritabanı
- **Mongoose** - MongoDB ODM
- **Multer** - Dosya yükleme
- **node-schedule** - Zamanlanmış görevler

### Frontend

- **Vanilla JavaScript** - Modern ES6+ özellikleri
- **CSS3** - Flexbox, Grid, Animations
- **FontAwesome** - İkon kütüphanesi
- **Responsive Design** - Mobile-first yaklaşım

### Entegrasyonlar

- **YouTube API** - Video içerik entegrasyonu
- **Python Scripts** - WhatsApp anket entegrasyonu
- **Chrome Automation** - Web scraping

## 🚀 Kurulum

### 1. Projeyi Klonlayın

```bash
git clone [repo-url]
cd reading-tracker
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Ortam Değişkenlerini Ayarlayın

`.env` dosyası oluşturun:

```env
MONGO_URI=mongodb://localhost:27017/reading-tracker
DB_NAME=reading-tracker
BACKUP_DB_NAME=reading-tracker-backup
YOUTUBE_API_KEY=your_youtube_api_key_here
```

### 4. MongoDB'yi Başlatın

```bash
# MongoDB servisini başlatın
mongod
```

### 5. Uygulamayı Çalıştırın

```bash
node server.js
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 📁 Proje Yapısı

```
reading-tracker/
├── public/                 # Frontend dosyaları
│   ├── css/               # Stil dosyaları
│   ├── js/                # JavaScript dosyaları
│   ├── images/            # Resim dosyaları
│   └── groupImages/       # Grup resimleri
├── uploads/               # Kullanıcı profil resimleri
├── poll-data-extraction/  # WhatsApp entegrasyonu
├── api/                   # API endpoint'leri
├── server.js              # Ana sunucu dosyası
└── package.json           # Proje bağımlılıkları
```

## 🔌 API Endpoints

### Grup İşlemleri

- `POST /api/groups` - Yeni grup oluşturma
- `GET /api/groups` - Grup listesi
- `GET /api/groups/:groupId/member-count` - Üye sayısı

### Kullanıcı İşlemleri

- `POST /api/add-user/:groupId` - Kullanıcı ekleme
- `POST /api/delete-user/:groupId` - Kullanıcı silme
- `POST /api/update-user/:groupId` - Kullanıcı güncelleme
- `POST /api/update-user-image/:groupId` - Profil resmi güncelleme

### Okuma Takibi

- `GET /api/all-data/:groupId` - Tüm veriler
- `POST /api/update-status/:groupId` - Okuma durumu güncelleme
- `GET /api/user-stats/:groupId/:userId` - Kullanıcı istatistikleri
- `GET /api/reading-stats/:groupId` - Okuma istatistikleri
- `GET /api/longest-streaks/:groupId` - En uzun seriler

### İçerik API'leri

- `GET /api/random-quote` - Rastgele söz
- `GET /api/random-ayet` - Rastgele ayet
- `GET /api/random-hadis` - Rastgele hadis
- `GET /api/random-dua` - Rastgele dua
- `GET /api/quote-images` - Söz resimleri

### Admin İşlemleri

- `POST /api/admin-login` - Admin girişi
- `POST /api/verify-admin` - Admin doğrulama
- `GET /api/access-logs` - Erişim kayıtları
- `GET /api/login-logs` - Giriş kayıtları

### YouTube Entegrasyonu

- `GET /api/config` - YouTube API yapılandırması

## 🎮 Kullanım

### Grup Oluşturma

1. Ana sayfada "Grup Oluştur" butonuna tıklayın
2. Grup bilgilerini doldurun (ad, açıklama, görünürlük)
3. Admin bilgilerini girin
4. Grup resmi yükleyin (isteğe bağlı)
5. "Grup Oluştur" butonuna tıklayın

### Grup Katılımı

1. Ana sayfada mevcut grupları görüntüleyin
2. Katılmak istediğiniz gruba tıklayın
3. Admin girişi yapın
4. Gruba katılın

### Okuma Takibi

1. Haftalık takip tablosunda günlere tıklayın
2. Okuma durumunuzu işaretleyin (✔ Okudum, ✖ Okumadım)
3. İstatistiklerinizi görüntüleyin
4. Lig atlama durumunuzu takip edin

## 🔧 Yapılandırma

### MongoDB Koleksiyonları

- `usergroups` - Grup bilgileri
- `users_[groupId]` - Grup üyeleri
- `readingstatuses_[groupId]` - Okuma durumları
- `admins` - Admin bilgileri

### Lig Sistemi

```javascript
const LEAGUES = [
  { min: 0, max: 5, name: "Bronz" },
  { min: 5, max: 10, name: "Gümüş" },
  { min: 10, max: 20, name: "Altın" },
  // ... daha fazla lig
];
```

## 🔄 Yedekleme Sistemi

- **Otomatik Yedekleme**: Her gün gece yarısı
- **Manuel Yedekleme**: Admin panelinden
- **Yedek Saklama**: Son 10 yedek
- **Yedek İçeriği**: Kullanıcı verileri ve okuma durumları

## 📊 İstatistikler

### Takip Edilen Metrikler

- Günlük okuma durumu
- Ardışık okuma serileri
- Lig atlama durumu
- Haftalık/aylık özetler
- Grup performansı

### Görselleştirme

- Haftalık takip tablosu
- Aylık takvim görünümü
- İstatistik kartları
- Progress bar'lar
- Lig gösterimi

## 🛡️ Güvenlik

### Yetkilendirme

- Admin şifre koruması
- Grup bazlı erişim kontrolü
- Session yönetimi
- Erişim logları

### Veri Güvenliği

- Otomatik yedekleme
- Veri şifreleme
- Güvenli dosya yükleme
- Input validasyonu

## 🚀 Deployment

### Vercel (Önerilen)

```bash
# Vercel CLI ile deploy
npm i -g vercel
vercel
```

### Docker

```dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📝 Lisans

Bu proje özel kullanım için geliştirilmiştir. Ticari kullanım için izin gereklidir.

## 📞 İletişim

- **Proje Yöneticisi**: alikacardev@gmail.com
- **Teknik Destek**: GitHub Issues
- **Özellik İstekleri**: GitHub Discussions

**RoTaKip Okuma Takip Sistemi** ile okuma alışkanlıklarınızı takip edin, motivasyonunuzu artırın ve hedeflerinize ulaşın! 📚✨
