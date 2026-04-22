import { useState, useRef, useEffect, useCallback } from "react";

// ─── MISTRAL CONFIG ────────────────────────────────────────────────────────────
const MISTRAL_API_KEY = "YOUR_MISTRAL_API_KEY"; // 🔑 Replace with your key
const MISTRAL_MODEL = "mistral-small-latest";

const TUTOR_SYSTEM_PROMPT = `Ты умный и терпеливый наставник-учитель по имени Spark. Твоя главная задача — помочь ученику ПОНЯТЬ материал самостоятельно, а НЕ решить задачу за него.

Правила:
1. НИКОГДА не давай готовый ответ или решение сразу.
2. Веди ученика через рассуждение: задавай наводящие вопросы, предлагай подсказки, объясняй концепции.
3. Если ученик просит просто дать ответ — мягко откажи и объясни, почему самостоятельное понимание важнее.
4. Разбивай сложные задачи на шаги и спрашивай, что ученик уже понимает.
5. Хвали за правильные рассуждения, а не за правильный ответ.
6. Используй простые аналогии и примеры из жизни.
7. Отвечай на языке, на котором пишет ученик (русский или английский).
8. Будь дружелюбным, enthusiastic и поддерживающим.

Помни: твоя цель — зажечь понимание, а не просто выдать информацию.`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const generateId = () => Math.random().toString(36).slice(2, 9);
const now = () => new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

const Icons = {
  spark: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
    </svg>
  ),
  plus: () => <Icon d="M12 5v14M5 12h14" />,
  chat: () => <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  trash: () => <Icon d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" size={16} />,
  send: () => <Icon d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" />,
  sun: () => <Icon d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M3 12h2M19 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z" />,
  moon: () => <Icon d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  menu: () => <Icon d="M3 12h18M3 6h18M3 18h18" />,
  close: () => <Icon d="M18 6L6 18M6 6l12 12" />,
  user: () => <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  logout: () => <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  eye: () => <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />,
  eyeOff: () => <Icon d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />,
  stop: () => <Icon d="M9 9h6v6H9z" />,
};

// ─── MISTRAL API ───────────────────────────────────────────────────────────────
async function* streamMistral(messages, onError) {
  try {
    const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        stream: true,
        messages: [
          { role: "system", content: TUTOR_SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      onError(err.message || `Ошибка ${resp.status}`);
      return;
    }

    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        const trimmed = line.replace(/^data: /, "").trim();
        if (!trimmed || trimmed === "[DONE]") continue;
        try {
          const json = JSON.parse(trimmed);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {}
      }
    }
  } catch (e) {
    onError(e.message || "Сетевая ошибка");
  }
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --orange-50: #fff7ed;
  --orange-100: #ffedd5;
  --orange-200: #fed7aa;
  --orange-300: #fdba74;
  --orange-400: #fb923c;
  --orange-500: #f97316;
  --orange-600: #ea580c;
  --orange-700: #c2410c;
  --orange-800: #9a3412;
  --orange-900: #7c2d12;
  --orange-950: #431407;
}

body { font-family: 'Sora', sans-serif; }

/* ── LIGHT THEME ── */
[data-theme="light"] {
  --bg-primary: #fffbf7;
  --bg-secondary: #fff7ed;
  --bg-sidebar: #fff4e6;
  --bg-card: #ffffff;
  --bg-input: #ffffff;
  --bg-hover: #fed7aa40;
  --bg-active: #fed7aa80;
  --bg-msg-user: linear-gradient(135deg, #ea580c, #f97316);
  --bg-msg-ai: #ffffff;
  --border: #fdba7460;
  --border-strong: #fb923c60;
  --text-primary: #1c0a00;
  --text-secondary: #7c2d12;
  --text-muted: #c2410c80;
  --text-msg-user: #ffffff;
  --text-msg-ai: #1c0a00;
  --shadow: 0 4px 24px #f9731620;
  --shadow-msg: 0 2px 12px #f9731615;
  --accent: #ea580c;
  --accent-bright: #f97316;
  --logo-glow: #f9731640;
}

/* ── DARK THEME ── */
[data-theme="dark"] {
  --bg-primary: #0f0704;
  --bg-secondary: #1a0e06;
  --bg-sidebar: #130b04;
  --bg-card: #1f1208;
  --bg-input: #1f1208;
  --bg-hover: #fb923c18;
  --bg-active: #fb923c28;
  --bg-msg-user: linear-gradient(135deg, #c2410c, #ea580c);
  --bg-msg-ai: #1f1208;
  --border: #7c2d1230;
  --border-strong: #ea580c40;
  --text-primary: #fef3e2;
  --text-secondary: #fdba74;
  --text-muted: #fb923c60;
  --text-msg-user: #ffffff;
  --text-msg-ai: #fef3e2;
  --shadow: 0 4px 24px #00000060;
  --shadow-msg: 0 2px 12px #00000040;
  --accent: #f97316;
  --accent-bright: #fb923c;
  --logo-glow: #f9731650;
}

/* ── LAYOUT ── */
.app {
  display: flex;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  transition: background 0.3s, color 0.3s;
}

/* ── SIDEBAR ── */
.sidebar {
  width: 280px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  transition: all 0.35s cubic-bezier(.4,0,.2,1);
  overflow: hidden;
  position: relative;
  z-index: 20;
}

.sidebar.collapsed {
  width: 0;
  min-width: 0;
  border-right: none;
}

.sidebar-inner {
  width: 280px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px 16px 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
}

.logo-icon {
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, var(--accent), var(--accent-bright));
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 0 16px var(--logo-glow);
  flex-shrink: 0;
}

.logo-text {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.logo-text span { color: var(--accent); }

.new-chat-btn {
  width: 32px; height: 32px;
  border-radius: 9px;
  border: 1px solid var(--border-strong);
  background: var(--bg-card);
  color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.new-chat-btn:hover { background: var(--accent); color: white; border-color: var(--accent); transform: scale(1.05); }

.sidebar-section {
  padding: 10px 10px 4px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-muted);
  flex-shrink: 0;
}

.chats-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  border: 1px solid transparent;
}

.chat-item:hover { background: var(--bg-hover); }
.chat-item.active {
  background: var(--bg-active);
  border-color: var(--border-strong);
}

.chat-item-icon { color: var(--accent); opacity: 0.7; flex-shrink: 0; }
.chat-item.active .chat-item-icon { opacity: 1; }

.chat-item-text {
  flex: 1;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-item-del {
  opacity: 0;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 3px;
  border-radius: 5px;
  display: flex; align-items: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.chat-item:hover .chat-item-del { opacity: 1; }
.chat-item-del:hover { color: #ef4444; background: #ef444420; }

.sidebar-footer {
  padding: 12px 8px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.user-row:hover { background: var(--bg-hover); }

.user-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-bright));
  display: flex; align-items: center; justify-content: center;
  color: white;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.user-plan {
  font-size: 10.5px;
  color: var(--accent);
  font-weight: 500;
}

.logout-btn {
  background: none; border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex; align-items: center;
  transition: all 0.15s;
}
.logout-btn:hover { color: var(--accent); }

/* ── MAIN ── */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* ── TOPBAR ── */
.topbar {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-primary);
  flex-shrink: 0;
  gap: 12px;
  position: relative;
  z-index: 10;
}

.topbar-toggle {
  background: none; border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex; align-items: center;
  transition: all 0.15s;
}
.topbar-toggle:hover { background: var(--bg-hover); color: var(--accent); }

.topbar-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 20px;
  background: var(--bg-active);
  border: 1px solid var(--border-strong);
  color: var(--accent);
  display: flex; align-items: center; gap: 5px;
  flex-shrink: 0;
}

.topbar-badge::before {
  content: '';
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #22c55e;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.theme-btn {
  background: none; border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex; align-items: center;
  transition: all 0.2s;
}
.theme-btn:hover { background: var(--bg-hover); color: var(--accent); transform: rotate(20deg); }

/* ── MESSAGES ── */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px 0;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.messages-inner {
  max-width: 780px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── WELCOME ── */
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  gap: 24px;
  animation: fadeUp 0.6s cubic-bezier(.4,0,.2,1);
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.welcome-logo {
  width: 72px; height: 72px;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--accent), var(--accent-bright));
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 40px var(--logo-glow), 0 8px 32px #00000020;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.welcome-logo svg { width: 36px; height: 36px; color: white; }

.welcome-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.welcome-title span { color: var(--accent); }

.welcome-sub {
  font-size: 15px;
  color: var(--text-secondary);
  max-width: 420px;
  line-height: 1.6;
}

.welcome-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  max-width: 560px;
}

.chip {
  padding: 9px 16px;
  border-radius: 50px;
  border: 1px solid var(--border-strong);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Sora', sans-serif;
}
.chip:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--logo-glow);
}

/* ── MESSAGE BUBBLES ── */
.msg-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  animation: fadeUp 0.3s ease;
}

.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.msg-row.user { justify-content: flex-end; }
.msg-row.ai { justify-content: flex-start; }

.msg-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 4px;
}

.msg-avatar.ai {
  background: linear-gradient(135deg, var(--accent), var(--accent-bright));
  color: white;
  box-shadow: 0 0 12px var(--logo-glow);
}

.msg-avatar.user {
  background: var(--bg-active);
  border: 1px solid var(--border-strong);
  color: var(--accent);
}

.msg-bubble {
  max-width: 72%;
  padding: 12px 16px;
  border-radius: 20px;
  font-size: 14.5px;
  line-height: 1.65;
  position: relative;
  box-shadow: var(--shadow-msg);
  word-break: break-word;
}

.msg-row.user .msg-bubble {
  background: var(--bg-msg-user);
  color: var(--text-msg-user);
  border-bottom-right-radius: 6px;
}

.msg-row.ai .msg-bubble {
  background: var(--bg-msg-ai);
  color: var(--text-msg-ai);
  border: 1px solid var(--border);
  border-bottom-left-radius: 6px;
}

.msg-time {
  font-size: 10.5px;
  color: var(--text-muted);
  padding: 0 4px;
  flex-shrink: 0;
  align-self: flex-end;
  margin-bottom: 6px;
}

/* Code blocks */
.msg-bubble pre {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.msg-bubble code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 5px;
  border: 1px solid var(--border);
}

.msg-bubble pre code {
  background: none;
  border: none;
  padding: 0;
}

/* Typing indicator */
.typing-dots {
  display: flex; gap: 4px; align-items: center; padding: 4px 0;
}
.typing-dots span {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: dot 1.2s infinite ease-in-out;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* ── INPUT ── */
.input-area {
  padding: 16px 20px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-primary);
  flex-shrink: 0;
}

.input-box {
  max-width: 780px;
  margin: 0 auto;
  position: relative;
}

.input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: var(--bg-input);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 10px 12px 10px 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: var(--shadow);
}

.input-wrap:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--logo-glow), var(--shadow);
}

textarea {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Sora', sans-serif;
  font-size: 14.5px;
  color: var(--text-primary);
  line-height: 1.5;
  max-height: 160px;
  min-height: 24px;
  padding: 0;
}

textarea::placeholder { color: var(--text-muted); }

.send-btn {
  width: 38px; height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), var(--accent-bright));
  border: none;
  color: white;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  box-shadow: 0 4px 14px var(--logo-glow);
}

.send-btn:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 6px 20px var(--logo-glow); }
.send-btn:active:not(:disabled) { transform: scale(0.95); }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.send-btn.stop { background: #ef444480; }
.send-btn.stop:hover:not(:disabled) { background: #ef4444; }

.input-hint {
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 8px;
}

/* ── AUTH OVERLAY ── */
.auth-overlay {
  position: fixed;
  inset: 0;
  background: #00000070;
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.auth-card {
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: 24px;
  padding: 36px 32px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 24px 80px #00000040;
  position: relative;
  animation: cardIn 0.3s cubic-bezier(.4,0,.2,1);
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(30px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.auth-logo {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 28px;
  justify-content: center;
}

.auth-logo-icon {
  width: 42px; height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--accent), var(--accent-bright));
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 20px var(--logo-glow);
  color: white;
}

.auth-logo-text {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}
.auth-logo-text span { color: var(--accent); }

.auth-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
  text-align: center;
}

.auth-sub {
  font-size: 13.5px;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 28px;
  line-height: 1.5;
}

.form-group { margin-bottom: 16px; }

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 7px;
}

.form-input-wrap {
  position: relative;
  display: flex; align-items: center;
}

.form-input {
  width: 100%;
  padding: 11px 42px 11px 14px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'Sora', sans-serif;
  outline: none;
  transition: all 0.2s;
}
.form-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--logo-glow);
  background: var(--bg-input);
}
.form-input::placeholder { color: var(--text-muted); }

.form-input-icon {
  position: absolute; right: 12px;
  color: var(--text-muted);
  cursor: pointer;
  background: none; border: none;
  padding: 0; display: flex; align-items: center;
  transition: color 0.2s;
}
.form-input-icon:hover { color: var(--accent); }

.auth-btn {
  width: 100%;
  padding: 13px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, var(--accent), var(--accent-bright));
  color: white;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
  box-shadow: 0 6px 24px var(--logo-glow);
}
.auth-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 32px var(--logo-glow); }
.auth-btn:active { transform: translateY(0); }
.auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.auth-switch {
  text-align: center;
  margin-top: 20px;
  font-size: 13.5px;
  color: var(--text-secondary);
}

.auth-switch button {
  background: none; border: none;
  color: var(--accent);
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  cursor: pointer;
  font-size: 13.5px;
  transition: opacity 0.2s;
}
.auth-switch button:hover { opacity: 0.75; }

.auth-demo {
  text-align: center;
  margin-top: 14px;
}

.auth-demo button {
  background: none; border: none;
  color: var(--text-muted);
  font-family: 'Sora', sans-serif;
  font-size: 12.5px;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s;
}
.auth-demo button:hover { color: var(--text-secondary); }

.error-msg {
  font-size: 12.5px;
  color: #ef4444;
  margin-top: 5px;
  display: flex; align-items: center; gap: 4px;
}

/* ── EMPTY STATE ── */
.empty-sidebar {
  padding: 20px 12px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

/* ── SCROLLBAR ── */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: var(--accent); }

/* ── RESPONSIVE ── */
@media (max-width: 640px) {
  .sidebar { position: absolute; height: 100%; box-shadow: 4px 0 30px #00000040; }
  .msg-bubble { max-width: 88%; }
  .welcome-title { font-size: 22px; }
}
`;

// ─── MARKDOWN-LITE RENDERER ───────────────────────────────────────────────────
function renderMarkdown(text) {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3 style='font-size:14px;font-weight:600;margin:10px 0 4px;'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 style='font-size:15px;font-weight:700;margin:12px 0 5px;'>$1</h2>")
    .replace(/^- (.+)$/gm, "<li style='margin:3px 0 3px 16px;'>$1</li>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

// ─── AUTH COMPONENT ───────────────────────────────────────────────────────────
function AuthOverlay({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Заполните все поля"); return; }
    if (mode === "register" && !name) { setError("Введите имя"); return; }
    setLoading(true);
    // 🔌 TODO: Replace with real API call to your backend
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    onLogin({ name: name || email.split("@")[0], email });
  };

  const handleDemo = () => onLogin({ name: "Ученик", email: "demo@mindspark.ru" });

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Icons.spark />
          </div>
          <div className="auth-logo-text">Mind<span>Spark</span></div>
        </div>

        <div className="auth-title">
          {mode === "login" ? "С возвращением! 👋" : "Создать аккаунт ✨"}
        </div>
        <div className="auth-sub">
          {mode === "login"
            ? "Войдите, чтобы продолжить обучение"
            : "Присоединяйтесь — это бесплатно"}
        </div>

        {mode === "register" && (
          <div className="form-group">
            <label className="form-label">Ваше имя</label>
            <div className="form-input-wrap">
              <input className="form-input" placeholder="Иван Иванов"
                value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              <div className="form-input-icon" style={{ cursor: "default" }}>
                <Icons.user />
              </div>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email</label>
          <div className="form-input-wrap">
            <input className="form-input" type="email" placeholder="ivan@school.ru"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Пароль</label>
          <div className="form-input-wrap">
            <input className="form-input" type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            <button className="form-input-icon" onClick={() => setShowPw(!showPw)}>
              {showPw ? <Icons.eyeOff /> : <Icons.eye />}
            </button>
          </div>
        </div>

        {error && <div className="error-msg">⚠ {error}</div>}

        <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
        </button>

        <div className="auth-switch">
          {mode === "login" ? (
            <>Нет аккаунта? <button onClick={() => { setMode("register"); setError(""); }}>Создать</button></>
          ) : (
            <>Уже есть аккаунт? <button onClick={() => { setMode("login"); setError(""); }}>Войти</button></>
          )}
        </div>

        <div className="auth-demo">
          <button onClick={handleDemo}>Продолжить без входа (демо)</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function MindSpark() {
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(false);

  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat?.messages || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  };

  const createChat = useCallback((firstMsg = null) => {
    const id = generateId();
    const title = firstMsg
      ? firstMsg.slice(0, 36) + (firstMsg.length > 36 ? "…" : "")
      : "Новый чат";
    const newChat = { id, title, messages: [], createdAt: Date.now() };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(id);
    return id;
  }, []);

  const deleteChat = (id, e) => {
    e.stopPropagation();
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      const remaining = chats.filter(c => c.id !== id);
      setActiveChatId(remaining[0]?.id || null);
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || streaming) return;
    if (MISTRAL_API_KEY === "YOUR_MISTRAL_API_KEY") {
      setApiKeyMissing(true);
      return;
    }

    let chatId = activeChatId;
    if (!chatId) chatId = createChat(text);

    const userMsg = { id: generateId(), role: "user", content: text, time: now() };
    const aiMsg = { id: generateId(), role: "assistant", content: "", time: now() };

    setChats(prev => prev.map(c => c.id === chatId
      ? { ...c, title: c.messages.length === 0 ? text.slice(0, 36) + (text.length > 36 ? "…" : "") : c.title, messages: [...c.messages, userMsg, aiMsg] }
      : c));

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setStreaming(true);
    abortRef.current = false;

    const historyMsgs = [
      ...(chats.find(c => c.id === chatId)?.messages || []).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: text }
    ];

    let accumulated = "";
    for await (const chunk of streamMistral(historyMsgs, (err) => {
      setChats(prev => prev.map(c => c.id === chatId
        ? { ...c, messages: c.messages.map(m => m.id === aiMsg.id ? { ...m, content: `⚠️ Ошибка: ${err}` } : m) }
        : c));
    })) {
      if (abortRef.current) break;
      accumulated += chunk;
      setChats(prev => prev.map(c => c.id === chatId
        ? { ...c, messages: c.messages.map(m => m.id === aiMsg.id ? { ...m, content: accumulated } : m) }
        : c));
    }

    setStreaming(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const CHIPS = [
    "Объясни теорему Пифагора",
    "Почему небо голубое?",
    "Как работают нейронные сети?",
    "Помоги понять производную",
    "Что такое фотосинтез?",
    "Как решить квадратное уравнение?",
  ];

  return (
    <>
      <style>{css}</style>
      <div className="app" data-theme={theme}>

        {/* AUTH */}
        {!user && <AuthOverlay onLogin={setUser} />}

        {/* SIDEBAR */}
        <div className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
          <div className="sidebar-inner">
            <div className="sidebar-header">
              <div className="logo">
                <div className="logo-icon"><Icons.spark /></div>
                <div className="logo-text">Mind<span>Spark</span></div>
              </div>
              <button className="new-chat-btn" onClick={() => { createChat(); }}
                title="Новый чат">
                <Icons.plus />
              </button>
            </div>

            <div className="sidebar-section">История чатов</div>
            <div className="chats-list">
              {chats.length === 0
                ? <div className="empty-sidebar">Начни чат — он появится здесь ✨</div>
                : chats.map(chat => (
                  <div key={chat.id}
                    className={`chat-item ${activeChatId === chat.id ? "active" : ""}`}
                    onClick={() => setActiveChatId(chat.id)}>
                    <div className="chat-item-icon"><Icons.chat /></div>
                    <div className="chat-item-text">{chat.title}</div>
                    <button className="chat-item-del" onClick={e => deleteChat(chat.id, e)}>
                      <Icons.trash />
                    </button>
                  </div>
                ))
              }
            </div>

            <div className="sidebar-footer">
              {user && (
                <div className="user-row">
                  <div className="user-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-plan">✦ Ученик</div>
                  </div>
                  <button className="logout-btn" onClick={() => setUser(null)} title="Выйти">
                    <Icons.logout />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div className="main">
          <div className="topbar">
            <button className="topbar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <Icons.close /> : <Icons.menu />}
            </button>
            <div className="topbar-title">
              {activeChat ? activeChat.title : "MindSpark"}
            </div>
            <div className="topbar-badge">Spark AI</div>
            <button className="theme-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Icons.sun /> : <Icons.moon />}
            </button>
          </div>

          {/* MESSAGES */}
          <div className="messages-area">
            <div className="messages-inner">
              {messages.length === 0 ? (
                <div className="welcome">
                  <div className="welcome-logo">
                    <Icons.spark />
                  </div>
                  <div className="welcome-title">
                    Привет, {user?.name || "Ученик"}! 👋<br />
                    Я <span>Spark</span> — твой наставник
                  </div>
                  <div className="welcome-sub">
                    Я не дам тебе готовый ответ — но помогу понять и додуматься самому.
                    Это работает намного лучше! 🧠
                  </div>
                  <div className="welcome-chips">
                    {CHIPS.map(c => (
                      <button key={c} className="chip" onClick={() => sendMessage(c)}>{c}</button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={msg.id} className="msg-group">
                    <div className={`msg-row ${msg.role === "user" ? "user" : "ai"}`}>
                      {msg.role === "assistant" && (
                        <div className="msg-avatar ai">⚡</div>
                      )}
                      <div className="msg-bubble">
                        {msg.role === "assistant" && msg.content === "" && streaming
                          ? <div className="typing-dots"><span /><span /><span /></div>
                          : msg.role === "assistant"
                            ? <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                            : msg.content
                        }
                      </div>
                      {msg.role === "user" && (
                        <div className="msg-avatar user">{user?.name?.charAt(0)?.toUpperCase() || "У"}</div>
                      )}
                    </div>
                    <div className={`msg-row ${msg.role === "user" ? "user" : "ai"}`} style={{ paddingLeft: msg.role === "assistant" ? 40 : 0, paddingRight: msg.role === "user" ? 40 : 0 }}>
                      <div className="msg-time">{msg.time}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* INPUT */}
          <div className="input-area">
            <div className="input-box">
              {apiKeyMissing && (
                <div style={{ background: "#ef444420", border: "1px solid #ef444460", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#ef4444", marginBottom: 10 }}>
                  ⚠️ Добавь Mistral API ключ в код (переменная <code style={{ fontFamily: "JetBrains Mono", fontSize: 12 }}>MISTRAL_API_KEY</code>)
                </div>
              )}
              <div className="input-wrap">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Задай вопрос или опиши задачу..."
                  value={input}
                  onChange={e => { setInput(e.target.value); autoResize(); }}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className={`send-btn ${streaming ? "stop" : ""}`}
                  onClick={() => streaming ? (abortRef.current = true) : sendMessage(input)}
                  disabled={!streaming && !input.trim()}
                >
                  {streaming ? <Icons.stop /> : <Icons.send />}
                </button>
              </div>
              <div className="input-hint">
                Enter — отправить · Shift+Enter — новая строка · Spark объясняет, а не решает за тебя
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
