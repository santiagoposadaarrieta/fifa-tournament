const { redis } = require('./_lib');
const { NAMES } = require('./_config');

module.exports = async (req, res) => {
  try {
    const [players, br] = await Promise.all([redis('HKEYS', 't:players'), redis('GET', 't:bracket')]);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ players: players.sort(), names: NAMES, bracket: br ? JSON.parse(br) : null, max: 32 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
