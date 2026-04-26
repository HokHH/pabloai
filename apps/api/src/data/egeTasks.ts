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

const SOURCE = "https://prof.mathege.ru";

export const egeTasks: EgeTask[] = [
  {
    id: "mathege-131",
    number: 2,
    topic: "Векторы и координаты",
    difficulty: "medium",
    statement: "Официальное задание открытого банка профильного ЕГЭ по математике. Условие показано на изображении.",
    imageUrl: `${SOURCE}/tasks/131/problem.png?cache=1777201240.8420434`,
    sourceUrl: `${SOURCE}/prototypes/?position=2`,
    sourceTaskId: "131",
    answer: "",
    hint: "Смотри, какие координаты или геометрические данные даны на рисунке, и выбери нужную формулу для номера 2.",
    solution: "Для этого задания нужен разбор по самому изображению. Нажми «Разбор», и Spark пройдёт условие по шагам.",
  },
  {
    id: "mathege-1024",
    number: 3,
    topic: "Прикладная задача по графику",
    difficulty: "medium",
    statement: "Официальное задание открытого банка профильного ЕГЭ по математике. Условие показано на изображении.",
    imageUrl: `${SOURCE}/tasks/1024/problem.png?cache=1777201243.8772948`,
    sourceUrl: `${SOURCE}/prototypes/?position=3`,
    sourceTaskId: "1024",
    answer: "72",
    hint: "На графике найди, при каком n крутящий момент равен 120, а потом используй формулу v = 0,036n.",
    solution: "По графику момент 120 Н·м достигается примерно при n = 2000 об/мин. Тогда v = 0,036 · 2000 = 72 км/ч.",
  },
  {
    id: "mathege-99181",
    number: 4,
    topic: "Планиметрия на клетчатой бумаге",
    difficulty: "medium",
    statement: "Официальное задание открытого банка профильного ЕГЭ по математике. Условие показано на изображении.",
    imageUrl: `${SOURCE}/tasks/99181/problem.png?cache=1777201247.537003`,
    sourceUrl: `${SOURCE}/prototypes/?position=4`,
    sourceTaskId: "99181",
    answer: "2.5",
    hint: "Тангенс угла равен отношению противолежащего катета к прилежащему. Посчитай клетки по вертикали и горизонтали.",
    solution: "По рисунку луч поднимается на 5 клеток и смещается на 2 клетки вправо. Поэтому tg α = 5 / 2 = 2,5.",
  },
  {
    id: "mathege-8912",
    number: 5,
    topic: "Вероятность",
    difficulty: "medium",
    statement: "Официальное задание открытого банка профильного ЕГЭ по математике. Условие показано на изображении.",
    imageUrl: `${SOURCE}/tasks/8912/problem.png?cache=1777201249.8678007`,
    sourceUrl: `${SOURCE}/prototypes/?position=5`,
    sourceTaskId: "8912",
    answer: "0.14",
    hint: "Для суммы 8 у двух кубиков перечисли все подходящие пары исходов.",
    solution: "Всего исходов 36. Сумму 8 дают пары (2;6), (3;5), (4;4), (5;3), (6;2), всего 5 исходов. Вероятность 5/36 ≈ 0,14.",
  },
  {
    id: "mathege-73161",
    number: 6,
    topic: "Логарифмическое уравнение",
    difficulty: "medium",
    statement: "Официальное задание открытого банка профильного ЕГЭ по математике. Условие показано на изображении.",
    imageUrl: `${SOURCE}/tasks/73161/problem.png?cache=1777201253.1072233`,
    sourceUrl: `${SOURCE}/prototypes/?position=6`,
    sourceTaskId: "73161",
    answer: "-124",
    hint: "Если log₂(4 − x) = 7, то 4 − x = 2⁷.",
    solution: "Из log₂(4 − x) = 7 получаем 4 − x = 2⁷ = 128. Тогда −x = 124 и x = −124.",
  },
  {
    id: "mathege-158723",
    number: 7,
    topic: "Планиметрия",
    difficulty: "medium",
    statement: "Официальное задание открытого банка профильного ЕГЭ по математике. Условие показано на изображении.",
    imageUrl: `${SOURCE}/tasks/158723/problem.png?cache=1777201256.1960418`,
    sourceUrl: `${SOURCE}/prototypes/?position=7`,
    sourceTaskId: "158723",
    answer: "4.8",
    hint: "Так как угол C прямой, AB — гипотенуза. Найди cos A через sin A.",
    solution: "sin A = 7/25, значит cos A = 24/25. В прямоугольном треугольнике AC = AB · cos A = 5 · 24/25 = 4,8.",
  },
  {
    id: "mathege-87637",
    number: 8,
    topic: "Производная и касательная",
    difficulty: "medium",
    statement: "Официальное задание открытого банка профильного ЕГЭ по математике. Условие показано на изображении.",
    imageUrl: `${SOURCE}/tasks/87637/problem.png?cache=1777201259.2453628`,
    sourceUrl: `${SOURCE}/prototypes/?position=8`,
    sourceTaskId: "87637",
    answer: "0.5",
    hint: "Параллельные прямые имеют одинаковый угловой коэффициент. Приравняй производную к 7.",
    solution: "Для y = x² + 6x − 8 производная равна y′ = 2x + 6. Касательная параллельна y = 7x − 5, значит её наклон равен 7. Получаем 2x + 6 = 7, откуда x = 0,5.",
  },
  {
    id: "mathege-129700",
    number: 9,
    topic: "Стереометрия",
    difficulty: "hard",
    statement: "Официальное задание открытого банка профильного ЕГЭ по математике. Условие показано на изображении.",
    imageUrl: `${SOURCE}/tasks/129700/problem.png?cache=1777201262.3792884`,
    sourceUrl: `${SOURCE}/prototypes/?position=9`,
    sourceTaskId: "129700",
    answer: "18",
    hint: "Разбей поверхность на две равные L-образные грани и боковые прямоугольники.",
    solution: "Фигура является прямой призмой с L-образным основанием глубины 1. Площадь одного L-основания равна 4, периметр основания равен 10. Полная поверхность: 2 · 4 + 10 · 1 = 18.",
  },
  {
    id: "mathege-43686",
    number: 10,
    topic: "Преобразования выражений",
    difficulty: "medium",
    statement: "Официальное задание открытого банка профильного ЕГЭ по математике. Условие показано на изображении.",
    imageUrl: `${SOURCE}/tasks/43686/problem.png?cache=1777201265.3212328`,
    sourceUrl: `${SOURCE}/prototypes/?position=10`,
    sourceTaskId: "43686",
    answer: "33",
    hint: "Используй разность квадратов под корнем.",
    solution: "65² − 56² = (65 − 56)(65 + 56) = 9 · 121 = 1089. Тогда √1089 = 33.",
  },
  {
    id: "mathege-13620",
    number: 11,
    topic: "Прикладная задача с формулой",
    difficulty: "medium",
    statement: "Официальное задание открытого банка профильного ЕГЭ по математике. Условие показано на изображении.",
    imageUrl: `${SOURCE}/tasks/13620/problem.png?cache=1777201268.302436`,
    sourceUrl: `${SOURCE}/prototypes/?position=11`,
    sourceTaskId: "13620",
    answer: "25",
    hint: "Удлинение 3 мм — это 0,003 м. Подставь в l(t) = l₀(1 + αt).",
    solution: "Удлинение равно l₀αt. Получаем 0,003 = 10 · 1,2 · 10⁻⁵ · t. Тогда t = 0,003 / 0,00012 = 25.",
  },
];

export function normalizeAnswer(value: string) {
  return value.trim().replace(",", ".").replace(/\s+/g, "").toLowerCase();
}

export function getEgeTask(taskId: string) {
  return egeTasks.find((task) => task.id === taskId);
}
