import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Priority: 1. CLI argument, 2. ATLAS_URI in .env, 3. MONGO_URI if not localhost
const cliUri = process.argv[2];
let targetUri = cliUri || process.env.ATLAS_URI;

if (!targetUri && process.env.MONGO_URI && !process.env.MONGO_URI.includes('127.0.0.1') && !process.env.MONGO_URI.includes('localhost')) {
  targetUri = process.env.MONGO_URI;
}

const DATA_DIR = path.join(__dirname, 'exported_data');

async function migrate() {
  console.log('====================================================');
  console.log('🚀 GovDesk - MongoDB Atlas Migration Tool');
  console.log('====================================================');

  if (!targetUri) {
    console.error('❌ Error: No MongoDB Atlas URI provided.\n');
    console.log('Usage:');
    console.log('  node src/db/migrateToAtlas.js "<your_mongodb_atlas_connection_string>"\n');
    console.log('OR set ATLAS_URI in your server/.env file:');
    console.log('  ATLAS_URI="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/govdesk?retryWrites=true&w=majority"\n');
    process.exit(1);
  }

  // Mask credentials for display
  const maskedUri = targetUri.replace(/:\/\/(.*?):(.*?)@/, '://$1:****@');
  console.log('📡 Target Cluster:', maskedUri);
  console.log('📁 Data Source   :', DATA_DIR);
  console.log('----------------------------------------------------');

  if (!fs.existsSync(DATA_DIR) || !fs.existsSync(path.join(DATA_DIR, 'manifest.json'))) {
    console.error('❌ Error: Exported data not found. Please run "npm run export-db" first.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'manifest.json'), 'utf-8'));

  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(targetUri);
    console.log('✅ Connected to MongoDB Atlas successfully!\n');

    const db = mongoose.connection.db;
    let totalImported = 0;

    for (const [colName, count] of Object.entries(manifest.collections)) {
      const filePath = path.join(DATA_DIR, `${colName}.json`);
      if (!fs.existsSync(filePath)) continue;

      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (!rawData || rawData.length === 0) {
        console.log(`  ⚪ ${colName.padEnd(20)}: 0 documents (empty collection)`);
        continue;
      }

      const collection = db.collection(colName);

      // Clean existing or insert documents
      await collection.deleteMany({});
      
      // Convert date strings and IDs properly if needed
      const docsToInsert = rawData.map(doc => {
        const item = { ...doc };
        if (item._id && typeof item._id === 'string' && item._id.length === 24) {
          try {
            item._id = new mongoose.Types.ObjectId(item._id);
          } catch (e) {
            // Keep original string if not standard ObjectId
          }
        }
        if (item.createdAt && typeof item.createdAt === 'string') {
          item.createdAt = new Date(item.createdAt);
        }
        if (item.updatedAt && typeof item.updatedAt === 'string') {
          item.updatedAt = new Date(item.updatedAt);
        }
        if (item.created_at && typeof item.created_at === 'string') {
          item.created_at = new Date(item.created_at);
        }
        if (item.updated_at && typeof item.updated_at === 'string') {
          item.updated_at = new Date(item.updated_at);
        }
        return item;
      });

      await collection.insertMany(docsToInsert);
      totalImported += docsToInsert.length;
      console.log(`  ✓ ${colName.padEnd(20)}: ${docsToInsert.length} documents uploaded to Atlas`);
    }

    // Create Indexes
    try {
      await db.collection('services').createIndex({ id: 1 }, { unique: true });
      await db.collection('services').createIndex({ title: 'text', description: 'text', tags: 'text' });
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('categories').createIndex({ id: 1 }, { unique: true });
      await db.collection('officelocations').createIndex({ id: 1 }, { unique: true });
      console.log('\n✅ Created performance and uniqueness indexes on Atlas.');
    } catch (idxErr) {
      // Indexes might already exist
    }

    console.log('\n====================================================');
    console.log(`🎉 SUCCESS: All ${totalImported} documents migrated to MongoDB Atlas!`);
    console.log('====================================================');
    console.log('Next step: Update your deployment environment variable:');
    console.log(`MONGO_URI=${targetUri}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
      console.error('💡 Hint: Check your username and password in the connection string.');
    } else if (err.message.includes('IP') || err.message.includes('whitelist') || err.message.includes('timed out')) {
      console.error('💡 Hint: In MongoDB Atlas -> Network Access -> ensure you have added IP 0.0.0.0/0 (Allow access from anywhere).');
    }
    process.exit(1);
  }
}

migrate();
