export type EgeTask = {
  id: string;
  number: number;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  statement: string;
  imageUrl?: string;
  sourceUrl?: string;
  sourceTaskId?: string;
  answer: string;
  solution: string;
  hint: string;
};

type TaskFactory = (index: number) => EgeTask;

const variants = Array.from({ length: 50 }, (_, index) => index + 1);
const fmt = (value: number) => Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4))).replace(".", ".");

function makeTasks(factory: TaskFactory) {
  return variants.map(factory);
}

const triples = [
  [3, 4, 5],
  [5, 12, 13],
  [7, 24, 25],
  [8, 15, 17],
  [9, 40, 41],
  [20, 21, 29],
] as const;

const type1 = makeTasks((i) => {
  const [opposite, adjacent, hypotenuse] = triples[i % triples.length];
  const scale = 1 + (i % 8);
  const ac = adjacent * scale;
  const answer = hypotenuse * scale;

  return {
    id: `ege-prof-01-planimetry-${i}`,
    number: 1,
    topic: "Планиметрия",
    difficulty: "medium",
    statement: `В треугольнике ABC угол C равен 90°, AC = ${fmt(ac)}, sin A = ${opposite}/${hypotenuse}. Найдите AB.`,
    answer: fmt(answer),
    hint: "AB — гипотенуза. Найди cos A через sin A, затем используй cos A = AC/AB.",
    solution: `Так как sin A = ${opposite}/${hypotenuse}, то cos A = ${adjacent}/${hypotenuse}. По определению косинуса cos A = AC/AB. Значит AB = ${fmt(ac)} / (${adjacent}/${hypotenuse}) = ${fmt(answer)}.`,
  };
});

const type2 = makeTasks((i) => {
  const ax = (i % 11) - 5 || 3;
  const ay = ((i * 2) % 13) - 6 || -4;
  const bx = ((i * 3) % 15) - 7 || 5;
  const by = ((i * 5) % 17) - 8 || -2;
  const answer = ax * bx + ay * by;

  return {
    id: `ege-prof-02-vectors-${i}`,
    number: 2,
    topic: "Векторы",
    difficulty: "medium",
    statement: `Даны векторы a(${ax}; ${ay}) и b(${bx}; ${by}). Найдите скалярное произведение a · b.`,
    answer: fmt(answer),
    hint: "Скалярное произведение в координатах считается как x₁x₂ + y₁y₂.",
    solution: `a · b = ${ax} · ${bx} + ${ay} · ${by} = ${fmt(answer)}.`,
  };
});

const type3 = makeTasks((i) => {
  const [a, b, baseDiagonal] = triples[(i + 1) % triples.length];
  const height = [12, 16, 20, 24, 28][i % 5];
  const answer = Math.sqrt(baseDiagonal ** 2 + height ** 2);
  const scaled = Number.isInteger(answer) ? 1 : 5;
  const aa = a * scaled;
  const bb = b * scaled;
  const cc = height * scaled;
  const diag = Math.sqrt(aa ** 2 + bb ** 2 + cc ** 2);

  return {
    id: `ege-prof-03-stereo-${i}`,
    number: 3,
    topic: "Стереометрия",
    difficulty: "medium",
    statement: `В прямоугольном параллелепипеде стороны основания равны ${aa} и ${bb}, а высота равна ${cc}. Найдите длину диагонали параллелепипеда.`,
    answer: fmt(diag),
    hint: "Используй пространственную теорему Пифагора: d² = a² + b² + c².",
    solution: `d² = ${aa}² + ${bb}² + ${cc}² = ${fmt(diag ** 2)}. Значит d = ${fmt(diag)}.`,
  };
});

const diceCounts: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const type4 = makeTasks((i) => {
  const sum = 2 + (i % 11);
  const answer = Number((diceCounts[sum] / 36).toFixed(2));

  return {
    id: `ege-prof-04-probability-${i}`,
    number: 4,
    topic: "Классическая вероятность",
    difficulty: "medium",
    statement: `Игральную кость бросают два раза. Найдите вероятность того, что сумма выпавших очков равна ${sum}. Ответ округлите до сотых.`,
    answer: fmt(answer),
    hint: "Всего 36 равновозможных исходов. Посчитай пары, которые дают нужную сумму.",
    solution: `Подходящих исходов ${diceCounts[sum]}, всего исходов 36. Вероятность равна ${diceCounts[sum]}/36 ≈ ${fmt(answer)}.`,
  };
});

const type5 = makeTasks((i) => {
  const defectA = [0.01, 0.02, 0.03, 0.04, 0.05][i % 5];
  const defectB = [0.02, 0.04, 0.06, 0.08, 0.1][Math.floor(i / 5) % 5];
  const answer = (1 - defectA) * (1 - defectB);

  return {
    id: `ege-prof-05-complex-probability-${i}`,
    number: 5,
    topic: "Вероятности сложных событий",
    difficulty: "medium",
    statement: `Вероятность брака на первом станке равна ${fmt(defectA)}, а на втором — ${fmt(defectB)}. Детали выбирают независимо. Найдите вероятность того, что обе детали окажутся качественными.`,
    answer: fmt(answer),
    hint: "Сначала найди вероятность качественной детали для каждого станка, затем перемножь.",
    solution: `Вероятности качества: ${fmt(1 - defectA)} и ${fmt(1 - defectB)}. Тогда искомая вероятность равна ${fmt(1 - defectA)} · ${fmt(1 - defectB)} = ${fmt(answer)}.`,
  };
});

const type6 = makeTasks((i) => {
  const base = [2, 3, 5][i % 3];
  const power = 2 + (i % 5);
  const shift = 1 + (i % 20);
  const value = base ** power;
  const answer = shift - value;

  return {
    id: `ege-prof-06-equation-${i}`,
    number: 6,
    topic: "Простейшие уравнения",
    difficulty: "medium",
    statement: `Решите уравнение log${base === 2 ? "₂" : base === 3 ? "₃" : "₅"}(${shift} − x) = ${power}. В ответе укажите корень.`,
    answer: fmt(answer),
    hint: `Если log${base}(${shift} − x) = ${power}, то ${shift} − x = ${base}${power === 2 ? "²" : power === 3 ? "³" : `^${power}`}.`,
    solution: `${shift} − x = ${base}^${power} = ${value}. Тогда x = ${shift} − ${value} = ${fmt(answer)}.`,
  };
});

const type7 = makeTasks((i) => {
  const [leg, otherLeg, hyp] = triples[i % triples.length];
  const scale = 1 + (i % 7);
  const a = hyp * scale;
  const b = leg * scale;
  const answer = otherLeg * scale;

  return {
    id: `ege-prof-07-transform-${i}`,
    number: 7,
    topic: "Вычисления и преобразования",
    difficulty: "medium",
    statement: `Найдите значение выражения √(${a}² − ${b}²).`,
    answer: fmt(answer),
    hint: "Под корнем стоит разность квадратов. Можно использовать готовую пифагорову тройку.",
    solution: `${a}² − ${b}² = ${fmt(a ** 2 - b ** 2)}, поэтому √(${fmt(a ** 2 - b ** 2)}) = ${fmt(answer)}.`,
  };
});

const type8 = makeTasks((i) => {
  const b = (i % 9) - 4;
  const x = (i % 11) - 5;
  const slope = 2 * x + b;
  const c = (i * 3) % 17 - 8;

  return {
    id: `ege-prof-08-derivative-${i}`,
    number: 8,
    topic: "Производная и касательная",
    difficulty: "medium",
    statement: `Найдите абсциссу точки, в которой касательная к графику функции y = x² ${b >= 0 ? "+" : "−"} ${Math.abs(b)}x ${c >= 0 ? "+" : "−"} ${Math.abs(c)} параллельна прямой y = ${slope}x + 1.`,
    answer: fmt(x),
    hint: "Параллельные прямые имеют одинаковый угловой коэффициент. Приравняй производную к коэффициенту при x.",
    solution: `y′ = 2x ${b >= 0 ? "+" : "−"} ${Math.abs(b)}. Наклон прямой равен ${slope}. Получаем 2x ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${slope}, откуда x = ${fmt(x)}.`,
  };
});

const type9 = makeTasks((i) => {
  const length = [5, 8, 10, 12, 15][i % 5];
  const alpha = [1.2, 1.5, 2, 2.4, 3][Math.floor(i / 5) % 5];
  const temp = 10 + (i % 10) * 5;
  const deltaMeters = length * alpha * 10 ** -5 * temp;
  const deltaMm = deltaMeters * 1000;

  return {
    id: `ege-prof-09-formula-${i}`,
    number: 9,
    topic: "Прикладная задача с формулой",
    difficulty: "medium",
    statement: `Длина металлического стержня меняется по формуле l = l₀(1 + αt), где l₀ = ${length} м, α = ${alpha} · 10⁻⁵. На сколько градусов повысилась температура, если стержень удлинился на ${fmt(deltaMm)} мм?`,
    answer: fmt(temp),
    hint: "Переведи миллиметры в метры. Удлинение равно l₀αt.",
    solution: `${fmt(deltaMm)} мм = ${fmt(deltaMeters)} м. Получаем ${fmt(deltaMeters)} = ${length} · ${alpha} · 10⁻⁵ · t, откуда t = ${fmt(temp)}.`,
  };
});

const type10 = makeTasks((i) => {
  const own = 12 + (i % 9) * 2;
  const flow = 1 + (i % 5);
  const down = (own + flow) * (1 + (i % 3));
  const up = (own - flow) * (1 + ((i + 1) % 3));
  const total = down / (own + flow) + up / (own - flow);

  return {
    id: `ege-prof-10-word-${i}`,
    number: 10,
    topic: "Текстовая задача",
    difficulty: "medium",
    statement: `Катер прошёл ${down} км по течению и ${up} км против течения за ${fmt(total)} ч. Собственная скорость катера равна ${own} км/ч. Найдите скорость течения реки.`,
    answer: fmt(flow),
    hint: "Скорость по течению равна u + v, против течения — u − v. Составь уравнение по времени.",
    solution: `Пусть v — скорость течения. Тогда ${down}/(${own} + v) + ${up}/(${own} − v) = ${fmt(total)}. Подстановка v = ${flow} даёт верное равенство, значит ответ ${flow}.`,
  };
});

const type11 = makeTasks((i) => {
  const vertex = (i % 15) - 7;
  const min = (i % 19) - 5;
  const b = -2 * vertex;
  const c = vertex ** 2 + min;

  return {
    id: `ege-prof-11-optimization-${i}`,
    number: 11,
    topic: "Наибольшее и наименьшее значение",
    difficulty: "hard",
    statement: `Найдите наименьшее значение функции y = x² ${b >= 0 ? "+" : "−"} ${Math.abs(b)}x ${c >= 0 ? "+" : "−"} ${Math.abs(c)}.`,
    answer: fmt(min),
    hint: "Выдели полный квадрат и посмотри на вершину параболы.",
    solution: `y = (x ${vertex >= 0 ? "−" : "+"} ${Math.abs(vertex)})² ${min >= 0 ? "+" : "−"} ${Math.abs(min)}. Квадрат неотрицателен, поэтому наименьшее значение равно ${fmt(min)}.`,
  };
});

const type12 = makeTasks((i) => {
  const principal = 21000 * (5 + (i % 16));
  const annualPayment = principal * 121 / 210;

  return {
    id: `ege-prof-12-finance-${i}`,
    number: 12,
    topic: "Финансовая математика",
    difficulty: "hard",
    statement: `Кредит ${principal} рублей выдан на 2 года под 10% годовых. В конце каждого года долг увеличивается на 10%, после чего заёмщик вносит одинаковый платёж. Найдите размер ежегодного платежа, если после второго платежа долг полностью погашен.`,
    answer: fmt(annualPayment),
    hint: "Пусть платёж равен A. После первого года долг: 1,1S − A. После второго: 1,1(1,1S − A) − A = 0.",
    solution: `Пусть платёж равен A. Тогда 1,1(1,1 · ${principal} − A) − A = 0. Получаем 1,21 · ${principal} − 2,1A = 0, значит A = ${fmt(annualPayment)}.`,
  };
});

export const egeTasks: EgeTask[] = [
  ...type1,
  ...type2,
  ...type3,
  ...type4,
  ...type5,
  ...type6,
  ...type7,
  ...type8,
  ...type9,
  ...type10,
  ...type11,
  ...type12,
];

export function normalizeAnswer(value: string) {
  return value.trim().replace(",", ".").replace(/\s+/g, "").toLowerCase();
}

export function getEgeTask(taskId: string) {
  return egeTasks.find((task) => task.id === taskId);
}
