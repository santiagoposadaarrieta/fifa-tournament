const crypto = require('crypto');

const DB_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const DB_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Run one Redis command through the Upstash REST API, e.g. redis('HGET', 'key', 'field')
async function redis(...cmd) {
  if (!DB_URL || !DB_TOKEN) throw new Error('Database is not connected yet (see README step 4).');
  const r = await fetch(DB_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + DB_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Accepts "fifa-2kac-bh3k", "FIFA2KACBH3K" or just "2KACBH3K" and returns "FIFA-2KAC-BH3K"
function canon(input) {
  let c = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length === 8) c = 'FIFA' + c;
  if (c.length !== 12) return '';
  return `FIFA-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}

// 32 fresh unique codes like FIFA-7K3Q-9XPD (no look-alike characters)
function genCodes(n = 32) {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = () => Array.from({ length: 4 }, () => alpha[crypto.randomInt(alpha.length)]).join('');
  const set = new Set();
  while (set.size < n) set.add(`FIFA-${pick()}-${pick()}`);
  return [...set].sort();
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const slotKey = (m) => (m % 2 === 0 ? 'a' : 'b');

function advance(rounds, r, m, name) {
  rounds[r][m].w = name;
  if (r < rounds.length - 1) rounds[r + 1][m >> 1][slotKey(m)] = name;
}

function clear(rounds, r, m) {
  const x = rounds[r][m];
  const old = x.w;
  if (!old) return;
  x.w = null;
  if (r < rounds.length - 1) {
    const n = rounds[r + 1][m >> 1];
    if (n.w === old) clear(rounds, r + 1, m >> 1);
    n[slotKey(m)] = null;
  }
}

// Random draw: 32 slots, byes (if fewer than 32 players) are spread across different matches
function buildBracket(players) {
  const p = shuffle([...players]);
  const byes = 32 - p.length;
  const matches = [];
  let idx = 0;
  for (let i = 0; i < 16; i++) {
    if (i < byes) matches.push({ a: p[idx++], b: null, w: null });
    else matches.push({ a: p[idx++], b: p[idx++], w: null });
  }
  shuffle(matches);
  const rounds = [matches];
  for (let r = 1; r < 5; r++) {
    rounds.push(Array.from({ length: 32 >> (r + 1) }, () => ({ a: null, b: null, w: null })));
  }
  matches.forEach((m, i) => { if (!m.b) advance(rounds, 0, i, m.a); });
  return { rounds, drawnAt: Date.now() };
}

module.exports = { redis, sha, canon, genCodes, shuffle, advance, clear, buildBracket };
