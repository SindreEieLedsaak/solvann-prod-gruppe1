# Solvann

A production-ready full-stack application template built with **Python Flask** (backend) and **React + TypeScript** (frontend), styled with the [Designsystemet](https://designsystemet.no) component library.

---

## Repository structure

```
solvann/
├── backend/               # Flask REST API
│   ├── app/
│   │   ├── api/           # Route blueprints (one file per resource)
│   │   ├── core/          # Config, logging, error handling
│   │   ├── services/      # Business logic
│   │   ├── models/        # Data models (ready for database)
│   │   └── __init__.py    # App factory
│   ├── tests/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pyproject.toml     # Black + Ruff config
│   ├── .env.example
│   └── run.py
│
├── frontend/              # React + TypeScript (Vite)
│   ├── src/
│   │   ├── app/           # Root App component
│   │   ├── routes/        # React Router config
│   │   ├── layouts/       # AppLayout (header + main + footer)
│   │   ├── features/      # Feature modules (home, example, …)
│   │   ├── components/    # Shared UI components + ErrorBoundary
│   │   ├── services/      # Typed API clients
│   │   ├── hooks/         # Custom React hooks
│   │   └── types/         # TypeScript types shared across layers
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── nginx.conf
├── docker-compose.yml     # Local development
├── .vscode/               # Recommended settings & extensions
└── docs/                  # Architecture decisions, API contracts, etc.
```

---

## Prerequisites

Install these before following either quick-start path below:

| Tool | Minimum version | Check | Install |
|------|-----------------|-------|---------|
| Python | 3.11+ | `python --version` | [python.org/downloads](https://www.python.org/downloads/) · Windows: `winget install Python.Python.3.12` |
| Node.js (includes npm) | 20 LTS+ | `node --version` / `npm --version` | [nodejs.org](https://nodejs.org/) · Windows: `winget install OpenJS.NodeJS.LTS` |
| Docker Desktop | latest | `docker --version` / `docker compose version` | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) · Windows: `winget install Docker.DockerDesktop` |

Docker Desktop must be **running** (its engine, not just installed) before any `docker compose` command
will work — on Windows/macOS this means launching the Docker Desktop application first.

You don't need every tool for every workflow:

- Fully local dev (no Docker) → Python + Node/npm, plus Docker only for the Postgres database (see below).
- Fully containerized dev (`docker compose up`) → Docker Desktop only.

---

## Quick start (local, no Docker)

> The backend's history feature (production/income over time) needs Postgres — start it with
> `docker compose up db -d` before `python run.py` (see [Database](#database-postgres-for-local-development) below).
> Without it, the app still runs fine; the history collector just logs a warning and disables itself.

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements-dev.txt

# Copy and edit environment variables
cp .env.example .env

# Run the development server
python run.py
# Flask is now available at http://localhost:5000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and edit environment variables
cp .env.example .env

# Start Vite dev server
npm run dev
# App is now available at http://localhost:5173
```

> The Vite dev server proxies all `/api/*` requests to `http://localhost:5000`, so the
> frontend and backend can run independently without CORS issues in development.

---

## Quick start (Docker Compose)

```bash
# Copy environment file for the backend
cp backend/.env.example backend/.env

# Build and start both services
docker compose up

# Frontend → http://localhost:5173
# Backend  → http://localhost:5000
```

Both services mount their source directories as volumes, so code changes are reflected
immediately (gunicorn `--reload` for Flask, Vite HMR for React).

---

## Database (Postgres) for local development

Historical/aggregated plant data (production, income, environmental cost, per-turbine history) is
persisted to Postgres. A background collector records a snapshot every 60 seconds while the backend
is running.

### Start just the database

If you're running the backend/frontend locally (no Docker) but still want history to work:

```bash
# From the repo root
docker compose up db -d      # starts only the db service, in the background
docker compose logs -f db    # optional: tail its logs
```

This starts Postgres 16 on `localhost:5432` with the credentials already wired up in
`backend/.env.example` (`DATABASE_URL=postgresql://solvann:solvann@localhost:5432/solvann`). Copy that
file to `backend/.env` (see Quick start above) and `python run.py` will connect to it automatically.

Data is persisted in a named Docker volume (`solvann_db_data`), so it survives `docker compose down`
and container restarts. To wipe it completely:

```bash
docker compose down -v   # -v also removes named volumes
```

### Seeding demo history

A fresh database only has data from the moment the backend starts collecting. To backfill a
realistic 24h of synthetic history (e.g. for demos):

```bash
cd backend
# with the venv active and DATABASE_URL pointing at the running db
python scripts/seed_history.py            # 24h of samples, every 5 minutes
python scripts/seed_history.py --clear    # wipe existing rows first, then seed
python scripts/seed_history.py --hours 48 --interval-minutes 10
```

### Disabling history collection

Set `ENABLE_HISTORY_COLLECTOR=false` in `backend/.env` to turn off the collector entirely (useful if
you don't have Postgres running and want to silence the startup warning).

---

## Running tests (backend)

```bash
cd backend
source .venv/bin/activate
pytest
```

---

## Linting & formatting

### Backend

```bash
cd backend
black .          # format
ruff check .     # lint
ruff check --fix .
```

### Frontend

```bash
cd frontend
npm run lint     # ESLint
npm run format   # Prettier
```

---

## Available endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/items` | List all items |
| POST | `/api/items` | Create an item |
| GET | `/api/plant/overview` | Current plant status, production, alarms |
| GET | `/api/turbines` | List all turbines |
| GET | `/api/turbines/<id>` | Single turbine detail |
| GET | `/api/turbines/<id>/history` | Per-turbine history (requires Postgres) |
| GET | `/api/reservoir` | Reservoir level & inflow/outflow |
| GET | `/api/market` | Spot price / market data |
| GET | `/api/solar` | Solar panel production |
| GET | `/api/plant/history` | Raw plant history (requires Postgres) |
| GET | `/api/plant/history/hourly` | Hourly-aggregated plant history (requires Postgres) |
| GET | `/api/plant/history/export?hours=N&resolution=hourly\|raw` | CSV export of history (requires Postgres) |

---

## Adding a new feature

### 1 — New backend endpoint

```
backend/app/api/products.py   ← new Blueprint
backend/app/services/product_service.py
```

**`backend/app/api/products.py`**
```python
from flask import Blueprint, jsonify

products_bp = Blueprint("products", __name__)

@products_bp.get("/products")
def list_products():
    return jsonify({"products": []}), 200
```

Register it in **`backend/app/__init__.py`**:
```python
from .api.products import products_bp
app.register_blueprint(products_bp, url_prefix="/api")
```

### 2 — New frontend page

```
frontend/src/features/products/ProductsPage.tsx
frontend/src/services/productsService.ts
frontend/src/features/products/hooks/useProducts.ts
```

Register the route in **`frontend/src/routes/index.tsx`**:
```tsx
{ path: 'products', element: <ProductsPage /> }
```

Add a nav link in **`frontend/src/components/ui/PageHeader.tsx`**:
```tsx
{ path: '/products', label: 'Products' }
```

---

## Architectural decisions

| Decision | Rationale |
|----------|-----------|
| Flask Blueprints | Keeps each resource self-contained; easy to move to a separate service later |
| App factory (`create_app`) | Enables different configs for dev/test/prod without module-level side effects |
| Vite proxy in dev | Avoids CORS issues locally; production uses nginx to proxy `/api/*` |
| Feature-based folder structure | Related code lives together; scales better than layer-based (`controllers/`, `services/`) |
| In-memory store in example service | Removes database dependency from the template; one file to swap when adding persistence |
| Designsystemet | Norwegian public-sector design system; accessible components with consistent tokens |

---

## Persistence layer

Historical plant/turbine data is already persisted to Postgres via `psycopg2` (no ORM) — see
[Database (Postgres) for local development](#database-postgres-for-local-development) to run it.

- `backend/app/services/history_service.py` — connection pool, `init_db()` (creates/upgrades the
  `plant_snapshots` and `turbine_snapshots` tables), `record_snapshot()`, `get_history()`,
  `get_hourly_history()`, `get_turbine_history()`.
- `backend/app/__init__.py` — starts a `BackgroundScheduler` job that calls `record_snapshot()` every
  60s; if `DATABASE_URL` is unset or unreachable, this logs a warning and disables itself instead of
  crashing the app.
- The `ExampleService`/`/api/items` resource is unrelated and still uses an in-memory store — a good
  reference if you want to add a *new* database-backed resource from scratch:
  1. Define any new tables/migrations alongside `history_service.py`'s `init_db()`
  2. Add query functions to a service module
  3. Call them from a new Blueprint in `backend/app/api/`

---

## Adding authentication

The architecture is ready for it:

- Add a `POST /api/auth/login` blueprint
- Issue JWTs and verify them with a `@require_auth` decorator applied to protected routes
- Store the token in `localStorage` or an `httpOnly` cookie
- Add an Axios request interceptor in `frontend/src/services/api.ts` to attach the token
