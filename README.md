# SeducLog

**SeducLog** is a delivery tracking and management application (aplicativo de acompanhamento e gerenciamento de entregas) built with:

- **Backend** — Node.js · Express · Prisma (PostgreSQL) · Socket.io · JWT
- **Frontend** — React (Vite) · Axios · Socket.io-client

---

## Table of Contents

1. [Project Description](#project-description)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Environment Variables](#environment-variables)
5. [Running Locally](#running-locally)
6. [Running with Docker](#running-with-docker)
7. [API Endpoint Summary](#api-endpoint-summary)
8. [Running Tests](#running-tests)

---

## Project Description

SeducLog enables educational institutions (SEDUC) to manage logistics requests end-to-end:

- Requesters submit supply/delivery requests.
- Warehouse operators approve, reject, or dispatch orders.
- Drivers update order status and ETA in real time.
- All parties receive instant notifications and can chat inside each request thread.

---

## Features

- **Authentication** — JWT-based register/login with role-based access control (REQUESTER · WAREHOUSE_OPERATOR · DRIVER · ADMIN)
- **Requests** — Create, view, and update delivery requests
- **Orders** — Dispatch and track orders with driver ETA
- **Stock management** — Track inventory with automatic low-stock alerts
- **Notifications** — Real-time push notifications for key events (request approved/rejected, order dispatched, driver arriving, delivery confirmed, stock below minimum)
- **Messaging** — In-request chat thread between requesters and warehouse operators, with real-time Socket.io delivery
- **Input validation** — Zod schemas on every POST/PATCH endpoint
- **Rate limiting** — express-rate-limit (100 req/min general, 20 req/15 min for auth)

---

## Architecture

```
seduclog/
├── backend/          # Express API + Prisma
│   ├── prisma/       # Schema & migrations
│   └── src/
│       ├── controllers/
│       ├── middleware/   # auth.js, validate.js
│       ├── routes/
│       ├── schemas/      # Zod schemas
│       ├── services/     # notificationService.js
│       ├── app.js
│       ├── socket.js
│       └── index.js
├── frontend/         # React + Vite
│   └── src/
│       ├── api/
│       ├── components/   # NotificationBell, NotificationPanel, MessageThread
│       ├── contexts/     # AuthContext, SocketContext, NotificationContext
│       └── pages/        # LoginPage, RequestList, RequestDetail
├── docker-compose.yml
└── .env.example
```

---

## Environment Variables

Copy the root `.env.example` to `.env` and fill in every value:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `POSTGRES_USER` | DB username (docker-compose) | `seduclog` |
| `POSTGRES_PASSWORD` | DB password (docker-compose) | — |
| `POSTGRES_DB` | Database name (docker-compose) | `seduclog` |
| `JWT_SECRET` | Secret key for signing JWT tokens | — |
| `PORT` | Port the API listens on | `4000` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost` |
| `VITE_API_URL` | API base URL used by the browser | `http://localhost:4000` |

> **Tip:** Generate a strong `JWT_SECRET` with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

## Running Locally

### Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14 (or start one with `docker compose up -d postgres`)

### Backend

```bash
cd backend

# Install dependencies
npm install

# Copy and edit the environment file
cp .env.example .env
# → set DATABASE_URL, JWT_SECRET

# Run database migrations
npm run db:migrate

# Start the development server (with hot-reload)
npm run dev
# API available at http://localhost:4000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and edit the environment file
cp .env.example .env
# → set VITE_API_URL=http://localhost:4000

# Start the Vite dev server
npm run dev
# App available at http://localhost:5173
```

---

## Running with Docker

```bash
# Copy and edit the root env file
cp .env.example .env
# → set POSTGRES_PASSWORD and JWT_SECRET (at minimum)

# Build and start all services (postgres, api, frontend)
docker compose up --build

# The application is available at http://localhost
# The API is also accessible at http://localhost:4000
```

To stop:

```bash
docker compose down
# To also remove the database volume:
docker compose down -v
```

---

## API Endpoint Summary

All protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Login and receive a JWT |

### Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | ✅ | List user's notifications (unread first) |
| PATCH | `/api/notifications/read-all` | ✅ | Mark all notifications as read |

### Requests

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/requests` | ✅ | All | List requests (operators/admins see all) |
| GET | `/api/requests/:id` | ✅ | All | Get a single request |
| POST | `/api/requests` | ✅ | REQUESTER, ADMIN | Create a request |
| PATCH | `/api/requests/:id/status` | ✅ | WAREHOUSE_OPERATOR, ADMIN | Update request status |

### Orders

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/orders` | ✅ | All | List orders |
| POST | `/api/orders` | ✅ | WAREHOUSE_OPERATOR, ADMIN | Create an order |
| PATCH | `/api/orders/:id/status` | ✅ | DRIVER, WAREHOUSE_OPERATOR, ADMIN | Update order status / ETA |

### Stock

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/stock` | ✅ | All | List stock items |
| POST | `/api/stock` | ✅ | WAREHOUSE_OPERATOR, ADMIN | Create a stock item |
| PATCH | `/api/stock/:id` | ✅ | WAREHOUSE_OPERATOR, ADMIN | Update stock quantity |

### Messages

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/messages/:requestId` | ✅ | All | Load message thread for a request |
| POST | `/api/messages/:requestId` | ✅ | REQUESTER, WAREHOUSE_OPERATOR | Send a message in a thread |

### Socket.io Events

| Event | Direction | Description |
|---|---|---|
| `notification:new` | Server → Client | New notification for the user |
| `message:new` | Server → Client | New message in a request thread |
| `join:request` | Client → Server | Subscribe to a request's message room |
| `leave:request` | Client → Server | Unsubscribe from a request's message room |

---

## Running Tests

```bash
cd backend

# Ensure the test database exists and migrations are applied:
# DATABASE_URL=postgresql://user:pass@localhost:5432/seduclog_test npx prisma migrate deploy

npm test
```

Tests use [Jest](https://jestjs.io/) + [Supertest](https://github.com/ladjs/supertest) and cover:

- Authentication (register · login · validation errors · duplicate email)
- Request creation (authorization · validation · listing)
- Notifications (list · mark all read · unread ordering)
- Messages (send · receive · role access control)
- Auto-notifications (request approved/rejected · stock below minimum)

