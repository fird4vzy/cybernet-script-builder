// Тесты безопасности. Появились после аудита, который нашёл три критических
// дыры; каждый тест закрывает конкретную из них, чтобы она не вернулась.
const { readSource, readCode, loadFunction, makeSuite, assert, assertEqual } = require('./helpers');

const t = makeSuite('БЕЗОПАСНОСТЬ');

// ─── C-3: id блока попадает в inline-обработчик ────────────────
// esc() экранирует HTML, но НЕ спасает внутри onclick="fn('...')":
// HTML-парсер раскодирует &#39; обратно в апостроф до того, как строку
// разберёт JS. Единственная реальная защита — набор допустимых символов.
const sanitizeProfileIds = loadFunction('sanitizeProfileIds', 'script.js', ['SAFE_ID_RE', 'safeIdFrom']);

t('sanitizeProfileIds вычищает кавычку, ломающую onclick', () => {
  const p = { blocks: [{ id: `x');alert(1);//`, branches: [] }], sections: [] };
  sanitizeProfileIds(p);
  assert(!/['"()]/.test(p.blocks[0].id), `в id остались опасные символы: ${p.blocks[0].id}`);
});

t('sanitizeProfileIds вычищает угловые скобки', () => {
  const p = { blocks: [{ id: '<img src=x onerror=alert(1)>', branches: [] }], sections: [] };
  sanitizeProfileIds(p);
  assert(!/[<>]/.test(p.blocks[0].id), `в id остались угловые скобки: ${p.blocks[0].id}`);
});

t('перенумерация id чинит ссылки в ветках', () => {
  const p = {
    sections: [{ id: 's1' }],
    blocks: [
      { id: `bad');//`, sec: 's1', branches: [{ next: 'ok2' }] },
      { id: 'ok2', sec: 's1', branches: [{ next: `bad');//` }] }
    ]
  };
  sanitizeProfileIds(p);
  const ids = p.blocks.map(b => b.id);
  const target = p.blocks[1].branches[0].next;
  assert(ids.includes(target), `ветка ссылается на несуществующий блок: ${target}`);
});

t('нормальные id не трогаются', () => {
  const p = { sections: [{ id: 's1' }], blocks: [{ id: 'greeting_2', sec: 's1', branches: [] }] };
  sanitizeProfileIds(p);
  assertEqual(p.blocks[0].id, 'greeting_2', 'безопасный id изменён');
});

// Все входы недоверенных профилей обязаны проходить через safeProfile().
t('все пути импорта профилей обеззараживаются', () => {
  const src = readSource('script.js');
  const required = [
    ['CSV-импорт', /safeProfile\(profiles\[profName\]\)/],
    ['импорт эталона из файла', /const p = safeProfile\(JSON\.parse\(ev\.target\.result\)\)/],
    ['облачные эталоны', /profile: safeProfile\(row\.profile_data\)/],
    ['эталон как профиль', /safeProfile\(JSON\.parse\(JSON\.stringify\(r\.profile\)\)\)/],
    ['чтение эталона', /return safeProfile\(/]
  ];
  required.forEach(([what, re]) => assert(re.test(src), `путь «${what}» не обеззараживается`));
});

t('id в атрибуте option экранируется', () => {
  const src = readSource('script.js');
  assert(!/<option value="\$\{id\}"/.test(src), 'сырой ${id} в value — нужен esc()');
});

// ─── C-2: ключи провайдеров не должны попадать в базу ──────────
t('cloudSaveSettings срезает ключи провайдеров', () => {
  const stripProviderKeys = loadFunction('stripProviderKeys', 'supabase-client.js');
  const out = stripProviderKeys({
    provider: 'openai', apiKey: 'sk-secret', geminiApiKey: 'AIza-secret',
    openaiApiKey: 'sk-secret2', learnFromEdits: true
  });
  assert(!('apiKey' in out), 'apiKey уехал в базу');
  assert(!('geminiApiKey' in out), 'geminiApiKey уехал в базу');
  assert(!('openaiApiKey' in out), 'openaiApiKey уехал в базу');
  assertEqual(out.provider, 'openai', 'обычные настройки не должны теряться');
  assertEqual(out.learnFromEdits, true, 'обычные настройки не должны теряться');
});

t('в запись настроек передаётся именно очищенный объект', () => {
  const src = readSource('supabase-client.js');
  assert(/llm_settings: stripProviderKeys\(llmSettings\)/.test(src),
    'cloudSaveSettings пишет llmSettings напрямую, минуя очистку');
});

// ─── C-1: прокси не должен быть открытым ───────────────────────
t('прокси требует авторизацию до обращения к провайдеру', () => {
  const api = readSource('api/ai.js');
  assert(/verifyUser\(req\)/.test(api), 'нет проверки пользователя');
  assert(/status\(401\)/.test(api), 'нет ответа 401 для неавторизованных');
  const authAt = api.indexOf('await verifyUser(req)');
  const callAt = api.indexOf('provider === \'openai\'');
  assert(authAt > 0 && authAt < callAt, 'проверка пользователя должна идти ДО вызова провайдера');
});

t('лимитер не обнуляет счётчики всем сразу', () => {
  // readCode, а не readSource: в комментарии рядом объясняется, почему так
  // делать нельзя, и по исходнику тест ловил бы собственное объяснение.
  const api = readCode('api/ai.js');
  assert(!/hits\.clear\(\)/.test(api),
    'hits.clear() сбрасывает лимит всем пользователям — так делать нельзя');
});

t('лимит считается по пользователю, а не по IP', () => {
  const api = readSource('api/ai.js');
  assert(/rateLimited\(user\.id\)/.test(api), 'лимит должен быть привязан к user.id');
});

t('размер промпта ограничен', () => {
  const api = readSource('api/ai.js');
  assert(/MAX_PROMPT_CHARS/.test(api) && /status\(413\)/.test(api), 'нет капа на размер промпта');
});

t('temperature зажата в допустимый диапазон', () => {
  const api = readSource('api/ai.js');
  assert(/Math\.min\(Math\.max\(/.test(api), 'temperature не ограничена — провайдер вернёт 400');
});

t('тела ошибок провайдера наружу не отдаются', () => {
  const api = readSource('api/ai.js');
  // shorten() по-прежнему нужен для логов, но в ответ клиенту идёт safeMessage
  assert(/safe \|\| 'Ошибка обращения к AI'/.test(api),
    'наружу уходит err.message с сырым ответом провайдера');
  assert(/ref: reqId\(\)|ref\b/.test(api), 'нет номера обращения для поиска в логах');
});

t('service-role ключ в коде отсутствует', () => {
  const api = readSource('api/ai.js');
  assert(!/SERVICE_ROLE/i.test(api), 'service-role ключ не должен использоваться в прокси');
});

module.exports = t;
