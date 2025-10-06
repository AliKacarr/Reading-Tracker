const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB'ye bağlan
mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });

const Vecize = mongoose.model('Vecize', {
  sentence: String
}, 'vecizeler');

// Örnek cümleler
const cumleler = [
  "Allah'ım! Bütün işlerimizin sonucunu güzel eyle, dünyada rezil olmaktan ve Ahiret azabından bizi koru. (Ahmed b. Hanbel, el-Müsned, 4/181)"
];

// Veritabanına cümleleri ekle
async function addQuotes() {
  try {

    // Yeni cümleleri ekle
    for (const cumle of cumleler) {
      const yeniCumle = new Vecize({ sentence: cumle });
      await yeniCumle.save();
      console.log(`Cümle eklendi: ${cumle.substring(0, 30)}...`);
    }

    console.log('Tüm cümleler başarıyla eklendi!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Cümle eklenirken hata oluştu:', error);
    mongoose.connection.close();
  }
}

// Fonksiyonu çalıştır
addQuotes();