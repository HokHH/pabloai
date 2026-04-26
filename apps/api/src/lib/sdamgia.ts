export type RealEgeTask = {
  id: string;
  number: number;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  statement: string;
  statementHtml: string;
  answer: string;
  solution: string;
  hint: string;
};

type Category = {
  id: number;
  topic: string;
  count: number;
  difficulty: "easy" | "medium" | "hard";
};

const BASE_URL = "https://math-ege.sdamgia.ru";
const TASKS_PER_PAGE = 5;

const categoriesByNumber: Record<number, Category[]> = {
  1: [
    { id: 79, topic: "Планиметрия: прямоугольный треугольник", count: 50, difficulty: "medium" },
    { id: 90, topic: "Планиметрия: равнобедренный треугольник", count: 50, difficulty: "medium" },
  ],
  2: [{ id: 182, topic: "Векторы и операции с ними", count: 58, difficulty: "medium" }],
  3: [
    { id: 193, topic: "Прямоугольный параллелепипед", count: 33, difficulty: "medium" },
    { id: 257, topic: "Объёмы многогранников", count: 59, difficulty: "medium" },
  ],
  4: [{ id: 166, topic: "Классическое определение вероятности", count: 60, difficulty: "medium" }],
  5: [{ id: 185, topic: "Теоремы о вероятностях событий", count: 58, difficulty: "medium" }],
  6: [
    { id: 12, topic: "Логарифмические уравнения", count: 14, difficulty: "medium" },
    { id: 219, topic: "Сложные тригонометрические уравнения", count: 121, difficulty: "hard" },
  ],
  7: [
    { id: 58, topic: "Преобразования логарифмических выражений", count: 34, difficulty: "medium" },
    { id: 60, topic: "Преобразования тригонометрических выражений", count: 57, difficulty: "medium" },
  ],
  8: [
    { id: 68, topic: "Производная и касательная", count: 31, difficulty: "medium" },
    { id: 70, topic: "Исследование функций производной", count: 39, difficulty: "medium" },
  ],
  9: [{ id: 232, topic: "Практические задачи", count: 200, difficulty: "hard" }],
  10: [{ id: 230, topic: "Сложная стереометрия: многогранники", count: 232, difficulty: "hard" }],
  11: [{ id: 246, topic: "Сложные неравенства", count: 196, difficulty: "hard" }],
  12: [{ id: 292, topic: "Финансовая математика: кредиты", count: 173, difficulty: "hard" }],
};

const taskCache = new Map<string, RealEgeTask>();

export function getRealEgeNumbers() {
  return Object.keys(categoriesByNumber).map(Number).sort((a, b) => a - b);
}

export function getRealEgePoolSize(number: number) {
  return (categoriesByNumber[number] || []).reduce((sum, category) => sum + category.count, 0);
}

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function absoluteUrls(html: string) {
  return html
    .replaceAll('src="/', `src="${BASE_URL}/`)
    .replaceAll("src='/", `src='${BASE_URL}/`);
}

function cleanText(html: string) {
  return html
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, " $1 ")
    .replace(/Показать решение|Спрятать решение/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8239;/g, " ")
    .replace(/&shy;/g, "")
    .replace(/&deg;/g, "°")
    .replace(/&minus;/g, "−")
    .replace(/&mdash;/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeHtml(html: string) {
  return absoluteUrls(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<input[^>]*>/gi, "")
    .replace(/Показать решение|Спрятать решение/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .replace(/<a\b([^>]*)>/gi, "<span$1>")
    .replace(/<\/a>/gi, "</span>");
}

function extractProblemBody(html: string, taskId: string) {
  const solutionMarker = new RegExp(`<div[^>]+id="sol${taskId}"`, "i");
  const bodyStart = html.search(/<div[^>]+id="body\d+"[^>]+class="pbody"[^>]*>/i);
  const solutionStart = html.search(solutionMarker);

  if (bodyStart === -1 || solutionStart === -1 || solutionStart <= bodyStart) {
    return "";
  }

  const bodyOpen = html.slice(bodyStart).match(/<div[^>]+>/i);
  const start = bodyStart + (bodyOpen?.[0].length || 0);
  return html.slice(start, solutionStart).replace(/<\/div>\s*$/i, "").trim();
}

function extractSolutionHtml(html: string, taskId: string) {
  const solutionStart = html.search(new RegExp(`<div[^>]+id="sol${taskId}"`, "i"));
  if (solutionStart === -1) {
    return "";
  }

  const nextProblem = html.slice(solutionStart + 20).search(/<div[^>]+id="problem_\d+"/i);
  const end = nextProblem === -1 ? html.indexOf("<div align=\"left\" class=\"answer\"", solutionStart) : solutionStart + 20 + nextProblem;

  return html.slice(solutionStart, end === -1 ? undefined : end);
}

function extractAnswer(solutionHtml: string) {
  const match = solutionHtml.match(/Ответ:<\/span>\s*([^<]+)/i);
  return (match?.[1] || "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/\s+/g, "")
    .trim();
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "MindSpark EGE trainer",
    },
  });

  if (!response.ok) {
    throw new Error(`Sdamgia request failed: ${response.status}`);
  }

  return response.text();
}

async function getRandomTaskId(category: Category) {
  const pageCount = Math.max(1, Math.ceil(category.count / TASKS_PER_PAGE));
  const page = 1 + Math.floor(Math.random() * pageCount);
  const html = await fetchHtml(`${BASE_URL}/test?filter=all&category_id=${category.id}&page=${page}`);
  const ids = [...html.matchAll(/id="problem_(\d+)"/g)].map((match) => match[1]);

  if (ids.length === 0) {
    throw new Error("No tasks found in Sdamgia category");
  }

  return randomItem(ids);
}

export async function fetchRandomRealEgeTask(number: number): Promise<RealEgeTask> {
  const categories = categoriesByNumber[number];
  if (!categories?.length) {
    throw new Error("Unsupported EGE task number");
  }

  const category = randomItem(categories);
  const taskId = await getRandomTaskId(category);
  return fetchRealEgeTask(`sdamgia-${number}-${taskId}`);
}

export async function fetchRealEgeTask(id: string): Promise<RealEgeTask> {
  const [, numberRaw, taskId] = id.match(/^sdamgia-(\d+)-(\d+)$/) || [];
  const number = Number(numberRaw);
  const categories = categoriesByNumber[number];

  if (!taskId || !categories?.length) {
    throw new Error("Invalid Sdamgia task id");
  }

  const cacheKey = `${number}-${taskId}`;
  const cached = taskCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const category = categories[0];
  const html = await fetchHtml(`${BASE_URL}/problem?id=${taskId}`);
  const bodyHtml = extractProblemBody(html, taskId);
  const solutionHtml = extractSolutionHtml(html, taskId);
  const answer = extractAnswer(solutionHtml);

  if (!bodyHtml || !answer) {
    throw new Error("Could not parse Sdamgia task");
  }

  const task: RealEgeTask = {
    id: `sdamgia-${number}-${taskId}`,
    number,
    topic: category.topic,
    difficulty: category.difficulty,
    statementHtml: sanitizeHtml(bodyHtml),
    statement: cleanText(bodyHtml),
    answer,
    hint: "Определи тип задания, выпиши данные и выбери формулу. Если застрял, нажми «Подсказка».",
    solution: cleanText(solutionHtml).slice(0, 4000),
  };

  taskCache.set(cacheKey, task);
  return task;
}
