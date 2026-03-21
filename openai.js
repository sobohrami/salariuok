const OpenAI = require('openai');

let client = null;

function getClient() {
  if (!client && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

async function normalizeJobTitle(rawTitle) {
  const ai = getClient();
  if (!ai) {
    // Fallback: capitalize properly
    return rawTitle.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  try {
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a job title normalizer. Convert informal or vague job titles into standard professional job titles used in Romania. Return ONLY the normalized title, nothing else. Examples: "marketing guy" -> "Marketing Specialist", "coder" -> "Software Developer", "IT" -> "IT Support Specialist"',
        },
        { role: 'user', content: rawTitle },
      ],
      max_tokens: 30,
      temperature: 0.1,
    });
    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error('OpenAI normalize error:', err.message);
    return rawTitle.trim();
  }
}

async function generateExplanation(jobTitle, location, score, percentageDiff, medianSalary, currency, romanianMedianSalary) {
  const ai = getClient();
  const above = percentageDiff >= 0;
  const absPerc = Math.abs(percentageDiff).toFixed(1);

  if (!ai) {
    // Fallback template
    if (score >= 90) {
      return `Salariul tău este excelent față de media europeană. Te afli la nivelul piețelor din Vest – o poziție remarcabilă!`;
    } else if (score >= 70) {
      return `Salariul tău este bun și se apropie de media europeană. Există totuși loc pentru o negociere, mai ales dacă ai realizări concrete de prezentat.`;
    } else if (score >= 40) {
      return `Salariul tău este sub media europeană pentru ${jobTitle}. Analizând clar datele pieței, ar putea fi util să discuți o ajustare a pachetului cu angajatorul.`;
    } else {
      return `Salariul tău este semnificativ sub media europeană pentru ${jobTitle}. Îți recomandăm să analizezi opțiunile disponibile – piața internațională îți oferă mult mai mult decât primești acum.`;
    }
  }

  try {
    const prompt = `
Job: ${jobTitle}
Location: ${location} (Romania)
Score vs Europe: ${score}/100
Gap vs Europe: ${above ? '+' : ''}${percentageDiff.toFixed(1)}%
European median: ${medianSalary} ${currency}/month
Local Romanian median: ${romanianMedianSalary} ${currency}/month

Write a 2-sentence evaluation in Romanian. 
1st sentence: Explain the European comparison (the reason for the score). 
2nd sentence: Acknowledge the local Romanian reality (e.g., how they compare to local peers). 
Be direct, realistic, and use a professional yet empathetic tone.
`;
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a Romanian salary market expert writing empathetic, insightful salary analysis. Always respond in Romanian.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 120,
      temperature: 0.7,
    });
    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error('OpenAI explain error:', err.message);
    return `Salariul tău este ${above ? 'cu ' + absPerc + '% peste' : 'cu ' + absPerc + '% sub'} media pieței pentru ${jobTitle} în ${location || 'zona ta'}.`;
  }
}

async function estimateEuropeanSalary(jobTitle, yearsExperience) {
  const ai = getClient();
  if (!ai) return 3000; // Fallback to 3000 EUR
  
  try {
    const prompt = `Estimate the median NET monthly salary in EUR for Western Europe (Germany/France/Benelux/Nordics average) for:
Job: ${jobTitle}
Experience: ${yearsExperience} years

Consider that specialized, high-demand, or high-earning niche roles (e.g. niche tech, high-risk services, or very specialized consultants) often have medians well above the 2000-3000 EUR base.
Return ONLY the integer number.`;
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10,
      temperature: 0.1,
    });
    
    // Extract numbers from the response just in case the AI added extra chars
    const match = completion.choices[0].message.content.match(/\d+/);
    return match ? parseInt(match[0], 10) : 3000;
  } catch (err) {
    console.error('OpenAI EU salary error:', err.message);
    return 3000;
  }
}

module.exports = { normalizeJobTitle, generateExplanation, estimateEuropeanSalary };
