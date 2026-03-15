# Completion List

Минимальный шаблон сайта для учета игр:
- планирую пройти
- играю сейчас
- уже прошел

Стек:
- `backend/` — Django + DRF
- `frontend/` — Next.js App Router
- `docker-compose.yml` — PostgreSQL + запуск сервисов

## Что уже есть

- модель `GameEntry`
- API `GET/POST /api/games/`
- Django admin
- простая витрина на главной странице Next.js

## Быстрый старт

### Через Docker

```bash
docker compose up --build
```

### Локально

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
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
