/**
 * scraper_undelucram.js
 * =====================
 * Scrapes public salary data from UndeLucram.ro (no login required).
 *
 * Data sources:
 *  1. Homepage "Salarii recente" widget  → a few dozen rotating entries
 *  2. Company salary pages (public portion) → scraped by company ID range
 *
 * Output: scraped_salaries.json
 *
 * Usage:
 *   node scraper_undelucram.js
 *   node scraper_undelucram.js --pages 5   (scrape 5 pages of recent salaries)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────
const BASE_URL = 'https://www.undelucram.ro';
const OUTPUT_FILE = path.join(__dirname, 'scraped_salaries.json');
const DELAY_MS = 1200; // polite delay between requests

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Cookie: 'selected_language=ro; ucity=Bucharest; _ga=GA1.1.680372286.1774211530; _fbp=fb.1.1774211530479.795133777336882891; _tt_enable_cookie=1; _ttp=01KMBKYZYY5WDEJNHYX0PCD0YE_.tt.1; cookie_ul=granted; cc_ads=granted; cc_analytics=granted; _gcl_au=1.1.910533331.1774211529.290702095.1774213108.1774213626; XSRF-TOKEN=eyJpdiI6IndQcUhkSlpWT0FEUUN0Snk2REc1a1E9PSIsInZhbHVlIjoiR2h0WlpSd25uck1PU2d3cVhZbW5mMjh0aSt6WlZscit0WGxvLzBEZ0l2V3JMaDJWWjB6YTRBMzBwQzJ0Ujk1YThWa3Y1UFdvdXM5c3dLdVlxS1IrNTd3YXFkcWdIeVRHUzhrem9vb0ZZb0JKdVlwdG5ZRHdsRWVYbWpRRjZwcVIiLCJtYWMiOiIyYzU4MjgyYTMwY2ZjMWU4ZjFlMjFkMmNjMTZhOTVlNzMwZmE2MDIyNmE1Y2MxODdkMjU1ODE3ZmE4YTg5OGI0IiwidGFnIjoiIn0%3D; wherewework_session=eyJpdiI6ImRNYjRtSTBrUUR4TDZUWTZIYW12MlE9PSIsInZhbHVlIjoiWmU2Vm42TDg1TXVpalFRb0dEOCs2NEszVzg2Z0lOSS8rUUJMTzhqTkdMR0dyTDQ5NkJWMEo1OFdYVWdUZGp1S2grTUpkV0kvYlpoOTQ4OCtqUFhCaW5lWExWRzhLbmRhbndGUHZHRzJHc3p1V1o5czB1UVVWRis5UTI0T3VpM2kiLCJtYWMiOiI1OWE0ZTY5NDZjOGE3NDE0ZDNlZGE0NGIxYzA0NDE0Zjg0ZTQ0ZDg4YjMwMmI0OTgwYzliMjBhMDk2NWZhNmE4IiwidGFnIjoiIn0%3D; _ga_7RGD8DK7VG=GS2.1.s1774211530$o1$g1$t1774214027$j22$l0$h0; ttcsid=1774211530732::h-IgPyzuHe0Ok0kalIvA.1.1774214028093.0; ttcsid_CH8BGCJC77UEQOU9DA60=1774211530731::BUCFxvgRN9adVhUPkwbC.1.1774214028093.1',
};

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse "22.03.2026" → { date: "22.03.2026", year: 2026 }
 */
function parseDate(rawDate) {
  if (!rawDate) return { date: null, year: null };
  const clean = rawDate.trim();
  const match = clean.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return { date: clean, year: null };
  return { date: clean, year: parseInt(match[3], 10) };
}

/**
 * Parse "8.000 Lei" → 8000
 */
function parseSalary(rawSalary) {
  if (!rawSalary) return null;
  const clean = rawSalary.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

// ──────────────────────────────────────────────
// SCRAPER 1: Homepage "Salarii recente"
// ──────────────────────────────────────────────

async function scrapeHomepageSalaries() {
  console.log('\n📡 Scraping homepage "Salarii recente"...');
  const results = [];

  try {
    const response = await axios.get(`${BASE_URL}/ro`, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);

    // The salary cards appear under "Salarii recente" section
    // Each card has: date, salary amount, job title, employment status, job type, company
    $('section, div, article').each((_, section) => {
      const sectionText = $(section).text();
      // Look for sections containing salary card patterns
      if (!sectionText.includes('Lei') || !sectionText.includes('Full-time')) return;

      // Try to find salary card items within this section
      $(section).find('a').each((_, card) => {
        const cardHtml = $(card).html() || '';
        const cardText = $(card).text().trim();

        // Must contain Lei to be a salary entry
        if (!cardText.includes('Lei')) return;

        // Extract date (DD.MM.YYYY pattern)
        const dateMatch = cardText.match(/(\d{2}\.\d{2}\.\d{4})/);
        if (!dateMatch) return;

        // Extract salary (number followed by Lei)
        const salaryMatch = cardHtml.match(/([\d.,]+)\s*Lei/i) || cardText.match(/([\d,. ]+)\s*Lei/i);
        if (!salaryMatch) return;

        // Extract employment info lines
        const lines = cardText.split('\n').map(l => l.trim()).filter(Boolean);

        const rawDate = dateMatch[1];
        const rawSalary = salaryMatch[1];

        // Find job title (line after salary line usually)
        let jobTitle = null;
        let employmentStatus = null;
        let jobType = null;
        let company = null;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.match(/^\d{2}\.\d{2}\.\d{4}$/)) continue; // skip date lines
          if (line.match(/[\d.,]+\s*Lei/i)) continue; // skip salary lines
          if (line.match(/^\d+\s+evalua/i)) continue; // skip "N evaluări"

          if (!jobTitle && !line.includes('angajat') && !line.includes('Full-time') && !line.includes('Part-time') && line.length > 2 && line.length < 80) {
            jobTitle = line;
          } else if (line.includes('angajat') || line.includes('Angajat')) {
            const parts = line.split('-').map(p => p.trim());
            if (parts.length >= 2) {
              employmentStatus = parts[0];
              jobType = parts[1];
            } else {
              employmentStatus = line;
            }
          } else if (!company && !line.includes('angajat') && !line.includes('Full-time') && !line.includes('Part-time') && line.length > 1 && line.length < 100 && jobTitle) {
            company = line;
          }
        }

        if (!jobTitle) return; // skip incomplete entries

        const { date, year } = parseDate(rawDate);
        const salary_ron = parseSalary(rawSalary);

        if (!salary_ron) return;

        results.push({
          date,
          year,
          salary_ron,
          job_title: jobTitle,
          employment_status: employmentStatus,
          job_type: jobType,
          company,
          source_url: `${BASE_URL}/ro`,
          scraped_at: new Date().toISOString(),
        });
      });
    });

    // Deduplicate by (date + salary + job_title)
    const seen = new Set();
    const unique = results.filter((r) => {
      const key = `${r.date}|${r.salary_ron}|${r.job_title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`   ✅ ${unique.length} salarii extrase de pe homepage`);
    return unique;
  } catch (err) {
    console.error('   ❌ Eroare homepage:', err.message);
    return [];
  }
}

// ──────────────────────────────────────────────
// SCRAPER 2: Company salary pages (public data)
// ──────────────────────────────────────────────

const MANUAL_PAGES = [
  { slug: 'lactalis-totul-despre-mediul-de-lucru', id: 39047 },
  { slug: 'jti-romania-totul-despre-mediul-de-lucru-salariu', id: 145 },
  { slug: 'booking-holdings-totul-despre-mediul-de-lucru', id: 144793 },
  { slug: 'jysk-romania-mediul-de-lucru', id: 1093 },
  { slug: 'kpmg-romania-totul-despre-mediul-de-lucru-interviu', id: 120 },
  { slug: 'oracle-totul-despre-mediul-de-lucru-interviu-salariu', id: 19 },
  { slug: 'emag-romania-totul-despre-mediul-de-lucru-interviu', id: 28 },
];

async function scrapeTopCompanies() {
  console.log('\n🌟 Se preiau companiile de pe pagina Top...');
  const companies = [];
  try {
    const response = await axios.get(`${BASE_URL}/ro/top`, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);
    
    // Caută toate linkurile care par a fi către salarii și extrage slug și ID
    $('a[href*="/ro/prezentare-"]').each((_, el) => {
      const href = $(el).attr('href');
      // Se potrivește /ro/prezentare-titlu-companie-1234
      const match = href.match(/\/ro\/prezentare-(.+)-(\d+)(\?.*)?$/);
      if (match) {
        companies.push({ slug: match[1], id: parseInt(match[2], 10) });
      }
    });

    const unique = [];
    const seen = new Set();
    for (const c of companies) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        unique.push(c);
      }
    }
    
    console.log(`   ✅ S-au găsit ${unique.length} companii din topuri.`);
    return unique;
  } catch(e) {
    console.warn(`   ⚠️ Eroare la preluarea topului de companii: ${e.message}`);
    return [];
  }
}
async function scrapeCompanyPage(slug, id) {
  const baseUrl = `${BASE_URL}/ro/salarii-${slug}-${id}`;
  const results = [];
  
  const currentYear = new Date().getFullYear();
  // An limită calculat bazat pe preferința a ultimilor 5 ani
  const MIN_YEAR = currentYear - 5;
  let page = 1;
  let companyName = slug;

  while (page <= 20) { // Limităm strict paginile descărcate per firmă ca să evităm loop-uri masive
    const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
    try {
      if (page > 1) await sleep(DELAY_MS);
      const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const $ = cheerio.load(response.data);

      if (page === 1) {
        companyName = $('h1, .company-name, [class*="company"]').first().text().trim() || slug;
      }

      let addedThisPage = 0;
      let hasOldSalaries = false;

      $('div, article, li').each((_, el) => {
        const text = $(el).text().trim();
        if (!text.includes('Lei')) return;

        const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})/);
        const salaryMatch = text.match(/([\d.,\s]+)\s*Lei/i);
        if (!dateMatch || !salaryMatch) return;

        const { date, year } = parseDate(dateMatch[1]);
        if (!year) return;

        // Limitează la ultimii 5 ani. Salarile de obicei sunt sortate cronologic.
        if (year < MIN_YEAR) {
          hasOldSalaries = true;
          return;
        }

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        let jobTitle = null;
        let employmentStatus = null;
        let jobType = null;

        for (const line of lines) {
          if (line.match(/\d{2}\.\d{2}\.\d{4}/)) continue;
          if (line.match(/[\d.,]+\s*Lei/i)) continue;
          if (line.match(/^\d+/)) continue;

          if (!jobTitle && line.length > 2 && line.length < 80 && !line.includes('angajat') && !line.includes('Full-time') && !line.includes('Part-time')) {
            jobTitle = line;
          } else if (line.includes('angajat') || line.includes('Angajat')) {
            const parts = line.split('-').map(p => p.trim());
            employmentStatus = parts[0] || line;
            jobType = parts[1] || null;
          }
        }

        if (!jobTitle) return;

        const salary_ron = parseSalary(salaryMatch[1]);
        if (!salary_ron) return;

        results.push({
          date,
          year,
          salary_ron,
          job_title: jobTitle,
          employment_status: employmentStatus,
          job_type: jobType,
          company: companyName,
          source_url: url,
          scraped_at: new Date().toISOString(),
        });
        addedThisPage++;
      });

      console.log(`     -> Pagina ${page}: extras ${addedThisPage} salarii reci (>= ${MIN_YEAR})`);

      if (addedThisPage === 0) break; 
      if (hasOldSalaries) {
         console.log(`     -> Au fost detectate date mai vechi de ${MIN_YEAR}. Oprim paginarea la ${companyName}.`);
         break;
      }

      page++;
    } catch (err) {
      if (err.response && (err.response.status === 404 || err.response.status === 403)) break;
      console.warn(`   ⚠️ Eroare pe pagina ${page}: ${err.message}`);
      break;
    }
  }

  const seen = new Set();
  return results.filter((r) => {
    const key = `${r.date}|${r.salary_ron}|${r.job_title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function scrapeAllCompanyPages() {
  const topCompanies = await scrapeTopCompanies();
  
  // Îmbinăm sursele manuale și automate fără duplicate
  const allTargets = [...MANUAL_PAGES];
  const seenIds = new Set(MANUAL_PAGES.map(c => c.id));
  
  for (const tc of topCompanies) {
    if (!seenIds.has(tc.id)) {
      seenIds.add(tc.id);
      allTargets.push(tc);
    }
  }

  console.log(`\n🏢 Se va executa scraping avansat pe ${allTargets.length} firme...`);
  const all = [];

  for (const { slug, id } of allTargets) {
    await sleep(DELAY_MS);
    console.log(`\n   => Verific firma: ${slug.split('-')[0].toUpperCase()} (ID: ${id})`);
    const entries = await scrapeCompanyPage(slug, id);
    if (entries.length > 0) {
      console.log(`   ✅ Total extras de la ${slug.split('-')[0]}: ${entries.length} salarii`);
      all.push(...entries);
    }
  }

  console.log(`   ✅ Total extras din sursele paginate: ${all.length} salarii.`);
  return all;
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

async function main() {
  console.log('🚀 UndeLucram.ro Salary Scraper');
  console.log('================================');

  const homepageData = await scrapeHomepageSalaries();
  await sleep(DELAY_MS);
  const companyData = await scrapeAllCompanyPages();

  const all = [...homepageData, ...companyData];

  // Final deduplication across all sources
  const seen = new Set();
  const unique = all.filter((r) => {
    const key = `${r.date}|${r.salary_ron}|${r.job_title}|${r.company}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date descending
  unique.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    const [da, ma, ya] = a.date.split('.').map(Number);
    const [db, mb, yb] = b.date.split('.').map(Number);
    return new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da);
  });

  // Save output
  const output = {
    scraped_at: new Date().toISOString(),
    source: 'undelucram.ro',
    total: unique.length,
    entries: unique,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log('\n════════════════════════════════');
  console.log(`✅ Total salarii unice: ${unique.length}`);
  console.log(`📁 Salvat în: ${OUTPUT_FILE}`);

  // Print summary stats
  const byYear = {};
  for (const e of unique) {
    if (e.year) byYear[e.year] = (byYear[e.year] || 0) + 1;
  }
  if (Object.keys(byYear).length > 0) {
    console.log('\nDistribuție pe ani:');
    for (const [yr, count] of Object.entries(byYear).sort((a, b) => b[0] - a[0])) {
      console.log(`   ${yr}: ${count} salarii`);
    }
  }

  const avgSalary = unique.reduce((sum, e) => sum + (e.salary_ron || 0), 0) / (unique.length || 1);
  console.log(`\nSalariu mediu scrapat: ${Math.round(avgSalary).toLocaleString('ro-RO')} Lei/lună`);

  // Show first 5 entries as preview
  console.log('\nPrimele 5 intrări:');
  unique.slice(0, 5).forEach((e, i) => {
    console.log(`   ${i + 1}. [${e.date}] ${e.job_title} @ ${e.company || '?'} → ${e.salary_ron?.toLocaleString('ro-RO')} Lei`);
  });
}

main().catch((err) => {
  console.error('❌ Eroare fatală:', err);
  process.exit(1);
});
