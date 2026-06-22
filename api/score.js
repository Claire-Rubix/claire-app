// API d'enregistrement des scores de Laurina (Redis / Vercel KV).
const { Redis } = require('@upstash/redis');

const KEY = 'scores_laurina';

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const redis = getRedis();

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      if (!redis) { res.status(200).json([]); return; }
      const list = (await redis.lrange(KEY, 0, -1)) || [];
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
      if (!redis) { res.status(503).json({ error: 'storage_not_configured' }); return; }
      await redis.rpush(KEY, rec);
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
