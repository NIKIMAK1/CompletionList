import Link from "next/link";

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
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game =
    gameTemplates[slug] ??
    ({
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
      screenshots: [
        "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=80",
      ],
    } satisfies GamePageData);

  return (
    <main className="gamePage">
      <div className="gamePageTop">
        <Link className="gameBackLink" href="/">
          На главную
        </Link>
        <Link className="gameBackLink" href="/profile">
          В профиль
        </Link>
      </div>

      <section className="gameHero">
        <div className="gameCoverColumn">
          <img alt={game.title} className="gameCoverImage" src={game.cover} />
        </div>

        <div className="gameInfoColumn">
          <p className="gameEyebrow">Game Page Template</p>
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
          <p className="gameSectionHint">
            В будущем сюда можно подставлять `screenshots`, `artworks` и `cover` из IGDB.
          </p>
        </div>

        <div className="gameGalleryGrid">
          {game.screenshots.map((image, index) => (
            <article className="gameShotCard" key={image}>
              <img alt={`${game.title} screenshot ${index + 1}`} src={image} />
            </article>
          ))}
        </div>
      </section>

      <section className="gameSection">
        <div className="gameSectionTop">
          <div>
            <p className="gameEyebrow">IGDB</p>
            <h2>Что будет здесь после интеграции</h2>
          </div>
        </div>
        <div className="gameIntegrationGrid">
          <article className="gameIntegrationCard">
            <strong>Основные поля</strong>
            <p>`name`, `summary`, `storyline`, `first_release_date`, `rating`.</p>
          </article>
          <article className="gameIntegrationCard">
            <strong>Медиа</strong>
            <p>`cover`, `screenshots`, `artworks`, трейлеры и связанные материалы.</p>
          </article>
          <article className="gameIntegrationCard">
            <strong>Связи</strong>
            <p>`genres`, `platforms`, `involved_companies`, `franchises`, `similar_games`.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
