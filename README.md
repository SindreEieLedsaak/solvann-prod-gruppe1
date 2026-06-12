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

## Quick start (local, no Docker)

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

## Adding a database

1. Add `flask-sqlalchemy` and `alembic` to `requirements.txt`
2. Set `DATABASE_URL` in `.env`
3. Define models in `backend/app/models/`
4. Initialize the extension in `create_app()` in `backend/app/__init__.py`
5. Replace the in-memory store in `ExampleService` with a repository that queries the database

---

## Adding authentication

The architecture is ready for it:

- Add a `POST /api/auth/login` blueprint
- Issue JWTs and verify them with a `@require_auth` decorator applied to protected routes
- Store the token in `localStorage` or an `httpOnly` cookie
- Add an Axios request interceptor in `frontend/src/services/api.ts` to attach the token
