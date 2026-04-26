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

const SOURCE = "https://math-ege.sdamgia.ru";

export const egeTasks: EgeTask[] = [
  {
    id: "reshuege-prof-01-planimetry-01",
    number: 1,
    topic: "Планиметрия",
    difficulty: "medium",
    statement: "В треугольнике ABC угол C равен 90°, AC = 4,8, sin A = 7/25. Найдите AB.",
    sourceUrl: `${SOURCE}/problem?id=27238`,
    sourceTaskId: "27238",
    answer: "5",
    hint: "AB — гипотенуза. Найди cos A через sin A, затем используй cos A = AC/AB.",
    solution: "Так как sin A = 7/25, то cos A = 24/25. По определению косинуса cos A = AC/AB. Значит AB = AC / cos A = 4,8 / (24/25) = 4,8 · 25 / 24 = 5.",
  },
  {
    id: "reshuege-prof-02-vectors-01",
    number: 2,
    topic: "Векторы",
    difficulty: "medium",
    statement: "Даны векторы a(−3; 4) и b(5; −2). Найдите скалярное произведение a · b.",
    sourceUrl: `${SOURCE}/prob_catalog`,
    answer: "-23",
    hint: "Скалярное произведение в координатах считается как x₁x₂ + y₁y₂.",
    solution: "a · b = (−3) · 5 + 4 · (−2) = −15 − 8 = −23.",
  },
  {
    id: "reshuege-prof-03-stereo-01",
    number: 3,
    topic: "Стереометрия",
    difficulty: "medium",
    statement: "В прямоугольном параллелепипеде стороны основания равны 6 и 8, а высота равна 24. Найдите длину диагонали параллелепипеда.",
    sourceUrl: `${SOURCE}/prob_catalog`,
    answer: "26",
    hint: "Используй пространственную теорему Пифагора: d² = a² + b² + c².",
    solution: "d² = 6² + 8² + 24² = 36 + 64 + 576 = 676. Значит d = 26.",
  },
  {
    id: "reshuege-prof-04-probability-01",
    number: 4,
    topic: "Классическая вероятность",
    difficulty: "medium",
    statement: "Игральную кость бросают два раза. Найдите вероятность того, что сумма выпавших очков равна 8. Ответ округлите до сотых.",
    sourceUrl: `${SOURCE}/prob_catalog`,
    answer: "0.14",
    hint: "Всего 36 равновозможных исходов. Перечисли пары, дающие сумму 8.",
    solution: "Сумму 8 дают пары (2;6), (3;5), (4;4), (5;3), (6;2), всего 5 исходов. Вероятность равна 5/36 ≈ 0,14.",
  },
  {
    id: "reshuege-prof-05-complex-probability-01",
    number: 5,
    topic: "Вероятности сложных событий",
    difficulty: "medium",
    statement: "Вероятность того, что первый станок выпустит бракованную деталь, равна 0,03, а второй — 0,04. Детали выбирают независимо. Найдите вероятность того, что обе детали окажутся качественными.",
    sourceUrl: `${SOURCE}/prob_catalog`,
    answer: "0.9312",
    hint: "Сначала найди вероятности качественной детали для каждого станка.",
    solution: "Для первого станка вероятность качественной детали равна 1 − 0,03 = 0,97. Для второго: 1 − 0,04 = 0,96. Так как события независимы, получаем 0,97 · 0,96 = 0,9312.",
  },
  {
    id: "reshuege-prof-06-log-equation-01",
    number: 6,
    topic: "Простейшие уравнения",
    difficulty: "medium",
    statement: "Решите уравнение log₂(4 − x) = 7. В ответе укажите корень.",
    sourceUrl: `${SOURCE}/prob_catalog`,
    answer: "-124",
    hint: "Если log₂(4 − x) = 7, то 4 − x = 2⁷.",
    solution: "Из log₂(4 − x) = 7 получаем 4 − x = 128. Тогда −x = 124, значит x = −124. Область определения 4 − x > 0 выполнена.",
  },
  {
    id: "reshuege-prof-07-transform-01",
    number: 7,
    topic: "Вычисления и преобразования",
    difficulty: "medium",
    statement: "Найдите значение выражения √(65² − 56²).",
    sourceUrl: `${SOURCE}/prob_catalog`,
    answer: "33",
    hint: "Под корнем стоит разность квадратов.",
    solution: "65² − 56² = (65 − 56)(65 + 56) = 9 · 121 = 1089. Тогда √1089 = 33.",
  },
  {
    id: "reshuege-prof-08-derivative-01",
    number: 8,
    topic: "Производная и касательная",
    difficulty: "medium",
    statement: "Найдите абсциссу точки, в которой касательная к графику функции y = x² + 6x − 8 параллельна прямой y = 7x − 5.",
    sourceUrl: `${SOURCE}/prob_catalog`,
    answer: "0.5",
    hint: "Параллельные прямые имеют одинаковый угловой коэффициент. Приравняй производную к 7.",
    solution: "y′ = 2x + 6. Наклон прямой y = 7x − 5 равен 7. Значит 2x + 6 = 7, откуда x = 0,5.",
  },
  {
    id: "reshuege-prof-09-applied-formula-01",
    number: 9,
    topic: "Прикладная задача с формулой",
    difficulty: "medium",
    statement: "Температура металлического стержня увеличилась так, что его длина изменилась по формуле l = l₀(1 + αt), где l₀ = 10 м, α = 1,2 · 10⁻⁵. На сколько градусов повысилась температура, если стержень удлинился на 3 мм?",
    sourceUrl: `${SOURCE}/prob_catalog`,
    answer: "25",
    hint: "3 мм = 0,003 м. Удлинение равно l₀αt.",
    solution: "0,003 = 10 · 1,2 · 10⁻⁵ · t. Получаем 0,003 = 0,00012t, значит t = 25.",
  },
  {
    id: "reshuege-prof-10-word-problem-01",
    number: 10,
    topic: "Текстовая задача",
    difficulty: "medium",
    statement: "Катер прошёл 30 км по течению и 20 км против течения за 3 часа. Собственная скорость катера равна 18 км/ч. Найдите скорость течения реки.",
    sourceUrl: `${SOURCE}/prob_catalog`,
    answer: "2",
    hint: "Составь уравнение: 30/(18 + v) + 20/(18 − v) = 3.",
    solution: "Пусть v — скорость течения. Тогда 30/(18 + v) + 20/(18 − v) = 3. После преобразований получаем 3v² + 10v − 108 = 0. Положительный корень: v = 2.",
  },
  {
    id: "reshuege-prof-11-optimization-01",
    number: 11,
    topic: "Наибольшее и наименьшее значение",
    difficulty: "hard",
    statement: "Найдите наименьшее значение функции y = x² − 8x + 19.",
    sourceUrl: `${SOURCE}/prob_catalog`,
    answer: "3",
    hint: "Выдели полный квадрат.",
    solution: "y = x² − 8x + 19 = (x − 4)² + 3. Так как (x − 4)² ≥ 0, наименьшее значение функции равно 3.",
  },
  {
    id: "reshuege-prof-12-finance-01",
    number: 12,
    topic: "Финансовая математика",
    difficulty: "hard",
    statement: "Кредит 240 000 рублей выдан на 2 года под 10% годовых. В конце каждого года долг увеличивается на 10%, после чего заёмщик вносит одинаковый платёж. Найдите размер ежегодного платежа, если после второго платежа долг полностью погашен.",
    sourceUrl: `${SOURCE}/prob_catalog`,
    answer: "138000",
    hint: "Пусть платёж равен A. После первого года долг: 264000 − A. После второго: 1,1(264000 − A) − A.",
    solution: "Пусть ежегодный платёж равен A. После первого начисления долг 240000 · 1,1 = 264000, после платежа 264000 − A. После второго года: 1,1(264000 − A) − A = 0. Тогда 290400 − 2,1A = 0, значит A = 138000.",
  },
];

export function normalizeAnswer(value: string) {
  return value.trim().replace(",", ".").replace(/\s+/g, "").toLowerCase();
}

export function getEgeTask(taskId: string) {
  return egeTasks.find((task) => task.id === taskId);
}
