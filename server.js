const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const schedule = require('node-schedule');
const app = express();
const port = 3000;

mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });

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


//**************************************************************************** tüm verileri çek
app.get('/api/all-data', async (req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });
    const stats = await ReadingStatus.find();
    res.json({ users, stats });
  } catch (error) {
    console.error('Error fetching all data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


//**************************************************************************** tracker-table
// //okuma durumu güncelleme
app.post('/api/update-status', async (req, res) => {
  try {
    const { userId, date, status } = req.body;

    if (status) {
      await ReadingStatus.findOneAndUpdate(
        { userId, date },
        { userId, date, status },
        { upsert: true }
      );
    } else {
      await ReadingStatus.findOneAndDelete({ userId, date });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});


//**************************************************************************** stats-section
//stats-section tablosu
app.get('/api/reading-stats', async (req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });
    const stats = await ReadingStatus.find();

    const userStats = users.map(user => {
      const userReadings = stats.filter(stat =>
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
app.get('/api/longest-streaks', async (req, res) => {
  try {
    const users = await User.find();
    const stats = await ReadingStatus.find();

    const results = users.map(user => {
      // Kullanıcının okuma kayıtlarını tarihe göre sırala
      const userStats = stats
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

// Hadis modeli
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
app.post('/api/add-user', upload.single('profileImage'), async (req, res) => {
  try {
    const { name } = req.body;
    const profileImage = req.file ? req.file.filename : null;

    const user = new User({ name, profileImage });
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Kullanıcıyı silme
app.post('/api/delete-user', async (req, res) => {
  try {
    const { id } = req.body;

    // Kullanıcıyı sil
    const user = await User.findByIdAndDelete(id);

    // Kullanıcının profil resmini sil
    if (user && user.profileImage) {
      const imagePath = path.join(__dirname, 'uploads', user.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Kullanıcının okuma durumlarını sil
    await ReadingStatus.deleteMany({ userId: id });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Kullanıcı ismini güncelleme
app.post('/api/update-user', async (req, res) => {
  const { userId, name } = req.body;

  try {
    await User.findByIdAndUpdate(
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
app.post('/api/update-user-image', upload.single('profileImage'), async (req, res) => {
  const { userId } = req.body;

  try {
    // If a file was uploaded
    if (req.file) {
      // Find the user to get their old profile image
      const user = await User.findById(userId);

      // Delete the old profile image if it exists
      if (user && user.profileImage) {
        const oldImagePath = path.join(__dirname, 'uploads', user.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Update with the new image
      await User.findByIdAndUpdate(
        userId,
        { profileImage: req.file.filename }
      );

      res.json({ success: true, filename: req.file.filename });
    } else {
      res.status(400).json({ error: 'No image file provided' });
    }
  } catch (error) {
    console.error('Error updating user image:', error);
    res.status(500).json({ error: 'Failed to update user image' });
  }
});


//********************************************************** Admin
// Admin model
const Admin = mongoose.model('Admin', {
  username: String,
  password: String
});

// Admin doğrulama
app.post('/api/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find admin in the adminData collection
    const admin = await Admin.findOne({ username, password });

    if (admin) {
      res.json({ success: true });
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
    const { username } = req.body;

    // Use the existing mongoose connection instead of creating a new client
    const admin = await Admin.findOne({ username });

    res.json({ valid: !!admin });
  } catch (error) {
    console.error('Error verifying admin:', error);
    res.status(500).json({ error: 'Server error' });
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