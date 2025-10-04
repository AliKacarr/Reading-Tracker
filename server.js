// ============================================================================
// 1. KONFIGÜRASYON VE BAĞLANTILAR
// ============================================================================

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os'); // Added OS module
require('dotenv').config();
const schedule = require('node-schedule');
const { Dropbox } = require('dropbox');
const sharp = require('sharp');
const bcrypt = require('bcrypt');

// Hash fonksiyonu
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit integer'a çevir
  }
  return hash;
}
const app = express();
const port = 3000;

// Middleware'ler
app.use(express.static('public'));
app.use('/images', express.static('uploads'));
app.use('/groupAvatars', express.static('groupAvatars'));
app.use(express.json());

// Ana sayfa route'u
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/groupid=:groupId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'groups.html'));
});

// Geriye uyumluluk route'u
app.get('/:groupId', (req, res) => {
  const groupId = req.params.groupId;
  // Only serve groups.html if it's not an API route or static file
  if (!groupId.startsWith('api') && !groupId.includes('.')) {
    res.sendFile(path.join(__dirname, 'public', 'groups.html'));
  } else {
    res.status(404).send('Not found');
  }
});

// Grup sayfası route'u
app.get('/:groupId([a-zA-Z0-9_-çğıöşüÇĞIİÖŞÜ]+)', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'groups.html'));
});

// MongoDB bağlantı seçenekleri
const mongooseOptions = {
  dbName: process.env.DB_NAME,
  serverSelectionTimeoutMS: 5000, // Sunucu seçim zaman aşımı
  socketTimeoutMS: 45000, // Soket zaman aşımı
  connectTimeoutMS: 10000, // Bağlantı zaman aşımı
  maxPoolSize: 10, // Maksimum bağlantı havuzu boyutu
  minPoolSize: 5, // Minimum bağlantı havuzu boyutu
  retryWrites: true, // Yazma işlemlerini yeniden dene
  retryReads: true, // Okuma işlemlerini yeniden dene
};

// MongoDB bağlantısı
mongoose.connect(process.env.MONGO_URI, mongooseOptions)
  .then(() => {
    console.log('MongoDB bağlantısı başarılı');
  })
  .catch((err) => {
    console.error('MongoDB bağlantı hatası:', err);
  });

// Bağlantı olaylarını dinle
mongoose.connection.on('connected', () => {
  console.log('MongoDB bağlantısı kuruldu');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB bağlantı hatası:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB bağlantısı kesildi');
});

// Uygulama kapatıldığında bağlantıyı kapat
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB bağlantısı kapatıldı');
    process.exit(0);
  } catch (err) {
    console.error('MongoDB bağlantısı kapatılırken hata:', err);
    process.exit(1);
  }
});


// ============================================================================
// 2. YARDIMCI FONKSİYONLAR
// ============================================================================

// Dropbox konfigürasyonu - OAuth2 ile
let dbx;
let currentAccessToken = null;
let tokenExpiry = null;

// Dropbox token yenileme fonksiyonu
async function refreshDropboxToken() {
  try {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.DROPBOX_APP_KEY}:${process.env.DROPBOX_APP_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: process.env.DROPBOX_REFRESH_TOKEN
      })
    });

    if (!response.ok) {
      throw new Error(`Token yenileme hatası: ${response.status}`);
    }

    const data = await response.json();
    currentAccessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    
    // Dropbox instance'ını güncelle
    dbx = new Dropbox({
      accessToken: currentAccessToken
    });

    console.log('✅ Dropbox token başarıyla yenilendi');
    return true;
  } catch (error) {
    console.error('❌ Dropbox token yenileme hatası:', error);
    return false;
  }
}

// Dropbox instance'ını başlat
async function initializeDropbox() {
  if (process.env.DROPBOX_REFRESH_TOKEN) {
    await refreshDropboxToken();
  } else {
    console.log('⚠️ DROPBOX_REFRESH_TOKEN bulunamadı, Dropbox devre dışı');
  }
}

// Dropbox token durumu kontrolü
async function checkDropboxToken() {
  try {
    // Token süresi kontrolü
    if (!currentAccessToken || (tokenExpiry && Date.now() >= tokenExpiry)) {
      console.log('🔄 Dropbox token süresi dolmuş, yenileniyor...');
      const refreshed = await refreshDropboxToken();
      if (!refreshed) {
        return { valid: false, error: 'Token yenileme başarısız' };
      }
    }

    if (!dbx) {
      return { valid: false, error: 'Dropbox başlatılmamış' };
    }

    await dbx.usersGetCurrentAccount();
    return { valid: true, error: null };
  } catch (error) {
    if (error.status === 401) {
      // Token yenileme dene
      console.log('🔄 401 hatası, token yenileniyor...');
      const refreshed = await refreshDropboxToken();
      if (refreshed) {
        try {
          await dbx.usersGetCurrentAccount();
          return { valid: true, error: null };
        } catch (retryError) {
          return { valid: false, error: 'Token yenileme sonrası hata' };
        }
      }
      return { valid: false, error: 'Token süresi dolmuş ve yenilenemedi' };
    } else if (error.status === 403) {
      return { valid: false, error: 'Yetki hatası' };
    } else {
      return { valid: false, error: 'Bağlantı hatası' };
    }
  }
}

// Türkçe karakterleri normalize et
function normalizeFileName(fileName) {
  return fileName
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S')
    .replace(/İ/g, 'I')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/\s+/g, '-') // Boşlukları tire ile değiştir
    .replace(/[^a-zA-Z0-9\-\.]/g, '-'); // Özel karakterleri tire ile değiştir
}

// WebP dönüştürme fonksiyonu
async function convertToWebP(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .webp({ 
        quality: 80, // Kalite (0-100)
        effort: 4    // Sıkıştırma seviyesi (0-6)
      })
      .toFile(outputPath);
    
    console.log(`✅ Resim WebP formatına dönüştürüldü: ${outputPath}`);
    return true;
  } catch (error) {
    console.error('❌ WebP dönüştürme hatası:', error);
    return false;
  }
}

// Grup ID'si oluşturma yardımcı fonksiyonu
function generateGroupId(groupName) {
  // Türkçe karakterleri değiştir
  const turkishChars = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U' };

  // Boşlukları kaldır, küçük harfe çevir ve Türkçe karakterleri değiştir
  let id = groupName.toLowerCase();

  // Türkçe karakterleri değiştir
  for (const [turkishChar, latinChar] of Object.entries(turkishChars)) {
    id = id.replace(new RegExp(turkishChar, 'g'), latinChar);
  }

  // Sadece alfanumerik karakterleri ve boşlukları tut
  id = id.replace(/[^a-z0-9\s]/g, '');

  // Boşlukları tire ile değiştir ve birden fazla tireyi tek tireye indir
  id = id.replace(/\s+/g, '-').replace(/-+/g, '-');

  // Başındaki ve sonundaki tireleri kaldır
  id = id.replace(/^-+|-+$/g, '');

  return id;
}

// Video API Konfigürasyon endpoint'i
app.get('/api/config', (req, res) => {
  res.json({
    youtubeApiKey: process.env.YOUTUBE_API_KEY || 'YOUR_DEFAULT_API_KEY'
  });
});

// Dropbox upload fonksiyonları
async function uploadToDropbox(fileBuffer, fileName, folder) {
  try {
    // Dosya adını normalize et
    const normalizedFileName = normalizeFileName(fileName);
    
    const dropboxPath = `/${folder}/${normalizedFileName}`;
    const response = await dbx.filesUpload({
      path: dropboxPath,
      contents: fileBuffer,
      mode: 'overwrite'
    });
    
    // Paylaşılabilir link oluştur
    const shareResponse = await dbx.sharingCreateSharedLinkWithSettings({
      path: dropboxPath,
      settings: {
        requested_visibility: 'public'
      }
    });
    
    // URL'yi parse et ve dl parametresini 1 yap
    const url = new URL(shareResponse.result.url);
    url.searchParams.set('dl', '1');
    return url.toString();
  } catch (error) {
    console.error('Dropbox upload hatası:', error);
    throw error;
  }
}

async function deleteFromDropbox(fileName, folder) {
  try {
    const dropboxPath = `/${folder}/${fileName}`;
    await dbx.filesDeleteV2({
      path: dropboxPath
    });
  } catch (error) {
    console.error('Dropbox delete hatası:', error);
    // Dosya bulunamadıysa hata verme
    if (error.status !== 409) {
      throw error;
    }
  }
}

// URL'den Dropbox dosyasını sil
async function deleteFromDropboxByUrl(fileUrl) {
  try {
    // URL'den dosya adını ayıkla
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1]; // Son parça dosya adı
    
    
    // userImages klasöründeki tüm dosyaları listele
    const listResponse = await dbx.filesListFolder({ path: '/userImages' });
    
    // Dosya adını Dropbox'taki gerçek adıyla eşleştir
    const exactFile = listResponse.result.entries.find(f => {
      // Önce tam eşleşme dene
      if (f.name === fileName) return true;
      
      // Timestamp kısmını karşılaştır (eski dosyalar için)
      const dbTimestamp = f.name.split('-')[0];
      const urlTimestamp = fileName.split('-')[0];
      return dbTimestamp === urlTimestamp;
    });
    
    if (!exactFile) {
      console.log(`❌ Dosya bulunamadı: ${fileName}`);
      return;
    }
    
    // Silinecek dosyanın yolu (Dropbox'taki gerçek adıyla)
    const filePath = `/userImages/${exactFile.name}`;

    // Dropbox'tan sil
    await dbx.filesDeleteV2({ path: filePath });
  } catch (error) {
      console.error('Hata detayı:', error.error);
  }
}

// URL'den grup resmini Dropbox'tan sil
async function deleteGroupImageFromDropboxByUrl(fileUrl) {
  try {
    // URL'den dosya adını ayıkla
    const parts = fileUrl.split('/');
    const lastPart = parts[parts.length - 1];
    const fileName = lastPart.split('?')[0];

    // Silinecek dosyanın yolu
    const filePath = `/groupImages/${fileName}`;

    // Dropbox'tan sil
    await dbx.filesDeleteV2({ path: filePath });
  } catch (error) {
    // 409 hatası "not_found" demek, dosya zaten silinmiş - bu normal
    if (error.status !== 409) {
      console.error('Dropbox grup resmi silme hatası:', error);
    }
  }
}

// Multer konfigürasyonları
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Grup resmi yükleme konfigürasyonu
const groupImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'public/groupImages';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Rastgele dosya adı oluştur
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'group-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadGroupImage = multer({ storage: groupImageStorage });

// Kullanıcı modeli
const User = mongoose.model('User', {
  name: String,
  profileImage: String
});

// Okuma durumu modeli
const ReadingStatus = mongoose.model('ReadingStatus', {
  userId: String,
  date: String,
  status: String
});

// Kullanıcı grupları modeli
const UserGroup = mongoose.model('UserGroup', {
  groupName: String,
  groupId: String,
  description: String,
  groupImage: { type: String, default: null },
  visibility: { type: String, default: 'public' },
  createdAt: { type: Date, default: Date.now }
});

// Davet modeli
const Invite = mongoose.model('Invite', {
  inviteTokenHash: String,
  userId: String,
  groupId: String,
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // 7 gün sonra
});

// Admin model kaldırıldı - artık users koleksiyonunda admin olarak saklanıyor

// MongoDB index'lerini oluşturma fonksiyonu
async function createIndexesForGroup(groupId) {
  try {
    const db = mongoose.connection.db;
    
    // Yeni grup için index'leri oluştur
    await db.collection(`readingstatuses_${groupId}`).createIndex({ userId: 1, date: 1 });
    await db.collection(`users_${groupId}`).createIndex({ name: 1 });
    await db.collection(`users_${groupId}`).createIndex({ username: 1 });
    
    console.log(`Yeni grup için index'ler oluşturuldu: ${groupId}`);
  } catch (error) {
    console.error(`Index oluşturma hatası (${groupId}):`, error);
  }
}

// Dropbox durumu endpoint'i
app.get('/api/dropbox-status', async (req, res) => {
  const tokenStatus = await checkDropboxToken();
  
  if (tokenStatus.valid) {
    res.json({ 
      status: 'connected', 
      message: 'Dropbox bağlantısı aktif',
      timestamp: Date.now() 
    });
  } else {
    let status = 'error';
    let message = 'Dropbox bağlantı hatası';
    
    if (tokenStatus.error === 'Token süresi dolmuş') {
      status = 'expired';
      message = 'Dropbox access token süresi dolmuş - .env dosyasında DROPBOX_ACCESS_TOKEN güncelleyin';
    } else if (tokenStatus.error === 'Yetki hatası') {
      status = 'forbidden';
      message = 'Dropbox yetki hatası - Token yetkilerini kontrol edin';
    } else {
      status = 'connection_error';
      message = 'Dropbox bağlantı hatası - İnternet bağlantısını kontrol edin';
    }
    
    res.json({ 
      status: status, 
      message: message,
      timestamp: Date.now() 
    });
  }
});

// 3. API ENDPOINT'LERİ
// ============================================================================

// 3.1. GRUP YÖNETİMİ
// ============================================================================

// Grup doğrulama endpoint'i
app.get('/api/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await UserGroup.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Grupları listeleme API'si
app.get('/api/groups', async (req, res) => {
  try {
    const { skip = 0, limit = 12, search = '' } = req.query;

    // Arama filtresi
    const searchFilter = search ? {
      $or: [
        { groupName: { $regex: search, $options: 'i' } },
        { groupId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Arama yapılıyorsa tüm grupları göster, yoksa sadece "public" olanları göster
    const visibilityFilter = search ? {} : { visibility: 'public' };

    // Tüm filtreleri birleştir
    const finalFilter = {
      ...searchFilter,
      ...visibilityFilter
    };

    // Grupları getir - rastgele sıralama için
    let groups;
    if (search) {
      // Arama yapılıyorsa normal sıralama
      groups = await UserGroup.find(finalFilter)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit));
    } else {
      // Arama yapılmıyorsa MongoDB'nin kendi rastgele sıralama özelliğini kullan
      // Bu daha performanslı ve gerçek rastgelelik sağlar
      groups = await UserGroup.aggregate([
        { $match: finalFilter },
        { $sample: { size: Number(limit) } }
      ]);
    }

    // Toplam grup sayısını al
    const total = await UserGroup.countDocuments(finalFilter);

    res.json({ groups, total });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Grup oluşturma endpoint'i
app.post('/api/groups', uploadGroupImage.single('groupImage'), async (req, res) => {
  try {
    const { groupName, description, adminName, adminPassword, visibility, selectedAvatarPath } = req.body;
    
    let groupImageUrl = null;
    
    // Hazır avatar seçildiyse onu kullan
    if (selectedAvatarPath) {
      groupImageUrl = selectedAvatarPath;
    }
    // Eğer resim dosyası varsa Dropbox'a yükle
    else if (req.file) {
      try {
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const fileBuffer = fs.readFileSync(req.file.path);
        groupImageUrl = await uploadToDropbox(fileBuffer, fileName, 'groupImages');
        
        // Yerel dosyayı sil
        fs.unlinkSync(req.file.path);
      } catch (error) {
        console.error('Dropbox grup resmi upload hatası:', error);
        // Hata durumunda grup resmi olmadan devam et
      }
    }

    if (!groupName) {
      return res.status(400).json({ error: 'Grup adı gereklidir' });
    }

    if (!adminName || !adminPassword) {
      return res.status(400).json({ error: 'Yönetici adı ve şifresi gereklidir' });
    }

    // Benzersiz bir grup ID'si oluştur
    const groupId = generateGroupId(groupName);

    // Grup ID'si zaten var mı kontrol et
    let finalGroupId = groupId;
    let counter = 1;
    let existingGroup = await UserGroup.findOne({ groupId: finalGroupId });

    // Eğer ID zaten varsa, benzersiz bir ID oluşturana kadar sayı ekle
    while (existingGroup) {
      finalGroupId = `${groupId}${counter}`;
      existingGroup = await UserGroup.findOne({ groupId: finalGroupId });
      counter++;
    }

    // Yeni grup oluştur
    const newGroup = new UserGroup({
      groupName,
      groupId: finalGroupId,
      description: description || '',
      groupImage: groupImageUrl, // null veya Dropbox URL'i
      visibility: visibility || 'public',
      createdAt: new Date()
    });

    await newGroup.save();

    // Varsayılan kullanıcı ekle (admin olarak)
    const { users, readingStatuses } = getGroupCollections(finalGroupId);
    
    // Admin şifresini hash'le
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    
    const defaultUser = new users({
      name: adminName,
      profileImage: "/images/default.png",
      username: adminName,
      userpassword: hashedAdminPassword,
      authority: "admin"
    });
    await defaultUser.save();

    // Varsayılan kullanıcının bugünkü okuma durumunu "okudum" olarak kaydet
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const defaultReadingStatus = new readingStatuses({
      userId: defaultUser._id.toString(),
      date: todayStr,
      status: "okudum"
    });
    await defaultReadingStatus.save();

    // Yeni grup için index'leri oluştur
    await createIndexesForGroup(finalGroupId);

    res.status(201).json({ success: true, group: newGroup, userId: defaultUser._id });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Grup oluşturulurken bir hata oluştu' });
  }
});

// Grup üye sayısını getirme endpoint'i
app.get('/api/groups/:groupId/member-count', async (req, res) => {
  try {
    const { groupId } = req.params;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Dinamik koleksiyonu al
    const { users } = getGroupCollections(groupId);

    // Kullanıcı sayısını al
    const count = await users.countDocuments();

    res.json({ count });
  } catch (error) {
    console.error('Error fetching member count:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Grup ayarlarını güncelleme endpoint'i
app.post('/api/update-group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { groupName, description, visibility } = req.body;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Grup bilgilerini güncelle
    const updatedGroup = await UserGroup.findOneAndUpdate(
      { groupId },
      { 
        groupName: groupName || group.groupName,
        description: description || group.description,
        visibility: visibility || group.visibility
      },
      { new: true }
    );

    res.json({ success: true, group: updatedGroup });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Grup resmini güncelleme endpoint'i
app.post('/api/update-group-image/:groupId', uploadGroupImage.single('groupImage'), async (req, res) => {
  try {
    const { groupId } = req.params;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Eski grup resmini Dropbox'tan sil
    if (group.groupImage && group.groupImage.includes('dropbox.com')) {
      deleteGroupImageFromDropboxByUrl(group.groupImage).catch(err => 
        console.error('Eski grup resmi silme hatası:', err)
      );
    }

    let newImageUrl = null;

    // Yeni resmi işle: Geçici klasöre kaydet -> WebP'ye dönüştür -> Dropbox'a gönder
    try {
      const originalFileName = req.file.originalname;
      const baseFileName = path.parse(originalFileName).name;
      
      // 1. Adım: Geçici klasöre kaydet (orijinal format)
      const tempFileName = `${Date.now()}-${originalFileName}`;
      const tempPath = path.join(__dirname, 'uploads', tempFileName);
      fs.copyFileSync(req.file.path, tempPath);
      
      // 2. Adım: WebP formatına dönüştür
      const webpFileName = `${Date.now()}-${baseFileName}.webp`;
      const webpPath = path.join(__dirname, 'uploads', webpFileName);
      const conversionSuccess = await convertToWebP(tempPath, webpPath);
      
      if (conversionSuccess) {
        // 3. Adım: WebP dosyasını Dropbox'a yükle
        const fileBuffer = fs.readFileSync(webpPath);
        newImageUrl = await uploadToDropbox(fileBuffer, webpFileName, 'groupImages');
        
        // 4. Adım: Yerel dosyaları temizle (gecikmeli)
        setTimeout(() => {
          try {
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath); // Geçici orijinal dosya
            }
          } catch (unlinkError) {
            console.log('⚠️ Geçici dosya silinemedi:', tempPath);
          }
        }, 1000); // 1 saniye bekle
        
        try {
          if (fs.existsSync(webpPath)) {
            fs.unlinkSync(webpPath); // WebP dosya
          }
        } catch (unlinkError) {
          console.log('⚠️ WebP dosya silinemedi:', webpPath);
        }
      } else {
        // Dönüştürme başarısızsa orijinal dosyayı kullan
        const fileBuffer = fs.readFileSync(tempPath);
        newImageUrl = await uploadToDropbox(fileBuffer, tempFileName, 'groupImages');
        
        // Geçici dosyayı temizle
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        } catch (unlinkError) {
          console.log('⚠️ Geçici dosya silinemedi:', tempPath);
        }
      }
      
      // Geçici multer dosyasını temizle
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (unlinkError) {
        console.log('⚠️ Multer geçici dosya silinemedi:', req.file.path);
      }
      
    } catch (error) {
      console.error('Dropbox grup resmi upload hatası:', error);
      return res.status(500).json({ error: 'Image upload failed' });
    }

    // Grup resmini güncelle
    const updatedGroup = await UserGroup.findOneAndUpdate(
      { groupId },
      { groupImage: newImageUrl },
      { new: true }
    );

    res.json({ success: true, imageUrl: newImageUrl, group: updatedGroup });
  } catch (error) {
    console.error('Error updating group image:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Grup resmini kaldırma endpoint'i
app.post('/api/remove-group-image/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Eski grup resmini Dropbox'tan sil
    if (group.groupImage && group.groupImage.includes('dropbox.com')) {
      deleteGroupImageFromDropboxByUrl(group.groupImage).catch(err => 
        console.error('Grup resmi silme hatası:', err)
      );
    }

    // Grup resmini null yap
    const updatedGroup = await UserGroup.findOneAndUpdate(
      { groupId },
      { groupImage: null },
      { new: true }
    );

    res.json({ success: true, group: updatedGroup });
  } catch (error) {
    console.error('Error removing group image:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Hazır avatar listesi endpoint'i
app.get('/api/group-avatars', (req, res) => {
  try {
    const avatarDir = path.join(__dirname, 'groupAvatars');
    
    if (!fs.existsSync(avatarDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(avatarDir);
    const avatars = files
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map(file => ({
        name: file,
        path: `/groupAvatars/${file}`
      }));
    
    res.json(avatars);
  } catch (error) {
    console.error('Avatar listesi yükleme hatası:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Hazır avatar ile grup resmini güncelleme endpoint'i
app.post('/api/update-group-image-from-avatar/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { avatarPath } = req.body;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Eski grup resmini Dropbox'tan sil
    if (group.groupImage && group.groupImage.includes('dropbox.com')) {
      deleteGroupImageFromDropboxByUrl(group.groupImage).catch(err => 
        console.error('Eski grup resmi silme hatası:', err)
      );
    }

    // Avatar dosyasının varlığını kontrol et
    const avatarFilePath = path.join(__dirname, avatarPath);
    if (!fs.existsSync(avatarFilePath)) {
      return res.status(404).json({ error: 'Avatar dosyası bulunamadı' });
    }

    // Hazır avatar için yerel path'i kullan (Dropbox'a yükleme yok)
    const newImageUrl = avatarPath;

    // Grup resmini güncelle
    const updatedGroup = await UserGroup.findOneAndUpdate(
      { groupId },
      { groupImage: newImageUrl },
      { new: true }
    );

    res.json({ success: true, imageUrl: newImageUrl, group: updatedGroup });
  } catch (error) {
    console.error('Error updating group image from avatar:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Grup silme endpoint'i
app.delete('/api/delete-group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Grup resmini Dropbox'tan sil
    if (group.groupImage && group.groupImage.includes('dropbox.com')) {
      deleteGroupImageFromDropboxByUrl(group.groupImage).catch(err => 
        console.error('Grup resmi silme hatası:', err)
      );
    }

    // Dinamik koleksiyonları al
    const { users, readingStatuses } = getGroupCollections(groupId);

    // Tüm kullanıcıların profil resimlerini Dropbox'tan sil
    const allUsers = await users.find();
    for (const user of allUsers) {
      if (user.profileImage && user.profileImage.includes('dropbox.com')) {
        deleteFromDropboxByUrl(user.profileImage).catch(err => 
          console.error('Kullanıcı resmi silme hatası:', err)
        );
      }
    }

    // Grup koleksiyonlarını sil
    await users.deleteMany({});
    await readingStatuses.deleteMany({});
    
    // Koleksiyonları tamamen sil - MongoDB native yöntemle
    try {
      // Doğrudan database bağlantısı ile koleksiyonları sil
      const db = mongoose.connection.db;
      
      // Users koleksiyonunu sil
      try {
        await db.collection(`users_${groupId}`).drop();
        console.log(`✅ Users koleksiyonu silindi: users_${groupId}`);
      } catch (dropErr) {
        if (dropErr.code === 26) {
          console.log(`ℹ️ Users koleksiyonu zaten yok: users_${groupId}`);
        } else {
          console.error('❌ Users koleksiyonu silme hatası:', dropErr);
        }
      }
      
      // ReadingStatuses koleksiyonunu sil
      try {
        await db.collection(`readingstatuses_${groupId}`).drop();
        console.log(`✅ ReadingStatuses koleksiyonu silindi: readingstatuses_${groupId}`);
      } catch (dropErr) {
        if (dropErr.code === 26) {
          console.log(`ℹ️ ReadingStatuses koleksiyonu zaten yok: readingstatuses_${groupId}`);
        } else {
          console.error('❌ ReadingStatuses koleksiyonu silme hatası:', dropErr);
        }
      }
      
    } catch (error) {
      console.error('❌ Koleksiyon silme genel hatası:', error);
    }

    // Admin kaydı artık users koleksiyonunda, ayrı silmeye gerek yok

    // Grubu sil
    await UserGroup.findOneAndDelete({ groupId });

    res.json({ success: true, message: 'Grup başarıyla silindi' });
  } catch (error) {
    console.error('Grup silme hatası:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

function getGroupCollections(groupId) {
  const userModelName = `users_${groupId}`;
  const readingStatusModelName = `readingstatuses_${groupId}`;

  // Eğer model zaten Mongoose'da varsa, onu kullan
  try {
    const existingUserModel = mongoose.model(userModelName);
    const existingReadingStatusModel = mongoose.model(readingStatusModelName);

    return {
      users: existingUserModel,
      readingStatuses: existingReadingStatusModel
    };
  } catch (error) {
    // Model yoksa oluştur
  }

  // Model'leri oluştur ve index'leri ayarla
  const userSchema = new mongoose.Schema({
    name: String,
    profileImage: String,
    username: String,
    userpassword: String,
    authority: String
  }, { collection: userModelName }); // Koleksiyon ismini açıkça belirt

  const readingStatusSchema = new mongoose.Schema({
    userId: String,
    date: String,
    status: String
  }, { collection: readingStatusModelName }); // Koleksiyon ismini açıkça belirt

  // Model'i oluştur
  const userModel = mongoose.model(userModelName, userSchema);
  const readingStatusModel = mongoose.model(readingStatusModelName, readingStatusSchema);

  return {
    users: userModel,
    readingStatuses: readingStatusModel
  };
}


// 3.2. KULLANICI YÖNETİMİ
// ============================================================================

// Kullanıcı listesi endpoint'i
app.get('/api/users/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Dinamik koleksiyonu al
    const { users } = getGroupCollections(groupId);

    // Sadece kullanıcıları getir
    const usersData = await users.find().sort({ name: 1 });

    res.json({ users: usersData });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Kullanıcı ekleme endpoint'i
app.post('/api/add-user/:groupId', upload.single('profileImage'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Dinamik koleksiyonu al
    const { users } = getGroupCollections(groupId);

    let profileImageUrl = '/images/default.png'; // Varsayılan resim URL'i
    let fileName = null;
    
    // Resim varsa önce yerel olarak kaydet
    if (req.file) {
      try {
        // 1. Adım: Geçici klasöre kaydet (orijinal format)
        const originalFileName = req.file.originalname;
        const normalizedFileName = normalizeFileName(originalFileName);
        const baseFileName = path.parse(normalizedFileName).name;
        
        const tempFileName = `${Date.now()}-${normalizedFileName}`;
        const tempPath = path.join(__dirname, 'uploads', tempFileName);
        fs.copyFileSync(req.file.path, tempPath);
        
        // 2. Adım: WebP formatına dönüştür
        const webpFileName = `${Date.now()}-${baseFileName}.webp`;
        const webpPath = path.join(__dirname, 'uploads', webpFileName);
        const conversionSuccess = await convertToWebP(tempPath, webpPath);
        
        if (conversionSuccess) {
          fileName = webpFileName;
          profileImageUrl = `/images/${fileName}`;
          // WebP başarılıysa orijinal dosyayı sil (gecikmeli)
          setTimeout(() => {
            try {
              if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
                console.log('✅ Orijinal dosya silindi (WebP dönüştürme başarılı)');
              }
            } catch (unlinkError) {
              console.log('⚠️ Orijinal dosya silinemedi:', tempPath);
            }
          }, 1000); // 1 saniye bekle
        } else {
          // Dönüştürme başarısızsa orijinal dosyayı kullan
          fileName = tempFileName;
          profileImageUrl = `/images/${fileName}`;
        }
        
        // Geçici multer dosyasını temizle
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (unlinkError) {
          console.log('⚠️ Multer geçici dosya silinemedi:', req.file.path);
        }
      } catch (error) {
        console.error('Yerel kaydetme hatası:', error);
        // Hata durumunda varsayılan resmi kullan
        profileImageUrl = '/images/default.png';
      }
    }

    // 2. Adım: Username ve password oluştur (çakışma kontrolü ile)
    let username = name;
    let randomNumber = Math.floor(Math.random() * 900) + 100; // 100-999 arası rastgele sayı
    
    // Username çakışması kontrolü
    let usernameExists = await users.findOne({ username });
    let attemptCount = 0;
    
    // Önce orijinal ismi dene
    if (usernameExists) {
      // Çakışma varsa sayı ekle
      while (usernameExists && attemptCount < 100) {
        attemptCount++;
        randomNumber = Math.floor(Math.random() * 900) + 100;
        username = name + randomNumber;
        usernameExists = await users.findOne({ username });
      }
    }
    
    if (usernameExists) {
      return res.status(400).json({ error: 'Bu isimde çok fazla kullanıcı var. Lütfen farklı bir isim deneyin.' });
    }
    
    const plainPassword = name + randomNumber;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    console.log(`Yeni kullanıcı ekleniyor: ${name}, username: ${username}, plainPassword: ${plainPassword}${attemptCount > 0 ? ` (${attemptCount} deneme sonrası)` : ''}`);
    
    // 3. Adım: Kullanıcıyı kaydet (yerel resim URL'i ile birlikte)
    const user = new users({ 
      name, 
      profileImage: profileImageUrl,
      username: username,
      userpassword: hashedPassword,
      authority: "member"
    });
    await user.save();
    
    // 4. Adım: Kullanıcıya hemen yanıt ver
    res.json({ success: true, user: user, fileName: fileName });

    // 5. Adım: Dropbox'a yükle (arka planda)
    if (fileName && user) {
      try {
        const localPath = path.join(__dirname, 'uploads', fileName);
        const fileBuffer = fs.readFileSync(localPath);
        const dropboxFileName = fileName; // Zaten WebP formatında
        const newImageUrl = await uploadToDropbox(fileBuffer, dropboxFileName, 'userImages');

        // 5. Adım: Veritabanını Dropbox URL'i ile güncelle
        await users.findByIdAndUpdate(
          user._id,
          { profileImage: newImageUrl }
        );

        // 6. Adım: Yerel dosyaları temizle (sadece Dropbox başarılıysa)
        try {
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
            console.log('✅ Yerel dosya silindi (Dropbox yüklemesi başarılı)');
          }
        } catch (unlinkError) {
          console.log('⚠️ Yerel dosya silinemedi:', localPath);
        }
      } catch (dropboxError) {
        console.error('Dropbox yükleme hatası:', dropboxError);
        
        // Dropbox hatası türüne göre log mesajı
        if (dropboxError.status === 401) {
          console.error('❌ Dropbox access token süresi dolmuş! Yerel resim kullanılıyor.');
        } else if (dropboxError.status === 403) {
          console.error('❌ Dropbox yetki hatası! Yerel resim kullanılıyor.');
        } else {
          console.error('❌ Dropbox bağlantı hatası! Yerel resim kullanılıyor.');
        }
        
        // Dropbox hatası kullanıcıyı etkilemez, yerel resim zaten çalışıyor
        // Yerel dosyayı silme - çünkü Dropbox'a yüklenemedi
        try {
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
            console.log('✅ Yerel dosya temizlendi (Dropbox hatası nedeniyle)');
          }
        } catch (cleanupError) {
          console.error('Yerel dosya temizleme hatası:', cleanupError);
        }
        
        // Orijinal temp dosyasını da temizle (Dropbox hatası durumunda)
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
            console.log('✅ Orijinal temp dosya temizlendi (Dropbox hatası nedeniyle)');
          }
        } catch (tempCleanupError) {
          console.log('⚠️ Orijinal temp dosya silinemedi:', tempPath);
        }
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Kullanıcı silme endpoint'i
app.post('/api/delete-user/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { id } = req.body;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Dinamik koleksiyonları al
    const { users, readingStatuses } = getGroupCollections(groupId);

    // Kullanıcıyı bul ve yetkisini kontrol et
    const user = await users.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Admin sayısını kontrol et
    const adminCount = await users.countDocuments({ authority: 'admin' });
    
    // Eğer son admin'i silmeye çalışıyorsa engelle
    if (user.authority === 'admin' && adminCount <= 1) {
      return res.status(400).json({ error: 'En az bir yönetici hesabı bulunmalıdır!' });
    }

    // Kullanıcıyı sil
    await users.findByIdAndDelete(id);

    // Kullanıcıya hemen yanıt ver
    res.json({ success: true });

    // Arka planda temizlik işlemleri
    if (user) {
      // Kullanıcının okuma durumlarını sil
      await readingStatuses.deleteMany({ userId: id });
      
      // Kullanıcının profil resmini Dropbox'tan sil (arka planda)
      if (user.profileImage && user.profileImage.includes('dropbox.com')) {
        deleteFromDropboxByUrl(user.profileImage).catch(err => 
          console.error('Dropbox silme hatası:', err)
        );
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Kullanıcı ismi güncelleme endpoint'i
app.post('/api/update-user/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const { userId, name } = req.body;

  try {
    // Parametreleri kontrol et
    if (!userId || !name) {
      return res.status(400).json({ error: 'userId ve name parametreleri gerekli' });
    }

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Dinamik koleksiyonu al
    const { users } = getGroupCollections(groupId);

    // Kullanıcıyı güncelle
    const updatedUser = await users.findByIdAndUpdate(
      userId,
      { name: name.trim() },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Kullanıcı güncellenirken hata oluştu' });
  }
});

// Kullanıcı yetkisi güncelleme endpoint'i
app.post('/api/update-user-authority/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const { userId, authority } = req.body;

  try {
    // Parametreleri kontrol et
    if (!userId || !authority) {
      return res.status(400).json({ error: 'userId ve authority parametreleri gerekli' });
    }

    // Yetki değerini kontrol et
    if (!['admin', 'member'].includes(authority)) {
      return res.status(400).json({ error: 'Geçersiz yetki değeri. Sadece admin veya member olabilir' });
    }

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Dinamik koleksiyonu al
    const { users } = getGroupCollections(groupId);

    // Kullanıcıyı bul
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Admin sayısını kontrol et
    const adminCount = await users.countDocuments({ authority: 'admin' });
    
    // Eğer son admin'i üye yapmaya çalışıyorsa engelle
    if (user.authority === 'admin' && authority === 'member' && adminCount <= 1) {
      return res.status(400).json({ error: 'En az bir yönetici hesabı bulunmalıdır!' });
    }

    // Kullanıcıyı güncelle
    const updatedUser = await users.findByIdAndUpdate(
      userId,
      { authority: authority },
      { new: true }
    );

    res.json({ 
      success: true, 
      user: updatedUser,
      message: `Kullanıcı yetkisi ${authority === 'admin' ? 'Yönetici' : 'Üye'} olarak güncellendi`
    });
  } catch (error) {
    console.error('Error updating user authority:', error);
    res.status(500).json({ error: 'Kullanıcı yetkisi güncellenirken hata oluştu' });
  }
});

// Kullanıcı resmi güncelleme endpoint'i
app.post('/api/update-user-image/:groupId', upload.single('profileImage'), async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;

  try {
    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Dinamik koleksiyonu al
    const { users } = getGroupCollections(groupId);

    // If a file was uploaded
    if (req.file) {
      // Find the user to get their old profile image
      const user = await users.findById(userId);
      const oldImageUrl = user ? user.profileImage : null;

      // 1. Adım: Geçici klasöre kaydet (orijinal format)
      const originalFileName = req.file.originalname;
      const normalizedFileName = normalizeFileName(originalFileName);
      const baseFileName = path.parse(normalizedFileName).name;
      
      const tempFileName = `${Date.now()}-${normalizedFileName}`;
      const tempPath = path.join(__dirname, 'uploads', tempFileName);
      fs.copyFileSync(req.file.path, tempPath);
      
      // 2. Adım: WebP formatına dönüştür
      const webpFileName = `${Date.now()}-${baseFileName}.webp`;
      const webpPath = path.join(__dirname, 'uploads', webpFileName);
      const conversionSuccess = await convertToWebP(tempPath, webpPath);
      
      let fileName;
      if (conversionSuccess) {
        fileName = webpFileName;
        // WebP başarılıysa orijinal dosyayı sil (gecikmeli)
        setTimeout(() => {
          try {
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath);
              console.log('✅ Orijinal dosya silindi (WebP dönüştürme başarılı)');
            }
          } catch (unlinkError) {
            console.log('⚠️ Orijinal dosya silinemedi:', tempPath);
          }
        }, 1000); // 1 saniye bekle
      } else {
        // Dönüştürme başarısızsa orijinal dosyayı kullan
        fileName = tempFileName;
      }
      
      // Geçici multer dosyasını temizle
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (unlinkError) {
        console.log('⚠️ Multer geçici dosya silinemedi:', req.file.path);
      }

      // 2. Adım: Veritabanını yerel yol ile güncelle
      const localImageUrl = `/images/${fileName}`;
      await users.findByIdAndUpdate(
        userId,
        { profileImage: localImageUrl }
      );

      // 3. Adım: Kullanıcıya hemen yanıt ver (yerel resim ile)
      res.json({ success: true, imageUrl: localImageUrl, fileName: fileName });

      // 4. Adım: Dropbox'a yükle (arka planda)
      try {
        const localPath = path.join(__dirname, 'uploads', fileName);
        const fileBuffer = fs.readFileSync(localPath);
        const dropboxFileName = fileName; // Zaten WebP formatında
        const newImageUrl = await uploadToDropbox(fileBuffer, dropboxFileName, 'userImages');

        // 5. Adım: Veritabanını Dropbox URL'i ile güncelle
        await users.findByIdAndUpdate(
          userId,
          { profileImage: newImageUrl }
        );

        // 6. Adım: Yerel dosyaları temizle (sadece Dropbox başarılıysa)
        try {
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
            console.log('✅ Yerel dosya silindi (Dropbox yüklemesi başarılı)');
          }
        } catch (unlinkError) {
          console.log('⚠️ Yerel dosya silinemedi:', localPath);
        }

        // 7. Adım: Eski resmi arka planda sil (Dropbox'tan)
        if (oldImageUrl && oldImageUrl.includes('dropbox.com')) {
          deleteFromDropboxByUrl(oldImageUrl).catch(err => 
            console.error('Eski resim silme hatası:', err)
          );
        }
      } catch (dropboxError) {
        console.error('Dropbox yükleme hatası:', dropboxError);
        
        // Dropbox hatası türüne göre log mesajı
        if (dropboxError.status === 401) {
          console.error('❌ Dropbox access token süresi dolmuş! Yerel resim kullanılıyor.');
        } else if (dropboxError.status === 403) {
          console.error('❌ Dropbox yetki hatası! Yerel resim kullanılıyor.');
        } else {
          console.error('❌ Dropbox bağlantı hatası! Yerel resim kullanılıyor.');
        }
        
        // Dropbox hatası kullanıcıyı etkilemez, yerel resim zaten çalışıyor
        // Yerel dosyayı silme - çünkü Dropbox'a yüklenemedi
        try {
          const localPath = path.join(__dirname, 'uploads', fileName);
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
            console.log('✅ Yerel dosya temizlendi (Dropbox hatası nedeniyle)');
          }
        } catch (cleanupError) {
          console.log('⚠️ Yerel dosya temizleme hatası:', cleanupError);
        }
        
        // Orijinal temp dosyasını da temizle (Dropbox hatası durumunda)
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
            console.log('✅ Orijinal temp dosya temizlendi (Dropbox hatası nedeniyle)');
          }
        } catch (tempCleanupError) {
          console.log('⚠️ Orijinal temp dosya silinemedi:', tempPath);
        }
      }
    } else {
      res.status(400).json({ error: 'No image file provided' });
    }
  } catch (error) {
    console.error('Error updating user image:', error);
    res.status(500).json({ error: 'Failed to update user image' });
  }
});


// 3.3. OKUMA İSTATİSTİKLERİ
// ============================================================================

// Tüm verileri çekme endpoint'i
app.get('/api/all-data/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Dinamik koleksiyonları al
    const { users, readingStatuses } = getGroupCollections(groupId);

    const usersData = await users.find().sort({ name: 1 });
    const statsData = await readingStatuses.find();

    res.json({ users: usersData, stats: statsData, group });
  } catch (error) {
    console.error('Error fetching all data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Kullanıcı istatistikleri endpoint'i
app.get('/api/user-stats/:groupId/:userId', async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Dinamik koleksiyonu al
    const { readingStatuses } = getGroupCollections(groupId);

    // Sadece belirli kullanıcının istatistiklerini getir
    const userStats = await readingStatuses.find({ userId }).sort({ date: 1 });

    res.json({ stats: userStats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Okuma istatistikleri endpoint'i
app.get('/api/reading-stats/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Dinamik koleksiyonları al
    const { users, readingStatuses } = getGroupCollections(groupId);

    const usersData = await users.find().sort({ name: 1 });
    const statsData = await readingStatuses.find();

    const userStats = usersData.map(user => {
      const userReadings = statsData.filter(stat =>
        stat.userId === user._id.toString() && stat.status === 'okudum'
      );

      return {
        userId: user._id,
        name: user.name,
        profileImage: user.profileImage,
        okudum: userReadings.length
      };
    });

    res.json(userStats);
  } catch (error) {
    console.error('Error fetching reading stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// En uzun seriler endpoint'i
app.get('/api/longest-streaks/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Dinamik koleksiyonları al
    const { users, readingStatuses } = getGroupCollections(groupId);

    const usersData = await users.find();
    const statsData = await readingStatuses.find();

    const results = usersData.map(user => {
      // Kullanıcının okuma kayıtlarını tarihe göre sırala
      const userStats = statsData
        .filter(s => s.userId === user._id.toString() && s.status === 'okudum')
        .map(s => s.date)
        .sort();

      let maxStreak = 0, currentStreak = 0;
      let streakStart = null, streakEnd = null;
      let maxStart = null, maxEnd = null;

      for (let i = 0; i < userStats.length; i++) {
        if (i === 0 || (new Date(userStats[i]) - new Date(userStats[i - 1]) === 86400000)) {
          currentStreak++;
          if (currentStreak === 1) streakStart = userStats[i];
          streakEnd = userStats[i];
        } else {
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
            maxStart = streakStart;
            maxEnd = streakEnd;
          }
          currentStreak = 1;
          streakStart = userStats[i];
          streakEnd = userStats[i];
        }
      }

      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxStart = streakStart;
        maxEnd = streakEnd;
      }

      return {
        userId: user._id,
        name: user.name,
        profileImage: user.profileImage,
        streak: maxStreak,
        startDate: maxStart,
        endDate: maxEnd
      };
    });

    results.sort((a, b) => b.streak - a.streak);

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Okuma durumu güncelleme endpoint'i
app.post('/api/update-status/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, date, status, requestingUserId, requestingUserAuthority } = req.body;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Yetki kontrolü
    if (!requestingUserId || !requestingUserAuthority) {
      return res.status(401).json({ error: 'Kullanıcı bilgileri eksik' });
    }

    // Member kullanıcıları sadece kendi verilerini güncelleyebilir
    if (requestingUserAuthority === 'member' && requestingUserId !== userId) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    // Admin kullanıcıları tüm verileri güncelleyebilir
    if (requestingUserAuthority !== 'admin' && requestingUserAuthority !== 'member') {
      return res.status(403).json({ error: 'Geçersiz kullanıcı yetkisi' });
    }

    // Dinamik koleksiyonu al
    const { readingStatuses } = getGroupCollections(groupId);

    if (status) {
      await readingStatuses.findOneAndUpdate(
        { userId, date },
        { userId, date, status },
        { upsert: true }
      );
    } else {
      await readingStatuses.findOneAndDelete({ userId, date });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});


// 3.4. DAVET SİSTEMİ
// ============================================================================

// Davet oluşturma endpoint'i
app.post('/api/create-invite/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Kullanıcı var mı kontrol et
    const { users } = getGroupCollections(groupId);
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Rastgele token oluştur (16 byte = 32 karakter hex)
    const crypto = require('crypto');
    const inviteToken = crypto.randomBytes(16).toString('hex');
    const inviteTokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');

    // Kullanıcının bu gruptaki kullanılmamış tüm davetlerini sil
    await Invite.deleteMany({ 
      userId, 
      groupId, 
      used: false 
    });

    // Yeni davet oluştur
    const invite = new Invite({
      inviteTokenHash,
      userId,
      groupId,
      used: false
    });

    await invite.save();

    res.json({ 
      success: true, 
      inviteToken,
      groupName: group.groupName,
      groupId: group.groupId
    });
  } catch (error) {
    console.error('Davet oluşturma hatası:', error);
    res.status(500).json({ error: 'Davet oluşturulurken hata oluştu' });
  }
});

// Davet doğrulama endpoint'i
app.get('/api/verify-invite/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { invite } = req.query;

    if (!invite) {
      return res.status(400).json({ error: 'Davet token\'ı gerekli' });
    }

    // Token'ı hash'le
    const crypto = require('crypto');
    const inviteTokenHash = crypto.createHash('sha256').update(invite).digest('hex');

    // Davet kaydını bul
    const inviteRecord = await Invite.findOne({
      inviteTokenHash,
      groupId,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!inviteRecord) {
      return res.status(404).json({ error: 'Geçersiz veya süresi dolmuş davet' });
    }

    // Grup bilgilerini al
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    res.json({ 
      success: true, 
      groupName: group.groupName,
      groupId: group.groupId,
      inviteId: inviteRecord._id
    });
  } catch (error) {
    console.error('Davet doğrulama hatası:', error);
    res.status(500).json({ error: 'Davet doğrulanırken hata oluştu' });
  }
});

// 3.5. ADMIN VE GÜVENLİK
// ============================================================================

// Admin girişi endpoint'i
app.post('/api/admin-login', async (req, res) => {
  try {
    const { username, password, groupId } = req.body;

    // Users koleksiyonundan kullanıcıyı bul (admin veya member)
    const { users } = getGroupCollections(groupId);
    const user = await users.findOne({ username });

    if (user) {
      // Şifre kontrolü
      const isPasswordValid = await bcrypt.compare(password, user.userpassword);
      
      if (isPasswordValid) {
        // Grup bilgisini al
        const group = await UserGroup.findOne({ groupId });
        if (!group) {
          return res.json({ success: false, error: 'Grup bulunamadı' });
        }
        res.json({
          success: true,
          groupName: group.groupName,
          groupId: group.groupId,
          userId: user._id, // Kullanıcı ID'sini de döndür
          authority: user.authority, // Kullanıcının yetkisini de döndür
          userName: user.username // Kullanıcının kullanıcı adını de döndür
        });
      } else {
        res.json({ success: false });
      }
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Admin doğrulama endpoint'i
app.post('/api/verify-admin', async (req, res) => {
  try {
    const { username, groupId } = req.body;

    // Users koleksiyonundan admin kullanıcısını bul
    const { users } = getGroupCollections(groupId);
    const admin = await users.findOne({ username, authority: 'admin' });

    res.json({ valid: !!admin });
  } catch (error) {
    console.error('Error verifying admin:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add an initial admin if none exists (you can remove this after first run)
const AccessLog = mongoose.model('AccessLog', {
  action: String,
  timestamp: Date,
  deviceInfo: Object,
  ipAddress: String,
  groupId: String
});

// Yetkisiz erişim logu endpoint'i
app.post('/api/log-unauthorized', async (req, res) => {
  try {
    const { action, deviceInfo, userName, groupId } = req.body;

    // Get client IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Create a new log entry
    const log = new AccessLog({
      action,
      timestamp: new Date(),
      deviceInfo,
      ipAddress: userName || ipAddress, // userName varsa onu kullan, yoksa IP
      groupId: groupId || 'catikati23'
    });

    await log.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging unauthorized access:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Erişim logları endpoint'i
app.get('/api/access-logs', async (req, res) => {
  try {
    const { groupId } = req.query;
    let query = {};
    
    // If groupId is provided, filter by groupId
    if (groupId) {
      query.groupId = groupId;
    }
    
    const logs = await AccessLog.find(query).sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login logs endpoint
app.get('/api/login-logs', async (req, res) => {
  try {
    const { groupId } = req.query;
    let query = {};
    
    // If groupId is provided, filter by groupId
    if (groupId) {
      query.groupId = groupId;
    }
    
    const logs = await LoginLog.find(query).sort({ date: -1 });

    // Format the dates before sending to client
    const formattedLogs = logs.map(log => {
      const date = new Date(log.date);
      const day = date.getDate();
      const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      // Create a formatted date string
      const formattedDate = `${day} ${month} ${year} ${hours}:${minutes}`;

      // Return the log with both raw date (for sorting) and formatted date
      return {
        ...log._doc,
        date: log.date,
        formattedDate: formattedDate
      };
    });

    res.json(formattedLogs);
  } catch (error) {
    console.error('Error fetching login logs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const requestIp = require('request-ip');

const loginLogSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  ipAddress: String,
  deviceInfo: Object,
  groupId: String
});

const LoginLog = mongoose.model('LoginLog', loginLogSchema);

// Ziyaret logu endpoint'i
app.post('/api/log-visit', async (req, res) => {
  try {
    const { deviceInfo, groupId, userName } = req.body;

    // Get client IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const log = new LoginLog({
      deviceInfo,
      ipAddress: userName || ipAddress,
      groupId: groupId || 'catikati23'
    });

    await log.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging visit:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});



// E. İÇERİK
// ============================================================================

// Günün sözü modeli
const Sentence = mongoose.model('Sentence', {
  sentence: String
});

// Rastgele ayet modeli
const ayetSchema = new mongoose.Schema({
  sentence: String
});

const Ayet = mongoose.model('Ayet', ayetSchema, 'ayetler');

// Hadis modeli
const hadisSchema = new mongoose.Schema({
  sentence: String
});

const Hadis = mongoose.model('Hadis', hadisSchema, 'hadisler');

// Dua modeli
const duaSchema = new mongoose.Schema({
  sentence: String
});

const Dua = mongoose.model('Dua', duaSchema, 'dualar');


// Söz resimleri endpoint'i
app.get('/api/quote-images', (req, res) => {
  const quotesDir = path.join(__dirname, 'public', 'quotes');
  fs.readdir(quotesDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to list images' });
    }
    // Filter for image files only (jpg, png, jpeg, gif, webp)
    const imageFiles = files.filter(file =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );
    res.json({ images: imageFiles });
  });
});

// Rastgele söz endpoint'i
app.get('/api/random-quote', async (req, res) => {
  try {
    // Count total documents in the sentences collection
    const count = await Sentence.countDocuments();

    // If there are no sentences, return a default message
    if (count === 0) {
      return res.json({ sentence: "İlmin tâlibi (talebesi), Rahman'ın tâlibidir. İlmin talipçisi, İslâm'ın rüknüdür. Onun ser-ü mükâfatı, Peygamberlerle beraber verilir. (Hadis-i Şerif)" });
    }

    // Generate a random index
    const random = Math.floor(Math.random() * count);

    // Skip to the random document and get it
    const randomSentence = await Sentence.findOne().skip(random);

    res.json({ sentence: randomSentence.sentence });
  } catch (error) {
    console.error('Error fetching random quote:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Rastgele ayet endpoint'i
app.get('/api/random-ayet', async (req, res) => {
  try {
    // Ayetler koleksiyonundaki toplam belge sayısını say
    const count = await Ayet.countDocuments();

    // Eğer hiç ayet yoksa, varsayılan bir mesaj döndür
    if (count === 0) {
      return res.json({ sentence: "Andolsun ki, Resûlullah, sizin için, Allah'a ve Ahiret gününe kavuşmayı umanlar ve Allah'ı çok zikredenler için güzel bir örnektir. (Ahzâb sûresi, 33/21)" });
    }

    // Rastgele bir indeks oluştur
    const random = Math.floor(Math.random() * count);

    // Rastgele belgeye atla ve al
    const randomAyet = await Ayet.findOne().skip(random);

    res.json({ sentence: randomAyet.sentence });
  } catch (error) {
    console.error('Rastgele ayet alınırken hata oluştu:', error);
    res.status(500).json({ error: 'Sunucu hatası', message: error.message });
  }
});

// Rastgele hadis endpoint'i
app.get('/api/random-hadis', async (req, res) => {
  try {
    // Hadisler koleksiyonundaki toplam belge sayısını say
    const count = await Hadis.countDocuments();

    // Eğer hiç hadis yoksa, varsayılan bir mesaj döndür
    if (count === 0) {
      return res.json({ sentence: "İlmin tâlibi (talebesi), Rahman'ın tâlibidir. İlmin talipçisi, İslâm'ın rüknüdür. Onun ser-ü mükâfatı, Peygamberlerle beraber verilir. (Hadis-i Şerif)" });
    }

    // Rastgele bir indeks oluştur
    const random = Math.floor(Math.random() * count);

    // Rastgele belgeye atla ve al
    const randomHadis = await Hadis.findOne().skip(random);

    res.json({ sentence: randomHadis.sentence });
  } catch (error) {
    console.error('Rastgele hadis alınırken hata oluştu:', error);
    res.status(500).json({ error: 'Sunucu hatası', message: error.message });
  }
});

// Rastgele dua endpoint'i
app.get('/api/random-dua', async (req, res) => {
  try {
    // Dualar koleksiyonundaki toplam belge sayısını say
    const count = await Dua.countDocuments();

    // Eğer hiç dua yoksa, varsayılan bir mesaj döndür
    if (count === 0) {
      return res.json({ sentence: "Allah’ım! Senden Seni sevmeyi Seni sevenleri sevmeyi ve Senin sevgine ulaştıran ameli yapmayı isterim. Allah’ım! Senin sevgini, bana canımdan, ailemden ve soğuk sudan daha sevgili kıl. (Tirmizî, Deavât,73)" });
    }

    // Rastgele bir indeks oluştur
    const random = Math.floor(Math.random() * count);

    // Rastgele belgeye atla ve al
    const randomDua = await Dua.findOne().skip(random);

    res.json({ sentence: randomDua.sentence });
  } catch (error) {
    console.error('Rastgele dua alınırken hata oluştu:', error);
    res.status(500).json({ error: 'Sunucu hatası', message: error.message });
  }
});


// F. YEDEKLEME HİZMETİ
// ============================================================================

const { MongoClient } = require('mongodb');

// MongoDB connection string from .env file
const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const backupDbName = process.env.BACKUP_DB_NAME || 'backups';

// Function to perform the backup
async function performBackup() {
  console.log("Backup: Starting...");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB for backup");

    // Source database (the one we're backing up)
    const sourceDb = client.db(dbName);

    // Target database (where backups will be stored)
    const backupDb = client.db(backupDbName);

    // Get current date/time for collection naming
    const now = new Date();

    // Format date as "YYYY-MM-DD"
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day}`;

    // Backup usergroups collection
    const usergroups = await sourceDb.collection('usergroups').find({}).toArray();
    const usergroupsCollectionName = `usergroups_backup_${timestamp}`;
    await backupDb.collection(usergroupsCollectionName).insertMany(usergroups);

    // Backup admins collection
    const admins = await sourceDb.collection('admins').find({}).toArray();
    const adminsCollectionName = `admins_backup_${timestamp}`;
    await backupDb.collection(adminsCollectionName).insertMany(admins);

    console.log(`Backup completed at ${now.toLocaleString()}`);
    console.log(`Usergroups backed up to collection: ${usergroupsCollectionName}`);
    console.log(`Admins backed up to collection: ${adminsCollectionName}`);

    // Clean up old backups
    await cleanupOldBackups(backupDb, 'usergroups_backup_', 10);
    await cleanupOldBackups(backupDb, 'admins_backup_', 10);


  } catch (err) {
    console.error("Error during backup:", err);
  } finally {
    await client.close();
    console.log("MongoDB connection closed after backup");
  }
}

// Function to clean up old backups, keeping only the most recent ones
async function cleanupOldBackups(db, prefix, keepCount) {
  try {
    // Get all collections in the backup database
    const collections = await db.listCollections().toArray();

    // Filter collections that match our prefix
    const backupCollections = collections
      .filter(col => col.name.startsWith(prefix))
      .map(col => col.name);

    // Sort by date (newest first) - extract date from collection name
    backupCollections.sort((a, b) => {
      const dateA = a.replace(prefix, '');
      const dateB = b.replace(prefix, '');
      return dateB.localeCompare(dateA); // Descending order (newest first)
    });

    console.log(`Found ${backupCollections.length} backup collections for prefix ${prefix}:`, backupCollections);

    // If we have more than keepCount, delete the oldest ones
    if (backupCollections.length > keepCount) {
      const collectionsToDelete = backupCollections.slice(keepCount);
      console.log(`Deleting ${collectionsToDelete.length} old backup collections:`, collectionsToDelete);

      for (const collectionName of collectionsToDelete) {
        try {
          await db.collection(collectionName).drop();
          console.log(`✅ Deleted old backup collection: ${collectionName}`);
        } catch (dropError) {
          console.error(`❌ Failed to delete collection ${collectionName}:`, dropError.message);
        }
      }
    } else {
      console.log(`No cleanup needed for ${prefix} - only ${backupCollections.length} collections found (keeping ${keepCount})`);
    }
  } catch (err) {
    console.error(`Error cleaning up old backups with prefix ${prefix}:`, err);
  }
}

function scheduleBackup() {
  // Schedule backups to run every 1440 minutes (24 hours)
  const backupJob = schedule.scheduleJob('0 0 * * *', performBackup);
  console.log("Backup scheduler started. Backups will run daily at midnight.");

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Backup service shutting down...');
    backupJob.cancel();
    process.exit(0);
  });

  return backupJob;
}

// Sağlık kontrolü endpoint'i
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

// Render'ı uyanık tutmak için ping sistemi
function schedulePing() {
  // Her 2 dakikada bir ping gönder
  const pingJob = schedule.scheduleJob('*/2 * * * *', async () => {
    try {
      const response = await fetch('https://rotakip.onrender.com/api/health');
      const data = await response.json();
    } catch (error) {
      console.error('Ping failed:', error.message);
    }
  });
  
  console.log("Ping scheduler started. Pings will be sent every 2 minutes.");
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Ping service shutting down...');
    pingJob.cancel();
  });
  
  return pingJob;
}

// Dropbox token yenileme sistemi
function scheduleTokenRefresh() {
  // Her 1 saatte bir token'ı yenile
  const tokenJob = schedule.scheduleJob('0 * * * *', async () => {
    try {
      console.log('🔄 Dropbox token otomatik yenileniyor...');
      await refreshDropboxToken();
    } catch (error) {
      console.error('Token refresh failed:', error.message);
    }
  });
  
  console.log("Token refresh scheduler started. Token will be refreshed every 1 hour.");
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Token refresh service shutting down...');
    tokenJob.cancel();
  });
  
  return tokenJob;
}

// Start the schedulers
const backupJob = scheduleBackup();
const pingJob = schedulePing();
const tokenJob = scheduleTokenRefresh();

// Dropbox'ı başlat
initializeDropbox();

// G. SERVER BAŞLATMA
// ============================================================================

app.listen(port, () => {
  console.log(`Uygulama http://localhost:${port} adresinde çalışıyor`);
});