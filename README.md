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

## Uygulama Ekranları
![Ekran görüntüsü 2025-05-27 232629](https://github.com/user-attachments/assets/fd9d68ed-2c2c-4e34-9742-f46b7266b992)
![Ekran görüntüsü 2025-05-27 233145](https://github.com/user-attachments/assets/a429cf8f-d4d5-4f66-b4ae-fe80e560e8a3)
![Ekran görüntüsü 2025-05-27 232714](https://github.com/user-attachments/assets/96d1809d-1beb-420f-9904-414216486d53)
![Ekran görüntüsü 2025-05-27 232753](https://github.com/user-attachments/assets/7a0235ec-4d16-4c9f-a216-247c3b43af24)
![Ekran görüntüsü 2025-05-27 232803](https://github.com/user-attachments/assets/0da1d430-3f7f-4d2e-850e-6c150064bbe6)
![Ekran görüntüsü 2025-05-27 232815](https://github.com/user-attachments/assets/556c7977-43e0-40ee-b48a-f0c7cbca2365)
![Ekran görüntüsü 2025-05-27 232837](https://github.com/user-attachments/assets/932366f0-e12e-4723-b2ad-610962c93f19)
![Ekran görüntüsü 2025-05-27 232858](https://github.com/user-attachments/assets/9dcf9b1a-7273-4852-ac1b-e7c94ee94632)
![Ekran görüntüsü 2025-05-27 233815](https://github.com/user-attachments/assets/f96d3ea8-8c56-4de9-89ea-15d0895745de)
![Ekran görüntüsü 2025-05-27 233231](https://github.com/user-attachments/assets/947b096a-6ed2-4e4c-b6be-3d63550d0fff)
![Ekran görüntüsü 2025-05-27 233328](https://github.com/user-attachments/assets/4944c192-d4be-43ea-9afd-f13705382a91)
![Ekran görüntüsü 2025-05-27 233403](https://github.com/user-attachments/assets/0899c306-260c-4f77-88a5-998e8b52a667)


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
