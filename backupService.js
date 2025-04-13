const { MongoClient } = require('mongodb');
const schedule = require('node-schedule');
require('dotenv').config();

// MongoDB connection string from .env file
const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const backupDbName = process.env.BACKUP_DB_NAME;

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
    
    // Format date as "13 Nisan" style
    const day = now.getDate();
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const timestamp = `${day} ${month} ${year}`;
    
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

// Function to schedule the backup
function scheduleBackup() {
  // Schedule backups to run daily at specified time
  const dailyBackupJob = schedule.scheduleJob('31 21 * * *', performBackup);
  console.log("Backup scheduler started.");
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Backup service shutting down...');
    dailyBackupJob.cancel();
    process.exit(0);
  });
}

module.exports = {
  scheduleBackup,
  performBackup
};