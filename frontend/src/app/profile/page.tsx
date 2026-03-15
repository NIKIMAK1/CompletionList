"use client";

import { FormEvent, useEffect, useState } from "react";

type User = {
  id: number;
  username: string;
};

type GameStatus = "planned" | "playing" | "completed";

type GameEntry = {
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
  owner_username: string;
};

type IGDBGame = {
  igdb_id: number;
  title: string;
  summary: string;
  cover_url: string;
  release_year: number | null;
  genres: string[];
  tags: string[];
  rating: number | null;
};

type AuthMode = "login" | "register";

type GameFormState = {
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const statusLabel: Record<GameStatus, string> = {
  planned: "Will play",
  playing: "Playing",
  completed: "Completed",
};

const statusDescription: Record<GameStatus, string> = {
  planned: "Games queued for later.",
  playing: "Games currently in progress.",
  completed: "Games already finished.",
};

const emptyGameForm: GameFormState = {
  igdb_id: null,
  title: "",
  platform: "",
  status: "planned",
  cover_url: "",
  release_year: null,
  genres: [],
  tags: [],
  rating: 0,
  note: "",
};

function normalizeGames(items: GameEntry[]) {
  return [...items].sort((left, right) => left.title.localeCompare(right.title));
}

function gameToForm(game: GameEntry): GameFormState {
  return {
    igdb_id: game.igdb_id,
    title: game.title,
    platform: game.platform,
    status: game.status,
    cover_url: game.cover_url,
    release_year: game.release_year,
    genres: game.genres,
    tags: game.tags,
    rating: game.rating,
    note: game.note,
  };
}

function renderStars(rating: number) {
  const filled = Math.round(rating / 2);
  return Array.from({ length: 5 }, (_, index) => (index < filled ? "*" : ".")).join("");
}

function splitCommaSeparated(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
      "Request failed";
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
  const [selectedStatus, setSelectedStatus] = useState<GameStatus>("completed");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [gameForm, setGameForm] = useState<GameFormState>(emptyGameForm);
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<GameFormState>(emptyGameForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IGDBGame[]>([]);
  const [searching, setSearching] = useState(false);
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

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSearching(true);

      try {
        const results = await apiRequest(`/igdb/search/?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        setSearchResults(results);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

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
      setMessage(authMode === "login" ? "Logged in." : "Account created.");
      await loadCurrentUser(data.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to authenticate.");
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
      setSearchQuery("");
      setSearchResults([]);
      setMessage("Game added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add game.");
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
      setMessage("Game updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update game.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGame(gameId: number) {
    if (!token) {
      return;
    }

    const confirmed = window.confirm("Delete this game?");
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
      setMessage("Game removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete game.");
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
    setMessage("Logged out.");
  }

  function applyIGDBResult(game: IGDBGame) {
    setGameForm((current) => ({
      ...current,
      igdb_id: game.igdb_id,
      title: game.title,
      cover_url: game.cover_url,
      release_year: game.release_year,
      genres: game.genres,
      tags: game.tags,
      rating: game.rating ? Math.min(10, Math.max(0, Math.round(game.rating / 10))) : current.rating,
      note: game.summary || current.note,
    }));
    setSearchQuery(game.title);
    setSearchResults([]);
    setMessage(`Loaded from IGDB: ${game.title}`);
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
          <h1>Personal game list</h1>
          <p className="description">
            Search IGDB, pull title, cover, genres, tags and release year, then save the game into your
            own completion list.
          </p>
        </div>

        {user ? (
          <div className="accountBox">
            <p className="accountLabel">Profile</p>
            <strong>{user.username}</strong>
            <span className="accountMeta">{games.length} games in collection</span>
            <button className="secondaryButton" onClick={handleLogout} type="button">
              Logout
            </button>
          </div>
        ) : null}
      </section>

      {message ? <p className="message">{message}</p> : null}

      {loading ? (
        <section className="card">
          <p>Loading...</p>
        </section>
      ) : user ? (
        <div className="contentStack">
          <section className="libraryShell">
            <div className="libraryHeader">
              <div>
                <p className="sectionLabel">Library</p>
                <h2>{statusLabel[selectedStatus]}</h2>
                <p className="libraryDescription">{statusDescription[selectedStatus]}</p>
              </div>
              <div className="statusTabs" role="tablist" aria-label="Filter by status">
                {(["completed", "playing", "planned"] as GameStatus[]).map((status) => (
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
                    <p className="sectionLabel">Empty</p>
                    <h3>No games here yet</h3>
                    <p>Add one from the form on the right.</p>
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
                          placeholder="Platform"
                          value={editingForm.platform}
                          onChange={(event) =>
                            setEditingForm((current) => ({ ...current, platform: event.target.value }))
                          }
                        />
                        <input
                          placeholder="Cover URL"
                          value={editingForm.cover_url}
                          onChange={(event) =>
                            setEditingForm((current) => ({ ...current, cover_url: event.target.value }))
                          }
                        />
                        <input
                          placeholder="Release year"
                          type="number"
                          value={editingForm.release_year ?? ""}
                          onChange={(event) =>
                            setEditingForm((current) => ({
                              ...current,
                              release_year: event.target.value ? Number(event.target.value) : null,
                            }))
                          }
                        />
                        <textarea
                          placeholder="Genres"
                          rows={2}
                          value={editingForm.genres.join(", ")}
                          onChange={(event) =>
                            setEditingForm((current) => ({
                              ...current,
                              genres: splitCommaSeparated(event.target.value),
                            }))
                          }
                        />
                        <textarea
                          placeholder="Tags"
                          rows={2}
                          value={editingForm.tags.join(", ")}
                          onChange={(event) =>
                            setEditingForm((current) => ({
                              ...current,
                              tags: splitCommaSeparated(event.target.value),
                            }))
                          }
                        />
                        <select
                          value={editingForm.status}
                          onChange={(event) =>
                            setEditingForm((current) => ({
                              ...current,
                              status: event.target.value as GameStatus,
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
                            Save
                          </button>
                          <button className="ghostButton" onClick={() => setEditingGameId(null)} type="button">
                            Cancel
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
                          <span className="platformChip">{game.platform || "No platform"}</span>
                        </div>
                        <div className="gameHeading">
                          <h3>{game.title}</h3>
                          <div className="ratingBlock">
                            <strong>{game.rating}/10</strong>
                            <span>{renderStars(game.rating)}</span>
                          </div>
                        </div>
                        {game.release_year ? <p>{game.release_year}</p> : null}
                        {game.genres.length ? <p>{game.genres.join(", ")}</p> : null}
                        {game.tags.length ? <p>#{game.tags.slice(0, 4).join(" #")}</p> : null}
                        <p>{game.note || "No note"}</p>
                        <div className="cardActions">
                          <button className="ghostButton" onClick={() => startEditing(game)} type="button">
                            Edit
                          </button>
                          <button className="dangerButton" onClick={() => void handleDeleteGame(game.id)} type="button">
                            Delete
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
                  <p className="sectionLabel">New card</p>
                  <h2>Add game</h2>
                </div>
              </div>
              <form className="form" onSubmit={handleCreateGame}>
                <input
                  placeholder="Search in IGDB"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                {searching ? <p>Searching IGDB...</p> : null}
                {searchResults.length ? (
                  <div className="statusMiniList">
                    {searchResults.slice(0, 5).map((result) => (
                      <button
                        className="ghostButton"
                        key={result.igdb_id}
                        onClick={() => applyIGDBResult(result)}
                        type="button"
                      >
                        {result.title}
                        {result.release_year ? ` (${result.release_year})` : ""}
                      </button>
                    ))}
                  </div>
                ) : null}
                <input
                  placeholder="Game title"
                  required
                  value={gameForm.title}
                  onChange={(event) => setGameForm((current) => ({ ...current, title: event.target.value }))}
                />
                <input
                  placeholder="Platform"
                  value={gameForm.platform}
                  onChange={(event) => setGameForm((current) => ({ ...current, platform: event.target.value }))}
                />
                <input
                  placeholder="Cover URL"
                  value={gameForm.cover_url}
                  onChange={(event) => setGameForm((current) => ({ ...current, cover_url: event.target.value }))}
                />
                <input
                  placeholder="Release year"
                  type="number"
                  value={gameForm.release_year ?? ""}
                  onChange={(event) =>
                    setGameForm((current) => ({
                      ...current,
                      release_year: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                />
                <textarea
                  placeholder="Genres, comma separated"
                  rows={2}
                  value={gameForm.genres.join(", ")}
                  onChange={(event) =>
                    setGameForm((current) => ({
                      ...current,
                      genres: splitCommaSeparated(event.target.value),
                    }))
                  }
                />
                <textarea
                  placeholder="Tags, comma separated"
                  rows={2}
                  value={gameForm.tags.join(", ")}
                  onChange={(event) =>
                    setGameForm((current) => ({
                      ...current,
                      tags: splitCommaSeparated(event.target.value),
                    }))
                  }
                />
                <select
                  value={gameForm.status}
                  onChange={(event) =>
                    setGameForm((current) => ({
                      ...current,
                      status: event.target.value as GameStatus,
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
                  placeholder="Rating 0 to 10"
                  type="number"
                  value={gameForm.rating}
                  onChange={(event) =>
                    setGameForm((current) => ({ ...current, rating: Number(event.target.value) || 0 }))
                  }
                />
                <textarea
                  placeholder="Short note"
                  rows={4}
                  value={gameForm.note}
                  onChange={(event) => setGameForm((current) => ({ ...current, note: event.target.value }))}
                />
                <button className="primaryButton" disabled={submitting} type="submit">
                  Save
                </button>
              </form>
            </article>

            <article className="card statsCard">
              <p className="sectionLabel">Stats</p>
              <h2>Collection</h2>
              <div className="statusMiniList">
                {(["completed", "playing", "planned"] as GameStatus[]).map((status) => (
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
      ) : (
        <section className="authLayout">
          <article className="card authCard">
            <div className="authSwitch">
              <button
                className={authMode === "login" ? "tab activeTab" : "tab"}
                onClick={() => setAuthMode("login")}
                type="button"
              >
                Login
              </button>
              <button
                className={authMode === "register" ? "tab activeTab" : "tab"}
                onClick={() => setAuthMode("register")}
                type="button"
              >
                Register
              </button>
            </div>

            <h2>{authMode === "login" ? "Login" : "Create account"}</h2>
            <form className="form" onSubmit={handleAuthSubmit}>
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
              <button className="primaryButton" disabled={submitting} type="submit">
                {authMode === "login" ? "Login" : "Register"}
              </button>
            </form>
          </article>
        </section>
      )}
    </main>
  );
}
