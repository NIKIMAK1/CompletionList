import json
import os
import time
from datetime import datetime, timezone
from typing import Any
from urllib import error, parse, request


TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token"
IGDB_GAMES_URL = "https://api.igdb.com/v4/games"

_token_cache: dict[str, Any] = {"access_token": None, "expires_at": 0.0}


class IGDBConfigurationError(Exception):
    pass


class IGDBRequestError(Exception):
    pass


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise IGDBConfigurationError(f"{name} is not configured.")
    return value


def _fetch_token() -> str:
    client_id = _require_env("IGDB_CLIENT_ID")
    client_secret = _require_env("IGDB_CLIENT_SECRET")

    if _token_cache["access_token"] and time.time() < _token_cache["expires_at"]:
        return str(_token_cache["access_token"])

    payload = parse.urlencode(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "client_credentials",
        }
    ).encode("utf-8")
    token_request = request.Request(TWITCH_TOKEN_URL, data=payload, method="POST")
    token_request.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with request.urlopen(token_request, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise IGDBRequestError(f"Unable to get Twitch token: {details or exc.reason}") from exc
    except error.URLError as exc:
        raise IGDBRequestError(f"Unable to reach Twitch token endpoint: {exc.reason}") from exc

    access_token = data.get("access_token")
    expires_in = int(data.get("expires_in", 0))
    if not access_token:
        raise IGDBRequestError("Twitch token response did not include access_token.")

    _token_cache["access_token"] = access_token
    _token_cache["expires_at"] = time.time() + max(expires_in - 60, 60)
    return str(access_token)


def _post_igdb(query: str, retry_on_unauthorized: bool = True) -> list[dict[str, Any]]:
    client_id = _require_env("IGDB_CLIENT_ID")
    access_token = _fetch_token()

    igdb_request = request.Request(
        IGDB_GAMES_URL,
        data=query.encode("utf-8"),
        method="POST",
    )
    igdb_request.add_header("Client-ID", client_id)
    igdb_request.add_header("Authorization", f"Bearer {access_token}")
    igdb_request.add_header("Accept", "application/json")

    try:
        with request.urlopen(igdb_request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        if exc.code == 401 and retry_on_unauthorized:
            _token_cache["access_token"] = None
            _token_cache["expires_at"] = 0.0
            return _post_igdb(query, retry_on_unauthorized=False)
        details = exc.read().decode("utf-8", errors="ignore")
        raise IGDBRequestError(f"IGDB request failed: {details or exc.reason}") from exc
    except error.URLError as exc:
        raise IGDBRequestError(f"Unable to reach IGDB: {exc.reason}") from exc


def _cover_url(image_id: str | None, size: str = "cover_big") -> str:
    if not image_id:
        return ""
    return f"https://images.igdb.com/igdb/image/upload/t_{size}/{image_id}.jpg"


def _release_year(timestamp: int | None) -> int | None:
    if not timestamp:
        return None
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).year


def normalize_game(game: dict[str, Any], *, cover_size: str = "cover_big") -> dict[str, Any]:
    return {
        "igdb_id": game.get("id"),
        "slug": game.get("slug"),
        "title": game.get("name", ""),
        "summary": game.get("summary", ""),
        "cover_url": _cover_url(((game.get("cover") or {}).get("image_id")), size=cover_size),
        "genres": [genre["name"] for genre in game.get("genres", []) if genre.get("name")],
        "tags": [keyword["name"] for keyword in game.get("keywords", []) if keyword.get("name")],
        "release_year": _release_year(game.get("first_release_date")),
        "rating": round(float(game.get("aggregated_rating", 0)), 1) if game.get("aggregated_rating") else None,
    }


def search_games(search_term: str, limit: int = 10) -> list[dict[str, Any]]:
    sanitized = search_term.replace('"', '\\"').strip()
    if not sanitized:
        return []

    query = f"""
fields name, slug, summary, first_release_date, aggregated_rating, cover.image_id, genres.name, keywords.name;
search "{sanitized}";
where name != null;
limit {max(1, min(limit, 20))};
"""
    return [normalize_game(item) for item in _post_igdb(query)]


def discover_games(limit: int = 12) -> list[dict[str, Any]]:
    now = datetime.now(tz=timezone.utc)
    start_of_last_year = datetime(now.year - 1, 1, 1, tzinfo=timezone.utc)
    end_of_next_year = datetime(now.year + 1, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
    start_ts = int(start_of_last_year.timestamp())
    end_ts = int(end_of_next_year.timestamp())

    query = f"""
fields name, slug, summary, first_release_date, aggregated_rating, total_rating_count, cover.image_id, genres.name, keywords.name;
where cover != null
  & first_release_date != null
  & first_release_date >= {start_ts}
  & first_release_date <= {end_ts}
  & total_rating_count > 5;
sort total_rating_count desc;
limit {max(1, min(limit, 24))};
"""
    return [normalize_game(item, cover_size="screenshot_big") for item in _post_igdb(query)]


def get_game_details(identifier: str) -> dict[str, Any] | None:
    safe_identifier = identifier.replace('"', '\\"').strip()
    if not safe_identifier:
        return None

    is_id_lookup = safe_identifier.startswith("igdb-") or safe_identifier.isdigit()
    numeric_id = safe_identifier.removeprefix("igdb-")
    where_clause = f"where id = {numeric_id};" if is_id_lookup else f'where slug = "{safe_identifier}";'

    query = f"""
fields
  id,
  slug,
  name,
  summary,
  storyline,
  first_release_date,
  aggregated_rating,
  cover.image_id,
  screenshots.image_id,
  artworks.image_id,
  genres.name,
  keywords.name,
  platforms.name,
  involved_companies.developer,
  involved_companies.company.name;
{where_clause}
limit 1;
"""
    games = _post_igdb(query)
    if not games:
        return None

    game = games[0]
    developer = "Unknown"
    for item in game.get("involved_companies", []):
        company = (item.get("company") or {}).get("name")
        if item.get("developer") and company:
            developer = company
            break
        if developer == "Unknown" and company:
            developer = company

    return {
        **normalize_game(game, cover_size="cover_big"),
        "description": game.get("summary") or game.get("storyline") or "",
        "storyline": game.get("storyline") or "",
        "developer": developer,
        "platforms": [platform["name"] for platform in game.get("platforms", []) if platform.get("name")],
        "screenshots": [
            _cover_url(item.get("image_id"), size="screenshot_huge")
            for item in game.get("screenshots", [])
            if item.get("image_id")
        ],
        "artworks": [
            _cover_url(item.get("image_id"), size="screenshot_huge")
            for item in game.get("artworks", [])
            if item.get("image_id")
        ],
    }
