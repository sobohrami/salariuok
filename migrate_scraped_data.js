const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { saveEntry } = require('./db');

/**
 * Migrează datele din scraped_salaries.json în Supabase în batch-uri.
 */
async function migrate() {
  const filePath = path.join(__dirname, 'scraped_salaries.json');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Fișierul scraped_salaries.json nu a fost găsit.');
    return;
  }

  let rawData;
  try {
    rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error('❌ Eroare la citirea fișierului JSON:', e.message);
    return;
  }

  const entries = rawData.entries || [];
  if (entries.length === 0) {
    console.log('ℹ️ Nu există intrări de migrat.');
    return;
  }

  console.log(`🚀 Începe migrarea a ${entries.length} înregistrări...`);

  const BATCH_SIZE = 50;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const rawBatch = entries.slice(i, i + BATCH_SIZE);
    
    // Transformăm datele din scraper în formatul acceptat de db.js
    const processedBatch = rawBatch
      .filter(e => e.job_title && e.salary_ron) // Validare minimă
      .map(e => ({
        jobTitle: e.job_title,
        normalizedJobTitle: (e.job_title || '').toLowerCase().trim(),
        location: 'România', // Default pentru setul curent
        yearsExperience: 3,   // Medie estimată
        salary: e.salary_ron,
        medianSalary: e.salary_ron,
        score: 70, // Scorul default pentru datele importate
        source: 'undelucram.ro',
        company: e.company || null
      }));

    if (processedBatch.length === 0) continue;

    try {
      const success = await saveEntry(processedBatch);
      if (success) {
        successCount += processedBatch.length;
        console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} finalizat (${successCount}/${entries.length})...`);
      } else {
        failCount += processedBatch.length;
        console.error(`❌ Eroare la batch-ul ${Math.floor(i / BATCH_SIZE) + 1}`);
      }
    } catch (err) {
      console.error(`❌ Eroare critică la batch-ul ${Math.floor(i / BATCH_SIZE) + 1}:`, err.message);
      failCount += processedBatch.length;
    }
  }

  console.log('\n--- Rezumat Migrare ---');
  console.log(`✅ Succes: ${successCount}`);
  console.log(`❌ Eșec:  ${failCount}`);
  console.log('-----------------------');
  
  if (successCount > 0) {
    console.log('✨ Migrare finalizată cu succes!');
  }
}

migrate();
