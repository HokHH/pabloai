const rawApiBase = import.meta.env.VITE_API_BASE_URL;
const API_BASE = rawApiBase
  ? rawApiBase.startsWith("http")
    ? rawApiBase
    : `https://${rawApiBase}`
  : "/api";

export async function apiRequest(path, options = {}, accessToken) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Ошибка запроса");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function streamChatMessage(chatId, content, mode, accessToken, onChunk, signal) {
  const response = await fetch(`${API_BASE}/chats/${chatId}/messages/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
    body: JSON.stringify({ content, mode }),
    signal,
  });

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Не удалось получить ответ модели");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    raw += decoder.decode(value, { stream: true });
    const events = raw.split("\n\n");
    raw = events.pop() || "";

    for (const event of events) {
      const lines = event.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.replace(/^data:\s*/, "").trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            onChunk(delta);
          }
        } catch {
          // Ignore non-JSON meta events in the chunk parser.
        }
      }
    }
  }
}

export async function streamEgeExplanation(taskId, mode, studentAnswer, accessToken, onChunk, signal) {
  const response = await fetch(`${API_BASE}/ege/tasks/${taskId}/explain/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
    body: JSON.stringify({ mode, studentAnswer }),
    signal,
  });

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Не удалось получить разбор задания");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    raw += decoder.decode(value, { stream: true });
    const events = raw.split("\n\n");
    raw = events.pop() || "";

    for (const event of events) {
      const lines = event.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.replace(/^data:\s*/, "").trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            onChunk(delta);
          }
        } catch {
          // Ignore non-JSON meta events in the chunk parser.
        }
      }
    }
  }
}
