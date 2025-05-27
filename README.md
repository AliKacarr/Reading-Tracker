# Okuma Takip Sistemi

Bu proje, grup üyelerinin günlük okuma durumlarını takip etmek için geliştirilmiş bir web uygulamasıdır.

## Özellikler

- 📊 Günlük okuma durumu takibi
- 👥 Kullanıcı yönetimi (ekleme, silme, güncelleme)
- 📈 Okuma istatistikleri ve seriler
- 📝 Günün sözü, ayet, hadis ve dua paylaşımı
- 🎥 YouTube video entegrasyonu
- 🔒 Admin paneli ve güvenlik
- 📱 Responsive tasarım
- 💾 Otomatik yedekleme sistemi
- 📊 WhatsApp anket entegrasyonu

## Teknolojiler

- Node.js
- Express.js
- MongoDB
- Mongoose
- Multer (Dosya yükleme)
- node-schedule (Zamanlanmış görevler)
- Python (WhatsApp anket entegrasyonu için)

## Kurulum

1. Projeyi klonlayın:

```bash
git clone [repo-url]
```

2. Bağımlılıkları yükleyin:

```bash
npm install
```

3. `.env` dosyası oluşturun ve gerekli değişkenleri ayarlayın:

```
MONGO_URI=your_mongodb_uri
DB_NAME=your_database_name
BACKUP_DB_NAME=your_backup_database_name
YOUTUBE_API_KEY=your_youtube_api_key
```

4. Uygulamayı başlatın:

```bash
node server.js
```

## Klasör Yapısı

- `/public` - Statik dosyalar
- `/uploads` - Kullanıcı profil resimleri
- `/poll-data-extraction` - WhatsApp anket entegrasyonu
- `/chrome-profile-*` - Chrome profil klasörleri

## API Endpoints

### Kullanıcı İşlemleri

- `POST /api/add-user` - Yeni kullanıcı ekleme
- `POST /api/delete-user` - Kullanıcı silme
- `POST /api/update-user` - Kullanıcı güncelleme
- `POST /api/update-user-image` - Kullanıcı resmi güncelleme

### Okuma Durumu

- `GET /api/all-data` - Tüm verileri çekme
- `POST /api/update-status` - Okuma durumu güncelleme
- `GET /api/reading-stats` - Okuma istatistikleri
- `GET /api/longest-streaks` - En uzun okuma serileri

### İçerik

- `GET /api/random-quote` - Rastgele söz
- `GET /api/random-ayet` - Rastgele ayet
- `GET /api/random-hadis` - Rastgele hadis
- `GET /api/random-dua` - Rastgele dua
- `GET /api/config` - YouTube API yapılandırması

### Admin

- `POST /api/admin-login` - Admin girişi
- `POST /api/verify-admin` - Admin doğrulama
- `GET /api/access-logs` - Erişim kayıtları
- `GET /api/login-logs` - Giriş kayıtları

## Yedekleme Sistemi

Sistem her gün gece yarısı otomatik olarak yedekleme yapar:

- Kullanıcı verileri
- Okuma durumları
- Son 10 yedek saklanır

## WhatsApp Anket Entegrasyonu

- `GET /run-poll-jobs` endpoint'i ile manuel olarak çalıştırılabilir
- İki farklı grup için anket verisi çekme ve gönderme işlemleri
- Python ve Node.js scriptleri ile entegrasyon

## Lisans

Bu proje özel kullanım için geliştirilmiştir.

## İletişim

Proje yöneticisi ile iletişime geçmek için admin panelini kullanabilirsiniz.
