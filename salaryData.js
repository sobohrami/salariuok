// Hardcoded Romanian salary benchmark data (monthly, RON, gross)
// Structure: jobCategory -> cityTier -> experienceTier -> median salary

const fs = require('fs');
const path = require('path');

const cityTiers = {
  // Tier 1 - Major cities
  'bucurești': 1, 'bucharest': 1,
  'cluj': 2, 'cluj-napoca': 2,
  'timișoara': 2, 'timisoara': 2,
  'iași': 2, 'iasi': 2,
  'brașov': 2, 'brasov': 2,
  'constanța': 2, 'constanta': 2,
  'sibiu': 3,
  'oradea': 3,
  'craiova': 3,
  'bacău': 3, 'bacau': 3,
  'ploiești': 3, 'ploiesti': 3,
  'pitești': 3, 'pitesti': 3,
  'galați': 3, 'galati': 3,
  'arad': 3,
};

// experienceTier: 0=0-2yrs, 1=3-5yrs, 2=6-10yrs, 3=10+yrs
// cityMultiplier: tier1=1.0, tier2=0.85, tier3=0.70
const cityMultipliers = { 1: 1.0, 2: 0.85, 3: 0.70, 4: 0.60 };

// Base salary data (Bucharest, gross monthly RON)
// [0-2yrs, 3-5yrs, 6-10yrs, 10+yrs]
const salaryBenchmarks = {
  // Tech
  'software developer': [4500, 7500, 11000, 16000],
  'software engineer': [4800, 8000, 12000, 17000],
  'frontend developer': [4200, 7000, 10500, 14500],
  'backend developer': [4500, 7800, 11500, 15500],
  'full stack developer': [4500, 8000, 12000, 16000],
  'mobile developer': [4500, 7500, 11000, 15000],
  'devops engineer': [5000, 9000, 13000, 18000],
  'data engineer': [5000, 9000, 13500, 18500],
  'data scientist': [5000, 9000, 13000, 18000],
  'machine learning engineer': [5500, 9500, 14000, 20000],
  'qa engineer': [3500, 5500, 8000, 11000],
  'system administrator': [3500, 5500, 8000, 11000],
  'network engineer': [3800, 6000, 9000, 13000],
  'cybersecurity analyst': [4500, 7500, 11000, 16000],
  'ui ux designer': [3800, 6000, 9000, 13000],
  'product manager': [5000, 9000, 13000, 19000],
  'project manager': [4500, 7500, 11000, 16000],
  'scrum master': [5000, 8500, 12000, 16000],
  'business analyst': [4000, 7000, 10000, 14000],
  'technical writer': [3200, 5000, 7000, 9500],

  // Finance & Accounting
  'accountant': [3000, 4500, 6500, 9000],
  'financial analyst': [4000, 6500, 9500, 14000],
  'controller': [5000, 8000, 12000, 17000],
  'auditor': [3500, 5500, 8500, 12000],
  'tax consultant': [3500, 5500, 8000, 12000],
  'cfo': [8000, 12000, 18000, 28000],

  // Marketing
  'marketing specialist': [3200, 5000, 7500, 11000],
  'digital marketing specialist': [3200, 5200, 7800, 11000],
  'seo specialist': [3000, 4800, 7000, 10000],
  'content writer': [2800, 4000, 6000, 8500],
  'social media manager': [3000, 4500, 6500, 9000],
  'marketing manager': [5000, 8000, 12000, 17000],
  'brand manager': [5000, 8500, 12500, 18000],
  'growth hacker': [3500, 6000, 9000, 13000],

  // Sales
  'sales representative': [2800, 4500, 6500, 9000],
  'account manager': [3500, 5500, 8000, 12000],
  'sales manager': [5000, 8500, 12000, 18000],
  'business development': [4000, 7000, 10000, 15000],
  'key account manager': [4500, 7500, 11000, 16000],

  // HR
  'hr specialist': [3000, 4800, 7000, 10000],
  'recruiter': [3000, 4800, 7000, 9500],
  'hr manager': [5000, 8000, 12000, 17000],

  // Operations / Logistics
  'operations manager': [4500, 7500, 11000, 16000],
  'logistics coordinator': [3000, 4800, 7000, 10000],
  'supply chain manager': [5000, 8000, 12000, 17000],
  'warehouse manager': [3000, 4800, 7000, 10000],

  // Customer Support
  'customer support': [2500, 3500, 5000, 7000],
  'customer success manager': [3500, 5500, 8000, 12000],
  'call center agent': [2500, 3200, 4500, 6000],

  // Legal
  'lawyer': [4000, 7000, 11000, 18000],
  'legal counsel': [5000, 9000, 14000, 20000],
  'paralegal': [3000, 4500, 6500, 9000],

  // Medical
  'doctor': [5000, 9000, 14000, 20000],
  'nurse': [3000, 4500, 6500, 9000],
  'pharmacist': [4000, 6000, 8500, 12000],
  'dentist': [5000, 9000, 14000, 22000],

  // Education
  'teacher': [2800, 3800, 5000, 7000],
  'professor': [4000, 6000, 9000, 14000],
  'trainer': [3000, 5000, 7500, 11000],

  // Architecture / Engineering
  'architect': [3500, 6000, 9000, 14000],
  'civil engineer': [3500, 5500, 8500, 13000],
  'mechanical engineer': [3500, 5500, 8500, 13000],
  'electrical engineer': [3500, 5500, 8500, 13000],

  // Default fallback
  'default': [3000, 5000, 7500, 11000],
};

function getCityTier(location) {
  if (!location) return 4;
  const loc = location.toLowerCase().trim();
  for (const [city, tier] of Object.entries(cityTiers)) {
    if (loc.includes(city)) return tier;
  }
  return 4; // unknown city
}

function getExperienceTier(years) {
  if (years <= 2) return 0;
  if (years <= 5) return 1;
  if (years <= 10) return 2;
  return 3;
}

function normalizeJobTitle(title) {
  if (!title) return '';
  return title.toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/ă|â/g, 'a')
    .replace(/ș|ş/g, 's')
    .replace(/ț|ţ/g, 't')
    .replace(/î|ì/g, 'i')
    .replace(/ö|ó/g, 'o');
}

function jobTitlesMatch(title1, title2, minSimilarity = 0.5) {
  const norm1 = normalizeJobTitle(title1);
  const norm2 = normalizeJobTitle(title2);
  
  // Exact match or substring match
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Simple word overlap check
  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const similarity = intersection / Math.max(words1.size, words2.size);
  
  return similarity >= minSimilarity;
}

function calculateMedian(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Note: getScrapedSalariesForJob has been deprecated as data was migrated to salary_data.json/Supabase.
 */
function getScrapedSalariesForJob(normalizedJobTitle) {
  return []; // Data is now in salary_data.json or Supabase
}

function getMedianSalary(normalizedJobTitle, location, yearsExperience) {
  const expTier = getExperienceTier(yearsExperience);
  const cityTier = getCityTier(location);
  const cityMultiplier = cityMultipliers[cityTier] || 0.65;

  // Experience multipliers: adjust base salary for seniority level
  const expMultipliers = [0.75, 1.0, 1.35, 1.75]; // 0-2yrs, 3-5yrs, 6-10yrs, 10+yrs

  // 1. Get salaries for this specific job from real market data
  let scrapedSalaries = getScrapedSalariesForJob(normalizedJobTitle);
  let userSalaries = [];
  
  try {
    const dbPath = path.join(__dirname, 'salary_data.json');
    if (fs.existsSync(dbPath)) {
      const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      if (dbData && Array.isArray(dbData.entries)) {
        for (const entry of dbData.entries) {
          if (!entry.job_title || !entry.salary) continue;
          const normJob = entry.normalized_job_title ? entry.normalized_job_title.toLowerCase() : '';
          if (jobTitlesMatch(entry.job_title, normalizedJobTitle, 0.4) || jobTitlesMatch(normJob, normalizedJobTitle, 0.4)) {
            if (entry.salary >= 1500 && entry.salary <= 45000) {
              userSalaries.push(entry.salary);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error reading user salary data:', e.message);
  }

  // 2. Calculate median from scraped + user data for this job
  const allSalaries = [...scrapedSalaries, ...userSalaries];
  if (allSalaries.length > 0) {
    const baseMedian = calculateMedian(allSalaries);
    const adjustedMedian = Math.round(baseMedian * cityMultiplier * expMultipliers[expTier]);
    
    console.log(`[ANALYSIS] "${normalizedJobTitle}" @ ${location} (${yearsExperience}yrs): ${allSalaries.length} data points. Base median: ${Math.round(baseMedian)}, Adjusted: ${adjustedMedian} RON`);
    return adjustedMedian;
  }

  // 3. FALLBACK to hardcoded benchmarks if no real data
  const jobKey = normalizedJobTitle.toLowerCase().trim();
  let benchmarkKey = 'default';
  let bestMatchLength = 0;

  for (const key of Object.keys(salaryBenchmarks)) {
    if (key === 'default') continue;
    if (jobKey.includes(key) || key.includes(jobKey)) {
      if (key.length > bestMatchLength) {
        bestMatchLength = key.length;
        benchmarkKey = key;
      }
    }
  }

  const baseMedian = salaryBenchmarks[benchmarkKey][expTier];
  const fallbackMedian = Math.round(baseMedian * cityMultiplier);
  console.log(`[ANALYSIS] No real data for "${normalizedJobTitle}". Using benchmark "${benchmarkKey}": ${fallbackMedian} RON`);
  return fallbackMedian;
}

module.exports = { getMedianSalary, getCityTier, getExperienceTier };
