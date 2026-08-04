// Запуск всех тестов: npm test
//
// Зачем это существует: CLAUDE.md годами предписывал прогонять test.js /
// test4.js / test5.js, которых в репозитории не было ни одного дня. Единственная
// страховка 600-килобайтного файла без сборки и модулей была недоступна всем,
// кто клонировал проект. Здесь она есть.
const { execSync } = require('child_process');
const path = require('path');

const SUITES = [
  './security.test.js',
  './generation.test.js',
  './layout.test.js',
  './profiles.test.js'
];

console.log('Cybernet AI — регрессионные тесты\n' + '═'.repeat(50));

let failed = 0;
for (const s of SUITES) {
  try {
    const suite = require(s);
    failed += suite.report();
  } catch (e) {
    failed += 1;
    console.log(`\n${s}`);
    console.log(`  FAIL набор не запустился — ${e.message}`);
  }
}

// Синтаксис всех трёх отгружаемых файлов
console.log('\nСИНТАКСИС');
for (const f of ['script.js', 'supabase-client.js', 'api/ai.js']) {
  try {
    execSync(`node --check ${f}`, { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    console.log(`  ok   ${f}`);
  } catch (e) {
    failed += 1;
    console.log(`  FAIL ${f} — ${String(e.stderr || e.message).split('\n')[0]}`);
  }
}

console.log('\n' + '═'.repeat(50));
if (failed) {
  console.log(`ПРОВАЛЕНО: ${failed}`);
  process.exit(1);
}
console.log('ВСЕ ТЕСТЫ ПРОЙДЕНЫ');
