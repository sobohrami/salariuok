'use strict';

// ============================================================
//  AUTOCOMPLETE DATA
// ============================================================
const JOB_SUGGESTIONS = [
  'Software Developer', 'Software Engineer', 'Frontend Developer',
  'Backend Developer', 'Full Stack Developer', 'Mobile Developer',
  'DevOps Engineer', 'Data Engineer', 'Data Scientist',
  'Machine Learning Engineer', 'QA Engineer', 'System Administrator',
  'Network Engineer', 'Cybersecurity Analyst', 'UI/UX Designer',
  'Product Manager', 'Project Manager', 'Scrum Master',
  'Business Analyst', 'Technical Writer',
  'Accountant', 'Financial Analyst', 'Controller', 'Auditor',
  'Marketing Specialist', 'Digital Marketing Specialist', 'SEO Specialist',
  'Content Writer', 'Social Media Manager', 'Marketing Manager',
  'Sales Representative', 'Account Manager', 'Sales Manager',
  'Business Development', 'HR Specialist', 'Recruiter', 'HR Manager',
  'Operations Manager', 'Logistics Coordinator', 'Customer Support',
  'Customer Success Manager', 'Lawyer', 'Teacher',
  'Doctor', 'Nurse', 'Pharmacist', 'Architect', 'Civil Engineer',
  'Meșter Constructor', 'Electrician', 'Instalator', 'Sudor', 'Mecanic Auto',
  'Zugrav', 'Faianțar', 'Tâmplar', 'Bucătar', 'Chef', 'Ospătar',
];

const CITY_SUGGESTIONS = [
  'București', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Brașov',
  'Constanța', 'Sibiu', 'Oradea', 'Craiova', 'Bacău',
  'Ploiești', 'Pitești', 'Galați', 'Arad', 'Târgu Mureș',
  'Suceava', 'Reșița', 'Slatina', 'Drobeta-Turnu Severin',
];

const COUNTRY_FLAGS = {
  'Germania': '🇩🇪', 'Franța': '🇫🇷', 'Franta': '🇫🇷', 'Olanda': '🇳🇱',
  'Belgia': '🇧🇪', 'Austria': '🇦🇹', 'Elveția': '🇨🇭', 'Elvetia': '🇨🇭',
  'Suedia': '🇸🇪', 'Norvegia': '🇳🇴', 'Danemarca': '🇩🇰', 'Finlanda': '🇫🇮',
  'Polonia': '🇵🇱', 'Cehia': '🇨🇿', 'Ungaria': '🇭🇺', 'Slovacia': '🇸🇰',
  'Bulgaria': '🇧🇬', 'Croatia': '🇭🇷', 'Croația': '🇭🇷',
  'Spania': '🇪🇸', 'Italia': '🇮🇹', 'Portugalia': '🇵🇹', 'Grecia': '🇬🇷',
  'Lituania': '🇱🇹', 'Latvia': '🇱🇻', 'Estonia': '🇪🇪',
};
function getFlag(c) {
  if (COUNTRY_FLAGS[c]) return COUNTRY_FLAGS[c];
  const k = Object.keys(COUNTRY_FLAGS).find(x => x.toLowerCase() === c.toLowerCase());
  return k ? COUNTRY_FLAGS[k] : '🌍';
}

// ============================================================
//  DOM REFERENCES
// ============================================================
const formSection = document.getElementById('formSection');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const salaryForm = document.getElementById('salaryForm');
const jobTitleInput = document.getElementById('jobTitle');
const locationInput = document.getElementById('location');
const experienceSlider = document.getElementById('experience');
const expValue = document.getElementById('expValue');
const salaryInput = document.getElementById('salary');
const submitBtn = document.getElementById('submitBtn');
const loadingStep = document.getElementById('loadingStep');
const headerStats = document.getElementById('headerStats');
const retryBtn = document.getElementById('retryBtn');
const shareBtn = document.getElementById('shareBtn');
const logoHome = document.getElementById('logo-home');
const toast = document.getElementById('toast');

// ============================================================
//  SECTION NAVIGATION
// ============================================================
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
//  SLIDER
// ============================================================
experienceSlider.addEventListener('input', () => {
  const v = experienceSlider.value;
  expValue.textContent = v === '20' ? '20+' : v;
  experienceSlider.setAttribute('aria-valuenow', v);
  updateSliderBackground();
});
function updateSliderBackground() {
  const pct = (experienceSlider.value / experienceSlider.max) * 100;
  experienceSlider.style.background =
    `linear-gradient(to right, var(--teal) 0%, var(--blue) ${pct}%, var(--border) ${pct}%)`;
}
updateSliderBackground();

// ============================================================
//  AUTOCOMPLETE
// ============================================================
function setupAutocomplete(input, dropdownId, suggestions) {
  const dropdown = document.getElementById(dropdownId);
  let activeIndex = -1;
  function showDropdown(items) {
    dropdown.innerHTML = '';
    activeIndex = -1;
    if (!items.length) { dropdown.classList.remove('open'); return; }
    items.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      div.textContent = item;
      div.setAttribute('role', 'option');
      div.setAttribute('id', `${dropdownId}-item-${i}`);
      div.addEventListener('mousedown', (e) => { e.preventDefault(); input.value = item; dropdown.classList.remove('open'); });
      dropdown.appendChild(div);
    });
    dropdown.classList.add('open');
  }
  input.addEventListener('input', () => {
    const val = input.value.toLowerCase().trim();
    if (!val) { dropdown.classList.remove('open'); return; }
    showDropdown(suggestions.filter(s => s.toLowerCase().includes(val)).slice(0, 7));
  });
  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.autocomplete-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); items[activeIndex]?.classList.remove('active'); activeIndex = (activeIndex + 1) % items.length; items[activeIndex]?.classList.add('active'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[activeIndex]?.classList.remove('active'); activeIndex = (activeIndex - 1 + items.length) % items.length; items[activeIndex]?.classList.add('active'); }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); input.value = items[activeIndex].textContent; dropdown.classList.remove('open'); }
    else if (e.key === 'Escape') { dropdown.classList.remove('open'); }
  });
  document.addEventListener('click', (e) => { if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('open'); });
}
setupAutocomplete(jobTitleInput, 'jobSuggestions', JOB_SUGGESTIONS);
setupAutocomplete(locationInput, 'locationSuggestions', CITY_SUGGESTIONS);

// ============================================================
//  FORM VALIDATION
// ============================================================
function setError(groupId, errorId, msg) {
  const group = document.getElementById(groupId);
  const err = document.getElementById(errorId);
  if (msg) { group?.classList.add('has-error'); if (err) err.textContent = msg; }
  else { group?.classList.remove('has-error'); if (err) err.textContent = ''; }
}
function validateForm() {
  let valid = true;
  if (!jobTitleInput.value.trim()) { setError('group-jobTitle', 'jobTitle-error', 'Te rugăm să introduci titlul jobului.'); valid = false; }
  else setError('group-jobTitle', 'jobTitle-error', '');
  if (!locationInput.value.trim()) { setError('group-location', 'location-error', 'Te rugăm să introduci orașul.'); valid = false; }
  else setError('group-location', 'location-error', '');
  const sal = parseFloat(salaryInput.value);
  if (!salaryInput.value || isNaN(sal) || sal < 1500 || sal > 100000) { 
    setError('group-salary', 'salary-error', 'Te rugăm să introduci un salariu valid între 1.500 și 100.000 RON.'); 
    valid = false; 
  } else setError('group-salary', 'salary-error', '');
  return valid;
}

// ============================================================
//  LOADING STEPS
// ============================================================
const LOADING_STEPS = [
  'Normalizăm titlul jobului…',
  'Comparăm cu piața din Europa…',
  'Calculăm potențialul tău freelance…',
  'Calculăm scorul tău de salarizare…',
  'Generăm insight-ul personalizat…',
];
let loadingInterval = null;
function startLoadingSteps() {
  let i = 0;
  loadingStep.textContent = LOADING_STEPS[0];
  loadingInterval = setInterval(() => { i = (i + 1) % LOADING_STEPS.length; loadingStep.textContent = LOADING_STEPS[i]; }, 1800);
}
function stopLoadingSteps() { clearInterval(loadingInterval); }

// ============================================================
//  SCORE RING ANIMATION
// ============================================================
function animateScore(score) {
  const circumference = 2 * Math.PI * 58; // r=58
  const ring = document.getElementById('ringFill');
  const numEl = document.getElementById('scoreNumber');
  ring.style.strokeDashoffset = circumference;
  const startTime = performance.now();
  function update(now) {
    const progress = Math.min((now - startTime) / 1500, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(ease * score);
    ring.style.strokeDashoffset = circumference - (current / 100) * circumference;
    numEl.textContent = current;
    if (progress < 1) requestAnimationFrame(update);
    else numEl.textContent = score;
  }
  setTimeout(() => requestAnimationFrame(update), 200);
}

// ============================================================
//  SALARY LADDER
// ============================================================
function renderLadder(data) {
  const { roMedianRon, euRegions, freelanceMonthlyRon, currency = 'RON' } = data;
  const userSalary = parseFloat(salaryInput.value) || 0;
  const EUR_TO_RON = 5;

  // ── Group 1: Personal (Tu) ──
  const personalEntries = [
    { label: 'Venitul tău', value: userSalary, flag: '💰', color: 'ladder-self', isSelf: true },
  ];

  // ── Group 2: Market medians ──
  const marketEntries = [
    { label: `Media ${euRegions.eastCountry}`, value: euRegions.east * EUR_TO_RON, eurVal: euRegions.east, flag: getFlag(euRegions.eastCountry), color: 'ladder-east' },
    { label: `Media ${euRegions.southCountry}`, value: euRegions.south * EUR_TO_RON, eurVal: euRegions.south, flag: getFlag(euRegions.southCountry), color: 'ladder-south' },
    { label: 'Media România', value: roMedianRon, flag: '🇷🇴', color: 'ladder-ro' },
    { label: `Media ${euRegions.westCountry}`, value: euRegions.west * EUR_TO_RON, eurVal: euRegions.west, flag: getFlag(euRegions.westCountry), color: 'ladder-west', isBenchmark: true },
  ].sort((a, b) => a.value - b.value);

  const allEntries = [...personalEntries, ...marketEntries];
  const maxVal = Math.max(...allEntries.map(e => e.value));

  const container = document.getElementById('ladderRows');
  container.innerHTML = '';

  let animDelay = 0;

  function buildGroup(entries, groupLabel, showBars = true) {
    // Group header
    const header = document.createElement('div');
    header.className = 'ladder-group-header';
    if (!showBars) header.style.marginTop = '0';
    header.textContent = groupLabel;
    container.appendChild(header);

    entries.forEach((entry) => {
      const pct = Math.max(6, Math.round((entry.value / maxVal) * 100));
      const row = document.createElement('div');
      row.className = `ladder-row ${entry.color}${entry.isSelf ? ' ladder-row-self' : ''}${!showBars ? ' no-bar' : ''}`;
      row.style.setProperty('--bar-pct', pct + '%');
      row.style.animationDelay = `${animDelay * 70}ms`;

      const valueLabel = entry.eurVal
        ? `${formatNum(entry.value)} RON<span class="ladder-eur">${formatNum(entry.eurVal)} EUR</span>`
        : `${formatNum(entry.value)} RON`;

      row.innerHTML = `
        <div class="ladder-meta">
          <span class="ladder-flag">${entry.flag}</span>
          <span class="ladder-name">${entry.label}${entry.isBenchmark ? ' <span class="ladder-badge">TOP</span>' : ''}</span>
        </div>
        ${showBars ? `
        <div class="ladder-bar-wrap">
          <div class="ladder-bar"></div>
        </div>` : ''}
        <div class="ladder-value">${valueLabel}</div>
      `;
      container.appendChild(row);

      requestAnimationFrame(() => {
        setTimeout(() => row.classList.add('ladder-row-animate'), animDelay * 70 + 50);
      });
      animDelay++;
    });
  }

  buildGroup(personalEntries, '', false);

  // Visual separator between groups
  const sep = document.createElement('div');
  sep.className = 'ladder-separator';
  container.appendChild(sep);

  buildGroup(marketEntries, '🌍 Medii de piață', true);
}

// ============================================================
//  RENDER RESULTS
// ============================================================
function renderResults(data) {
  const {
    normalizedTitle, score, scoreLabel, scoreEmoji,
    medianSalary, minSalary, maxSalary,
    difference, percentageDiff, annualDiff,
    euRegions,
    freelanceMonthlyRon, freelanceAnnualGapRon,
    roMedianRon, roPercentageDiff,
    explanation, currency = 'RON',
  } = data;

  const userSalary = parseFloat(salaryInput.value) || 0;

  // ── Score ring ──
  const scoreCard = document.getElementById('scoreCard');
  scoreCard.className = 'hero-result-row';
  if (score < 40) scoreCard.classList.add('underpaid');
  else if (score < 70) scoreCard.classList.add('fair');
  else if (score >= 90) scoreCard.classList.add('excellent');
  else scoreCard.classList.add('good');

  document.getElementById('scoreEmoji').textContent = scoreEmoji;
  document.getElementById('scoreLabel').textContent = `${scoreLabel} ${scoreEmoji}`;
  document.getElementById('scoreJob').textContent = normalizedTitle;
  animateScore(score);

  // ── Salary range (local market) ──
  document.getElementById('salaryRange').textContent =
    `${formatNum(minSalary)}–${formatNum(maxSalary)} RON`;

  // ── Annual impact vs EU West ──
  const annualEl = document.getElementById('annualDiff');
  const impactLabel = document.getElementById('impactLabel');
  const userLocation = locationInput.value.trim() || 'orașul tău';
  if (annualDiff < 0) {
    annualEl.textContent = `−${formatNum(Math.abs(annualDiff))} RON`;
    annualEl.className = 'impact-big-number negative';
    impactLabel.textContent = `Pierzi anual față de ${euRegions?.westCountry || 'Vest EU'}`;
  } else {
    annualEl.textContent = `+${formatNum(annualDiff)} RON`;
    annualEl.className = 'impact-big-number positive';
    impactLabel.textContent = `Câștig față de ${euRegions?.westCountry || 'Vest EU'} / an`;
  }
  document.getElementById('impactNote') && (document.getElementById('impactNote').textContent =
    `RON / an față de media EU`);

  // ── Salary Ladder ──
  if (euRegions) renderLadder(data);

  // ── Freelance Callout ──
  if (freelanceMonthlyRon !== undefined) {
    document.getElementById('freelanceMonthly').textContent = formatNum(freelanceMonthlyRon) + ' RON';
    const gapEl = document.getElementById('freelanceAnnualGap');
    const isGain = freelanceAnnualGapRon >= 0;
    gapEl.textContent = `${isGain ? '+' : '−'}${formatNum(Math.abs(freelanceAnnualGapRon))} RON / an ${isGain ? 'în plus' : 'pierdut'}`;
    gapEl.className = `freelance-callout-gap ${isGain ? 'gain' : 'loss'}`;
    document.getElementById('freelanceNote').textContent = isGain
      ? `Ca freelancer, ai putea câștiga ${formatNum(freelanceAnnualGapRon)} RON mai mult pe an — fără a pleca din România.`
      : `Față de potențialul unui freelancer independent, rămânând angajat pierzi ${formatNum(Math.abs(freelanceAnnualGapRon))} RON anual.`;
  }

  // ── AI Explanation ──
  document.getElementById('explanationText').textContent = explanation;

  // ── Share text ──
  shareBtn._shareText = `${scoreEmoji} ${scoreLabel}! Scorul meu e ${score}/100 ca ${normalizedTitle} — fac ${formatNum(userSalary)} RON/lună. Verifică și tu pe SalariuOK.ro`;
}

// ============================================================
//  UTILS
// ============================================================
function formatNum(n) { return new Intl.NumberFormat('ro-RO').format(Math.round(n)); }

// ============================================================
//  SHARE
// ============================================================
shareBtn.addEventListener('click', async () => {
  const text = shareBtn._shareText || 'Verifică dacă ești plătit corect pe SalariuOK.ro!';
  try {
    if (navigator.share) await navigator.share({ title: 'SalariuOK.ro', text, url: window.location.href });
    else { await navigator.clipboard.writeText(text); showToast('✅ Copiat în clipboard!'); }
  } catch { try { await navigator.clipboard.writeText(text); showToast('✅ Copiat în clipboard!'); } catch { showToast('❌ Nu s-a putut copia.'); } }
});

// ============================================================
//  TOAST
// ============================================================
let toastTimeout;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================================
//  RETRY / LOGO
// ============================================================
function goHome() {
  showSection('formSection');
  submitBtn.disabled = false;
  submitBtn.querySelector('.btn-text').textContent = 'Verifică salariul meu';
}
retryBtn.addEventListener('click', goHome);
logoHome.addEventListener('click', goHome);
logoHome.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') goHome(); });

// ============================================================
//  FORM SUBMISSION
// ============================================================
salaryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('general-error').style.display = 'none';
  if (!validateForm()) return;
  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').textContent = 'Se analizează…';
  showSection('loadingSection');
  startLoadingSteps();

  const payload = {
    jobTitle: jobTitleInput.value.trim(),
    location: locationInput.value.trim(),
    yearsExperience: parseInt(experienceSlider.value, 10),
    salary: parseFloat(salaryInput.value),
    currency: 'RON',
  };

  try {
    const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    stopLoadingSteps();
    if (!res.ok) throw new Error(data.error || 'Eroare server.');
    renderResults(data);
    showSection('resultsSection');
    fetchStats();
  } catch (err) {
    stopLoadingSteps();
    showSection('formSection');
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').textContent = 'Verifică salariul meu';
    const ge = document.getElementById('general-error');
    ge.textContent = err.message || 'A apărut o eroare. Încearcă din nou.';
    ge.style.display = 'block';
  }
});

// ============================================================
//  STATS
// ============================================================
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const { totalAnalyses } = await res.json();
    if (totalAnalyses > 0) {
      headerStats.innerHTML = `<span>${totalAnalyses.toLocaleString('ro-RO')}</span> salarii reale verificate`;
      const heroTotal = document.getElementById('heroTotalSalaries');
      if (heroTotal) heroTotal.textContent = totalAnalyses.toLocaleString('ro-RO');
    }
  } catch (_) { }
}
fetchStats();
