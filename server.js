require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { normalizeJobTitle, generateExplanation, estimateEuropeanSalary } = require('./openai');
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

    // 1. Normalize job title
    const normalizedTitle = await normalizeJobTitle(jobTitle.trim());

    // 2. Fetch European and Romanian Median Salaries
    const euMedianEur = await estimateEuropeanSalary(normalizedTitle, yearsExperience);
    const euMedianRon = euMedianEur * 5; // Approx 5 RON = 1 EUR
    const romanianMedianSalary = getMedianSalary(normalizedTitle, location, yearsExperience);

    // 3. Calculations (Comparing strictly against EUROPEAN Median)
    const rawScore = (salary / euMedianRon) * 100;
    const score = Math.min(100, Math.max(0, Math.round(rawScore)));

    const minSalary = Math.round(euMedianRon * 0.8);
    const maxSalary = Math.round(euMedianRon * 1.2);

    const euDifference = salary - euMedianRon;
    const euPercentageDiff = (euDifference / euMedianRon) * 100;
    const annualDiff = Math.round(euDifference * 12);

    // Romanian Comparison
    const roDifference = salary - romanianMedianSalary;
    const roPercentageDiff = (roDifference / romanianMedianSalary) * 100;

    // 4. Score label
    let scoreLabel, scoreEmoji;
    if (score < 40) { scoreLabel = 'Subplătit'; scoreEmoji = '😬'; }
    else if (score < 70) { scoreLabel = 'Corect'; scoreEmoji = '😐'; }
    else if (score < 90) { scoreLabel = 'Bun'; scoreEmoji = '🙂'; }
    else { scoreLabel = 'Excelent'; scoreEmoji = '😎'; }

    // 5. AI explanation
    const explanation = await generateExplanation(normalizedTitle, location, score, euPercentageDiff, euMedianRon, currency, romanianMedianSalary);

    // 6. Save to DB (Persistent)
    await saveEntry({
      jobTitle: jobTitle.trim(),
      normalizedJobTitle: normalizedTitle,
      location: location.trim(),
      yearsExperience,
      salary,
      medianSalary: euMedianRon,
      score,
    });

    // 7. Return result
    res.json({
      normalizedTitle,
      score,
      scoreLabel,
      scoreEmoji,
      medianSalary: euMedianRon,
      minSalary,
      maxSalary,
      difference: Math.round(euDifference),
      percentageDiff: parseFloat(euPercentageDiff.toFixed(1)),
      annualDiff,
      euMedianEur,
      roMedianRon: romanianMedianSalary,
      roPercentageDiff: parseFloat(roPercentageDiff.toFixed(1)),
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
