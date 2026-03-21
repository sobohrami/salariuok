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
  'Customer Success Manager', 'Lawyer', 'Accountant', 'Teacher',
  'Doctor', 'Nurse', 'Pharmacist', 'Architect', 'Civil Engineer',
];

const CITY_SUGGESTIONS = [
  'București', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Brașov',
  'Constanța', 'Sibiu', 'Oradea', 'Craiova', 'Bacău',
  'Ploiești', 'Pitești', 'Galați', 'Arad', 'Târgu Mureș',
  'Suceava', 'Reșița', 'Slatina', 'Drobeta-Turnu Severin',
];

// ============================================================
//  DOM REFERENCES
// ============================================================
const formSection      = document.getElementById('formSection');
const loadingSection   = document.getElementById('loadingSection');
const resultsSection   = document.getElementById('resultsSection');
const salaryForm       = document.getElementById('salaryForm');
const jobTitleInput    = document.getElementById('jobTitle');
const locationInput    = document.getElementById('location');
const experienceSlider = document.getElementById('experience');
const expValue         = document.getElementById('expValue');
const salaryInput      = document.getElementById('salary');
const submitBtn        = document.getElementById('submitBtn');
const loadingStep      = document.getElementById('loadingStep');
const headerStats      = document.getElementById('headerStats');
const retryBtn         = document.getElementById('retryBtn');
const shareBtn         = document.getElementById('shareBtn');
const logoHome         = document.getElementById('logo-home');
const toast            = document.getElementById('toast');

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
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = item;
        dropdown.classList.remove('open');
      });
      dropdown.appendChild(div);
    });
    dropdown.classList.add('open');
  }

  input.addEventListener('input', () => {
    const val = input.value.toLowerCase().trim();
    if (!val) { dropdown.classList.remove('open'); return; }
    const filtered = suggestions.filter(s => s.toLowerCase().includes(val)).slice(0, 7);
    showDropdown(filtered);
  });

  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.autocomplete-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[activeIndex]?.classList.remove('active');
      activeIndex = (activeIndex + 1) % items.length;
      items[activeIndex]?.classList.add('active');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[activeIndex]?.classList.remove('active');
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      items[activeIndex]?.classList.add('active');
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      input.value = items[activeIndex].textContent;
      dropdown.classList.remove('open');
    } else if (e.key === 'Escape') {
      dropdown.classList.remove('open');
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
}

setupAutocomplete(jobTitleInput, 'jobSuggestions', JOB_SUGGESTIONS);
setupAutocomplete(locationInput, 'locationSuggestions', CITY_SUGGESTIONS);

// ============================================================
//  FORM VALIDATION
// ============================================================
function setError(groupId, errorId, msg) {
  const group = document.getElementById(groupId);
  const err = document.getElementById(errorId);
  if (msg) {
    group?.classList.add('has-error');
    if (err) err.textContent = msg;
  } else {
    group?.classList.remove('has-error');
    if (err) err.textContent = '';
  }
}

function validateForm() {
  let valid = true;
  if (!jobTitleInput.value.trim()) {
    setError('group-jobTitle', 'jobTitle-error', 'Te rugăm să introduci titlul jobului.');
    valid = false;
  } else { setError('group-jobTitle', 'jobTitle-error', ''); }

  if (!locationInput.value.trim()) {
    setError('group-location', 'location-error', 'Te rugăm să introduci orașul.');
    valid = false;
  } else { setError('group-location', 'location-error', ''); }

  const sal = parseFloat(salaryInput.value);
  if (!salaryInput.value || isNaN(sal) || sal <= 0) {
    setError('group-salary', 'salary-error', 'Te rugăm să introduci un salariu valid.');
    valid = false;
  } else { setError('group-salary', 'salary-error', ''); }

  return valid;
}

// ============================================================
//  LOADING STEPS ANIMATION
// ============================================================
const LOADING_STEPS = [
  'Normalizăm titlul jobului…',
  'Comparăm cu piața din zona ta…',
  'Calculăm scorul tău de salarizare…',
  'Generăm insight-ul personalizat…',
];

let loadingInterval = null;
function startLoadingSteps() {
  let i = 0;
  loadingStep.textContent = LOADING_STEPS[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % LOADING_STEPS.length;
    loadingStep.textContent = LOADING_STEPS[i];
  }, 1800);
}
function stopLoadingSteps() {
  clearInterval(loadingInterval);
}

// ============================================================
//  SCORE RING ANIMATION
// ============================================================
function animateScore(score) {
  const circumference = 2 * Math.PI * 85; // 534
  const ring = document.getElementById('ringFill');
  const numEl = document.getElementById('scoreNumber');

  // Start from empty
  ring.style.strokeDashoffset = circumference;

  let current = 0;
  const target = score;
  const duration = 1500;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    current = Math.round(ease * target);

    const offset = circumference - (current / 100) * circumference;
    ring.style.strokeDashoffset = offset;
    numEl.textContent = current;

    if (progress < 1) requestAnimationFrame(update);
    else numEl.textContent = target;
  }

  // Small delay before starting animation
  setTimeout(() => requestAnimationFrame(update), 200);
}

// ============================================================
//  RENDER RESULTS
// ============================================================
function renderResults(data) {
  const {
    normalizedTitle, score, scoreLabel, scoreEmoji,
    medianSalary, minSalary, maxSalary,
    difference, percentageDiff, annualDiff,
    euMedianEur, roMedianRon, roPercentageDiff,
    explanation, currency = 'RON',
  } = data;

  // Score card class
  const scoreCard = document.getElementById('scoreCard');
  scoreCard.className = 'score-card glass-card';
  if (score < 40) scoreCard.classList.add('underpaid');
  else if (score < 70) scoreCard.classList.add('fair');
  else if (score >= 90) scoreCard.classList.add('excellent');
  else scoreCard.classList.add('good');

  document.getElementById('scoreEmoji').textContent = scoreEmoji;
  document.getElementById('scoreLabel').textContent = `${scoreLabel} ${scoreEmoji}`;
  document.getElementById('scoreJob').textContent = normalizedTitle;

  // Salary range
  document.getElementById('salaryRange').textContent =
    `${formatNum(minSalary)} – ${formatNum(maxSalary)} ${currency}`;

  // EU Comparison (Main percentage diff now)
  const euVal = document.getElementById('euValue');
  const euSign = percentageDiff >= 0 ? '+' : '';
  euVal.textContent = `${euSign}${percentageDiff.toFixed(1)}%`;
  euVal.className = `stat-value ${percentageDiff >= 0 ? 'positive' : 'negative'}`;
  document.getElementById('euSub').textContent = `Medie Vest: ${formatNum(euMedianEur)} EUR`;

  // RO Comparison
  const compVal = document.getElementById('compValue');
  const roSign = roPercentageDiff >= 0 ? '+' : '';
  compVal.textContent = `${roSign}${roPercentageDiff.toFixed(1)}%`;
  compVal.className = `stat-value ${roPercentageDiff >= 0 ? 'positive' : 'negative'}`;
  document.getElementById('compSub').textContent = `Medie RO: ${formatNum(roMedianRon)} RON`;

  // Annual diff
  const annualEl = document.getElementById('annualDiff');
  const impactLabel = document.getElementById('impactLabel');
  const impactIcon = document.getElementById('impactIcon');
  if (annualDiff < 0) {
    annualEl.textContent = `−${formatNum(Math.abs(annualDiff))} ${currency}`;
    annualEl.className = 'stat-value impact-value negative';
    impactLabel.textContent = 'Pierdere anuală estimată';
    impactIcon.textContent = '💣';
  } else {
    annualEl.textContent = `+${formatNum(annualDiff)} ${currency}`;
    annualEl.className = 'stat-value impact-value positive';
    impactLabel.textContent = 'Câștig față de median/an';
    impactIcon.textContent = '🎉';
  }

  // Explanation
  document.getElementById('explanationText').textContent = explanation;

  // Animate score ring
  animateScore(score);

  // Share text
  shareBtn._shareText = buildShareText(normalizedTitle, score, scoreLabel, scoreEmoji, percentageDiff, Math.abs(difference), currency);
}

function formatNum(n) {
  return new Intl.NumberFormat('ro-RO').format(n);
}

function buildShareText(job, score, label, emoji, pctDiff, diffAbs, currency) {
  const sign = pctDiff >= 0 ? '+' : '-';
  const direction = pctDiff >= 0 ? 'peste' : 'sub';
  return `${emoji} ${label}! Scorul meu de salarizare e ${score}/100 ca ${job} — ${sign}${Math.abs(pctDiff).toFixed(1)}% ${direction} piață (±${formatNum(diffAbs)} ${currency}/lună). Verifică și tu pe SalariuOK.ro`;
}

// ============================================================
//  SHARE BUTTON
// ============================================================
shareBtn.addEventListener('click', async () => {
  const text = shareBtn._shareText || 'Verifică dacă ești plătit corect pe SalariuOK.ro!';
  try {
    if (navigator.share) {
      await navigator.share({ title: 'SalariuOK.ro', text, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(text);
      showToast('✅ Textul a fost copiat în clipboard!');
    }
  } catch (e) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('✅ Textul a fost copiat în clipboard!');
    } catch (_) {
      showToast('❌ Nu s-a putut copia textul.');
    }
  }
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
  if (!validateForm()) return;

  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').textContent = 'Se analizează…';

  showSection('loadingSection');
  startLoadingSteps();

  const payload = {
    jobTitle:       jobTitleInput.value.trim(),
    location:       locationInput.value.trim(),
    yearsExperience: parseInt(experienceSlider.value, 10),
    salary:         parseFloat(salaryInput.value),
    currency:       'RON',
  };

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    stopLoadingSteps();

    if (!res.ok) throw new Error(data.error || 'Eroare server.');

    renderResults(data);
    showSection('resultsSection');
    fetchStats(); // refresh counter
  } catch (err) {
    stopLoadingSteps();
    showSection('formSection');
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').textContent = 'Verifică salariul meu';
    setError('group-salary', 'salary-error', err.message || 'A apărut o eroare. Încearcă din nou.');
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
      headerStats.innerHTML = `<span>${totalAnalyses.toLocaleString('ro-RO')}</span> analize efectuate`;
    }
  } catch (_) {}
}

fetchStats();
