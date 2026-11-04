const crypto = require('crypto');
const { redis, sha, genCodes, buildBracket, advance, clear } = require('./_lib');

const same = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

module.exports = async (req, res) => {
  if (req.method !== 'POST') return bad(res, 'POST only', 405);
  try {
    const pass = process.env.ADMIN_PASSWORD;
    if (!pass) return bad(res, 'ADMIN_PASSWORD is not set in Vercel yet (see README step 5).', 500);
    const { password, action, round, match, name, allowByes } = req.body || {};
    if (!password || !same(password, pass)) return bad(res, 'Wrong password.', 401);

    const players = await redis('HKEYS', 't:players');
    const raw = await redis('GET', 't:bracket');
    let bracket = raw ? JSON.parse(raw) : null;

    if (action === 'draw') {
      if (bracket) return bad(res, 'A draw already exists. Reset it first if you want to redo it.');
      const n = players.length;
      if (n < 32 && !(allowByes && n >= 17)) {
        return bad(res, `Only ${n} of 32 players are in. Tick "allow byes" to draw with 17 or more.`);
      }
      bracket = buildBracket(players);
      const ok = await redis('SET', 't:bracket', JSON.stringify(bracket), 'NX');
      if (!ok) return bad(res, 'A draw already exists.');
    } else if (action === 'winner') {
      if (!bracket) return bad(res, 'No draw yet.');
      const m = bracket.rounds[round] && bracket.rounds[round][match];
      if (!m || (name !== m.a && name !== m.b)) return bad(res, 'That player is not in this match.');
      if (m.w === name) clear(bracket.rounds, round, match); // click the winner again to undo
      else { clear(bracket.rounds, round, match); advance(bracket.rounds, round, match, name); }
      await redis('SET', 't:bracket', JSON.stringify(bracket));
    } else if (action === 'release') {
      // free a player's name and code (e.g. someone picked the wrong name)
      if (bracket) return bad(res, 'Reset the draw before releasing players.');
      const claims = await redis('HGETALL', 't:claims'); // [hash, name, hash, name...]
      for (let i = 0; i < claims.length; i += 2) if (claims[i + 1] === name) await redis('HDEL', 't:claims', claims[i]);
      await redis('HDEL', 't:players', name);
    } else if (action === 'reset-draw') {
      await redis('DEL', 't:bracket');
      bracket = null;
    } else if (action === 'reset-all') {
      // wipe everything and issue 32 brand-new codes (old codes stop working immediately)
      await redis('DEL', 't:bracket', 't:players', 't:claims', 't:codes');
      const fresh = genCodes(32);
      await redis('HSET', 't:codes', ...fresh.flatMap((c) => [sha(c), c]));
      bracket = null;
    } else if (action !== 'list') {
      return bad(res, 'Unknown action.');
    }

    const now = await redis('HKEYS', 't:players');
    const [stored, used] = await Promise.all([redis('HGETALL', 't:codes'), redis('HKEYS', 't:claims')]);
    let codes = null; // null = still on the original codes from your file
    if (stored && stored.length) {
      codes = [];
      for (let i = 0; i < stored.length; i += 2) codes.push({ code: stored[i + 1], used: used.includes(stored[i]) });
      codes.sort((a, b) => a.code.localeCompare(b.code));
    }
    res.status(200).json({ ok: true, players: now.sort(), bracket, codes, usedCount: used.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
