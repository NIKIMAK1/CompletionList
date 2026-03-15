"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type User = {
  id: number;
  username: string;
};

type CatalogGame = {
  igdb_id: number;
  slug?: string | null;
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

function gameHref(game: CatalogGame) {
  return `/games/${game.slug || `igdb-${game.igdb_id}`}`;
}

function shortSummary(summary: string) {
  const normalized = summary.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "No summary available.";
  }
  if (normalized.length <= 96) {
    return normalized;
  }
  return `${normalized.slice(0, 93).trimEnd()}...`;
}

function sortByReleaseYearDesc(games: CatalogGame[]) {
  return [...games].sort((left, right) => (right.release_year ?? -Infinity) - (left.release_year ?? -Infinity));
}

function sortByRatingDesc(games: CatalogGame[]) {
  return [...games].sort((left, right) => (right.rating ?? -Infinity) - (left.rating ?? -Infinity));
}

export default function HomePage() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [catalogGames, setCatalogGames] = useState<CatalogGame[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedToken = window.localStorage.getItem("authToken");
    if (storedToken) {
      void loadCurrentUser(storedToken);
      return;
    }
    setAuthChecked(true);
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
      setUser(currentUser);
    } catch {
      window.localStorage.removeItem("authToken");
      setUser(null);
    } finally {
      setAuthChecked(true);
      void loadCatalog();
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
      setAuthChecked(true);
      await loadCurrentUser(data.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to authenticate.");
    } finally {
      setSubmitting(false);
    }
  }

  const featuredGame = catalogGames[0] ?? null;
  const currentYear = new Date().getFullYear();
  const releasedGames = sortByReleaseYearDesc(
    catalogGames.filter((game) => game.release_year !== null && game.release_year <= currentYear),
  );
  const upcomingGames = sortByReleaseYearDesc(
    catalogGames.filter((game) => game.release_year === null || game.release_year > currentYear),
  );
  const anticipatedGames = sortByRatingDesc(
    catalogGames.filter((game) => (game.release_year ?? currentYear + 1) >= currentYear && game.rating !== null),
  );

  const recentlyReleased = (releasedGames.length ? releasedGames : catalogGames).slice(0, 5);
  const comingSoon = (upcomingGames.length ? upcomingGames : catalogGames.slice(2)).slice(0, 5);
  const mostAnticipated = (anticipatedGames.length ? anticipatedGames : sortByRatingDesc(catalogGames)).slice(0, 5);

  const discoveryColumns = [
    {
      key: "released",
      label: "Recently Released",
      title: "Fresh drops",
      accent: "homeDiscoveryColumnReleased",
      games: recentlyReleased,
    },
    {
      key: "upcoming",
      label: "Coming Soon",
      title: "On deck",
      accent: "homeDiscoveryColumnUpcoming",
      games: comingSoon,
    },
    {
      key: "anticipated",
      label: "Most Anticipated",
      title: "Watchlist leaders",
      accent: "homeDiscoveryColumnAnticipated",
      games: mostAnticipated,
    },
  ];

  return (
    <main className="homePage">
      <section className="homeUserRow">
        <div className="homeUserPanel">
          {authChecked && !user ? (
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
          ) : !authChecked ? (
            <div className="homeAuthCard homeAuthCardPlaceholder" />
          ) : null}
        </div>
      </section>

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
          <Link className="homeFeaturedCard homeFeaturedLink" href={gameHref(featuredGame)}>
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
          </Link>
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
              <p className="homeSectionLabel">Discovery</p>
              <h2>Recently Released, Coming Soon, Most Anticipated</h2>
              <p className="homeSectionText">
                Live discovery cards from the backend, rearranged into IGDB-style shelves instead of one flat grid.
              </p>
            </div>
          </div>

          <section className="homeDiscoveryGrid">
            {discoveryColumns.map((column) => {
              const leadGame = column.games[0];
              const listGames = column.games.slice(1);

              return (
                <section className={`homeDiscoveryColumn ${column.accent}`} key={column.key}>
                  <div className="homeDiscoveryHead">
                    <p className="homeSectionLabel">{column.label}</p>
                    <strong>{column.title}</strong>
                  </div>

                  {leadGame ? (
                    <Link className="homeDiscoveryLead homeGameLink" href={gameHref(leadGame)}>
                      <div className="homeDiscoveryLeadPoster">
                        <img alt={leadGame.title} src={leadGame.cover_url} />
                        <span className="homeCornerChip">{leadGame.release_year ?? "TBA"}</span>
                      </div>
                      <div className="homeDiscoveryLeadBody">
                        <h3>{leadGame.title}</h3>
                        <p className="homeGameGenre">{gameMeta(leadGame)}</p>
                        <div className="homeGameMeta">
                          <span>{leadGame.release_year ?? "TBA"}</span>
                          <span>{leadGame.rating ? leadGame.rating.toFixed(1) : "NR"}</span>
                        </div>
                        <p className="homeGameSubtitle">{shortSummary(leadGame.summary)}</p>
                      </div>
                    </Link>
                  ) : null}

                  <div className="homeDiscoveryList">
                    {listGames.map((game, index) => (
                      <Link className="homeDiscoveryItem homeGameLink" href={gameHref(game)} key={game.igdb_id}>
                        <span className="homeDiscoveryIndex">{String(index + 2).padStart(2, "0")}</span>
                        <img alt={game.title} src={game.cover_url} />
                        <div className="homeDiscoveryItemBody">
                          <strong>{game.title}</strong>
                          <p>
                            {game.release_year ?? "TBA"} · {gameMeta(game)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </section>
        </div>

        <aside className="homeSidebar" id="updates">
          <section className="homeSideCard">
            <p className="homeSectionLabel">Feed</p>
            <h3>Featured picks</h3>
            <div className="homeNewsList">
              {catalogGames.slice(0, 4).map((game) => (
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
        </aside>
      </section>
    </main>
  );
}
