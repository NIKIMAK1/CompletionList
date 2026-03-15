"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type GamePageData = {
  title: string;
  tagline: string;
  description: string;
  release: string;
  developer: string;
  platforms: string[];
  genres: string[];
  cover: string | null;
  screenshots: string[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function humanizeSlug(slug: string) {
  return slug
    .replace(/^igdb-/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function templateGame(slug: string): GamePageData {
  return {
    title: humanizeSlug(slug),
    tagline: "IGDB data unavailable",
    description: "Для этой игры пока не удалось получить данные из backend IGDB endpoint.",
    release: "TBD",
    developer: "Unknown",
    platforms: ["Unknown"],
    genres: ["Unknown"],
    cover: null,
    screenshots: [],
  };
}

function normalizeGame(game: any): GamePageData {
  const screenshots = [...(game.artworks || []), ...(game.screenshots || [])].slice(0, 6);

  return {
    title: game.title,
    tagline: game.genres?.length
      ? `${game.genres[0]} · ${game.rating ? `${Math.round(game.rating)}/100` : "без рейтинга"}`
      : "IGDB game",
    description: game.description || game.storyline || "Описание пока не найдено.",
    release: game.release_year ? String(game.release_year) : "TBD",
    developer: game.developer || "Unknown",
    platforms: game.platforms?.length ? game.platforms : ["Unknown"],
    genres: game.genres?.length ? game.genres : ["Unknown"],
    cover: game.cover_url || null,
    screenshots,
  };
}

export default function GamePage() {
  const routeParams = useParams<{ slug: string }>();
  const slug = routeParams.slug;
  const [game, setGame] = useState<GamePageData | null>(null);
  const [sourceLabel, setSourceLabel] = useState("Загрузка из IGDB...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadGame() {
      setIsLoading(true);
      setGame(null);
      setSourceLabel("Загрузка из IGDB...");

      try {
        const response = await fetch(`${API_URL}/igdb/game/${encodeURIComponent(slug)}/`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Game not found");
        }

        const payload = await response.json();
        if (!cancelled) {
          setGame(normalizeGame(payload));
          setSourceLabel("Источник: backend IGDB API");
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setGame(templateGame(slug));
          setSourceLabel("Источник: fallback without IGDB media");
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

  return (
    <main className="gamePage">
      <div className="gamePageTop">
        <span className="gameSourceBadge">{sourceLabel}</span>
      </div>

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
