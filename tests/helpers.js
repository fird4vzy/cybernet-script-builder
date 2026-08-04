// Общая обвязка для тестов.
//
// Сборки нет и модулей нет — script.js это один большой файл для браузера.
// Поэтому тесты вытаскивают из него нужные функции по имени и исполняют.
// Способ грубый, но честный: проверяется РОВНО тот код, который поедет в
// продакшен, без параллельной копии, которая разъедется с оригиналом.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readSource(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

// Вырезать объявление функции целиком, считая фигурные скобки.
function extractFunction(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error(`функция ${name} не найдена`);
  let depth = 0, i = src.indexOf('{', start), end = -1;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) throw new Error(`не удалось разобрать тело ${name}`);
  return src.slice(start, end);
}

// Загрузить функцию из script.js в исполняемом виде.
// deps — имена функций/констант, от которых она зависит: файл не модульный,
// поэтому свободные переменные надо принести вместе с ней.
function loadFunction(name, file = 'script.js', deps = []) {
  const src = readSource(file);
  const preamble = deps.map(d => {
    const asConst = src.match(new RegExp(`^const ${d} = .*$`, 'm'));
    if (asConst) return asConst[0];
    return extractFunction(src, d);
  }).join('\n');
  const body = extractFunction(src, name);
  return eval(`(function () { ${preamble}\n${body}\n return ${name}; })()`);
}

// Исходник без строк-комментариев. Нужен, когда проверяем ОТСУТСТВИЕ вызова:
// иначе тест ловит упоминание этого вызова в комментарии «раньше здесь было…».
function readCode(file) {
  return readSource(file)
    .split(/\r?\n/)
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
}

// Вырезать значение const-массива (например LITERARY_MARKERS).
function loadConstArray(name, file = 'script.js') {
  const src = readSource(file);
  const decl = `const ${name} = [`;
  const start = src.indexOf(decl);
  if (start < 0) throw new Error(`массив ${name} не найден`);
  const end = src.indexOf('];', start) + 2;
  return eval(src.slice(start + `const ${name} = `.length, end));
}

// ─── Мини-раннер ───────────────────────────────────────────────
function makeSuite(title) {
  const results = [];
  const t = (name, fn) => {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, err: e.message });
    }
  };
  t.report = () => {
    const failed = results.filter(r => !r.ok);
    console.log(`\n${title}`);
    results.forEach(r => console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok ? '' : ' — ' + r.err}`));
    console.log(`  ${results.length - failed.length}/${results.length} пройдено`);
    return failed.length;
  };
  return t;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'условие не выполнено');
}

function assertEqual(got, want, msg) {
  if (got !== want) throw new Error(`${msg || 'не совпало'}: получено ${JSON.stringify(got)}, ожидалось ${JSON.stringify(want)}`);
}

module.exports = { ROOT, readSource, readCode, extractFunction, loadFunction, loadConstArray, makeSuite, assert, assertEqual };
