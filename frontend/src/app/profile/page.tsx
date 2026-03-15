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
  cover_url: string;
  rating: number;
  note: string;
  owner_username: string;
};

type AuthMode = "login" | "register";
type StatusFilter = GameEntry["status"];
type GameFormState = {
  title: string;
  platform: string;
  status: GameEntry["status"];
  cover_url: string;
  rating: number;
  note: string;
};

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

const emptyGameForm: GameFormState = {
  title: "",
  platform: "",
  status: "planned",
  cover_url: "",
  rating: 0,
  note: "",
};

function normalizeGames(items: GameEntry[]) {
  return [...items].sort((left, right) => left.title.localeCompare(right.title));
}

function gameToForm(game: GameEntry): GameFormState {
  return {
    title: game.title,
    platform: game.platform,
    status: game.status,
    cover_url: game.cover_url,
    rating: game.rating,
    note: game.note,
  };
}

function renderStars(rating: number) {
  const filled = Math.round(rating / 2);
  return Array.from({ length: 5 }, (_, index) => (index < filled ? "★" : "☆")).join("");
}

async function apiRequest(path: string, options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

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

export default function ProfilePage() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [games, setGames] = useState<GameEntry[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("completed");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [gameForm, setGameForm] = useState<GameFormState>(emptyGameForm);
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<GameFormState>(emptyGameForm);
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
      setGames(normalizeGames(userGames));
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

      setGames((currentGames) => normalizeGames([...currentGames, createdGame]));
      setSelectedStatus(createdGame.status);
      setGameForm(emptyGameForm);
      setMessage("Игра добавлена в ваш список.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось добавить игру.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || editingGameId === null) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const updatedGame = await apiRequest(
        `/games/${editingGameId}/`,
        {
          method: "PATCH",
          body: JSON.stringify(editingForm),
        },
        token,
      );

      setGames((currentGames) =>
        normalizeGames(currentGames.map((game) => (game.id === editingGameId ? updatedGame : game))),
      );
      setSelectedStatus(updatedGame.status);
      setEditingGameId(null);
      setEditingForm(emptyGameForm);
      setMessage("Карточка обновлена.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось обновить игру.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGame(gameId: number) {
    if (!token) {
      return;
    }

    const confirmed = window.confirm("Удалить карточку игры?");
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      await apiRequest(`/games/${gameId}/`, { method: "DELETE" }, token);
      setGames((currentGames) => currentGames.filter((game) => game.id !== gameId));
      if (editingGameId === gameId) {
        setEditingGameId(null);
        setEditingForm(emptyGameForm);
      }
      setMessage("Карточка удалена.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось удалить игру.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(game: GameEntry) {
    setEditingGameId(game.id);
    setEditingForm(gameToForm(game));
    setMessage("");
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
          <div className="contentStack">
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
                      <p>Добавьте запись и выберите этот статус в форме ниже.</p>
                    </div>
                  </article>
                ) : (
                  filteredGames.map((game) =>
                    editingGameId === game.id ? (
                      <article className="gameCard gameCardEditing" key={game.id}>
                        <div className={`gameAccent status-${game.status}`} />
                        <form className="gameCardBody form" onSubmit={handleUpdateGame}>
                          <input
                            required
                            value={editingForm.title}
                            onChange={(event) =>
                              setEditingForm((current) => ({ ...current, title: event.target.value }))
                            }
                          />
                          <input
                            placeholder="Платформа"
                            value={editingForm.platform}
                            onChange={(event) =>
                              setEditingForm((current) => ({ ...current, platform: event.target.value }))
                            }
                          />
                          <input
                            placeholder="Ссылка на обложку"
                            value={editingForm.cover_url}
                            onChange={(event) =>
                              setEditingForm((current) => ({ ...current, cover_url: event.target.value }))
                            }
                          />
                          <select
                            value={editingForm.status}
                            onChange={(event) =>
                              setEditingForm((current) => ({
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
                          <input
                            max={10}
                            min={0}
                            type="number"
                            value={editingForm.rating}
                            onChange={(event) =>
                              setEditingForm((current) => ({
                                ...current,
                                rating: Number(event.target.value) || 0,
                              }))
                            }
                          />
                          <textarea
                            rows={4}
                            value={editingForm.note}
                            onChange={(event) =>
                              setEditingForm((current) => ({ ...current, note: event.target.value }))
                            }
                          />
                          <div className="cardActions">
                            <button className="primaryButton" disabled={submitting} type="submit">
                              Сохранить
                            </button>
                            <button
                              className="ghostButton"
                              onClick={() => setEditingGameId(null)}
                              type="button"
                            >
                              Отмена
                            </button>
                          </div>
                        </form>
                      </article>
                    ) : (
                      <article className="gameCard" key={game.id}>
                        <div className={`gameAccent status-${game.status}`} />
                        <div className="gamePosterWrap">
                          {game.cover_url ? (
                            <img alt={game.title} className="gamePoster" src={game.cover_url} />
                          ) : (
                            <div className="gamePosterPlaceholder">
                              <span>{game.title.slice(0, 1).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <div className="gameCardBody">
                          <div className="gameMetaRow">
                            <span className={`badge status-${game.status}`}>{statusLabel[game.status]}</span>
                            <span className="platformChip">{game.platform || "Без платформы"}</span>
                          </div>
                          <div className="gameHeading">
                            <h3>{game.title}</h3>
                            <div className="ratingBlock">
                              <strong>{game.rating}/10</strong>
                              <span>{renderStars(game.rating)}</span>
                            </div>
                          </div>
                          <p>{game.note || "Без заметки"}</p>
                          <div className="cardActions">
                            <button className="ghostButton" onClick={() => startEditing(game)} type="button">
                              Редактировать
                            </button>
                            <button
                              className="dangerButton"
                              onClick={() => void handleDeleteGame(game.id)}
                              type="button"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      </article>
                    ),
                  )
                )}
              </section>
            </section>

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
                  <input
                    placeholder="Ссылка на обложку"
                    value={gameForm.cover_url}
                    onChange={(event) =>
                      setGameForm((current) => ({ ...current, cover_url: event.target.value }))
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
                  <input
                    max={10}
                    min={0}
                    placeholder="Оценка от 0 до 10"
                    type="number"
                    value={gameForm.rating}
                    onChange={(event) =>
                      setGameForm((current) => ({ ...current, rating: Number(event.target.value) || 0 }))
                    }
                  />
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
          </div>
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
