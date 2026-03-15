"use client";

import { FormEvent, useEffect, useState } from "react";

type User = {
  id: number;
  username: string;
};

type GameEntry = {
  id: number;
  title: string;
  platform: string;
  status: "planned" | "playing" | "completed";
  note: string;
  owner_username: string;
};

type AuthMode = "login" | "register";
type StatusFilter = GameEntry["status"];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const statusLabel: Record<GameEntry["status"], string> = {
  planned: "Буду играть",
  playing: "Играю",
  completed: "Пройдено",
};

const statusDescription: Record<GameEntry["status"], string> = {
  planned: "Тайтлы, которые ждут своей очереди.",
  playing: "Прохождение в процессе прямо сейчас.",
  completed: "То, что уже закрыто и можно вспомнить.",
};

const emptyGameForm = {
  title: "",
  platform: "",
  status: "planned" as GameEntry["status"],
  note: "",
};

async function apiRequest(path: string, options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const validationError = Object.values(data)[0];
    const errorMessage =
      data.detail ||
      (Array.isArray(validationError) ? String(validationError[0]) : undefined) ||
      "Ошибка запроса";
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export default function HomePage() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [games, setGames] = useState<GameEntry[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("completed");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [gameForm, setGameForm] = useState(emptyGameForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const storedToken = window.localStorage.getItem("authToken");
    if (!storedToken) {
      setLoading(false);
      return;
    }

    void loadCurrentUser(storedToken);
  }, []);

  async function loadCurrentUser(currentToken: string) {
    try {
      const currentUser = await apiRequest("/auth/me/", {}, currentToken);
      const userGames = await apiRequest("/games/", {}, currentToken);

      setToken(currentToken);
      setUser(currentUser);
      setGames(userGames);
    } catch {
      window.localStorage.removeItem("authToken");
      setToken("");
      setUser(null);
      setGames([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const endpoint = authMode === "login" ? "/auth/login/" : "/auth/register/";
      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(authForm),
      });

      window.localStorage.setItem("authToken", data.token);
      setAuthForm({ username: "", password: "" });
      setMessage(authMode === "login" ? "Вы вошли в аккаунт." : "Аккаунт создан.");
      await loadCurrentUser(data.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось выполнить авторизацию.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const createdGame = await apiRequest(
        "/games/",
        {
          method: "POST",
          body: JSON.stringify(gameForm),
        },
        token,
      );

      setGames((currentGames) =>
        [...currentGames, createdGame].sort((left, right) => left.title.localeCompare(right.title)),
      );
      setSelectedStatus(createdGame.status);
      setGameForm(emptyGameForm);
      setMessage("Игра добавлена в ваш список.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось добавить игру.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    if (!token) {
      return;
    }

    try {
      await apiRequest("/auth/logout/", { method: "POST" }, token);
    } catch {
      // Local cleanup is enough if the token was already invalidated.
    }

    window.localStorage.removeItem("authToken");
    setToken("");
    setUser(null);
    setGames([]);
    setMessage("Вы вышли из аккаунта.");
  }

  const filteredGames = games.filter((game) => game.status === selectedStatus);
  const statusCounts = {
    completed: games.filter((game) => game.status === "completed").length,
    playing: games.filter((game) => game.status === "playing").length,
    planned: games.filter((game) => game.status === "planned").length,
  };

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Game Collection</p>
          <h1>Личный список игр</h1>
          <p className="description">
            Карточки в духе каталога: сверху статусы, внутри личная подборка того, что уже пройдено,
            в процессе или отложено на потом.
          </p>
        </div>

        {user ? (
          <div className="accountBox">
            <p className="accountLabel">Профиль</p>
            <strong>{user.username}</strong>
            <span className="accountMeta">{games.length} игр в коллекции</span>
            <button className="secondaryButton" onClick={handleLogout} type="button">
              Выйти
            </button>
          </div>
        ) : null}
      </section>

      {message ? <p className="message">{message}</p> : null}

      {loading ? (
        <section className="card">
          <p>Загрузка...</p>
        </section>
      ) : user ? (
        <>
          <section className="dashboard">
            <article className="card formCard">
              <div className="sectionHeader">
                <div>
                  <p className="sectionLabel">Новая карточка</p>
                  <h2>Добавить игру</h2>
                </div>
              </div>
              <form className="form" onSubmit={handleCreateGame}>
                <input
                  placeholder="Название игры"
                  required
                  value={gameForm.title}
                  onChange={(event) => setGameForm((current) => ({ ...current, title: event.target.value }))}
                />
                <input
                  placeholder="Платформа"
                  value={gameForm.platform}
                  onChange={(event) =>
                    setGameForm((current) => ({ ...current, platform: event.target.value }))
                  }
                />
                <select
                  value={gameForm.status}
                  onChange={(event) =>
                    setGameForm((current) => ({
                      ...current,
                      status: event.target.value as GameEntry["status"],
                    }))
                  }
                >
                  {Object.entries(statusLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <textarea
                  placeholder="Короткая заметка"
                  rows={4}
                  value={gameForm.note}
                  onChange={(event) => setGameForm((current) => ({ ...current, note: event.target.value }))}
                />
                <button className="primaryButton" disabled={submitting} type="submit">
                  Сохранить
                </button>
              </form>
            </article>

            <article className="card statsCard">
              <p className="sectionLabel">Статистика</p>
              <h2>Коллекция</h2>
              <div className="statusMiniList">
                {(["completed", "playing", "planned"] as StatusFilter[]).map((status) => (
                  <div className="miniStat" key={status}>
                    <span className={`miniDot status-${status}`} />
                    <strong>{statusCounts[status]}</strong>
                    <small>{statusLabel[status]}</small>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="libraryShell">
            <div className="libraryHeader">
              <div>
                <p className="sectionLabel">Библиотека</p>
                <h2>{statusLabel[selectedStatus]}</h2>
                <p className="libraryDescription">{statusDescription[selectedStatus]}</p>
              </div>
              <div className="statusTabs" role="tablist" aria-label="Фильтр по статусу">
                {(["completed", "playing", "planned"] as StatusFilter[]).map((status) => (
                  <button
                    key={status}
                    className={selectedStatus === status ? "statusTab activeStatusTab" : "statusTab"}
                    onClick={() => setSelectedStatus(status)}
                    type="button"
                  >
                    <span>{statusLabel[status]}</span>
                    <strong>{statusCounts[status]}</strong>
                  </button>
                ))}
              </div>
            </div>

            <section className="cardGrid">
              {filteredGames.length === 0 ? (
                <article className="gameCard gameCardEmpty">
                  <div className="gameCardBody">
                    <p className="sectionLabel">Пусто</p>
                    <h3>Здесь пока нет игр</h3>
                    <p>Добавьте запись и выберите этот статус в форме выше.</p>
                  </div>
                </article>
              ) : (
                filteredGames.map((game) => (
                  <article className="gameCard" key={game.id}>
                    <div className={`gameAccent status-${game.status}`} />
                    <div className="gameCardBody">
                      <div className="gameMetaRow">
                        <span className={`badge status-${game.status}`}>{statusLabel[game.status]}</span>
                        <span className="platformChip">{game.platform || "Без платформы"}</span>
                      </div>
                      <h3>{game.title}</h3>
                      <p>{game.note || "Без заметки"}</p>
                    </div>
                  </article>
                ))
              )}
            </section>
          </section>
        </>
      ) : (
        <section className="authLayout">
          <article className="card authCard">
            <div className="authSwitch">
              <button
                className={authMode === "login" ? "tab activeTab" : "tab"}
                onClick={() => setAuthMode("login")}
                type="button"
              >
                Вход
              </button>
              <button
                className={authMode === "register" ? "tab activeTab" : "tab"}
                onClick={() => setAuthMode("register")}
                type="button"
              >
                Регистрация
              </button>
            </div>

            <h2>{authMode === "login" ? "Войти" : "Создать аккаунт"}</h2>
            <form className="form" onSubmit={handleAuthSubmit}>
              <input
                placeholder="Логин"
                required
                value={authForm.username}
                onChange={(event) => setAuthForm((current) => ({ ...current, username: event.target.value }))}
              />
              <input
                placeholder="Пароль"
                required
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              />
              <button className="primaryButton" disabled={submitting} type="submit">
                {authMode === "login" ? "Войти" : "Зарегистрироваться"}
              </button>
            </form>
          </article>
        </section>
      )}
    </main>
  );
}
