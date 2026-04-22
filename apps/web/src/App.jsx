import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, streamChatMessage } from "./api.js";

const CHIPS = [
  "Объясни теорему Пифагора простыми словами",
  "Почему небо голубое?",
  "Помоги понять производную на примере",
  "Как решать квадратные уравнения по шагам?",
  "Что такое фотосинтез?",
  "Как работают нейронные сети?",
];

const RESPONSE_MODES = [
  { id: "hint", label: "Только намек" },
  { id: "balanced", label: "Обычно" },
  { id: "deep", label: "Подробнее" },
];

const Icons = {
  spark: () => (
    <svg className="logo-glyph" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="spark-gradient" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff7f0" />
          <stop offset="1" stopColor="#ffd3a8" />
        </linearGradient>
      </defs>
      <path
        d="M37 6 17 33h13l-3 25 20-28H34z"
        fill="url(#spark-gradient)"
        stroke="rgba(96,35,0,.2)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M45 11 49 16 56 18 50 22 48 29 44 24 37 22 43 18z" fill="#fff3cf" />
    </svg>
  ),
  plus: () => <span>+</span>,
  menu: () => <span>≡</span>,
  close: () => <span>×</span>,
  send: () => <span>➜</span>,
  stop: () => <span>■</span>,
  trash: () => <span>🗑</span>,
  edit: () => <span>✎</span>,
  sun: () => <span>☀</span>,
  moon: () => <span>☾</span>,
};

function formatMessageTime(value) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Что-то пошло не так";
}

function formatChatPreview(text) {
  if (!text) {
    return "Новый разговор появится здесь после первого сообщения.";
  }

  return text;
}

function renderMessageNodes(text) {
  const blocks = text.split("\n\n").filter(Boolean);

  return blocks.map((block, index) => {
    if (block.startsWith("- ")) {
      const items = block
        .split("\n")
        .map((item) => item.replace(/^- /, "").trim())
        .filter(Boolean);

      return (
        <ul key={index} className="message-list-block">
          {items.map((item, itemIndex) => <li key={`${index}-${itemIndex}`}>{item}</li>)}
        </ul>
      );
    }

    return <p key={index}>{block}</p>;
  });
}

function AuthScreen({ mode, onModeChange, onSubmit, loading, error }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const submit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-icon"><Icons.spark /></div>
          <div className="brand-copy">
            <div className="brand-title">MindSpark</div>
            <div className="brand-subtitle">AI-наставник, который помогает понять, а не просто списать.</div>
          </div>
        </div>

        <div className="auth-copy">
          <h1>{mode === "login" ? "Войти в платформу" : "Создать аккаунт"}</h1>
          <p>
            {mode === "login"
              ? "Продолжим обучение с того места, где ты остановился."
              : "Начнём с личного кабинета и сохранения истории диалогов."}
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              <span>Имя</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Иван"
                autoComplete="name"
              />
            </label>
          )}

          <label>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="student@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            <span>Пароль</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Минимум 8 символов"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "Подключаемся..." : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>

        <div className="auth-switcher">
          {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}
          <button type="button" onClick={() => onModeChange(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Регистрация" : "Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const MODEL_LABEL = "Mistral Nemo";
  const [theme, setTheme] = useState("dark");
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 960);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 960);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composer, setComposer] = useState("");
  const [sendError, setSendError] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [responseMode, setResponseMode] = useState("balanced");
  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);

  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || null,
    [activeChatId, chats],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  useEffect(() => {
    const syncViewport = () => {
      setIsMobile(window.innerWidth < 960);
      if (window.innerWidth >= 960) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const data = await apiRequest("/auth/refresh", { method: "POST" });
        setUser(data.user);
        setAccessToken(data.accessToken);
      } catch {
        setUser(null);
        setAccessToken("");
      } finally {
        setAuthLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    const loadChats = async () => {
      try {
        const data = await apiRequest("/chats", {}, accessToken);
        setChats(data.chats);
        if (data.chats.length > 0) {
          setActiveChatId((current) => current || data.chats[0].id);
        }
      } catch (error) {
        setSendError(getErrorMessage(error));
      }
    };

    loadChats();
  }, [accessToken]);

  useEffect(() => {
    if (!activeChatId || !accessToken) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setMessagesLoading(true);
      try {
        const data = await apiRequest(`/chats/${activeChatId}`, {}, accessToken);
        setMessages(data.chat.messages);
      } catch (error) {
        setSendError(getErrorMessage(error));
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [activeChatId, accessToken]);

  useEffect(() => {
    setTitleDraft(activeChat?.title || "");
    setEditingTitle(false);
  }, [activeChat?.id, activeChat?.title]);

  const handleAuth = async (form) => {
    setAuthError("");
    setAuthLoading(true);

    try {
      const path = authMode === "login" ? "/auth/login" : "/auth/register";
      const payload = authMode === "login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const data = await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setUser(data.user);
      setAccessToken(data.accessToken);
      setChats([]);
      setActiveChatId(null);
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" }, accessToken);
    } catch {
      // Best effort logout.
    }

    setUser(null);
    setAccessToken("");
    setChats([]);
    setMessages([]);
    setActiveChatId(null);
    setSidebarOpen(window.innerWidth >= 960);
  };

  const createChat = async (title = "Новый чат") => {
    const data = await apiRequest(
      "/chats",
      { method: "POST", body: JSON.stringify({ title }) },
      accessToken,
    );

    const nextChat = data.chat;
    setChats((current) => [nextChat, ...current]);
    setActiveChatId(nextChat.id);
    setMessages([]);
    if (window.innerWidth < 960) {
      setSidebarOpen(false);
    }
    return nextChat.id;
  };

  const removeChat = async (chatId) => {
    await apiRequest(`/chats/${chatId}`, { method: "DELETE" }, accessToken);
    setChats((current) => current.filter((chat) => chat.id !== chatId));

    if (activeChatId === chatId) {
      const remaining = chats.filter((chat) => chat.id !== chatId);
      setActiveChatId(remaining[0]?.id || null);
      setMessages([]);
    }
  };

  const renameChat = async () => {
    const nextTitle = titleDraft.trim();
    if (!activeChatId || !nextTitle || nextTitle === activeChat?.title) {
      setEditingTitle(false);
      setTitleDraft(activeChat?.title || "");
      return;
    }

    try {
      const data = await apiRequest(
        `/chats/${activeChatId}`,
        { method: "PATCH", body: JSON.stringify({ title: nextTitle }) },
        accessToken,
      );

      setChats((current) => current.map((chat) => (
        chat.id === activeChatId ? { ...chat, title: data.chat.title, updatedAt: data.chat.updatedAt } : chat
      )));
      setEditingTitle(false);
    } catch (error) {
      setSendError(getErrorMessage(error));
    }
  };

  const resizeTextarea = () => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  };

  const handleSend = async (prefill) => {
    const content = (typeof prefill === "string" ? prefill : composer).trim();
    if (!content || streaming) return;

    setSendError("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let chatId = activeChatId;
    try {
      if (!chatId) {
        chatId = await createChat(content.slice(0, 48));
      }

      const optimisticUserMessage = {
        id: `tmp-user-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      const optimisticAssistantMessage = {
        id: `tmp-ai-${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, optimisticUserMessage, optimisticAssistantMessage]);
      setComposer("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      let generated = "";
      await streamChatMessage(
        chatId,
        content,
        responseMode,
        accessToken,
        (chunk) => {
          generated += chunk;
          setMessages((current) => current.map((message) => (
            message.id === optimisticAssistantMessage.id ? { ...message, content: generated } : message
          )));
        },
        controller.signal,
      );

      const chatData = await apiRequest(`/chats/${chatId}`, {}, accessToken);
      setMessages(chatData.chat.messages);
      setChats((current) => current.map((chat) => (
        chat.id === chatId
          ? {
              ...chat,
              title: chatData.chat.title,
              updatedAt: chatData.chat.updatedAt,
              messageCount: chatData.chat.messages.length,
              preview: chatData.chat.messages.at(-1)?.content?.slice(0, 110) || chat.preview,
            }
          : chat
      )));
    } catch (error) {
      if (error.name !== "AbortError") {
        setSendError(getErrorMessage(error));
      }
      const chatData = chatId ? await apiRequest(`/chats/${chatId}`, {}, accessToken).catch(() => null) : null;
      if (chatData?.chat?.messages) {
        setMessages(chatData.chat.messages);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  if (authLoading && !user) {
    return <div className="loading-screen">Загружаем MindSpark...</div>;
  }

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        onModeChange={setAuthMode}
        onSubmit={handleAuth}
        loading={authLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand-mark">
            <div className="brand-icon"><Icons.spark /></div>
            <div className="brand-copy">
              <div className="brand-title">MindSpark</div>
              <div className="sidebar-note">Персональный AI-тьютор</div>
            </div>
          </div>
          <button className="icon-btn mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Закрыть меню">
            <Icons.close />
          </button>
        </div>

        <button className="create-chat" onClick={() => createChat()}>
          <Icons.plus />
          <span>Новый чат</span>
        </button>

        <div className="sidebar-section-title">История</div>
        <div className="chat-list">
          {chats.length === 0 ? <div className="empty-state">Пока нет чатов. Начни диалог, и история появится здесь.</div> : null}
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={`chat-card ${chat.id === activeChatId ? "active" : ""}`}
              onClick={() => {
                setActiveChatId(chat.id);
                if (window.innerWidth < 960) {
                  setSidebarOpen(false);
                }
              }}
            >
              <div className="chat-card-accent" />
              <div className="chat-card-copy">
                <strong>{chat.title}</strong>
                <p>{formatChatPreview(chat.preview)}</p>
                <span>{new Date(chat.updatedAt).toLocaleDateString("ru-RU")}</span>
              </div>
              <span
                className="chat-delete"
                onClick={(event) => {
                  event.stopPropagation();
                  removeChat(chat.id);
                }}
              >
                <Icons.trash />
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div>
            <div className="user-name">{user.name}</div>
            <div className="sidebar-note">{user.email}</div>
          </div>
          <button className="ghost-btn" onClick={handleLogout}>Выйти</button>
        </div>
      </aside>

      {sidebarOpen && isMobile ? <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Закрыть меню" /> : null}

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn" onClick={() => setSidebarOpen((current) => !current)} aria-label="Открыть меню">
              {sidebarOpen && isMobile ? <Icons.close /> : <Icons.menu />}
            </button>
            <div className="topbar-copy">
              <div className="topbar-row">
                {editingTitle ? (
                  <input
                    className="topbar-title-input"
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onBlur={renameChat}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") renameChat();
                      if (event.key === "Escape") {
                        setEditingTitle(false);
                        setTitleDraft(activeChat?.title || "");
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <div className="topbar-title">{activeChat?.title || "Новый диалог"}</div>
                )}
                {activeChat ? (
                  <button className="title-edit-btn" onClick={() => setEditingTitle(true)} aria-label="Переименовать чат">
                    <Icons.edit />
                  </button>
                ) : null}
              </div>
              <div className="topbar-subtitle">Наставник объясняет, а не решает за ученика</div>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="model-pill">{MODEL_LABEL}</div>
            <button className="icon-btn" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Icons.sun /> : <Icons.moon />}
            </button>
          </div>
        </header>

        <section className={`messages-panel ${messages.length === 0 ? "messages-panel-empty" : ""}`}>
          {messagesLoading ? <div className="loading-strip">Подгружаем историю чата...</div> : null}
          {messages.length === 0 ? (
            <div className="hero-panel">
              <div className="hero-badge">Spark AI Tutor</div>
              <h2>Разбираем сложные темы спокойно, по шагам и без готовых шпаргалок.</h2>
              <p>
                Spark помогает самому дойти до понимания: задаёт наводящие вопросы, раскладывает тему на шаги и не подменяет обучение готовым решением.
              </p>
              <div className="hero-features">
                <div className="hero-feature">
                  <strong>По шагам</strong>
                  <span>Вместо готового ответа Spark ведёт тебя через понимание.</span>
                </div>
                <div className="hero-feature">
                  <strong>С историей</strong>
                  <span>Все диалоги сохраняются и помогают продолжать с нужного места.</span>
                </div>
              </div>
              <div className="chip-grid">
                {CHIPS.map((chip) => (
                  <button key={chip} className="chip" onClick={() => handleSend(chip)}>{chip}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article key={message.id} className={`message-row ${message.role}`}>
                  <div className="message-avatar">{message.role === "assistant" ? "S" : user.name.slice(0, 1).toUpperCase()}</div>
                  <div className="message-body">
                    <div className="message-meta">
                      <strong>{message.role === "assistant" ? "Spark" : user.name}</strong>
                      <span>{formatMessageTime(message.createdAt || Date.now())}</span>
                    </div>
                    <div className="message-bubble">
                      {streaming && message.role === "assistant" && !message.content
                        ? <div className="typing">Думаю<span>.</span><span>.</span><span>.</span></div>
                        : <div className="message-content">{renderMessageNodes(message.content)}</div>}
                    </div>
                  </div>
                </article>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <footer className="composer-shell">
          {sendError ? <div className="form-error inline-error">{sendError}</div> : null}
          <div className="mode-switcher">
            {RESPONSE_MODES.map((mode) => (
              <button
                key={mode.id}
                className={`mode-chip ${responseMode === mode.id ? "active" : ""}`}
                onClick={() => setResponseMode(mode.id)}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className="composer-box">
            <textarea
              ref={textareaRef}
              value={composer}
              onChange={(event) => {
                setComposer(event.target.value);
                resizeTextarea();
              }}
              onKeyDown={handleComposerKeyDown}
              placeholder="Задай вопрос или опиши задачу. Spark поможет дойти до ответа самостоятельно."
              rows={1}
            />
            <button className={`send-btn ${streaming ? "danger" : ""}`} onClick={streaming ? stopStreaming : () => handleSend()}>
              {streaming ? <Icons.stop /> : <Icons.send />}
            </button>
          </div>
          <div className="composer-hint">Enter отправляет сообщение, Shift+Enter переносит строку.</div>
        </footer>
      </main>
    </div>
  );
}
