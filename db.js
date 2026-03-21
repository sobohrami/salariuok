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

  // Fallback to local JSON
  const data = loadLocalData();
  const count = data.entries.length;
  const avgScore = count > 0
    ? Math.round(data.entries.reduce((s, e) => s + (e.score || 0), 0) / count)
    : null;
  return { totalAnalyses: count, averageScore: avgScore };
}

module.exports = { saveEntry, getStats };
