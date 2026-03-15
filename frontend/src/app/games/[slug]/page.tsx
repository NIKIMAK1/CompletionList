"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type GameStatus = "planned" | "playing" | "completed";

type UserGameEntry = {
  id: number;
  igdb_id: number | null;
  title: string;
  platform: string;
  status: GameStatus;
  cover_url: string;
  release_year: number | null;
  genres: string[];
  tags: string[];
  rating: number;
  note: string;
};

type GamePageData = {
  igdbId: number | null;
  title: string;
  tagline: string;
  description: string;
  release: string;
  developer: string;
  platforms: string[];
  genres: string[];
  tags: string[];
  rating: number;
  cover: string | null;
  screenshots: string[];
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

function humanizeSlug(slug: string) {
  return slug
    .replace(/^igdb-/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function templateGame(slug: string): GamePageData {
  return {
    igdbId: Number.isFinite(Number(slug.replace(/^igdb-/, ""))) ? Number(slug.replace(/^igdb-/, "")) : null,
    title: humanizeSlug(slug),
    tagline: "IGDB data unavailable",
    description: "Для этой игры пока не удалось получить данные из backend IGDB endpoint.",
    release: "TBD",
    developer: "Unknown",
    platforms: ["Unknown"],
    genres: ["Unknown"],
    tags: [],
    rating: 0,
    cover: null,
    screenshots: [],
  };
}

function normalizeUserGame(game: UserGameEntry): GamePageData {
  return {
    igdbId: game.igdb_id,
    title: game.title,
    tagline: `${game.platform || "Custom entry"} · ${game.status}`,
    description: game.note || "Пользовательская карточка без описания.",
    release: game.release_year ? String(game.release_year) : "TBD",
    developer: game.platform || "Custom entry",
    platforms: game.platform ? [game.platform] : ["Unknown"],
    genres: game.genres?.length ? game.genres : ["Unknown"],
    tags: game.tags?.length ? game.tags : [],
    rating: typeof game.rating === "number" ? game.rating : 0,
    cover: game.cover_url || null,
    screenshots: [],
  };
}

function normalizeGame(game: any): GamePageData {
  const screenshots = [...(game.artworks || []), ...(game.screenshots || [])].slice(0, 6);

  return {
    igdbId: typeof game.igdb_id === "number" ? game.igdb_id : null,
    title: game.title,
    tagline: game.genres?.length
      ? `${game.genres[0]} · ${game.rating ? `${Math.round(game.rating)}/100` : "без рейтинга"}`
      : "IGDB game",
    description: game.description || game.storyline || "Описание пока не найдено.",
    release: game.release_year ? String(game.release_year) : "TBD",
    developer: game.developer || "Unknown",
    platforms: game.platforms?.length ? game.platforms : ["Unknown"],
    genres: game.genres?.length ? game.genres : ["Unknown"],
    tags: game.tags?.length ? game.tags : [],
    rating: typeof game.rating === "number" ? Math.min(10, Math.max(0, Math.round(game.rating / 10))) : 0,
    cover: game.cover_url || null,
    screenshots,
  };
}

export default function GamePage() {
  const routeParams = useParams<{ slug: string }>();
  const slug = routeParams.slug;
  const [game, setGame] = useState<GamePageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<GameStatus>("planned");
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [authToken, setAuthToken] = useState("");

  useEffect(() => {
    const storedToken = window.localStorage.getItem("authToken");
    if (storedToken) {
      setAuthToken(storedToken);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGame() {
      setIsLoading(true);
      setGame(null);

      try {
        const storedToken = window.localStorage.getItem("authToken");
        const isIgdbSlug = /^igdb-\d+$/.test(slug);

        if (!isIgdbSlug && storedToken) {
          const userGames = (await apiRequest("/games/", {}, storedToken)) as UserGameEntry[];
          const matchingUserGame = userGames.find((gameEntry) => slugifyTitle(gameEntry.title) === slug);

          if (matchingUserGame && !cancelled) {
            setGame(normalizeUserGame(matchingUserGame));
            setIsLoading(false);
            return;
          }
        }

        if (isIgdbSlug) {
          const response = await fetch(`${API_URL}/igdb/game/${encodeURIComponent(slug)}/`, {
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error("Game not found");
          }

          const payload = await response.json();
          if (!cancelled) {
            setGame(normalizeGame(payload));
            setIsLoading(false);
          }
          return;
        }

        throw new Error("Game not found");
      } catch {
        try {
          const storedToken = window.localStorage.getItem("authToken");
          if (storedToken) {
            const userGames = (await apiRequest("/games/", {}, storedToken)) as UserGameEntry[];
            const matchingUserGame = userGames.find(
              (gameEntry) =>
                slugifyTitle(gameEntry.title) === slug || (gameEntry.igdb_id !== null && `igdb-${gameEntry.igdb_id}` === slug),
            );

            if (matchingUserGame && !cancelled) {
              setGame(normalizeUserGame(matchingUserGame));
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Ignore local list lookup errors and fall back to template data below.
        }

        if (!cancelled) {
          setGame(templateGame(slug));
          setIsLoading(false);
        }
      }
    }

    void loadGame();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const displayTitle = game?.title || humanizeSlug(slug);
  const displayCover = game?.cover || null;

  async function handleAddToList() {
    if (!game) {
      return;
    }

    if (!authToken) {
      setSaveMessage("Войдите в аккаунт, чтобы добавить игру в список.");
      return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
      await apiRequest(
        "/games/",
        {
          method: "POST",
          body: JSON.stringify({
            igdb_id: game.igdbId,
            title: game.title,
            platform: game.platforms[0] === "Unknown" ? "" : game.platforms[0],
            status: saveStatus,
            cover_url: game.cover || "",
            release_year: game.release !== "TBD" ? Number(game.release) : null,
            genres: game.genres.filter((genre) => genre !== "Unknown"),
            tags: game.tags,
            rating: game.rating,
            note: game.description,
          }),
        },
        authToken,
      );
      setSaveMessage("Игра добавлена в ваш список.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Не удалось добавить игру.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="gamePage">
      <section className="gameHero">
        <div className="gameCoverColumn">
          {displayCover ? (
            <img alt={displayTitle} className="gameCoverImage" src={displayCover} />
          ) : (
            <div className="gameCoverImage gameCoverPlaceholder">No cover available</div>
          )}
        </div>

        <div className="gameInfoColumn">
          <p className="gameEyebrow">Game Page</p>
          <h1>{displayTitle}</h1>
          {isLoading ? <p className="gameDescription">Загружаем описание и метаданные...</p> : null}
          {!isLoading && game ? <p className="gameTagline">{game.tagline}</p> : null}
          {!isLoading && game ? <p className="gameDescription">{game.description}</p> : null}

          <div className="gameMetaBoard">
            <div className="gameMetaCard">
              <span>Релиз</span>
              <strong>{isLoading ? "..." : game?.release}</strong>
            </div>
            <div className="gameMetaCard">
              <span>Студия</span>
              <strong>{isLoading ? "..." : game?.developer}</strong>
            </div>
          </div>

          {!isLoading && game ? (
            <div className="gameListPanel">
              <div className="gameListPanelHeader">
                <div>
                  <p className="gameEyebrow">Your List</p>
                  <strong>Add this game</strong>
                </div>
                {!authToken ? (
                  <Link className="ghostButton" href="/profile">
                    Login
                  </Link>
                ) : null}
              </div>
              <div className="gameListPanelControls">
                <select
                  className="gameListSelect"
                  onChange={(event) => setSaveStatus(event.target.value as GameStatus)}
                  value={saveStatus}
                >
                  <option value="planned">Will play</option>
                  <option value="playing">Playing</option>
                  <option value="completed">Completed</option>
                </select>
                <button className="primaryButton" disabled={saving} onClick={() => void handleAddToList()} type="button">
                  {saving ? "Saving..." : "Add to list"}
                </button>
              </div>
              {saveMessage ? <p className="gameInlineMessage">{saveMessage}</p> : null}
            </div>
          ) : null}

          {!isLoading && game ? (
            <div className="gameTagGroup">
              {game.platforms.map((platform) => (
                <span className="gameTag" key={platform}>
                  {platform}
                </span>
              ))}
            </div>
          ) : null}

          {!isLoading && game ? (
            <div className="gameTagGroup">
              {game.genres.map((genre) => (
                <span className="gameTag gameTagMuted" key={genre}>
                  {genre}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="gameSection">
        <div className="gameSectionTop">
          <div>
            <p className="gameEyebrow">Галерея</p>
            <h2>Скриншоты и арты</h2>
          </div>
        </div>

        <div className="gameGalleryGrid">
          {isLoading ? (
            Array.from({ length: 3 }, (_, index) => (
              <article className="gameShotCard gameShotCardPlaceholder" key={index} />
            ))
          ) : game && game.screenshots.length ? (
            game.screenshots.map((image, index) => (
              <article className="gameShotCard" key={`${image}-${index}`}>
                <img alt={`${displayTitle} screenshot ${index + 1}`} src={image} />
              </article>
            ))
          ) : (
            <div className="gameGalleryEmpty">У этой игры в IGDB сейчас нет доступных скриншотов.</div>
          )}
        </div>
      </section>
    </main>
  );
}
