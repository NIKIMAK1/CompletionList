"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type User = {
  id: number;
  username: string;
};

type CatalogGame = {
  igdb_id: number;
  title: string;
  summary: string;
  cover_url: string;
  release_year: number | null;
  genres: string[];
  tags: string[];
  rating: number | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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
      "Request failed";
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function gameMeta(game: CatalogGame) {
  if (game.genres.length) {
    return game.genres.join(", ");
  }
  if (game.tags.length) {
    return game.tags.slice(0, 3).join(", ");
  }
  return "IGDB";
}

export default function HomePage() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [catalogGames, setCatalogGames] = useState<CatalogGame[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedToken = window.localStorage.getItem("authToken");
    if (storedToken) {
      void loadCurrentUser(storedToken);
    }
    void loadCatalog();
  }, []);

  async function loadCatalog() {
    try {
      const games = await apiRequest("/igdb/discover/");
      setCatalogGames(games);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load IGDB catalog.");
    } finally {
      setCatalogLoading(false);
    }
  }

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
      setMessage(authMode === "login" ? "Logged in." : "Account created.");
      await loadCurrentUser(data.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to authenticate.");
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
    setMessage("Logged out.");
  }

  const featuredGame = catalogGames[0] ?? null;
  const gridGames = catalogGames.slice(1, 9);
  const recentGames = catalogGames.slice(0, 4);

  return (
    <main className="homePage">
      <header className="homeTopbar">
        <div className="homeBrand">
          <div className="homeBrandMark">CL</div>
          <div>
            <p className="homeBrandLabel">Completion List</p>
            <strong>IGDB powered game catalog</strong>
          </div>
        </div>

        <nav className="homeNav">
          <a href="#featured">Featured</a>
          <a href="#catalog">Catalog</a>
          <a href="#updates">Recent</a>
        </nav>

        <div className="homeUserPanel">
          {user ? (
            <div className="homeProfileCard">
              <p className="homePanelLabel">Profile</p>
              <strong>{user.username}</strong>
              <div className="homeProfileActions">
                <Link className="homeLinkButton" href="/profile">
                  Open profile
                </Link>
                <button className="homeGhostButton" onClick={handleLogout} type="button">
                  Logout
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
                  Login
                </button>
                <button
                  className={authMode === "register" ? "homeTab homeTabActive" : "homeTab"}
                  onClick={() => setAuthMode("register")}
                  type="button"
                >
                  Register
                </button>
              </div>
              <form className="homeAuthForm" onSubmit={handleAuthSubmit}>
                <input
                  placeholder="Username"
                  required
                  value={authForm.username}
                  onChange={(event) => setAuthForm((current) => ({ ...current, username: event.target.value }))}
                />
                <input
                  placeholder="Password"
                  required
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                />
                <button className="homePrimaryButton" disabled={submitting} type="submit">
                  {authMode === "login" ? "Login" : "Create account"}
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      {message ? <p className="homeMessage">{message}</p> : null}

      <section className="homeHero" id="featured">
        <div className="homeHeroMain">
          <p className="homeEyebrow">Live IGDB</p>
          <h1>Game covers, genres, tags and release years from IGDB</h1>
          <p className="homeHeroText">
            The backend requests IGDB through Twitch app authentication and exposes safe site endpoints for
            search and discovery.
          </p>
          <div className="homeHeroActions">
            <Link className="homePrimaryButton" href="/profile">
              Search and save games
            </Link>
            <a className="homeGhostButton" href="#catalog">
              Browse catalog
            </a>
          </div>
        </div>

        {featuredGame ? (
          <article className="homeFeaturedCard">
            <img alt={featuredGame.title} src={featuredGame.cover_url} />
            <div className="homeFeaturedOverlay">
              <span className="homeStatusChip">Featured</span>
              <h2>{featuredGame.title}</h2>
              <p>{gameMeta(featuredGame)}</p>
              <div className="homeFeaturedMeta">
                <span>{featuredGame.release_year ?? "TBA"}</span>
                <span>{featuredGame.rating ? featuredGame.rating.toFixed(1) : "NR"}</span>
                <span>{featuredGame.tags.slice(0, 2).join(", ") || "IGDB"}</span>
              </div>
            </div>
          </article>
        ) : (
          <article className="homeFeaturedCard">
            <div className="homeFeaturedOverlay">
              <h2>{catalogLoading ? "Loading catalog..." : "IGDB is not configured yet"}</h2>
            </div>
          </article>
        )}
      </section>

      <section className="homeContent" id="catalog">
        <div className="homeMainColumn">
          <div className="homeSectionTop">
            <div>
              <p className="homeSectionLabel">Catalog</p>
              <h2>Latest imported from IGDB</h2>
              <p className="homeSectionText">
                These cards are rendered from the backend discovery endpoint, not from hardcoded template data.
              </p>
            </div>
          </div>

          <section className="homeCardGrid">
            {gridGames.map((game) => (
              <article className="homeGameCard" key={game.igdb_id}>
                <div className="homeGamePoster">
                  <img alt={game.title} src={game.cover_url} />
                  <span className="homeCornerChip">{game.release_year ?? "TBA"}</span>
                </div>
                <div className="homeGameBody">
                  <p className="homeGameSubtitle">{game.summary || "No summary available."}</p>
                  <h3>{game.title}</h3>
                  <p className="homeGameGenre">{gameMeta(game)}</p>
                  <div className="homeGameMeta">
                    <span>{game.release_year ?? "TBA"}</span>
                    <span>{game.rating ? game.rating.toFixed(1) : "NR"}</span>
                    <span>{game.tags.slice(0, 2).join(", ") || "IGDB"}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>

        <aside className="homeSidebar" id="updates">
          <section className="homeSideCard">
            <p className="homeSectionLabel">Recent</p>
            <h3>Latest releases</h3>
            <p>Fresh titles from IGDB with cover art and release metadata.</p>
          </section>

          <section className="homeSideCard">
            <p className="homeSectionLabel">Feed</p>
            <h3>Quick picks</h3>
            <div className="homeNewsList">
              {recentGames.map((game) => (
                <article className="homeNewsItem" key={game.igdb_id}>
                  <span className="homeNewsDot" />
                  <div>
                    <strong>{game.title}</strong>
                    <p>
                      {game.release_year ?? "TBA"} · {gameMeta(game)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="homeSideCard homeAccentCard">
            <p className="homeSectionLabel">Backend</p>
            <h3>Integration details</h3>
            <p>
              The site now uses server-side IGDB requests with Twitch app tokens, so secrets stay in Django
              env vars and never reach the browser.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
