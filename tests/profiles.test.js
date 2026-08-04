// Тесты группировки профилей по компаниям и целостности проекта.
const { readSource, loadFunction, makeSuite, assert, assertEqual } = require('./helpers');

const t = makeSuite('ПРОФИЛИ И ЦЕЛОСТНОСТЬ');

const guessCompany = loadFunction('guessCompany');

t('компания вычленяется из принятых в библиотеке имён', () => {
  const cases = {
    'tm_script_ipakyolibank': 'ipakyolibank',
    'pre_script_bank_0': 'bank',
    'tm_script_1C_uzcloud': '1C',
    'TM_script_MONIX_card_activation': 'MONIX',
    'tm_script_uzumbank_mainLimit': 'uzumbank',
    'soft_script_tbcbank': 'tbcbank',
    'hard_script_bank': 'bank'
  };
  Object.entries(cases).forEach(([name, want]) => assertEqual(guessCompany(name), want, name));
});

t('несколько скриптов одного банка попадают в одну группу', () => {
  const same = ['pre_script_bank_0', 'start_script_bank', 'hard_script_bank', 'soft_script_bank'];
  const groups = new Set(same.map(guessCompany));
  assertEqual(groups.size, 1, 'скрипты одного банка разъехались по группам');
});

t('нестандартные имена не роняют группировку', () => {
  ['Новый скрипт', 'Реструктуризация долга', '', 'AVO', '2.drawio'].forEach(n => {
    const r = guessCompany(n);
    assert(typeof r === 'string' && r.length > 0, `пустая компания для «${n}»`);
  });
});

// ─── Целостность проекта ───────────────────────────────────────
// Версия сборки логируется в консоль и служит единственным способом понять,
// доехал ли код до браузера. Токены ?v= в index.html должны идти с ней в ногу.
t('версия сборки объявлена', () => {
  const src = readSource('script.js');
  assert(/const CYBERNET_BUILD = '[^']+'/.test(src), 'CYBERNET_BUILD не найден');
});

t('токены ?v= у всех ресурсов одинаковые', () => {
  const html = readSource('index.html');
  const tokens = [...html.matchAll(/(?:href|src)="(?:styles\.css|script\.js|supabase-client\.js)\?v=([^"]+)"/g)]
    .map(m => m[1]);
  assertEqual(tokens.length, 3, 'ожидались токены у styles.css, script.js и supabase-client.js');
  assertEqual(new Set(tokens).size, 1, `токены разъехались: ${tokens.join(', ')} — правки не доедут до браузера`);
});

t('CRLF сохранён во всех исходниках', () => {
  ['script.js', 'index.html', 'styles.css', 'supabase-client.js'].forEach(f => {
    const raw = readSource(f);
    const lone = (raw.match(/(?<!\r)\n/g) || []).length;
    assertEqual(lone, 0, `${f}: ${lone} строк с одиночным LF — дифф раздуется на весь файл`);
  });
});

t('node_modules не попадает в репозиторий', () => {
  const ignore = readSource('.gitignore');
  assert(/^node_modules\/?$/m.test(ignore), 'node_modules/ не в .gitignore');
});

t('в package.json нет неиспользуемых зависимостей', () => {
  const pkg = JSON.parse(readSource('package.json'));
  const deps = Object.keys(pkg.dependencies || {});
  assertEqual(deps.length, 0, `зависимости не используются в коде: ${deps.join(', ')}`);
});

module.exports = t;
