// ─────────────────────────────────────────────────────────────
// Cybernet AI · Конструктор скриптов — серверный прокси к LLM
//
// Зачем: API-ключи больше НЕ хранятся в браузере и не уезжают в БД.
// Они лежат в переменных окружения Vercel и видны только серверу.
//
// Переменные окружения (Vercel → Settings → Environment Variables):
//   GEMINI_API_KEY  — ключ Google AI Studio
//   OPENAI_API_KEY  — ключ OpenAI
//   PROXY_ALLOW_ORIGIN — (опционально) домен фронтенда,
//                        напр. https://cybernet-script-builder.vercel.app
//
// Запрос от клиента:
//   POST /api/ai
//   { provider: 'gemini'|'openai', model, system, user,
//     temperature, maxTokens, json }
// Ответ: { text: "..." }  либо { error: "..." }
// ─────────────────────────────────────────────────────────────

// Примитивный лимит запросов в памяти инстанса: защищает ключ от
// «выкачивания» через открытый эндпоинт. Не абсолютная защита
// (инстансы serverless живут недолго), но отсекает простое злоупотребление.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.start > WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  rec.count += 1;
  if (hits.size > 500) hits.clear(); // не давать памяти расти бесконечно
  return rec.count > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  const allowOrigin = process.env.PROXY_ALLOW_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Только POST' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Слишком много запросов. Подождите минуту.' });
  }

  // Если задан PROXY_ALLOW_ORIGIN — пускаем только свой фронтенд
  if (process.env.PROXY_ALLOW_ORIGIN) {
    const origin = req.headers.origin || '';
    if (origin && origin !== process.env.PROXY_ALLOW_ORIGIN) {
      return res.status(403).json({ error: 'Запрос с чужого домена отклонён' });
    }
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const provider = body.provider === 'openai' ? 'openai' : 'gemini';
  const system = typeof body.system === 'string' ? body.system : '';
  const user = typeof body.user === 'string' ? body.user : '';
  const temperature = Number.isFinite(body.temperature) ? body.temperature : 0.7;
  const wantJson = !!body.json;

  if (!user.trim()) {
    return res.status(400).json({ error: 'Пустой запрос к AI' });
  }

  try {
    const text =
      provider === 'openai'
        ? await callOpenAI({ model: body.model, system, user, temperature, wantJson, maxTokens: body.maxTokens })
        : await callGemini({ model: body.model, system, user, temperature, wantJson, maxTokens: body.maxTokens });

    return res.status(200).json({ text });
  } catch (err) {
    // Наружу не отдаём внутренние детали и уж точно не ключ
    console.error('AI proxy error:', err);
    return res.status(502).json({ error: err.message || 'Ошибка обращения к AI' });
  }
}

async function callGemini({ model, system, user, temperature, wantJson, maxTokens }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('На сервере не настроен GEMINI_API_KEY');

  const mdl = model || 'gemini-3.5-flash';
  const payload = {
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: {
      temperature,
      topP: 0.95,
      maxOutputTokens: Math.min(maxTokens || 4096, 32768),
      responseMimeType: wantJson ? 'application/json' : 'text/plain'
    }
  };
  if (system) payload.systemInstruction = { parts: [{ text: system }] };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(mdl)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload)
    }
  );

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${shorten(t)}`);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason;
    throw new Error(reason === 'SAFETY'
      ? 'Gemini заблокировал ответ по фильтрам безопасности'
      : 'Пустой ответ от Gemini' + (reason ? ` (${reason})` : ''));
  }
  return text.trim();
}

async function callOpenAI({ model, system, user, temperature, wantJson, maxTokens }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('На сервере не настроен OPENAI_API_KEY');

  const mdl = model || 'gpt-4o-mini';
  let sys = system || '';
  // json_object режим требует слова "json" в промпте, иначе 400
  if (wantJson && !/json/i.test(sys) && !/json/i.test(user)) {
    sys += (sys ? '\n\n' : '') + 'Отвечай строго в формате JSON.';
  }

  const messages = [];
  if (sys) messages.push({ role: 'system', content: sys });
  messages.push({ role: 'user', content: user });

  const modelCap = /gpt-4o|gpt-4\.1|gpt-5|o[0-9]/.test(mdl) ? 16384 : 4096;
  const payload = {
    model: mdl,
    messages,
    temperature,
    max_tokens: Math.min(maxTokens || 4096, modelCap)
  };
  if (wantJson) payload.response_format = { type: 'json_object' };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${shorten(t)}`);
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) {
    const reason = data?.choices?.[0]?.finish_reason;
    if (reason === 'content_filter') throw new Error('Модель заблокировала ответ по content-фильтрам');
    if (reason === 'length') throw new Error('Ответ не поместился в лимит модели — уменьшите размер скрипта');
    throw new Error('Пустой ответ от OpenAI' + (reason ? ` (${reason})` : ''));
  }
  return text.trim();
}

function shorten(s) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > 300 ? t.slice(0, 300) + '…' : t;
}
