// API d'enregistrement des scores de Laurina (Redis / Vercel KV).
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEY = 'scores_laurina';

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
      const rec = {
        who: String(body.who || 'Laurina').slice(0, 80),
        total: Number(body.total) || 0,
        pct: Number(body.pct) || 0,
        km: Number(body.km) || 0,
        steps: Number(body.steps) || 0,
        ts: Date.now(),
      };
      await redis.rpush(KEY, rec);
      // garde aussi le meilleur score global
      const prev = (await redis.get(KEY + ':best')) || 0;
      if (rec.total > prev) await redis.set(KEY + ':best', rec.total);
      res.status(200).json({ ok: true, best: Math.max(prev, rec.total) });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
};
