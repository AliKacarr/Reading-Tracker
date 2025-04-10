const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// MongoDB bağlantısı
mongoose.connect('mongodb+srv://alikacar2361:jch359LVv.7JL2d@readingtrucker-cluster.tkzg4ih.mongodb.net/readingTracker');

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
