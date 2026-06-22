// API de stockage des "mots doux" pour le jeu de Laurina.
// Stockage = Redis (Vercel KV / Upstash). Marche avec les deux jeux de variables.
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEY = 'mots_laurina';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    if (req.method === 'GET') {
      const list = (await redis.lrange(KEY, 0, -1)) || [];
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(list);
      return;
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const who = String(body.who || '').trim().slice(0, 80);
      const note = String(body.note || '').trim().slice(0, 1000);
      let score = Number(body.score);
      if (!Number.isFinite(score)) score = 10;
      score = Math.max(0, Math.min(10, Math.round(score)));
      if (!who || !note) { res.status(400).json({ error: 'who et note requis' }); return; }
      await redis.rpush(KEY, { who, note, score, ts: Date.now() });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
};
