import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, streamChatMessage, streamEgeExplanation } from "./api.js";

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

const AUTH_STORAGE_KEY = "mindspark_auth";

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

function EgeTrainer({ accessToken }) {
  const [selectedNumber, setSelectedNumber] = useState(2);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [progress, setProgress] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState("");
  const explainAbortRef = useRef(null);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || tasks[0] || null,
    [selectedTaskId, tasks],
  );

  const accuracy = progress?.total
    ? Math.round((progress.correct / progress.total) * 100)
    : 0;

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      setError("");
      setFeedback(null);
      setExplanation("");
      setAnswer("");

      try {
        const data = await apiRequest(`/ege/tasks?number=${selectedNumber}`, {}, accessToken);
        setTasks(data.tasks);
        setAvailableNumbers(data.numbers || []);
        setSelectedTaskId(data.tasks[0]?.id || "");
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [accessToken, selectedNumber]);

  useEffect(() => {
    if (availableNumbers.length > 0 && !availableNumbers.includes(selectedNumber)) {
      setSelectedNumber(availableNumbers[0]);
    }
  }, [availableNumbers, selectedNumber]);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const data = await apiRequest("/ege/progress", {}, accessToken);
        setProgress(data);
      } catch {
        setProgress(null);
      }
    };

    loadProgress();
  }, [accessToken, feedback]);

  const checkAnswer = async () => {
    if (!selectedTask || !answer.trim()) return;

    setChecking(true);
    setError("");

    try {
      const data = await apiRequest(
        `/ege/tasks/${selectedTask.id}/check`,
        { method: "POST", body: JSON.stringify({ answer }) },
        accessToken,
      );
      setFeedback(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setChecking(false);
    }
  };

  const explainTask = async (mode = "balanced") => {
    if (!selectedTask || explaining) return;

    setExplanation("");
    setError("");
    setExplaining(true);

    const controller = new AbortController();
    explainAbortRef.current = controller;

    try {
      let generated = "";
      await streamEgeExplanation(
        selectedTask.id,
        mode,
        answer,
        accessToken,
        (chunk) => {
          generated += chunk;
          setExplanation(generated);
        },
        controller.signal,
      );
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setError(getErrorMessage(requestError));
      }
    } finally {
      setExplaining(false);
      explainAbortRef.current = null;
    }
  };

  const selectTask = (taskId) => {
    setSelectedTaskId(taskId);
    setAnswer("");
    setFeedback(null);
    setExplanation("");
    setError("");
  };

  return (
    <section className="ege-workspace">
      <div className="ege-overview">
        <div>
          <div className="hero-badge">ЕГЭ профиль</div>
          <h2>Тренажёр по заданиям профильной математики</h2>
          <p>Выбирай номер, решай задачу, проверяй ответ и получай разбор в формате репетитора.</p>
        </div>
        <div className="ege-score">
          <strong>{progress?.total || 0}</strong>
          <span>попыток</span>
          <strong>{accuracy}%</strong>
          <span>точность</span>
        </div>
      </div>

      <div className="ege-layout">
        <aside className="ege-number-panel">
          <div className="sidebar-section-title">Номера ЕГЭ</div>
          <div className="ege-number-grid">
            {(availableNumbers.length ? availableNumbers : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).map((number) => (
              <button
                key={number}
                className={`ege-number ${selectedNumber === number ? "active" : ""}`}
                onClick={() => setSelectedNumber(number)}
                type="button"
              >
                {number}
              </button>
            ))}
          </div>
        </aside>

        <div className="ege-task-panel">
          {loading ? <div className="loading-strip">Загружаем задания...</div> : null}
          {error ? <div className="form-error inline-error">{error}</div> : null}
          {selectedTask ? (
            <>
              <div className="ege-task-head">
                <div>
                  <span>Задание №{selectedTask.number}</span>
                  <h3>{selectedTask.topic}</h3>
                </div>
                <div className={`difficulty-pill ${selectedTask.difficulty}`}>{selectedTask.difficulty}</div>
              </div>

              <div className="ege-task-body">
                {selectedTask.imageUrl ? (
                  <img className="ege-task-image" src={selectedTask.imageUrl} alt={`Задание №${selectedTask.number} из открытого банка`} />
                ) : (
                  <div>{selectedTask.statement}</div>
                )}
                {selectedTask.sourceUrl ? (
                  <a className="ege-source-link" href={selectedTask.sourceUrl} target="_blank" rel="noreferrer">
                    РЕШУ ЕГЭ: математика профильного уровня{selectedTask.sourceTaskId ? `, ID ${selectedTask.sourceTaskId}` : ""}
                  </a>
                ) : null}
              </div>

              <div className="ege-task-picker">
                {tasks.map((task, index) => (
                  <button
                    key={task.id}
                    className={`ege-task-tab ${task.id === selectedTask.id ? "active" : ""}`}
                    onClick={() => selectTask(task.id)}
                    type="button"
                  >
                    Вариант {index + 1}
                  </button>
                ))}
              </div>

              <div className="ege-answer-row">
                <input
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") checkAnswer();
                  }}
                  placeholder="Введи ответ"
                />
                <button className="primary-btn" onClick={checkAnswer} disabled={checking || !answer.trim()} type="button">
                  {checking ? "Проверяем..." : "Проверить"}
                </button>
              </div>

              {feedback ? (
                <div className={`ege-feedback ${feedback.correct ? "correct" : "wrong"}`}>
                  <strong>{feedback.correct ? "Верно" : "Пока не сходится"}</strong>
                  <p>{feedback.correct ? feedback.solution : feedback.hint}</p>
                </div>
              ) : null}

              <div className="ege-actions">
                <button className="ghost-btn" onClick={() => explainTask("hint")} disabled={explaining} type="button">Подсказка</button>
                <button className="ghost-btn" onClick={() => explainTask("balanced")} disabled={explaining} type="button">Разбор</button>
                <button className="ghost-btn" onClick={() => explainTask("deep")} disabled={explaining} type="button">Подробно</button>
                {explaining ? (
                  <button className="ghost-btn danger-text" onClick={() => explainAbortRef.current?.abort()} type="button">Остановить</button>
                ) : null}
              </div>

              {explaining && !explanation ? <div className="loading-strip">Spark готовит разбор...</div> : null}
              {explanation ? (
                <div className="ege-explanation">
                  <div className="message-meta">
                    <strong>Разбор Spark</strong>
                    <span>ЕГЭ профиль</span>
                  </div>
                  <div className="message-content">{renderMessageNodes(explanation)}</div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">Для этого номера пока нет заданий. Добавим банк постепенно.</div>
          )}
        </div>
      </div>
    </section>
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
  const [workspace, setWorkspace] = useState("ege");
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
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.user && parsed?.accessToken) {
            setUser(parsed.user);
            setAccessToken(parsed.accessToken);
            setAuthLoading(false);
          }
        } catch {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }

      try {
        const data = await apiRequest("/auth/refresh", { method: "POST" });
        setUser(data.user);
        setAccessToken(data.accessToken);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: data.user, accessToken: data.accessToken }));
      } catch {
        if (!stored) {
          setUser(null);
          setAccessToken("");
        }
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
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: data.user, accessToken: data.accessToken }));
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
    localStorage.removeItem(AUTH_STORAGE_KEY);
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
    setWorkspace("chat");
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

        <div className="workspace-switch">
          <button
            className={`workspace-btn ${workspace === "ege" ? "active" : ""}`}
            onClick={() => setWorkspace("ege")}
            type="button"
          >
            ЕГЭ профиль
          </button>
          <button
            className={`workspace-btn ${workspace === "chat" ? "active" : ""}`}
            onClick={() => setWorkspace("chat")}
            type="button"
          >
            AI-чат
          </button>
        </div>

        <div className="sidebar-section-title">История</div>
        <div className="chat-list">
          {chats.length === 0 ? <div className="empty-state">Пока нет чатов. Начни диалог, и история появится здесь.</div> : null}
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={`chat-card ${chat.id === activeChatId ? "active" : ""}`}
              onClick={() => {
                setWorkspace("chat");
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
                {workspace === "chat" && editingTitle ? (
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
                  <div className="topbar-title">{workspace === "ege" ? "Подготовка к ЕГЭ" : activeChat?.title || "Новый диалог"}</div>
                )}
                {workspace === "chat" && activeChat ? (
                  <button className="title-edit-btn" onClick={() => setEditingTitle(true)} aria-label="Переименовать чат">
                    <Icons.edit />
                  </button>
                ) : null}
              </div>
              <div className="topbar-subtitle">
                {workspace === "ege" ? "Профильная математика: задачи, проверка, разбор" : "Наставник объясняет, а не решает за ученика"}
              </div>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="model-pill">{MODEL_LABEL}</div>
            <button className="icon-btn" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Icons.sun /> : <Icons.moon />}
            </button>
          </div>
        </header>

        {workspace === "ege" ? (
          <EgeTrainer accessToken={accessToken} />
        ) : (
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
        )}

        {workspace === "chat" ? (
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
        ) : null}
      </main>
    </div>
  );
}
