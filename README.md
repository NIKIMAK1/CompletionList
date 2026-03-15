# Completion List

Минимальный шаблон сайта для учета игр:
- планирую пройти
- играю сейчас
- уже прошел

Стек:
- `backend/` — Django + DRF
- `uv` — Python dependency manager
- `frontend/` — Next.js App Router
- `docker-compose.yml` — PostgreSQL + запуск сервисов

## Что уже есть

- модель `GameEntry`
- API `GET/POST /api/games/`
- авторизация через токен: `/api/auth/register/`, `/api/auth/login/`, `/api/auth/me/`, `/api/auth/logout/`
- Django admin
- главная страница Next.js с регистрацией, входом и личным списком игр

## Быстрый старт

### Через Docker

```bash
docker compose up --build
```

### Локально

Backend:

```bash
cd backend
uv sync --frozen
cp .env.example .env
uv run python manage.py migrate
uv run python manage.py runserver
```

Frontend:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Что можно добавить дальше

- пользователи и авторизация
- отдельные списки по пользователям
- оценки, жанры, обложки
- поиск и фильтры
