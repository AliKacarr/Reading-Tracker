const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os'); // Added OS module
require('dotenv').config();
const schedule = require('node-schedule');
const { Dropbox } = require('dropbox');
const app = express();
const port = 3000;

// Dropbox konfigürasyonu
const dbx = new Dropbox({
  accessToken: process.env.DROPBOX_ACCESS_TOKEN
});

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
    console.error('Dropbox grup resmi silme hatası:', error);
  }
}

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

app.use(express.static('public'));
app.use('/images', express.static('uploads'));
app.use(express.json());

//resim yükleme
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

// Resim yükleme konfigürasyonu - grup resimleri için
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

// Admin model
const Admin = mongoose.model('Admin', {
  username: String,
  password: String,
  groupId: String
});

// Model cache'i
const modelCache = {};

// Yardımcı fonksiyonlar
function getGroupCollections(groupId) {
  const userModelName = `users_${groupId}`;
  const readingStatusModelName = `readingstatuses_${groupId}`;

  // Eğer model zaten cache'de varsa, onu kullan
  if (modelCache[userModelName] && modelCache[readingStatusModelName]) {
    return {
      users: modelCache[userModelName],
      readingStatuses: modelCache[readingStatusModelName]
    };
  }

  // Eğer model zaten Mongoose'da varsa, onu kullan
  try {
    const existingUserModel = mongoose.model(userModelName);
    const existingReadingStatusModel = mongoose.model(readingStatusModelName);

    modelCache[userModelName] = existingUserModel;
    modelCache[readingStatusModelName] = existingReadingStatusModel;

    return {
      users: modelCache[userModelName],
      readingStatuses: modelCache[readingStatusModelName]
    };
  } catch (error) {
    // Model yoksa oluştur
  }

  // Model'leri oluştur ve cache'e ekle
  const userSchema = new mongoose.Schema({
    name: String,
    profileImage: String
  }, { collection: userModelName }); // Koleksiyon ismini açıkça belirt

  const readingStatusSchema = new mongoose.Schema({
    userId: String,
    date: String,
    status: String
  }, { collection: readingStatusModelName }); // Koleksiyon ismini açıkça belirt

  // Model'i oluştur
  modelCache[userModelName] = mongoose.model(userModelName, userSchema);
  modelCache[readingStatusModelName] = mongoose.model(readingStatusModelName, readingStatusSchema);

  return {
    users: modelCache[userModelName],
    readingStatuses: modelCache[readingStatusModelName]
  };
}

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

// Health check endpoint for keeping Render alive
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

// Grupları listeleme endpoint'i
app.get('/api/groups', async (req, res) => {
  try {
    const { skip = 0, limit = 12, search = '' } = req.query;

    // Arama sorgusu oluştur
    const query = search
      ? {
        $or: [
          { groupName: { $regex: search, $options: 'i' } },
          { groupId: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }
      : {};

    // Toplam grup sayısını al
    const total = await UserGroup.countDocuments(query);

    // Grupları getir
    const groups = await UserGroup.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    res.json({ groups, total });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Server error' });
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



//**************************************************************************** tüm verileri çek
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

//**************************************************************************** belirli kullanıcının istatistiklerini çek
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

//**************************************************************************** sadece kullanıcıları çek
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


//**************************************************************************** tracker-table
// //okuma durumu güncelleme
app.post('/api/update-status/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, date, status } = req.body;

    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
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


//**************************************************************************** stats-section
//stats-section tablosu
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


//**************************************************************************** longest-series
//longest-series tablosu
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


//**************************************************************************** quote
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

// Rastgele ayet getiren endpoint
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

//**************************************************************************** videos
//Youtube API anahtarını döndür
app.get('/api/config', (req, res) => {
  res.json({
    youtubeApiKey: process.env.YOUTUBE_API_KEY || 'YOUR_DEFAULT_API_KEY'
  });
});


//**************************************************************************** main-area
//Kullanıcı ekleme
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
    
    // Resim varsa önce yükle, sonra kullanıcıyı kaydet
    if (req.file) {
      try {
        // Dosyayı Dropbox'a yükle
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const fileBuffer = fs.readFileSync(req.file.path);
        profileImageUrl = await uploadToDropbox(fileBuffer, fileName, 'userImages');
        
        // Yerel dosyayı sil
        fs.unlinkSync(req.file.path);
      } catch (error) {
        console.error('Dropbox upload hatası:', error);
        // Hata durumunda varsayılan resmi kullan
        profileImageUrl = '/images/default.png';
      }
    }

    // Kullanıcıyı kaydet (resim URL'i ile birlikte)
    const user = new users({ name, profileImage: profileImageUrl });
    await user.save();
    
    // Kullanıcıya yanıt ver
    res.json({ success: true, user: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Kullanıcıyı silme
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

    // Kullanıcıyı sil
    const user = await users.findByIdAndDelete(id);

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

// Kullanıcı ismini güncelleme
app.post('/api/update-user/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const { userId, name } = req.body;

  try {
    // Grup var mı kontrol et
    const group = await UserGroup.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // Dinamik koleksiyonu al
    const { users } = getGroupCollections(groupId);

    await users.findByIdAndUpdate(
      userId,
      { name: name }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Kullanıcı resmini güncelleme
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

      // Upload new image to Dropbox
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const fileBuffer = fs.readFileSync(req.file.path);
      const newImageUrl = await uploadToDropbox(fileBuffer, fileName, 'userImages');
      
      // Delete local file
      fs.unlinkSync(req.file.path);

      // Update with the new image URL
      await users.findByIdAndUpdate(
        userId,
        { profileImage: newImageUrl }
      );

      // Kullanıcıya hemen yanıt ver
      res.json({ success: true, imageUrl: newImageUrl });

      // Eski resmi arka planda sil
      if (oldImageUrl && oldImageUrl.includes('dropbox.com')) {
        deleteFromDropboxByUrl(oldImageUrl).catch(err => 
          console.error('Eski resim silme hatası:', err)
        );
      }
    } else {
      res.status(400).json({ error: 'No image file provided' });
    }
  } catch (error) {
    console.error('Error updating user image:', error);
    res.status(500).json({ error: 'Failed to update user image' });
  }
});


//********************************************************** Admin

// Admin doğrulama
app.post('/api/admin-login', async (req, res) => {
  try {
    const { username, password, groupId } = req.body;

    // Find admin in the adminData collection with matching groupId
    const admin = await Admin.findOne({ username, password, groupId });

    if (admin) {
      // Grup bilgisini al
      const group = await UserGroup.findOne({ groupId: admin.groupId });
      if (!group) {
        return res.json({ success: false, error: 'Grup bulunamadı' });
      }
      res.json({
        success: true,
        groupName: group.groupName,
        groupId: group.groupId
      });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Add an initial admin if none exists (you can remove this after first run)
const AccessLog = mongoose.model('AccessLog', {
  action: String,
  timestamp: Date,
  deviceInfo: Object,
  ipAddress: String
});

//Yetkisiz erişimleri kaydetme
app.post('/api/log-unauthorized', async (req, res) => {
  try {
    const { action, deviceInfo } = req.body;

    // Get client IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Create a new log entry
    const log = new AccessLog({
      action,
      timestamp: new Date(),
      deviceInfo,
      ipAddress
    });

    await log.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging unauthorized access:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//Erişim kayıtlarını yükleme
app.get('/api/access-logs', async (req, res) => {
  try {
    // Admin kontrolü yapmadan doğrudan logları getir
    const logs = await AccessLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const requestIp = require('request-ip');

const loginLogSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  ipAddress: String,
  deviceInfo: Object
});

const LoginLog = mongoose.model('LoginLog', loginLogSchema);

//Giriş kayıtlarını getirme
app.post('/api/log-visit', async (req, res) => {
  try {
    const { deviceInfo } = req.body;
    const ipAddress = requestIp.getClientIp(req);

    const log = new LoginLog({
      ipAddress,
      deviceInfo
    });

    await log.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging visit:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

//giriş kayıtları
app.get('/api/login-logs', async (req, res) => {
  try {
    const logs = await LoginLog.find().sort({ date: -1 });

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

// admin doğrulama
app.post('/api/verify-admin', async (req, res) => {
  try {
    const { username, groupId } = req.body;

    // Use the existing mongoose connection instead of creating a new client
    const admin = await Admin.findOne({ username, groupId });

    res.json({ valid: !!admin });
  } catch (error) {
    console.error('Error verifying admin:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Grupları listeleme API'si
app.get('/api/groups', async (req, res) => {
  try {
    const { page = 1, limit = 12, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Arama filtresi
    const searchFilter = search ? {
      $or: [
        { groupName: { $regex: search, $options: 'i' } },
        { groupId: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Grupları getir
    const groups = await Group.find(searchFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Grup yoksa boş array döndür
    if (!groups || groups.length === 0) {
      return res.json({
        groups: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalGroups: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // Her grup için kullanıcı sayısını hesapla
    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const userCount = await User.countDocuments({ groupId: group.groupId });
        return {
          ...group.toObject(),
          userCount
        };
      })
    );

    // Toplam sayfa sayısını hesapla
    const totalGroups = await Group.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalGroups / limit);

    res.json({
      groups: groupsWithCounts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalGroups,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Ana sayfa - index.html'i direkt aç (eski groups.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Grup sayfası için route - alfanumerik, tire ve alt çizgi karakterlerine izin ver
app.get('/:groupId([a-zA-Z0-9_-]+)', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'groups.html'));
});

// Grup oluşturma endpoint'i - güncellenmiş
app.post('/api/groups', uploadGroupImage.single('groupImage'), async (req, res) => {
  try {
    const { groupName, description, adminName, adminPassword, visibility } = req.body;
    
    let groupImageUrl = null;
    
    // Eğer resim varsa Dropbox'a yükle
    if (req.file) {
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

    // Admin bilgilerini grupId ile ilişkilendirerek kaydet
    const admin = new Admin({
      username: adminName,
      password: adminPassword,
      groupId: finalGroupId
    });

    await admin.save();

    // Varsayılan kullanıcı ekle
    const { users } = getGroupCollections(finalGroupId);
    const defaultUser = new users({
      name: "Siz",
      profileImage: "/images/default.png" // Varsayılan resim URL'i
    });
    await defaultUser.save();

    res.status(201).json({ success: true, group: newGroup });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Grup oluşturulurken bir hata oluştu' });
  }
});

// Catch-all route for group URLs (localhost support)
app.get('/groupid=:groupId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'groups.html'));
});

// Catch-all route for old format (backward compatibility)
app.get('/:groupId', (req, res) => {
  const groupId = req.params.groupId;
  // Only serve groups.html if it's not an API route or static file
  if (!groupId.startsWith('api') && !groupId.includes('.')) {
    res.sendFile(path.join(__dirname, 'public', 'groups.html'));
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(port, () => {
  console.log(`Uygulama http://localhost:${port} adresinde çalışıyor`);
});


// Backup service *******************************************************************

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

    // Backup users collection
    const users = await sourceDb.collection('users').find({}).toArray();
    const usersCollectionName = `u_backup_${timestamp}`;
    await backupDb.collection(usersCollectionName).insertMany(users);

    // Backup reading statuses collection
    const statuses = await sourceDb.collection('readingstatuses').find({}).toArray();
    const statusesCollectionName = `rs_backup_${timestamp}`;
    await backupDb.collection(statusesCollectionName).insertMany(statuses);

    console.log(`Backup completed at ${now.toLocaleString()}`);
    console.log(`Users backed up to collection: ${usersCollectionName}`);
    console.log(`Reading statuses backed up to collection: ${statusesCollectionName}`);

    // Clean up old backups
    await cleanupOldBackups(backupDb, 'u_backup_', 10);
    await cleanupOldBackups(backupDb, 'rs_backup_', 10);


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
      .map(col => col.name)
      .sort()
      .reverse();

    // If we have more than keepCount, delete the oldest ones
    if (backupCollections.length > keepCount) {
      const collectionsToDelete = backupCollections.slice(keepCount);

      for (const collectionName of collectionsToDelete) {
        await db.collection(collectionName).drop();
        console.log(`Deleted old backup collection: ${collectionName}`);
      }
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

// Start the backup scheduler
const backupJob = scheduleBackup();

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

// Start the ping scheduler
const pingJob = schedulePing();