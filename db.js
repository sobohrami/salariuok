let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  // Supabase not installed locally, will use fallback
}
const fs = require('fs');
const path = require('path');

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const isSupabaseConfigured = supabaseUrl && supabaseKey && createClient;

const DB_PATH = path.join(__dirname, 'salary_data.json');

// --- JSON FALLBACK HELPERS ---
function loadLocalData() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Local DB load error:', e.message);
  }
  return { entries: [] };
}

function saveLocalData(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Local DB save error:', e.message);
    return false;
  }
}

// --- MAIN DATABASE FUNCTIONS ---

/**
 * Saves a salary entry to Supabase (primary) or JSON (fallback)
 */
async function saveEntry(entry) {
  const { jobTitle, normalizedJobTitle, location, yearsExperience, salary, medianSalary, score } = entry;

  // Simple suspicious detection
  let isSuspicious = false;
  const ratio = salary / 3500; // Baseline net avg
  if (yearsExperience <= 1 && salary > 12000) isSuspicious = true;
  if (salary > 40000 && yearsExperience < 5) isSuspicious = true;
  
  // High salary for low-barrier/manual jobs (if detection is obvious)
  const lowBarrierWords = ['muncitor', 'lucrator', 'vanzator', 'picol', 'curier', 'gunoier', 'sofer'];
  const lowerTitle = jobTitle.toLowerCase();
  if (lowBarrierWords.some(w => lowerTitle.includes(w)) && salary > 8000) isSuspicious = true;

  if (isSupabaseConfigured) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase
        .from('salary_entries')
        .insert([{
          job_title: jobTitle,
          normalized_job_title: normalizedJobTitle,
          location,
          years_experience: yearsExperience,
          salary,
          median_salary: medianSalary,
          score,
          is_suspicious: isSuspicious
        }]);
      if (!error) return true;
      console.error('Supabase insert error:', error.message);
    } catch (err) {
      console.error('Supabase connection error:', err.message);
    }
  }

  // Fallback to local JSON if Supabase fails or isn't configured
  console.log('Using local JSON fallback for saving entry...');
  const data = loadLocalData();
  data.entries.push({
    id: Date.now(),
    job_title: jobTitle,
    normalized_job_title: normalizedJobTitle,
    location,
    years_experience: yearsExperience,
    salary,
    median_salary: medianSalary,
    score,
    is_suspicious: isSuspicious,
    timestamp: new Date().toISOString(),
  });
  return saveLocalData(data);
}

/**
 * Gets overview stats from Supabase (primary) or JSON (fallback)
 */
async function getStats() {
  if (isSupabaseConfigured) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error, count } = await supabase
        .from('salary_entries')
        .select('score', { count: 'exact' });

      if (!error) {
        const total = count || 0;
        const avgScore = total > 0
          ? Math.round(data.reduce((s, e) => s + e.score, 0) / total)
          : null;
        return { totalAnalyses: total, averageScore: avgScore };
      }
      console.error('Supabase stats error:', error.message);
    } catch (err) {
      console.error('Supabase connection error:', err.message);
    }
  }

  // Fallback to local JSON (or combined stats)
  const data = loadLocalData();
  const count = data.entries.length;

  let scrapedCount = 0;
  try {
    const SCRAPED_PATH = path.join(__dirname, 'scraped_salaries.json');
    if (fs.existsSync(SCRAPED_PATH)) {
      const scrapedData = JSON.parse(fs.readFileSync(SCRAPED_PATH, 'utf8'));
      if (scrapedData && Array.isArray(scrapedData.entries)) {
        scrapedCount = scrapedData.entries.length;
      }
    }
  } catch (e) {}

  const total = count + scrapedCount;
  const avgScore = count > 0
    ? Math.round(data.entries.reduce((s, e) => s + (e.score || 0), 0) / count)
    : null;
    
  return { totalAnalyses: total, averageScore: avgScore };
}

module.exports = { saveEntry, getStats };
