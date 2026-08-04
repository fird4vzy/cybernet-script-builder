// Тесты раскладки схемы.
//
// История двух багов, которые эти тесты стерегут:
//  1) buildLayout строил граф по legacy-полям next_default/next_yes/next_no,
//     а syncLegacyNext кладёт туда максимум ТРИ ссылки. Блок с четырьмя
//     ветками терял детей, те оставались без родителей, считались корнями и
//     вставали ВЫШЕ собственного родителя.
//  2) Порядок блоков внутри строки сортировался по id как по строке
//     ('10' < '8'), из-за чего стрелки бегали через всю схему.
const { loadFunction, makeSuite, assert, assertEqual } = require('./helpers');

const t = makeSuite('РАСКЛАДКА СХЕМЫ');

const BRANCH_COLOR_DEFAULT = '#6b7280';
global.BRANCH_COLOR_DEFAULT = BRANCH_COLOR_DEFAULT;
const buildLayout = loadFunction('buildLayout');

const B = (id, title, type, brs) => ({
  id, title, type, intent: '',
  branches: brs.map(([label, next]) => ({ id: 'br' + id + next, label, color: BRANCH_COLOR_DEFAULT, next }))
});

// Геометрия из canvasApplyAutoLayout()
const NW = 250, NH = 110, HG = 30, LG = 80, VG = 90, PAD = 60;
function positions(blocks) {
  const { rowCells } = buildLayout(blocks);
  const rows = Object.keys(rowCells).map(Number).sort((a, b) => a - b);
  let mL = 0, mC = 1, mR = 0;
  rows.forEach(r => {
    mL = Math.max(mL, rowCells[r].left.length);
    mC = Math.max(mC, rowCells[r].center.length);
    mR = Math.max(mR, rowCells[r].right.length);
  });
  const lw = {
    left: mL * NW + Math.max(0, mL - 1) * HG,
    center: mC * NW + Math.max(0, mC - 1) * HG,
    right: mR * NW + Math.max(0, mR - 1) * HG
  };
  const lx = {
    left: PAD,
    center: PAD + (lw.left ? lw.left + LG : 0),
    right: PAD + (lw.left ? lw.left + LG : 0) + lw.center + (lw.right ? LG : 0)
  };
  const pos = {};
  rows.forEach(r => ['left', 'center', 'right'].forEach(ln => {
    const ns = rowCells[r][ln];
    if (!ns.length) return;
    const tw = ns.length * NW + Math.max(0, ns.length - 1) * HG;
    const sx = lx[ln] + ((lw[ln] || NW) - tw) / 2;
    ns.forEach((id, i) => { pos[id] = [sx + i * (NW + HG), PAD + r * (NH + VG)]; });
  }));
  return pos;
}

// Граф с блоком на ТРИ ветки, ни одна из которых не «да»/«нет» —
// ровно тот случай, который ломал legacy-поля.
const threeWay = [
  B('start', 'Начало', 'start', [['', 'lang']]),
  B('lang', 'Проверка языка', 'decision', [['Рус', 'ask'], ['Уз', 'ask']]),
  B('ask', 'Вопрос', 'normal', [['Комфортно', 'end_ok'], ['Некомфортно', 'obj'], ['Непонятно', 'clarify']]),
  B('obj', 'Возражение', 'normal', [['Да', 'end_ok'], ['Нет', 'end_no']]),
  B('clarify', 'Уточнение', 'normal', [['Да', 'end_ok'], ['Нет', 'end_no']]),
  B('end_ok', 'Согласие', 'end', []),
  B('end_no', 'Отказ', 'end', [])
];

t('ветки берутся из branches, а не из трёх legacy-полей', () => {
  const { rank } = buildLayout(threeWay);
  ['obj', 'clarify'].forEach(id => {
    assert(rank[id] > rank['ask'], `«${id}» должен стоять НИЖЕ своего родителя «ask»`);
  });
});

t('ни одно ребро не идёт снизу вверх', () => {
  const { rank } = buildLayout(threeWay);
  threeWay.forEach(b => b.branches.forEach(br => {
    assert(rank[br.next] > rank[b.id],
      `ребро ${b.id}→${br.next} идёт вверх (${rank[b.id]} → ${rank[br.next]})`);
  }));
});

t('обе языковые ветки сходятся в один блок и не ломают ранги', () => {
  const { rank } = buildLayout(threeWay);
  assert(rank['ask'] > rank['lang'], 'блок после ромба языка должен быть ниже ромба');
});

t('порядок в строке — по родителям, а не по алфавиту id', () => {
  // '10' алфавитно меньше '8' — старая сортировка ставила их именно так
  const g = [
    B('root', 'Старт', 'start', [['', 'p1'], ['', 'p2']]),
    B('p1', 'Левый', 'normal', [['', '10']]),
    B('p2', 'Правый', 'normal', [['', '8']]),
    B('10', 'Ребёнок левого', 'end', []),
    B('8', 'Ребёнок правого', 'end', [])
  ];
  const pos = positions(g);
  const dxLeft = Math.abs(pos['10'][0] - pos['p1'][0]);
  const dxRight = Math.abs(pos['8'][0] - pos['p2'][0]);
  const dxCross = Math.abs(pos['10'][0] - pos['p2'][0]);
  assert(dxLeft <= dxCross, 'ребёнок оказался ближе к чужому родителю, чем к своему');
  assert(dxRight <= Math.abs(pos['8'][0] - pos['p1'][0]),
    'ребёнок оказался ближе к чужому родителю, чем к своему');
});

t('концовки встают в полосу родителей, а не всегда влево', () => {
  const { laneOf } = buildLayout(threeWay);
  // end_no доступен только из obj/clarify — он не должен уезжать в другую полосу
  const parents = ['obj', 'clarify'].map(id => laneOf[id]);
  assert(parents.includes(laneOf['end_no']),
    `концовка в полосе «${laneOf['end_no']}», родители в «${parents.join(', ')}»`);
});

t('одиночная цепочка раскладывается по одной строке на блок', () => {
  const chain = [
    B('a', 'A', 'start', [['', 'b']]),
    B('b', 'B', 'normal', [['', 'c']]),
    B('c', 'C', 'end', [])
  ];
  const { rank } = buildLayout(chain);
  assertEqual(rank['a'], 0, 'старт должен быть в строке 0');
  assertEqual(rank['b'], 1, 'второй блок — строка 1');
  assertEqual(rank['c'], 2, 'третий блок — строка 2');
});

t('пустой список блоков не роняет раскладку', () => {
  const r = buildLayout([]);
  assert(r && typeof r === 'object', 'buildLayout([]) должен вернуть объект');
});

module.exports = t;
