const TOURNAMENT = 'FIFA Campus Cup';
const ROUND_NAMES = ['Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final'];

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, body) {
  const r = await fetch(path, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { cache: 'no-store' });
  const j = await r.json().catch(() => ({ error: 'Server error. Try again.' }));
  if (!r.ok) throw new Error(j.error || 'Something went wrong.');
  return j;
}

function emptyRounds() {
  return [16, 8, 4, 2, 1].map((n) => Array.from({ length: n }, () => ({ a: null, b: null, w: null })));
}

function slotHTML(m, k, r, i) {
  const n = m[k];
  let cls = 'slot', label;
  if (n) {
    label = esc(n);
    if (m.w) cls += m.w === n ? ' win' : ' lose';
  } else {
    cls += ' tbd';
    label = r === 0 && m[k === 'a' ? 'b' : 'a'] ? 'Bye' : 'TBD';
  }
  return `<div class="${cls}" ${n ? `data-name="${esc(n)}" data-r="${r}" data-m="${i}"` : ''}>${label}</div>`;
}

// bracket = {rounds:[...]} or null (shows an empty bracket). onPick(round, match, name) makes names clickable (admin).
function renderBracket(el, bracket, onPick) {
  const rounds = bracket ? bracket.rounds : emptyRounds();
  el.innerHTML = rounds.map((round, r) => `
    <div class="round">
      <h3>${ROUND_NAMES[r]}</h3>
      <div class="cells">${round.map((m, i) => `
        <div class="cell ${r < 4 ? (i % 2 === 0 ? 'top' : 'bot') : 'last'}">
          <div class="match ${r > 0 ? 'linked' : ''}">${slotHTML(m, 'a', r, i)}${slotHTML(m, 'b', r, i)}</div>
        </div>`).join('')}
      </div>
    </div>`).join('');
  if (onPick) el.querySelectorAll('.slot[data-name]').forEach((s) => { s.onclick = () => onPick(+s.dataset.r, +s.dataset.m, s.dataset.name); });
}

function champion(bracket) {
  return bracket && bracket.rounds[4][0].w;
}

document.querySelectorAll('[data-title]').forEach((e) => { e.textContent = TOURNAMENT; });
