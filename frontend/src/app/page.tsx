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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const statusLabel: Record<GameEntry["status"], string> = {
  planned: "Планирую",
  playing: "Играю",
  completed: "Прошел",
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

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Game backlog</p>
          <h1>Список игр по статусам</h1>
          <p className="description">
            Минимальный трекер с пользователями: регистрируйтесь, входите и ведите свой личный
            список игр.
          </p>
        </div>

        {user ? (
          <div className="accountBox">
            <p className="accountLabel">Аккаунт</p>
            <strong>{user.username}</strong>
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
              <p className="sectionLabel">Новая запись</p>
              <h2>Добавить игру</h2>
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
                  placeholder="Заметка"
                  rows={4}
                  value={gameForm.note}
                  onChange={(event) => setGameForm((current) => ({ ...current, note: event.target.value }))}
                />
                <button className="primaryButton" disabled={submitting} type="submit">
                  Добавить
                </button>
              </form>
            </article>

            <article className="card statsCard">
              <p className="sectionLabel">Профиль</p>
              <h2>{user.username}</h2>
              <p>Ваши игры видны только вам через авторизованный API.</p>
              <div className="statsRow">
                <span>{games.length}</span>
                <small>записей в списке</small>
              </div>
            </article>
          </section>

          <section className="grid">
            {games.length === 0 ? (
              <article className="card empty">
                <h2>Список пуст</h2>
                <p>Добавьте первую игру через форму выше.</p>
              </article>
            ) : (
              games.map((game) => (
                <article className="card" key={game.id}>
                  <div className="cardHeader">
                    <span className={`badge status-${game.status}`}>{statusLabel[game.status]}</span>
                    <span className="platform">{game.platform || "Без платформы"}</span>
                  </div>
                  <h2>{game.title}</h2>
                  <p>{game.note || "Без заметки"}</p>
                </article>
              ))
            )}
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
