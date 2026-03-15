type GameEntry = {
  id: number;
  title: string;
  platform: string;
  status: "planned" | "playing" | "completed";
  note: string;
};

const statusLabel: Record<GameEntry["status"], string> = {
  planned: "Планирую",
  playing: "Играю",
  completed: "Прошел",
};

async function getGames(): Promise<GameEntry[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/games/`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const games = await getGames();

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Game backlog</p>
        <h1>Список игр по статусам</h1>
        <p className="description">
          Минимальный шаблон под трекер в духе Shikimori: что хочу пройти, во что играю и что уже
          закончил.
        </p>
      </section>

      <section className="grid">
        {games.length === 0 ? (
          <article className="card empty">
            <h2>Пока пусто</h2>
            <p>Добавьте записи через Django admin или POST-запрос в `/api/games/`.</p>
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
    </main>
  );
}
