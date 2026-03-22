const OpenAI = require('openai');

let client = null;

function getClient() {
  if (!client && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

async function validateAndNormalizeInput(jobTitle, location) {
  const ai = getClient();
  if (!ai) {
    return {
      isValid: true,
      normalizedTitle: jobTitle.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    };
  }
  try {
    const prompt = `Analizează următoarele date introduse de un utilizator pentru un calculator de salarii:
Job: "${jobTitle}"
Locație: "${location}"

1. Verifică dacă jobul reflectă o profesie reală (chiar dacă e prea vagă, informala sau generală, cum ar fi "antrenor" sau "lucrător"). Dacă e reală/vagă, e VALIDĂ; normalizează-o (ex. "Antrenor Sportiv").
2. Verifică locația. Dacă este un oraș/țară reală (chiar dacă e în afara României, ex: "Somalia", "Londra"), e VALIDĂ.

DOAR DACĂ meseria sau locația este complet absurdă, inventată, jignitoare sau o glumă evidentă (ex: "Biciclist Turbat", "În ceruri", "Șef la bani") vei respinge inputul. Fii indulgent.

Returnează STRICT un obiect JSON cu această structură:
{
  "isValid": boolean,
  "normalizedTitle": "string (dacă e valid) sau gol",
  "reason": "string (dacă invalid, explică scurt dece. ex: 'Numele jobului sau locația introduse par a fi invalide.')"
}`;
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: 'Ești un expert HR român care analizează strict veridicitatea datelor de input.' }, { role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 150,
      temperature: 0.1,
    });
    const result = JSON.parse(completion.choices[0].message.content.trim());
    return result;
  } catch (err) {
    console.error('OpenAI validate error:', err.message);
    return { isValid: true, normalizedTitle: jobTitle.trim() };
  }
}

/**
 * Returns median NET monthly salaries in EUR for 3 EU regions + freelance estimate.
 * Single GPT call returning JSON for efficiency.
 */
async function estimateEuropeanSalariesMulti(jobTitle, yearsExperience) {
  const ai = getClient();

  if (!ai) {
    return {
      east: 1800, eastCountry: 'Polonia',
      west: 3500, westCountry: 'Germania',
      south: 2400, southCountry: 'Spania',
    };
  }

  try {
    const prompt = `You are a European labor market expert. Estimate the median NET monthly salary in EUR for the following job:
Job: ${jobTitle}
Experience: ${yearsExperience} years

Return ONLY a valid JSON object with no additional text, with these exact keys:
{
  "east": <integer EUR - representative East EU country e.g. Poland, Czech Rep.>,
  "eastCountry": "<country name in Romanian>",
  "west": <integer EUR - representative West EU e.g. Germany, France, Benelux average>,
  "westCountry": "<country name in Romanian>",
  "south": <integer EUR - representative South EU e.g. Spain, Italy average>,
  "southCountry": "<country name in Romanian>"
}

Reflect realistic market differences between regions. Be specific and accurate.`;

    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120,
      temperature: 0.1,
    });

    const text = completion.choices[0].message.content.trim();
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      east: parseInt(parsed.east) || 1800,
      eastCountry: parsed.eastCountry || 'Polonia',
      west: parseInt(parsed.west) || 3500,
      westCountry: parsed.westCountry || 'Germania',
      south: parseInt(parsed.south) || 2400,
      southCountry: parsed.southCountry || 'Spania',
    };
  } catch (err) {
    console.error('OpenAI EU multi salary error:', err.message);
    return {
      east: 1800, eastCountry: 'Polonia',
      west: 3500, westCountry: 'Germania',
      south: 2400, southCountry: 'Spania',
    };
  }
}

/**
 * Estimates monthly freelance/independent contractor net income in EUR for Romanian market.
 */
async function estimateFreelanceIncome(jobTitle, yearsExperience) {
  const ai = getClient();

  if (!ai) {
    return { monthlyEur: 2200, monthlyRon: 11000 };
  }

  try {
    const prompt = `Estimate the realistic median NET monthly income in EUR for a freelancer / independent contractor in Romania working as:
Job: ${jobTitle}
Experience: ${yearsExperience} years

Consider: direct client contracts, platforms like Upwork/Freelancer, local B2B contracts. Include tax optimization typical for Romanian SRL/PFA.
Return ONLY the integer number representing monthly NET EUR.`;

    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10,
      temperature: 0.1,
    });

    const match = completion.choices[0].message.content.match(/\d+/);
    const monthlyEur = match ? parseInt(match[0], 10) : 2200;
    return { monthlyEur, monthlyRon: Math.round(monthlyEur * 5) };
  } catch (err) {
    console.error('OpenAI freelance income error:', err.message);
    return { monthlyEur: 2200, monthlyRon: 11000 };
  }
}

async function generateExplanation(jobTitle, location, score, euPercentageDiff, euRegions, romanianMedianSalary, freelanceMonthlyRon, userSalaryRon) {
  const ai = getClient();
  const above = euPercentageDiff >= 0;
  const absPerc = Math.abs(euPercentageDiff).toFixed(1);
  const freelanceAnnualGap = (freelanceMonthlyRon - userSalaryRon) * 12;

  if (!ai) {
    if (score >= 90) {
      return `Salariul tău este excelent față de media europeană. Te afli la nivelul piețelor din Vest – o poziție remarcabilă!`;
    } else if (score >= 70) {
      return `Salariul tău este bun și se apropie de media europeană. Există totuși loc pentru o negociere, mai ales dacă ai realizări concrete de prezentat.`;
    } else if (score >= 40) {
      return `Salariul tău este sub media europeană pentru ${jobTitle}. Analizând datele pieței, ar putea fi util să discuți o ajustare a pachetului cu angajatorul.`;
    } else {
      return `Salariul tău este semnificativ sub media europeană pentru ${jobTitle}. Ca liber profesionist, ai putea câștiga cu ${Math.round(Math.abs(freelanceAnnualGap) / 1000)}k RON mai mult anual.`;
    }
  }

  try {
    const prompt = `
Job: ${jobTitle}
Locație: ${location} (România)
Scor față de piața locală: ${score}/100
Diferență față de media locală RO: ${above ? '+' : ''}${euPercentageDiff.toFixed(1)}%

Medii europene lunare nete (EUR):
- Est (${euRegions.eastCountry}): ${euRegions.east} EUR
- Vest (${euRegions.westCountry}): ${euRegions.west} EUR
- Sud (${euRegions.southCountry}): ${euRegions.south} EUR

Media locală din ${location}: ${new Intl.NumberFormat('ro-RO').format(romanianMedianSalary)} RON/lună
Salariul utilizatorului: ${new Intl.NumberFormat('ro-RO').format(userSalaryRon)} RON/lună
Potențial freelance: ${new Intl.NumberFormat('ro-RO').format(freelanceMonthlyRon)} RON/lună

Scrie o evaluare de 3 fraze scurte în română:
1. Explică scorul față de piața locală din ${location}.
2. Compară cu contextul european (Est/Vest/Sud).
3. Menționează potențialul ca freelancer/contractor independent.
Ton: profesionist, empatic, direct. Nu folosi propoziții lungi.
`;
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Ești un expert în piața muncii din România. Răspunzi întotdeauna în română, concis și empatic.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 180,
      temperature: 0.7,
    });
    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error('OpenAI explain error:', err.message);
    return `Salariul tău este ${above ? 'cu ' + absPerc + '% peste' : 'cu ' + absPerc + '% sub'} media pieței pentru ${jobTitle} în ${location || 'zona ta'}.`;
  }
}

module.exports = { validateAndNormalizeInput, generateExplanation, estimateEuropeanSalariesMulti, estimateFreelanceIncome };
