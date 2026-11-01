import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const LOCAL_URI = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/govdesk';
const OUTPUT_DIR = path.join(__dirname, 'exported_data');

async function exportAll() {
  console.log('====================================================');
  console.log('📦 GovDesk - Exporting Local MongoDB (Compass) Data');
  console.log('📡 Source URI:', LOCAL_URI);
  console.log('📁 Target Directory:', OUTPUT_DIR);
  console.log('====================================================');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    await mongoose.connect(LOCAL_URI);
    console.log('✅ Connected to Local MongoDB successfully.');

    const collections = await mongoose.connection.db.listCollections().toArray();
    const manifest = {
      exportedAt: new Date().toISOString(),
      database: 'govdesk',
      source: LOCAL_URI,
      collections: {}
    };

    let totalDocs = 0;

    for (const col of collections) {
      const colName = col.name;
      // Skip system collections if any
      if (colName.startsWith('system.')) continue;

      const docs = await mongoose.connection.db.collection(colName).find({}).toArray();
      const filePath = path.join(OUTPUT_DIR, `${colName}.json`);

      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
      manifest.collections[colName] = docs.length;
      totalDocs += docs.length;

      console.log(`  ✓ Exported ${colName.padEnd(20)}: ${docs.length} documents -> ${colName}.json`);
    }

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    console.log('----------------------------------------------------');
    console.log(`🎉 Total Documents Exported: ${totalDocs}`);
    console.log(`📁 All files saved to: ${OUTPUT_DIR}`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Export failed:', err.message);
    process.exit(1);
  }
}

exportAll();
