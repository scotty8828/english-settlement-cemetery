/* ============================================================
   ENGLISH SETTLEMENT CEMETERY — DIGITAL MUSEUM
   Timeline JavaScript
   ============================================================ */

const FAMILY_COLORS = {
  Harrison: "#4A3FB5", Hopkins:  "#0F6E56", Morris:   "#8B3A1C",
  Gregory:  "#1A5C8A", Crossley: "#6B3FA0", Sedden:   "#2E7D6B",
  Gilson:   "#7A5C1E", Halfast:  "#C06030", Alston:   "#3D7A3D",
  Shaw:     "#8A5A8A", Vroman:   "#2E6A8A", Stearns:  "#6A3D3D",
  Reynolds: "#5A7A3D", Owens:    "#8A6A2E", Russ:     "#3D6A7A",
  Edmond:   "#7A3D6A", Nelson:   "#4A7A5A", Rieck:    "#7A4A3D",
  Shumake:  "#3D4A7A", Dailey:   "#6A7A3D", Graham:   "#5A3D7A",
  Hasson:   "#7A5A3D", Heliker:  "#3D7A6A", Wheatall: "#6A3D7A",
  Burns:    "#888888", Carey:    "#888888"
};

const FAMILY_TAGLINES = {
  Harrison: "Pioneer. Patriarch. Foundation of Harrison Township.",
  Morris:   "Blacksmith. Pioneer. Family man.",
  Hopkins:  "Farmer. Community leader.",
  Crossley: "Settler. Family patriarch.",
  Sedden:   "Pioneer family of the English Settlement.",
  Gregory:  "Physician and community pillar.",
  default:  "Buried at English Settlement Cemetery."
};

const TW = 1100; // timeline canvas width in pixels
const RH = 26;   // row height in pixels

let allPeople = [];
let activePeople = [];
let currentPerson = '';
let showing = 12;

// ── Load people data ──
async function loadPeople() {
  try {
    const response = await fetch('../data/harrison_cemetery_master.json');
    allPeople = await response.json();
    allPeople.sort((a, b) => {
      if (!a.deathYear && !b.deathYear) return 0;
      if (!a.deathYear) return 1;
      if (!b.deathYear) return -1;
      return a.deathYear - b.deathYear;
    });
    buildFamilyDropdown();
    applyFilters();
  } catch (e) {
    console.error('Could not load people data:', e);
  }
}

// ── Year axis calculations ──
function getYearRange() {
  const births = allPeople.filter(p => p.birthYear).map(p => p.birthYear);
  const deaths = allPeople.filter(p => p.deathYear).map(p => p.deathYear);
  return {
    min: Math.min(...births) - 2,
    max: Math.max(...deaths) + 2
  };
}

function yearToPx(year, range) {
  return ((year - range.min) / (range.max - range.min)) * TW;
}

// ── Draw year axis ──
function drawAxis(range) {
  const cv = document.getElementById('tl-ax-cv');
  if (!cv) return;
  cv.width = TW; cv.height = 30;
  cv.style.width = TW + 'px'; cv.style.height = '30px';
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, TW, 30);

  // decade ticks
  for (let y = Math.ceil(range.min / 10) * 10; y <= range.max; y += 10) {
    const x = yearToPx(y, range);
    ctx.fillStyle = '#B8A070';
    ctx.fillRect(x, 0, 0.5, 5);
  }
  // every 20 years — bold label
  for (let y = Math.ceil(range.min / 20) * 20; y <= range.max; y += 20) {
    const x = yearToPx(y, range);
    ctx.fillStyle = '#5C3D11';
    ctx.fillRect(x - 0.5, 0, 1.5, 8);
    ctx.fillStyle = '#2C1F0E';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(y, x, 22);
  }
  // every 10 years — smaller label
  for (let y = Math.ceil(range.min / 10) * 10; y <= range.max; y += 10) {
    if (y % 20 === 0) continue;
    const x = yearToPx(y, range);
    ctx.fillStyle = '#9B8060';
    ctx.font = '500 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(y, x, 20);
  }
}

// ── Draw a lifespan bar ──
function drawBar(canvas, person, range) {
  canvas.width = TW; canvas.height = RH;
  canvas.style.width = TW + 'px'; canvas.style.height = RH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, TW, RH);
  const col = FAMILY_COLORS[person.family] || '#666';
  const BH = 9, BY = 8;

  // No dates at all
  if (!person.birthYear && !person.deathYear) {
    ctx.strokeStyle = '#C0B090'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.roundRect(TW * 0.05, BY, TW * 0.9, BH, 2); ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  const birth = person.birthYear || range.min + 2;
  const death = person.deathYear || range.max - 2;
  const x1 = yearToPx(birth, range);
  const x2 = yearToPx(death, range);
  const bw = Math.max(x2 - x1, 3);

  // Uncertain dates — hatched pattern
  if (person.birthUncertain || person.deathUncertain) {
    ctx.save(); ctx.globalAlpha = 0.5;
    const pat = document.createElement('canvas');
    pat.width = 6; pat.height = BH;
    const pc = pat.getContext('2d');
    pc.fillStyle = col; pc.fillRect(0, 0, 3, BH);
    ctx.fillStyle = ctx.createPattern(pat, 'repeat');
    ctx.beginPath(); ctx.roundRect(x1, BY, bw, BH, 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.restore();
  } else {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect(x1, BY, bw, BH, 2); ctx.fill();
  }

  // Veteran star
  if (person.military) {
    ctx.fillStyle = '#C8A84B';
    ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('★', yearToPx(death, range), BY - 1);
  }

  // Death tick
  ctx.fillStyle = col; ctx.globalAlpha = 0.12;
  ctx.fillRect(Math.round(yearToPx(death, range)), 0, 1, RH);
  ctx.globalAlpha = 1;
}

// ── Build family dropdown ──
function buildFamilyDropdown() {
  const sel = document.getElementById('tl-fm');
  if (!sel) return;
  const families = [...new Set(allPeople.map(p => p.family))].sort();
  families.forEach(f => {
    const o = document.createElement('option');
    o.value = f; o.textContent = f;
    sel.appendChild(o);
  });
}

// ── Apply filters and re-render ──
function applyFilters() {
  const q   = (document.getElementById('tl-si')?.value || '').toLowerCase();
  const fam = document.getElementById('tl-fm')?.value || '';
  const fil = document.getElementById('tl-fi')?.value || '';

  activePeople = allPeople.filter(p => {
    if (q && !p.fullName.toLowerCase().includes(q)) return false;
    if (fam && p.family !== fam) return false;
    if (fil === 'veteran' && !p.military) return false;
    if (fil === 'child') {
      if (!p.birthYear || !p.deathYear) return false;
      if ((p.deathYear - p.birthYear) >= 18) return false;
    }
    if (fil === 'unknown' && (p.birthYear || p.deathYear)) return false;
    return true;
  });

  const cnt = document.getElementById('tl-cn');
  if (cnt) cnt.textContent = activePeople.length + ' people';
  showing = 12;
  renderTimeline();
}

// ── Render timeline rows ──
function renderTimeline(showAll = false) {
  const nl = document.getElementById('tl-nl');
  const bi = document.getElementById('tl-bi');
  if (!nl || !bi) return;

  nl.innerHTML = ''; bi.innerHTML = '';
  bi.style.width = TW + 'px';

  const range  = getYearRange();
  const limit  = showAll ? activePeople.length : Math.min(activePeople.length, showing);

  activePeople.slice(0, limit).forEach(person => {
    const col = FAMILY_COLORS[person.family] || '#666';

    // Name cell
    const nc = document.createElement('div');
    nc.className = 'tnc';
    nc.textContent = person.fullName;
    nc.title = person.fullName;
    nc.style.color = col;
    nc.style.borderLeftColor = col;
    nl.appendChild(nc);

    // Bar row
    const br = document.createElement('div');
    br.className = 'tbr';
    br.style.width = TW + 'px';
    const cv = document.createElement('canvas');
    br.appendChild(cv);
    bi.appendChild(br);

    // Hover sync
    const hover = on => {
      nc.classList.toggle('hv', on);
      br.classList.toggle('hv', on);
    };
    nc.addEventListener('mouseenter', () => hover(true));
    nc.addEventListener('mouseleave', () => hover(false));
    br.addEventListener('mouseenter', () => hover(true));
    br.addEventListener('mouseleave', () => hover(false));

    // Click to popup
    const openPopup = () => showPopup(person);
    nc.addEventListener('click', openPopup);
    br.addEventListener('click', openPopup);

    requestAnimationFrame(() => drawBar(cv, person, range));
  });

  // Show more button
  const mo  = document.getElementById('tl-mo');
  const rem = activePeople.length - limit;
  if (mo) {
    if (rem > 0 && !showAll) {
      mo.style.display = 'block';
      const mn = document.getElementById('tl-mo-n');
      if (mn) mn.textContent = rem;
    } else {
      mo.style.display = 'none';
    }
  }
}

// ── Show popup card ──
function showPopup(person) {
  currentPerson = person.fullName;
  const span = person.birthYear && person.deathYear
    ? ` (${person.deathYear - person.birthYear} yrs)` : '';
  const dates = (!person.birthYear && !person.deathYear)
    ? 'Dates unknown'
    : `${person.birthYear || '?'} – ${person.deathYear || '?'}${span}`;

  document.getElementById('pop-nm').textContent = person.fullName;
  document.getElementById('pop-dt').textContent = dates;

  const fb = document.getElementById('pop-fm');
  fb.textContent = person.family + ' family' + (person.military ? ' · Veteran' : '');
  fb.style.background = FAMILY_COLORS[person.family] || '#666';

  document.getElementById('pop-tg').textContent =
    FAMILY_TAGLINES[person.family] || FAMILY_TAGLINES.default;

  const btn = document.getElementById('pop-bt');
  btn.href = `person/${person.slug}.html`;

  document.getElementById('popup').style.display = 'block';
  document.getElementById('pop-ov').style.display = 'block';
}

function closePopup() {
  document.getElementById('popup').style.display = 'none';
  document.getElementById('pop-ov').style.display = 'none';
}

function showAll() {
  const mo = document.getElementById('tl-mo');
  if (mo) mo.style.display = 'none';
  renderTimeline(true);
}

// ── Sync vertical scroll between names and bars ──
function setupScrollSync() {
  const nl  = document.getElementById('tl-nl');
  const bo  = document.getElementById('tl-bo');
  const axs = document.getElementById('tl-ax-strip');
  if (!nl || !bo || !axs) return;

  let syncing = false;
  nl.addEventListener('scroll', () => {
    if (syncing) return; syncing = true;
    bo.scrollTop = nl.scrollTop;
    syncing = false;
  });
  bo.addEventListener('scroll', () => {
    if (syncing) return; syncing = true;
    nl.scrollTop  = bo.scrollTop;
    axs.scrollLeft = bo.scrollLeft;
    syncing = false;
  });
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  setupScrollSync();
  loadPeople().then(() => {
    const range = getYearRange();
    drawAxis(range);
  });

  window.addEventListener('resize', () => {
    const range = getYearRange();
    drawAxis(range);
  });
});
