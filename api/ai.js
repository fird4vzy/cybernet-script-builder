// ─────────────────────────────────────────────────────────────
// Cybernet AI · Конструктор скриптов — серверный прокси к LLM
//
// Зачем: API-ключи больше НЕ хранятся в браузере и не уезжают в БД.
// Они лежат в переменных окружения Vercel и видны только серверу.
//
// 🔴 ГЛАВНОЕ ПРАВИЛО: эндпоинт тратит НАШИ деньги, поэтому пускает
// только вошедших пользователей. Раньше проверки не было вовсе, а два
// «контроля» не работали:
//   1) `if (origin && origin !== ALLOW)` — при ОТСУТСТВИИ заголовка
//      Origin условие ложно и запрос проходил. curl и боты Origin не
//      шлют, то есть защита работала только против браузеров.
//   2) Лимитер держал счётчики в Map инстанса и делал hits.clear()
//      при переполнении — обнуляя лимит СРАЗУ ВСЕМ, включая атакующего.
// Теперь: обязательный JWT Supabase, лимит по user.id, капы на вход.
//
// Переменные окружения (Vercel → Settings → Environment Variables):
//   GEMINI_API_KEY  — ключ Google AI Studio
//   OPENAI_API_KEY  — ключ OpenAI
//   PROXY_ALLOW_ORIGIN — (опционально) домен фронтенда
//   SUPABASE_URL / SUPABASE_ANON_KEY — (опционально) если проект переехал;
//      по умолчанию берутся те же публичные значения, что и в клиенте.
//      Service-role ключ здесь НЕ НУЖЕН и добавлять его нельзя.
//
// Запрос от клиента:
//   POST /api/ai
//   Authorization: Bearer <supabase access_token>
//   { provider: 'gemini'|'openai', model, system, user,
//     temperature, maxTokens, json }
// Ответ: { text: "..." }  либо { error: "...", ref: "..." }
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gyoqlhsbqedbhlgyyqny.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b3FsaHNicWVkYmhsZ3l5cW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODU4MzIsImV4cCI6MjA5NzM2MTgzMn0.6Z-Zhzlxj6ph1WDJHpsv-WSfQW6Cuu0tsos6BAaPTAc';

// Потолок на размер промпта. Без него один запрос мог стоить сколько угодно:
// Vercel принимает тело до ~4.5 МБ, а мы платим за каждый токен.
const MAX_PROMPT_CHARS = 200_000;

// Лимит на ПОЛЬЗОВАТЕЛЯ, а не на IP. Генерация идёт порциями (эталон на
// 150 блоков — это ~15-20 последовательных вызовов плюс правка тона),
// поэтому потолок заметно выше «человеческого» темпа, но конечен.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const MAX_TRACKED = 5000;

function rateLimited(key) {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now - rec.start > WINDOW_MS) {
    hits.set(key, { start: now, count: 1 });
    // Вычищаем ТОЛЬКО протухшие записи. Прежний hits.clear() сбрасывал
    // лимит всем сразу — атакующему достаточно было раздуть Map.
    if (hits.size > MAX_TRACKED) {
      for (const [k, v] of hits) {
        if (now - v.start > WINDOW_MS) hits.delete(k);
        if (hits.size <= MAX_TRACKED) break;
      }
    }
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

// Проверка токена Supabase обычным fetch — без SDK и без service-role ключа.
// /auth/v1/user валидирует подпись и срок действия на стороне Supabase.
async function verifyUser(req) {
  const raw = req.headers.authorization || req.headers.Authorization || '';
  const jwt = String(raw).replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt}` }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (e) {
    console.error('verifyUser failed:', e);
    return null;
  }
}

function reqId() {
  return Math.random().toString(36).slice(2, 10);
}

export default async function handler(req, res) {
  const allow = process.env.PROXY_ALLOW_ORIGIN || '';
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', allow || origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Только POST' });
  }

  // Origin — вторая линия обороны против злоупотребления из чужой вкладки.
  // Основная защита ниже (JWT): кросс-сайтовый скрипт не прочитает наш токен,
  // он лежит в localStorage нашего домена.
  if (allow && origin && origin !== allow) {
    return res.status(403).json({ error: 'Запрос с чужого домена отклонён' });
  }

  const user = await verifyUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Нужен вход в аккаунт — обновите страницу и войдите заново' });
  }

  if (rateLimited(user.id)) {
    return res.status(429).json({ error: 'Слишком много запросов. Подождите минуту.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const provider = body.provider === 'openai' ? 'openai' : 'gemini';
  const system = typeof body.system === 'string' ? body.system : '';
  const user_ = typeof body.user === 'string' ? body.user : '';
  // Number.isFinite пропускал -50 и 9999 — провайдер отвечал 400 либо выдавал бред.
  const temperature = Math.min(Math.max(Number.isFinite(body.temperature) ? body.temperature : 0.7, 0), 2);
  const wantJson = !!body.json;

  if (!user_.trim()) {
    return res.status(400).json({ error: 'Пустой запрос к AI' });
  }
  if (system.length + user_.length > MAX_PROMPT_CHARS) {
    return res.status(413).json({ error: 'Промпт слишком большой — уменьшите базу знаний или размер скрипта' });
  }

  try {
    const text =
      provider === 'openai'
        ? await callOpenAI({ model: body.model, system, user: user_, temperature, wantJson, maxTokens: body.maxTokens })
        : await callGemini({ model: body.model, system, user: user_, temperature, wantJson, maxTokens: body.maxTokens });

    return res.status(200).json({ text });
  } catch (err) {
    // Наружу — только общая фраза и номер обращения. Раньше сюда утекало до
    // 300 символов сырого ответа провайдера: идентификаторы организации и
    // проекта, подсказки по квотам и биллингу, внутренние request-id.
    const ref = reqId();
    console.error(`AI proxy error [${ref}] user=${user.id}:`, err);
    const safe = err && err.safeMessage;
    return res.status(502).json({ error: safe || 'Ошибка обращения к AI', ref });
  }
}

// Ошибки, которые ПОЛЕЗНО показать пользователю (это не детали провайдера,
// а понятная причина), помечаем safeMessage — остальное остаётся в логах.
function userError(msg) {
  const e = new Error(msg);
  e.safeMessage = msg;
  return e;
}

async function callGemini({ model, system, user, temperature, wantJson, maxTokens }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw userError('На сервере не настроен GEMINI_API_KEY');

  // Дефолт по замерам проекта (см. CLAUDE.md): 3.5 Flash часто отдаёт 503,
  // 3.1 Flash Lite стабильнее и по качеству выше GPT-4o mini.
  const mdl = model || 'gemini-3.1-flash-lite';
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
    const e = new Error(`Gemini ${resp.status}: ${shorten(t)}`);
    if (resp.status === 429) e.safeMessage = 'Лимит запросов к Gemini исчерпан — попробуйте позже';
    if (resp.status === 503) e.safeMessage = 'Gemini перегружен — попробуйте ещё раз или смените модель';
    throw e;
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason;
    throw userError(reason === 'SAFETY'
      ? 'Gemini заблокировал ответ по фильтрам безопасности'
      : 'Пустой ответ от Gemini' + (reason ? ` (${reason})` : ''));
  }
  return text.trim();
}

async function callOpenAI({ model, system, user, temperature, wantJson, maxTokens }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw userError('На сервере не настроен OPENAI_API_KEY');

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
    const e = new Error(`OpenAI ${resp.status}: ${shorten(t)}`);
    if (resp.status === 429) e.safeMessage = 'Лимит запросов к OpenAI исчерпан — попробуйте позже';
    throw e;
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) {
    const reason = data?.choices?.[0]?.finish_reason;
    if (reason === 'content_filter') throw userError('Модель заблокировала ответ по content-фильтрам');
    if (reason === 'length') throw userError('Ответ не поместился в лимит модели — уменьшите размер скрипта');
    throw userError('Пустой ответ от OpenAI' + (reason ? ` (${reason})` : ''));
  }
  return text.trim();
}

function shorten(s) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > 300 ? t.slice(0, 300) + '…' : t;
}
