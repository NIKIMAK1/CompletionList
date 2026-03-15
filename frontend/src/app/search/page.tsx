"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SearchGame = {
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

function gameHref(game: SearchGame) {
  return `/games/${game.slug || `igdb-${game.igdb_id}`}`;
}

function gameMeta(game: SearchGame) {
  if (game.genres.length) {
    return game.genres.join(", ");
  }
  if (game.tags.length) {
    return game.tags.slice(0, 3).join(", ");
  }
  return "IGDB";
}

function shortSummary(summary: string) {
  const normalized = summary.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Описание пока не найдено.";
  }
  if (normalized.length <= 110) {
    return normalized;
  }
  return `${normalized.slice(0, 107).trimEnd()}...`;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("Начните вводить название игры.");

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setMessage("Начните вводить название игры.");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSearching(true);
      setMessage("");

      try {
        const response = await fetch(`${API_URL}/igdb/search/?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Поиск временно недоступен.");
        }

        const payload = await response.json();
        setResults(payload);
        setMessage(payload.length ? "" : "Ничего не найдено.");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setResults([]);
        setMessage("Не удалось загрузить результаты поиска.");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  return (
    <main className="searchPage">
      <section className="searchHero">
        <p className="eyebrow">Search</p>
        <h1>Поиск игр в IGDB</h1>
        <p className="description">
          Ищите игры по названию, открывайте карточку и потом добавляйте их в профиль.
        </p>
      </section>

      <section className="searchPanel">
        <input
          className="searchInput"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Например, Hollow Knight, Persona, Cyberpunk..."
          value={query}
        />
        {searching ? <p className="searchMessage">Ищем в IGDB...</p> : null}
        {!searching && message ? <p className="searchMessage">{message}</p> : null}
      </section>

      <section className="searchGrid">
        {results.map((game) => (
          <Link className="homeGameCard homeGameLink" href={gameHref(game)} key={game.igdb_id}>
            <div className="homeGamePoster">
              {game.cover_url ? (
                <img alt={game.title} src={game.cover_url} />
              ) : (
                <div className="gamePosterPlaceholder">
                  <span>{game.title.slice(0, 1).toUpperCase()}</span>
                </div>
              )}
              <span className="homeCornerChip">{game.release_year ?? "TBA"}</span>
            </div>
            <div className="homeGameBody">
              <h3>{game.title}</h3>
              <p className="homeGameGenre">{gameMeta(game)}</p>
              <div className="homeGameMeta">
                <span>{game.release_year ?? "TBA"}</span>
                <span>{game.rating ? game.rating.toFixed(1) : "NR"}</span>
                <span>{game.tags.slice(0, 2).join(", ") || "IGDB"}</span>
              </div>
              <p className="homeGameSubtitle">{shortSummary(game.summary)}</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
