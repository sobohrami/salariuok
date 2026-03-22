require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { validateAndNormalizeInput, generateExplanation, estimateEuropeanSalariesMulti, estimateFreelanceIncome } = require('./openai');
const { getMedianSalary } = require('./salaryData');
const { saveEntry, getStats } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// POST /api/analyze
app.post('/api/analyze', async (req, res) => {
  try {
    const { jobTitle, location, yearsExperience, salary, currency = 'RON' } = req.body;

    // Validate inputs
    if (!jobTitle || !location || yearsExperience === undefined || !salary) {
      return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii.' });
    }
    if (typeof salary !== 'number' || salary <= 0) {
      return res.status(400).json({ error: 'Salariul trebuie să fie un număr pozitiv.' });
    }
    if (typeof yearsExperience !== 'number' || yearsExperience < 0) {
      return res.status(400).json({ error: 'Experiența trebuie să fie un număr valid.' });
    }

    // 1. Normalize job title & Validate Input
    const inputStatus = await validateAndNormalizeInput(jobTitle.trim(), location.trim());
    
    if (!inputStatus.isValid) {
      return res.status(400).json({ error: inputStatus.reason || 'Jobul sau locația introduse nu par a fi valide.' });
    }
    const normalizedTitle = inputStatus.normalizedTitle;

    // 2. Fetch all salary data in parallel
    const [euRegions, freelanceData, romanianMedianSalary] = await Promise.all([
      estimateEuropeanSalariesMulti(normalizedTitle, yearsExperience),
      estimateFreelanceIncome(normalizedTitle, yearsExperience),
      Promise.resolve(getMedianSalary(normalizedTitle, location, yearsExperience)),
    ]);

    const EUR_TO_RON = 5;

    // 3. Score: compared against LOCAL Romanian median for this city/job (location-aware)
    const localBenchmark = romanianMedianSalary; // already city-aware from salaryData.js
    const rawScore = (salary / localBenchmark) * 100;
    const score = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Suggested range based on local market (±20% of local median)
    const minSalary = Math.round(localBenchmark * 0.9);
    const maxSalary = Math.round(localBenchmark * 1.3);

    // EU West comparison (informational)
    const euWestRon = euRegions.west * EUR_TO_RON;
    const euDifference = salary - euWestRon;
    const euPercentageDiff = (euDifference / euWestRon) * 100;
    const annualDiff = Math.round(euDifference * 12);

    // Romanian local comparison
    const roDifference = salary - romanianMedianSalary;
    const roPercentageDiff = (roDifference / romanianMedianSalary) * 100;

    // Freelance gap calculations
    const freelanceMonthlyRon = freelanceData.monthlyRon;
    const freelanceMonthlyEur = freelanceData.monthlyEur;
    const freelanceAnnualGapRon = Math.round((freelanceMonthlyRon - salary) * 12);

    // EU regions with percentage vs user salary
    const euRegionsWithDiff = {
      east: euRegions.east,
      eastCountry: euRegions.eastCountry,
      eastRon: euRegions.east * EUR_TO_RON,
      eastDiffPct: parseFloat((((euRegions.east * EUR_TO_RON) - salary) / salary * 100).toFixed(1)),

      west: euRegions.west,
      westCountry: euRegions.westCountry,
      westRon: euRegions.west * EUR_TO_RON,
      westDiffPct: parseFloat((((euRegions.west * EUR_TO_RON) - salary) / salary * 100).toFixed(1)),

      south: euRegions.south,
      southCountry: euRegions.southCountry,
      southRon: euRegions.south * EUR_TO_RON,
      southDiffPct: parseFloat((((euRegions.south * EUR_TO_RON) - salary) / salary * 100).toFixed(1)),
    };

    // 4. Score label
    let scoreLabel, scoreEmoji;
    if (score < 40) { scoreLabel = 'Subplătit'; scoreEmoji = '😬'; }
    else if (score < 70) { scoreLabel = 'Corect'; scoreEmoji = '😐'; }
    else if (score < 90) { scoreLabel = 'Bun'; scoreEmoji = '🙂'; }
    else { scoreLabel = 'Excelent'; scoreEmoji = '😎'; }

    // 5. AI explanation
    const explanation = await generateExplanation(
      normalizedTitle, location, score, euPercentageDiff,
      euRegions, romanianMedianSalary, freelanceMonthlyRon, salary
    );

    // 6. Save to DB
    await saveEntry({
      jobTitle: jobTitle.trim(),
      normalizedJobTitle: normalizedTitle,
      location: location.trim(),
      yearsExperience,
      salary,
      medianSalary: euWestRon,
      score,
    });

    // 7. Return result
    res.json({
      normalizedTitle,
      score,
      scoreLabel,
      scoreEmoji,
      medianSalary: euWestRon,
      minSalary,
      maxSalary,
      difference: Math.round(euDifference),
      percentageDiff: parseFloat(euPercentageDiff.toFixed(1)),
      annualDiff,
      euMedianEur: euRegions.west,
      roMedianRon: romanianMedianSalary,
      roPercentageDiff: parseFloat(roPercentageDiff.toFixed(1)),
      euRegions: euRegionsWithDiff,
      freelanceMonthlyEur,
      freelanceMonthlyRon,
      freelanceAnnualGapRon,
      explanation,
      currency,
    });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'A apărut o eroare. Te rugăm să încerci din nou.' });
  }
});

// GET /api/stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch stats.' });
  }
});

// Catch-all: serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only listen if NOT running as a serverless function (e.g. Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 SalariuOK server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
