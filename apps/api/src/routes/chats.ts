import { Router } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { streamTutorCompletion } from "../lib/llm.js";

const TUTOR_SYSTEM_PROMPT = `Ты умный и терпеливый наставник-учитель по имени Spark. Твоя главная задача - помочь ученику понять материал самостоятельно, а не решить задачу за него.

Правила:
1. Никогда не давай готовый ответ сразу.
2. Веди ученика через рассуждение: задавай наводящие вопросы, предлагай подсказки и короткие объяснения.
3. Если ученик просит просто дать ответ, мягко откажи и предложи подумать вместе.
4. Разбивай сложные задачи на шаги.
5. Хвали за ход мысли, а не только за конечный ответ.
6. Используй простой язык, аналогии и примеры из жизни.
7. Отвечай на языке ученика.
8. Будь дружелюбным, энергичным и поддерживающим.`;

const router = Router();

const createChatSchema = z.object({
  title: z.string().min(1).max(120).optional(),
});

const updateChatSchema = z.object({
  title: z.string().min(1).max(120),
});

const responseModeSchema = z.enum(["hint", "balanced", "deep"]);

const sendMessageSchema = z.object({
  content: z.string().min(1).max(12000),
  mode: responseModeSchema.default("balanced"),
});

const HISTORY_MESSAGE_LIMIT = 12;

function getModeInstruction(mode: z.infer<typeof responseModeSchema>) {
  switch (mode) {
    case "hint":
      return "Формат ответа: очень коротко, через намек или один следующий шаг. Не больше 3-4 предложений.";
    case "deep":
      return "Формат ответа: подробнее обычного, но все равно по шагам. Давай структурированное объяснение и заверши одним вопросом ученику.";
    default:
      return "Формат ответа: сбалансированно, короткое объяснение плюс один следующий вопрос ученику.";
  }
}

router.get("/", async (req, res, next) => {
  try {
    const chats = await prisma.chat.findMany({
      where: { userId: req.auth!.userId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({
      chats: chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: chat._count.messages,
        preview: chat.messages[0]?.content?.slice(0, 110) || "",
      })),
    });
  } catch (error) {
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : "Ошибка стриминга" })}\n\n`);
      res.end();
      return;
    }

    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createChatSchema.parse(req.body);
    const chat = await prisma.chat.create({
      data: {
        userId: req.auth!.userId,
        title: data.title?.trim() || "Новый чат",
      },
    });

    res.status(201).json({ chat });
  } catch (error) {
    next(error);
  }
});

router.get("/:chatId", async (req, res, next) => {
  try {
    const chat = await prisma.chat.findFirst({
      where: { id: req.params.chatId, userId: req.auth!.userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) {
      throw createHttpError(404, "Чат не найден");
    }

    res.json({ chat });
  } catch (error) {
    next(error);
  }
});

router.patch("/:chatId", async (req, res, next) => {
  try {
    const data = updateChatSchema.parse(req.body);
    const chat = await prisma.chat.findFirst({
      where: { id: req.params.chatId, userId: req.auth!.userId },
    });

    if (!chat) {
      throw createHttpError(404, "Чат не найден");
    }

    const updated = await prisma.chat.update({
      where: { id: chat.id },
      data: {
        title: data.title.trim(),
        updatedAt: new Date(),
      },
    });

    res.json({ chat: updated });
  } catch (error) {
    next(error);
  }
});

router.delete("/:chatId", async (req, res, next) => {
  try {
    const chat = await prisma.chat.findFirst({
      where: { id: req.params.chatId, userId: req.auth!.userId },
    });

    if (!chat) {
      throw createHttpError(404, "Чат не найден");
    }

    await prisma.chat.delete({ where: { id: chat.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/:chatId/messages/stream", async (req, res, next) => {
  try {
    const data = sendMessageSchema.parse(req.body);
    const chat = await prisma.chat.findFirst({
      where: { id: req.params.chatId, userId: req.auth!.userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) {
      throw createHttpError(404, "Чат не найден");
    }

    const trimmedContent = data.content.trim();
    const recentMessages = chat.messages.slice(-HISTORY_MESSAGE_LIMIT);

    const userMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: trimmedContent,
      },
    });

    const history = [
      { role: "system" as const, content: TUTOR_SYSTEM_PROMPT },
      { role: "system" as const, content: getModeInstruction(data.mode) },
      ...recentMessages.map((message) => ({
        role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: message.content,
      })),
      { role: "user" as const, content: trimmedContent },
    ];

    if (chat.messages.length === 0) {
      await prisma.chat.update({
        where: { id: chat.id },
        data: {
          title: trimmedContent.slice(0, 48) + (trimmedContent.length > 48 ? "..." : ""),
          updatedAt: new Date(),
        },
      });
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const assistantContent = await streamTutorCompletion(res, history);

    const assistantMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "assistant",
        content: assistantContent || "Извини, я не успел сформировать ответ. Давай попробуем еще раз.",
      },
    });

    await prisma.chat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    res.write(`event: meta\ndata: ${JSON.stringify({ userMessageId: userMessage.id, assistantMessageId: assistantMessage.id })}\n\n`);
    res.end();
  } catch (error) {
    next(error);
  }
});

export { router as chatRouter };
