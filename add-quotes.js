const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect('mongodb+srv://alikacar2361:jch359LVv.7JL2d@readingtrucker-cluster.tkzg4ih.mongodb.net/readingTracker');

// Define the Sentence model
const Sentence = mongoose.model('Sentence', {
  sentence: String
});

// Sample quotes
const quotes = [
  "İlmin tâlibi (talebesi), Rahman'ın tâlibidir. İlmin talipçisi, İslâm'ın rüknüdür. Onun ser-ü mükâfatı, Peygamberlerle beraber verilir. (Hadis-i Şerif)",
  "Kitaplar, insanın en sadık dostlarıdır.",
  "Okumak, düşünceleri özgürleştirir.",
  "Bir kitap, bin öğretmenden daha değerlidir.",
  "Okumak, ruhun gıdasıdır.",
  "Bilgi güçtür, okumak ise o gücün anahtarıdır.",
  "Kitaplar, geçmişten geleceğe uzanan köprülerdir.",
  "Okuyan insan, düşünen insandır; düşünen insan, üreten insandır.",
  "Bir kitap, bir dünya demektir.",
  "Okumak, zihnin egzersizidir."
];

// Function to add quotes to the database
async function addQuotes() {
  try {
    // Clear existing quotes
    await Sentence.deleteMany({});
    
    // Add new quotes
    for (const quote of quotes) {
      const sentence = new Sentence({ sentence: quote });
      await sentence.save();
      console.log(`Added quote: ${quote.substring(0, 30)}...`);
    }
    
    console.log('All quotes have been added successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error adding quotes:', error);
    mongoose.connection.close();
  }
}

// Run the function
addQuotes();