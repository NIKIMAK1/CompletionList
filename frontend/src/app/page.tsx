"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type User = {
  id: number;
  username: string;
};

type StatusKey = "completed" | "playing" | "planned";

type TemplateGame = {
  id: number;
  title: string;
  subtitle: string;
  year: string;
  score: string;
  time: string;
  status: StatusKey;
  cover: string;
  genre: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const statusLabel: Record<StatusKey, string> = {
  completed: "Пройдено",
  playing: "Играю",
  planned: "Буду играть",
};

const featuredGame: TemplateGame = {
  id: 100,
  title: "Persona 3 Reload",
  subtitle: "Новая крупная JRPG недели",
  year: "2024",
  score: "8.9",
  time: "65 ч",
  status: "playing",
  cover:
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
  genre: "JRPG, Social Sim",
};

const templateGames: TemplateGame[] = [
  {
    id: 1,
    title: "Elden Ring",
    subtitle: "Шаблон новинки",
    year: "2022",
    score: "9.3",
    time: "110 ч",
    status: "completed",
    cover:
      "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=700&q=80",
    genre: "Action RPG",
  },
  {
    id: 2,
    title: "Like a Dragon",
    subtitle: "Шаблон обновления",
    year: "2024",
    score: "8.4",
    time: "42 ч",
    status: "playing",
    cover:
      "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=700&q=80",
    genre: "RPG, Drama",
  },
  {
    id: 3,
    title: "Metaphor ReFantazio",
    subtitle: "Шаблон анонса",
    year: "2025",
    score: "TBD",
    time: "90 ч",
    status: "planned",
    cover:
      "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=700&q=80",
    genre: "Fantasy RPG",
  },
  {
    id: 4,
    title: "Cyberpunk 2077",
    subtitle: "Шаблон новинки",
    year: "2023",
    score: "8.7",
    time: "58 ч",
    status: "completed",
    cover:
      "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&w=700&q=80",
    genre: "Action RPG",
  },
  {
    id: 5,
    title: "Final Fantasy VII Rebirth",
    subtitle: "Шаблон обновления",
    year: "2024",
    score: "8.8",
    time: "74 ч",
    status: "playing",
    cover:
      "https://images.unsplash.com/photo-1519985176271-adb1088fa94c?auto=format&fit=crop&w=700&q=80",
    genre: "JRPG",
  },
  {
    id: 6,
    title: "Silent Hill 2",
    subtitle: "Шаблон анонса",
    year: "2024",
    score: "TBD",
    time: "14 ч",
    status: "planned",
    cover:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=700&q=80",
    genre: "Horror",
  },
];

const newsTemplates = [
  {
    title: "Блок новостей",
    text: "Сюда можно подгружать новости релизов, патчей и анонсов через внешний API.",
  },
  {
    title: "Обновления игр",
    text: "Шаблон для свежих обновлений: новые DLC, патчи, версии и оценки пользователей.",
  },
  {
    title: "Новые релизы",
    text: "Отдельный блок под последние игры, вышедшие в этом месяце или сезоне.",
  },
];

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
  const [selectedStatus, setSelectedStatus] = useState<StatusKey>("playing");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const filteredGames = useMemo(
    () => templateGames.filter((game) => game.status === selectedStatus),
    [selectedStatus],
  );

  useEffect(() => {
    const storedToken = window.localStorage.getItem("authToken");
    if (!storedToken) {
      return;
    }

    void loadCurrentUser(storedToken);
  }, []);

  async function loadCurrentUser(currentToken: string) {
    try {
      const currentUser = await apiRequest("/auth/me/", {}, currentToken);
      setToken(currentToken);
      setUser(currentUser);
    } catch {
      window.localStorage.removeItem("authToken");
      setToken("");
      setUser(null);
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
    setMessage("Вы вышли из аккаунта.");
  }

  return (
    <main className="homePage">
      <header className="homeTopbar">
        <div className="homeBrand">
          <div className="homeBrandMark">CL</div>
          <div>
            <p className="homeBrandLabel">Completion List</p>
            <strong>Новые игры, обновления и каталог</strong>
          </div>
        </div>

        <nav className="homeNav">
          <a href="#featured">Новинки</a>
          <a href="#catalog">Каталог</a>
          <a href="#updates">Обновления</a>
        </nav>

        <div className="homeUserPanel">
          {user ? (
            <div className="homeProfileCard">
              <p className="homePanelLabel">Профиль</p>
              <strong>{user.username}</strong>
              <div className="homeProfileActions">
                <Link className="homeLinkButton" href="/profile">
                  Открыть кабинет
                </Link>
                <button className="homeGhostButton" onClick={handleLogout} type="button">
                  Выйти
                </button>
              </div>
            </div>
          ) : (
            <div className="homeAuthCard">
              <div className="homeAuthTabs">
                <button
                  className={authMode === "login" ? "homeTab homeTabActive" : "homeTab"}
                  onClick={() => setAuthMode("login")}
                  type="button"
                >
                  Вход
                </button>
                <button
                  className={authMode === "register" ? "homeTab homeTabActive" : "homeTab"}
                  onClick={() => setAuthMode("register")}
                  type="button"
                >
                  Регистрация
                </button>
              </div>
              <form className="homeAuthForm" onSubmit={handleAuthSubmit}>
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
                <button className="homePrimaryButton" disabled={submitting} type="submit">
                  {authMode === "login" ? "Войти" : "Создать аккаунт"}
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      {message ? <p className="homeMessage">{message}</p> : null}

      <section className="homeHero" id="featured">
        <div className="homeHeroMain">
          <p className="homeEyebrow">Public Home</p>
          <h1>Главная страница каталога игр</h1>
          <p className="homeHeroText">
            Это публичная витрина под интеграцию с внешним API: новинки, карточки игр, обновления,
            описания, обложки и тематические подборки.
          </p>
          <div className="homeHeroActions">
            <button className="homePrimaryButton" type="button">
              Подключить API игр
            </button>
            <Link className="homeGhostButton" href="/profile">
              Перейти в профиль
            </Link>
          </div>
        </div>

        <article className="homeFeaturedCard">
          <img alt={featuredGame.title} src={featuredGame.cover} />
          <div className="homeFeaturedOverlay">
            <span className={`homeStatusChip status-${featuredGame.status}`}>{statusLabel[featuredGame.status]}</span>
            <h2>{featuredGame.title}</h2>
            <p>{featuredGame.genre}</p>
            <div className="homeFeaturedMeta">
              <span>{featuredGame.year}</span>
              <span>{featuredGame.score}</span>
              <span>{featuredGame.time}</span>
            </div>
          </div>
        </article>
      </section>

      <section className="homeContent" id="catalog">
        <div className="homeMainColumn">
          <div className="homeSectionTop">
            <div>
              <p className="homeSectionLabel">Каталог</p>
              <h2>{statusLabel[selectedStatus]}</h2>
              <p className="homeSectionText">
                Шаблон секции, куда будут подставляться реальные игры, описания и обложки из API.
              </p>
            </div>
            <div className="homeStatusTabs" role="tablist" aria-label="Статусы каталога">
              {(["completed", "playing", "planned"] as StatusKey[]).map((status) => (
                <button
                  key={status}
                  className={selectedStatus === status ? "homeStatusTab homeStatusTabActive" : "homeStatusTab"}
                  onClick={() => setSelectedStatus(status)}
                  type="button"
                >
                  {statusLabel[status]}
                </button>
              ))}
            </div>
          </div>

          <section className="homeCardGrid">
            {filteredGames.map((game) => (
              <article className="homeGameCard" key={game.id}>
                <div className="homeGamePoster">
                  <img alt={game.title} src={game.cover} />
                  <span className={`homeCornerChip status-${game.status}`}>{statusLabel[game.status]}</span>
                </div>
                <div className="homeGameBody">
                  <p className="homeGameSubtitle">{game.subtitle}</p>
                  <h3>{game.title}</h3>
                  <p className="homeGameGenre">{game.genre}</p>
                  <div className="homeGameMeta">
                    <span>{game.year}</span>
                    <span>{game.score}</span>
                    <span>{game.time}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>

        <aside className="homeSidebar" id="updates">
          <section className="homeSideCard">
            <p className="homeSectionLabel">Новинки</p>
            <h3>Блок последних релизов</h3>
            <p>Сюда можно выводить свежие игры, которые пришли из внешнего API.</p>
          </section>

          <section className="homeSideCard">
            <p className="homeSectionLabel">Обновления</p>
            <h3>Патчи, DLC и анонсы</h3>
            <div className="homeNewsList">
              {newsTemplates.map((item) => (
                <article className="homeNewsItem" key={item.title}>
                  <span className="homeNewsDot" />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="homeSideCard homeAccentCard">
            <p className="homeSectionLabel">Для разработчика</p>
            <h3>Готово к интеграции</h3>
            <p>
              Текущие шаблонные массивы можно заменить на реальный ответ API с играми, картинками,
              описаниями, рейтингами и датами релиза.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
