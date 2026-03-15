"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type GamePageData = {
  title: string;
  tagline: string;
  description: string;
  release: string;
  developer: string;
  platforms: string[];
  genres: string[];
  cover: string;
  screenshots: string[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const fallbackImages = [
  "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=80",
];

const gameTemplates: Record<string, GamePageData> = {
  "persona-3-reload": {
    title: "Persona 3 Reload",
    tagline: "JRPG template page prepared for IGDB integration",
    description:
      "Шаблон страницы игры: здесь будут название, описание, постер, галерея скриншотов, платформы, жанры и дополнительные поля из IGDB. Сейчас контент демонстрационный, но структура уже готова под реальный API-ответ.",
    release: "2024",
    developer: "Atlus",
    platforms: ["PC", "PlayStation 5", "Xbox Series X|S"],
    genres: ["JRPG", "Social Sim", "Story-rich"],
    cover:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1000&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1519985176271-adb1088fa94c?auto=format&fit=crop&w=1000&q=80",
    ],
  },
};

function humanizeSlug(slug: string) {
  return slug
    .replace(/^igdb-/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function templateGame(slug: string): GamePageData {
  return (
    gameTemplates[slug] || {
      title: humanizeSlug(slug),
      tagline: "Custom game template",
      description:
        "Здесь будет карточка игры, когда вы подставите реальные данные из IGDB: summary, artworks, screenshots, release dates, genres и платформы.",
      release: "TBD",
      developer: "Unknown",
      platforms: ["API data"],
      genres: ["API data"],
      cover:
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80",
      screenshots: fallbackImages,
    }
  );
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
    cover:
      game.cover_url ||
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80",
    screenshots: screenshots.length ? screenshots : fallbackImages,
  };
}

export default function GamePage({ params }: { params: { slug: string } }) {
  const fallbackGame = useMemo(() => templateGame(params.slug), [params.slug]);
  const [game, setGame] = useState<GamePageData>(fallbackGame);
  const [sourceLabel, setSourceLabel] = useState("Загрузка из IGDB...");

  useEffect(() => {
    let cancelled = false;

    async function loadGame() {
      try {
        const response = await fetch(`${API_URL}/igdb/game/${encodeURIComponent(params.slug)}/`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Game not found");
        }

        const payload = await response.json();
        if (!cancelled) {
          setGame(normalizeGame(payload));
          setSourceLabel("Источник: backend IGDB API");
        }
      } catch {
        if (!cancelled) {
          setGame(templateGame(params.slug));
          setSourceLabel("Источник: local template");
        }
      }
    }

    setGame(fallbackGame);
    setSourceLabel("Загрузка из IGDB...");
    void loadGame();

    return () => {
      cancelled = true;
    };
  }, [fallbackGame, params.slug]);

  return (
    <main className="gamePage">
      <div className="gamePageTop">
        <Link className="gameBackLink" href="/">
          На главную
        </Link>
        <Link className="gameBackLink" href="/profile">
          В профиль
        </Link>
        <span className="gameSourceBadge">{sourceLabel}</span>
      </div>

      <section className="gameHero">
        <div className="gameCoverColumn">
          <img alt={game.title} className="gameCoverImage" src={game.cover} />
        </div>

        <div className="gameInfoColumn">
          <p className="gameEyebrow">Game Page</p>
          <h1>{game.title}</h1>
          <p className="gameTagline">{game.tagline}</p>
          <p className="gameDescription">{game.description}</p>

          <div className="gameMetaBoard">
            <div className="gameMetaCard">
              <span>Релиз</span>
              <strong>{game.release}</strong>
            </div>
            <div className="gameMetaCard">
              <span>Студия</span>
              <strong>{game.developer}</strong>
            </div>
          </div>

          <div className="gameTagGroup">
            {game.platforms.map((platform) => (
              <span className="gameTag" key={platform}>
                {platform}
              </span>
            ))}
          </div>

          <div className="gameTagGroup">
            {game.genres.map((genre) => (
              <span className="gameTag gameTagMuted" key={genre}>
                {genre}
              </span>
            ))}
          </div>
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
          {game.screenshots.map((image, index) => (
            <article className="gameShotCard" key={`${image}-${index}`}>
              <img alt={`${game.title} screenshot ${index + 1}`} src={image} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
