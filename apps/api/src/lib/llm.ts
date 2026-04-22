import OpenAI from "openai";
import type { Response } from "express";
import { env } from "../config/env.js";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const client = new OpenAI({
  baseURL: env.OPENAI_COMPAT_BASE_URL,
  apiKey: env.OPENAI_COMPAT_API_KEY,
});

export async function streamTutorCompletion(res: Response, messages: ChatMessage[]) {
  const completion = await client.chat.completions.create({
    messages,
    model: env.OPENAI_COMPAT_MODEL,
    temperature: 0.4,
    max_tokens: 700,
    top_p: 1,
    stream: true,
  });

  let accumulated = "";

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content || "";

    if (delta) {
      accumulated += delta;
    }

    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  res.write("data: [DONE]\n\n");

  return accumulated;
}
