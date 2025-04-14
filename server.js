const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const schedule = require('node-schedule');
const app = express();
const port = 3000;
 
// MongoDB connection from .env file
mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });

// Import backup functionality
const { scheduleBackup } = require('./backupservice.js');

// Schedule the backup job
scheduleBackup();

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

// Günün sözü modeli
// Add this new model for sentences after your existing models
const Sentence = mongoose.model('Sentence', {
  sentence: String
});

// Statik dosyalar için klasör
app.use(express.static('public'));
app.use('/images', express.static('uploads'));
app.use(express.json());

// Multer ayarları - resim yükleme için
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

// API endpoint'leri
app.get('/api/data', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const users = await User.find();
    
    // If date range is provided, filter stats by date range
    let statsQuery = {};
    if (startDate && endDate) {
      statsQuery = {
        date: { $gte: startDate, $lte: endDate }
      };
    }
    
    const stats = await ReadingStatus.find(statsQuery);
    res.json({ users, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.post('/api/update-status', async (req, res) => {
  try {
    const { userId, date, status } = req.body;
    
    if (status) {
      // Durumu güncelle veya oluştur
      await ReadingStatus.findOneAndUpdate(
        { userId, date },
        { userId, date, status },
        { upsert: true }
      );
    } else {
      // Durumu sil (boş durum)
      await ReadingStatus.findOneAndDelete({ userId, date });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

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

app.listen(port, () => {
  console.log(`Uygulama http://localhost:${port} adresinde çalışıyor`);
});


// Add this new endpoint to fetch all data for streak calculations
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

// Add these endpoints to your server.js file

// Update user name
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

// Update user profile image
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

// Add this new endpoint to fetch a random quote
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


// Add this new endpoint to get reading statistics for all users
app.get('/api/reading-stats', async (req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });
    const stats = await ReadingStatus.find();
    
    // Process stats for each user
    const userStats = users.map(user => {
      // Count "okudum" entries for this user
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


// Admin model
const Admin = mongoose.model('Admin', {
  username: String,
  password: String
});


// Admin login endpoint
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
app.get('/api/setup-admin', async (req, res) => {
  try {
    const adminCount = await Admin.countDocuments();
    
    if (adminCount === 0) {
      const admin = new Admin({
        username: 'admin',
        password: 'admin123' // Change this to a secure password
      });
      
      await admin.save();
      res.json({ success: true, message: 'Admin account created' });
    } else {
      res.json({ success: true, message: 'Admin account already exists' });
    }
  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});


// Add this model for access logs
const AccessLog = mongoose.model('AccessLog', {
  action: String,
  timestamp: Date,
  deviceInfo: Object,
  ipAddress: String
});

// Add this endpoint to log unauthorized access attempts
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

// Add this endpoint to view logs (admin only)
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

// Add this to your imports
const requestIp = require('request-ip');

// Add this to your MongoDB schema definitions
const loginLogSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  ipAddress: String,
  deviceInfo: Object
});

const LoginLog = mongoose.model('LoginLog', loginLogSchema);

// Add these API endpoints
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
