import { Router } from "express";
import { z } from "zod";
import { normalizeAnswer } from "../data/egeTasks.js";
import {
  fetchRandomRealEgeTask,
  fetchRealEgeTask,
  getRealEgeNumbers,
  getRealEgePoolSize,
  type RealEgeTask,
} from "../lib/sdamgia.js";
import { prisma } from "../lib/prisma.js";
import { streamTutorCompletion } from "../lib/llm.js";

const router = Router();

const checkSchema = z.object({
  answer: z.string().min(1).max(200),
});

const explainSchema = z.object({
  mode: z.enum(["hint", "balanced", "deep"]).default("balanced"),
  studentAnswer: z.string().max(4000).optional(),
});

function publicTask(task: RealEgeTask) {
  return {
    id: task.id,
    number: task.number,
    topic: task.topic,
    difficulty: task.difficulty,
    statement: task.statement,
    statementHtml: task.statementHtml,
    hint: task.hint,
  };
}

function getModeInstruction(mode: z.infer<typeof explainSchema>["mode"]) {
  if (mode === "hint") {
    return [
      "Режим: подсказка.",
      "Не раскрывай ответ и не пиши полное решение.",
      "Дай 1-2 направляющих шага: какую формулу вспомнить, что обозначить, где обычно ошибаются.",
    ].join("\n");
  }

  if (mode === "deep") {
    return [
      "Режим: подробный разбор.",
      "Структура ответа: тип задания, идея решения, шаги вычисления, типичная ошибка, короткая проверка.",
      "Пиши как репетитор профильного ЕГЭ: понятно, но без лишней болтовни.",
    ].join("\n");
  }

  return [
    "Режим: короткий разбор.",
    "Структура ответа: идея решения, 2-4 шага, финальная проверка.",
    "Если ученик прислал ответ, сначала оцени его и покажи, где мог появиться промах.",
  ].join("\n");
}

router.get("/tasks", async (req, res, next) => {
  try {
    const number = Number(req.query.number);
    const numbers = getRealEgeNumbers();

    if (Number.isInteger(number)) {
      const task = await fetchRandomRealEgeTask(number);
      res.json({
        tasks: [publicTask(task)],
        numbers,
        totalByNumber: getRealEgePoolSize(number),
      });
      return;
    }

    const tasks = await Promise.all(numbers.map((taskNumber) => fetchRandomRealEgeTask(taskNumber)));
    res.json({
      tasks: tasks.map(publicTask),
      numbers,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/tasks/:taskId", async (req, res, next) => {
  try {
    const task = await fetchRealEgeTask(req.params.taskId);
    res.json({ task: publicTask(task) });
  } catch (error) {
    next(error);
  }
});

router.post("/tasks/:taskId/check", async (req, res, next) => {
  try {
    const task = await fetchRealEgeTask(req.params.taskId);
    const data = checkSchema.parse(req.body);
    const correct = normalizeAnswer(data.answer) === normalizeAnswer(task.answer);

    await prisma.egeAttempt.create({
      data: {
        taskId: task.id,
        taskNumber: task.number,
        topic: task.topic,
        userAnswer: data.answer.trim(),
        correct,
        userId: req.auth!.userId,
      },
    });

    res.json({
      correct,
      answer: correct ? task.answer : undefined,
      solution: correct ? task.solution : undefined,
      hint: correct ? undefined : task.hint,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/tasks/:taskId/explain/stream", async (req, res, next) => {
  try {
    const task = await fetchRealEgeTask(req.params.taskId);
    const data = explainSchema.parse(req.body);

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    await streamTutorCompletion(res, [
      {
        role: "system",
        content: [
          "Ты AI-репетитор по профильной математике ЕГЭ.",
          "Твоя задача - готовить ученика к экзамену, а не просто выдавать ответ.",
          "Всегда держи фокус на типе задания, методе решения, аккуратных вычислениях и типичных ошибках.",
          "Используй математическую запись в человекочитаемом виде: log₂, x², √, 10⁻⁵, дроби через /.",
          "Не ссылайся на источники и сайты в ответе.",
          "Не упоминай внутренние ID задания.",
        ].join("\n"),
      },
      { role: "system", content: getModeInstruction(data.mode) },
      {
        role: "user",
        content: [
          `Номер ЕГЭ: ${task.number}`,
          `Тема: ${task.topic}`,
          `Условие: ${task.statement}`,
          `Правильный ответ: ${task.answer}`,
          `Эталонное решение: ${task.solution}`,
          data.studentAnswer ? `Ответ ученика: ${data.studentAnswer}` : "",
        ].filter(Boolean).join("\n"),
      },
    ]);

    res.end();
  } catch (error) {
    next(error);
  }
});

router.get("/progress", async (req, res, next) => {
  try {
    const attempts = await prisma.egeAttempt.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const byNumber = attempts.reduce<Record<string, { total: number; correct: number }>>((acc, attempt) => {
      const key = String(attempt.taskNumber);
      acc[key] ||= { total: 0, correct: 0 };
      acc[key].total += 1;
      if (attempt.correct) {
        acc[key].correct += 1;
      }
      return acc;
    }, {});

    res.json({
      total: attempts.length,
      correct: attempts.filter((attempt) => attempt.correct).length,
      byNumber,
    });
  } catch (error) {
    next(error);
  }
});

export { router as egeRouter };
