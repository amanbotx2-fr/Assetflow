# AssetFlow Frontend

Static multi-page Vite frontend for AssetFlow.

## Architecture

- Entry flow: `index.html` redirects to `login.html`.
- Authenticated pages load through `js/app.js`.
- Shared shell, sidebar, navbar, breadcrumb, profile menu, toast and state helpers live in `js/layout.js`.
- API and session helpers live in `js/api.js`.
- Page renderers live in `js/pages.js`.
- Authentication and registration logic lives in `js/auth.js`.
- Shared styles live in `styles/`.

The legacy React implementation has been removed from the active source. Do not add new React routes for the current static architecture.

## Environment

Create a local frontend environment file when the backend URL differs from the default:

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Backend API base URL used by `js/api.js`. |

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

The Vite server prefers port `3000`, matching the backend CORS example. If that port is busy, Vite will choose the next open port.

Build:

```bash
npm run build
```

Type check:

```bash
npm run lint
```

## Backend Requirements

The frontend expects the backend to be running at `VITE_API_BASE_URL` and uses:

- `POST /api/auth/login`
- `GET /api/auth/registration-options`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- protected module APIs under `/api/dashboard`, `/api/users`, `/api/departments`, `/api/categories`, `/api/assets`, `/api/allocations`, `/api/transfers`, `/api/bookings`, `/api/maintenance`, `/api/audits`, `/api/reports`, and `/api/notifications`.
