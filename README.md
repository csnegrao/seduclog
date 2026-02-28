# Seduclog

> Applicativo de acompanhamento e gerenciamento de entregas de materiais escolares — SEDUC/CE

Seduclog is a full-stack logistics tracking application that manages material requests, warehouse operations, driver deliveries, real-time notifications, and in-request messaging for a school supply distribution network.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Running Locally (without Docker)](#running-locally-without-docker)
- [Running with Docker](#running-with-docker)
- [API Endpoint Summary](#api-endpoint-summary)
- [User Roles](#user-roles)

---

## Features

- **Authentication** — JWT access/refresh token pair; role-based authorization
- **Material Requests** — create, approve, cancel with full history trail
- **Warehouse Operations** — delivery order creation, picklist, stock movements, inventory sessions
- **Driver App** — order pickup, GPS location tracking, occurrence reporting, delivery confirmation with signature
- **Real-time Tracking** — Socket.io for live driver location and ETA updates
- **Notifications** — automatic in-app notifications for request/delivery lifecycle events
- **Messaging** — per-request chat thread between requester and warehouse team
- **Reports Dashboard** — delivery performance, stock levels, driver KPIs, divergence report (manager/admin)
- **Security** — Helmet security headers, rate limiting (express-rate-limit), Zod input validation on all mutations

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 18, TypeScript, Tailwind CSS, Recharts, Socket.io-client |
| Backend   | Node.js 20, Express 4, TypeScript, Socket.io 4 |
| Validation| Zod 4                                           |
| Auth      | jsonwebtoken, bcrypt                            |
| Security  | Helmet, express-rate-limit                      |
| Database  | In-memory (production: PostgreSQL via Prisma)   |
| Testing   | Jest, Supertest                                 |
| Container | Docker, Docker Compose, nginx                   |

---

## Project Structure

```
seduclog/
├── backend/
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # authenticate, authorize, validate
│   │   ├── models/        # In-memory data stores
│   │   ├── routes/        # Express routers
│   │   ├── schemas/       # Zod validation schemas
│   │   ├── types/         # Shared TypeScript types
│   │   ├── utils/         # JWT, Socket.io helpers, notifications
│   │   ├── app.ts         # Express app factory
│   │   └── server.ts      # HTTP + Socket.io server entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # React UI components
│   │   ├── contexts/      # AuthContext
│   │   ├── hooks/         # Custom React hooks
│   │   └── types/         # TypeScript interfaces
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable                  | Required | Default        | Description                                          |
|---------------------------|----------|----------------|------------------------------------------------------|
| `POSTGRES_USER`           | No       | `seduclog`     | PostgreSQL username                                  |
| `POSTGRES_PASSWORD`       | Yes      | —              | PostgreSQL password                                  |
| `POSTGRES_DB`             | No       | `seduclog`     | PostgreSQL database name                             |
| `DATABASE_URL`            | No       | —              | Full Prisma connection string (future migration)     |
| `JWT_ACCESS_SECRET`       | Yes      | —              | Secret for signing access tokens (≥64 random chars)  |
| `JWT_REFRESH_SECRET`      | Yes      | —              | Secret for signing refresh tokens (≥64 random chars) |
| `JWT_ACCESS_EXPIRES_IN`   | No       | `15m`          | Access token expiry duration                         |
| `JWT_REFRESH_EXPIRES_IN`  | No       | `7d`           | Refresh token expiry duration                        |
| `PORT`                    | No       | `3001`         | API server port                                      |
| `FRONTEND_URL`            | No       | `*`            | Allowed CORS origin for Socket.io                    |
| `GOOGLE_MAPS_API_KEY`     | No       | _(empty)_      | Enables real ETA calculation via Distance Matrix API |
| `REACT_APP_API_BASE`      | No       | `http://localhost:3001` | Frontend API base URL (empty = nginx proxy) |

---

## Running Locally (without Docker)

### Prerequisites

- Node.js ≥ 20
- npm ≥ 9

### Backend

```bash
cd backend
cp ../.env.example .env   # edit the JWT secrets at minimum
npm install
npm run dev               # starts ts-node-dev on port 3001
```

### Frontend

```bash
cd frontend
# Set REACT_APP_API_BASE=http://localhost:3001 in .env or shell
npm install
npm start                 # starts React dev server on port 3000
```

### Run backend tests

```bash
cd backend
npm test
```

---

## Running with Docker

### Prerequisites

- Docker ≥ 24
- Docker Compose ≥ 2

### Start all services

```bash
# 1. Copy and edit environment variables
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

# 2. Build and start
docker compose up --build

# The app is available at:
#   Frontend: http://localhost
#   API:      http://localhost:3001
```

### Stop

```bash
docker compose down
```

### Remove volumes (full reset)

```bash
docker compose down -v
```

---

## API Endpoint Summary

All API routes are prefixed with `/api`.

### Authentication

| Method | Path               | Auth     | Description                          |
|--------|--------------------|----------|--------------------------------------|
| POST   | `/auth/login`      | —        | Login with email + password          |
| POST   | `/auth/refresh`    | —        | Exchange refresh token for new pair  |
| GET    | `/auth/me`         | Bearer   | Return current user profile          |

### Material Requests

| Method | Path                        | Roles                       | Description                      |
|--------|-----------------------------|-----------------------------|----------------------------------|
| POST   | `/requests`                 | requester                   | Create a request                 |
| GET    | `/requests`                 | all authenticated           | List requests (filtered)         |
| GET    | `/requests/:id`             | all authenticated           | Request detail                   |
| GET    | `/requests/:id/tracking`    | all authenticated           | Real-time tracking info          |
| PATCH  | `/requests/:id/approve`     | warehouse_operator, admin   | Approve request                  |
| PATCH  | `/requests/:id/cancel`      | requester (own), warehouse, admin | Cancel request             |

### Warehouse

| Method | Path                                    | Roles                     | Description                       |
|--------|-----------------------------------------|---------------------------|-----------------------------------|
| GET    | `/warehouse/queue`                      | warehouse_operator, admin | Pending/approved request queue    |
| POST   | `/warehouse/orders`                     | warehouse_operator, admin | Create delivery order             |
| PATCH  | `/warehouse/orders/:id/start-picking`   | warehouse_operator, admin | Mark order as picking             |
| GET    | `/warehouse/stock`                      | warehouse_operator, admin | Full product stock list           |
| GET    | `/warehouse/stock/alerts`               | warehouse_operator, admin | Low-stock products                |
| POST   | `/warehouse/stock/movement`             | warehouse_operator, admin | Register stock entry              |
| POST   | `/warehouse/inventory`                  | warehouse_operator, admin | Start inventory session           |
| PATCH  | `/warehouse/inventory/:id/reconcile`    | warehouse_operator, admin | Submit physical counts            |
| GET    | `/warehouse/drivers`                    | warehouse_operator, admin | Available drivers and vehicles    |

### Driver

| Method | Path                              | Roles         | Description                       |
|--------|-----------------------------------|---------------|-----------------------------------|
| GET    | `/driver/orders`                  | driver, admin | List assigned orders              |
| PATCH  | `/driver/orders/:id/pickup`       | driver, admin | Confirm warehouse pickup          |
| POST   | `/driver/orders/:id/location`     | driver, admin | Update GPS position               |
| POST   | `/driver/orders/:id/occurrence`   | driver, admin | Register route occurrence         |
| POST   | `/driver/orders/:id/deliver`      | driver, admin | Final delivery confirmation       |

### Reports (manager/admin only)

| Method | Path                           | Description                         |
|--------|--------------------------------|-------------------------------------|
| GET    | `/reports/summary`             | Request counts and daily volumes    |
| GET    | `/reports/deliveries`          | On-time rate and delivery averages  |
| GET    | `/reports/stock`               | Stock levels and top products       |
| GET    | `/reports/driver-performance`  | Per-driver KPIs                     |
| GET    | `/reports/divergences`         | Orders with missing/partial items   |

### Notifications

| Method | Path                          | Auth     | Description                              |
|--------|-------------------------------|----------|------------------------------------------|
| GET    | `/notifications`              | Bearer   | List user notifications (unread first)   |
| PATCH  | `/notifications/read-all`     | Bearer   | Mark all notifications as read           |

### Messages

| Method | Path                     | Roles                                        | Description              |
|--------|--------------------------|----------------------------------------------|--------------------------|
| GET    | `/messages/:requestId`   | requester (own), warehouse, manager, admin   | Load message thread      |
| POST   | `/messages/:requestId`   | requester (own), warehouse, manager, admin   | Send message in thread   |

### Health

| Method | Path      | Description       |
|--------|-----------|-------------------|
| GET    | `/health` | API health check  |

---

## User Roles

| Role                | Description                                         |
|---------------------|-----------------------------------------------------|
| `admin`             | Full access to all endpoints                        |
| `manager`           | Reports and read-only access to all data            |
| `warehouse_operator`| Warehouse operations, approve/dispatch requests     |
| `driver`            | View and update assigned delivery orders            |
| `requester`         | Create and track own material requests              |
| `viewer`            | Read-only access                                    |

### Default seed users (development only)

| Email                       | Password       | Role                |
|-----------------------------|----------------|---------------------|
| `admin@seduclog.com`        | `admin123`     | admin               |
| `manager@seduclog.com`      | `manager123`   | manager             |
| `warehouse@seduclog.com`    | `warehouse123` | warehouse_operator  |
| `driver@seduclog.com`       | `driver123`    | driver              |
| `requester@seduclog.com`    | `requester123` | requester           |

> ⚠️ **These are seed credentials for development only. Change all secrets before deploying to production.**
# seduclog
Applicativo de acompanhamento e gerenciamento de entregas.

## Stack de produção

| Componente  | Tecnologia          |
|-------------|---------------------|
| Web server  | LiteSpeed           |
| Banco de dados | MariaDB          |
| Linguagem   | PHP 8+              |

## Configuração rápida (desenvolvimento local com Docker)

1. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
2. Edite `.env` com as suas credenciais.

3. Suba os containers:
   ```bash
   docker compose up -d
   ```

4. Acesse `http://localhost` no navegador.  
   O painel de administração do LiteSpeed está disponível em `http://localhost:7080`.

## Implantação em produção (LiteSpeed + MariaDB)

1. Copie os arquivos da aplicação para o diretório raiz do virtual host configurado no LiteSpeed.
2. Copie `.env.example` para `.env` e preencha as variáveis com os dados reais do servidor.
3. Execute o script de inicialização do banco:
   ```bash
   mysql -u root -p seduclog < docker/mariadb/init.sql
   ```
4. Certifique-se de que o LiteSpeed está configurado para carregar `.htaccess`
   (`autoLoadHtaccess` habilitado no virtual host).
5. O arquivo `.htaccess` na raiz do projeto faz o roteamento para `index.php` e
   aplica cabeçalhos de segurança.

## Variáveis de ambiente

| Variável       | Descrição                         | Padrão         |
|----------------|-----------------------------------|----------------|
| `DB_HOST`      | Host do MariaDB                   | `127.0.0.1`    |
| `DB_PORT`      | Porta do MariaDB                  | `3306`         |
| `DB_DATABASE`  | Nome do banco de dados            | `seduclog`     |
| `DB_USERNAME`  | Usuário do banco                  | `seduclog_user`|
| `DB_PASSWORD`  | Senha do banco                    | _(obrigatório)_|
# AlmoxarifadoEdu — Sistema de Gestão de Almoxarifado SEDUC

Sistema web completo para gerenciamento de almoxarifado da Secretaria de Educação (SEDUC), com controle de estoque, pedidos, separação, entregas com rastreamento e assinatura digital.

## Stack Tecnológica

| Camada | Tecnologias |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Banco | PostgreSQL + Prisma ORM |
| Real-time | Socket.io |
| Auth | JWT + RBAC |
| Mapas | Google Maps API |
| Assinatura | signature_pad |
| Offline | Service Workers + IndexedDB |

## Perfis de Usuário

| Perfil | Acesso |
|--------|--------|
| `ADMIN` | Acesso completo ao sistema |
| `WAREHOUSE_OPERATOR` | Estoque, separação e despacho |
| `DRIVER` | Rotas de entrega e assinatura |
| `REQUESTER` | Solicitação e acompanhamento de pedidos |
| `MANAGER` | Dashboard e relatórios (somente leitura) |

## Início Rápido

### 1. Pré-requisitos
- Node.js 18+
- Docker & Docker Compose
- npm

### 2. Subir o banco de dados
```bash
docker-compose up -d
```

### 3. Backend
```bash
cd backend
cp .env.example .env
# Edite .env com suas configurações

npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

### 4. Frontend
```bash
cd frontend
# Crie .env.local com VITE_GOOGLE_MAPS_KEY=sua_chave (opcional)

npm install
npm run dev
```

Acesse: http://localhost:5173

## Credenciais de Teste (após seed)

| Usuário | E-mail | Senha |
|---------|--------|-------|
| Admin | admin@seduc.gov.br | admin123 |
| Operador | operador@seduc.gov.br | operador123 |
| Motorista | motorista@seduc.gov.br | motorista123 |
| Solicitante | diretor@escola.gov.br | diretor123 |
| Gestor | gestor@seduc.gov.br | gestor123 |

## Variáveis de Ambiente

### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://seduclog:seduclog_pass@localhost:5432/seduclog_db"
JWT_SECRET="seu-segredo-jwt-aqui"
JWT_EXPIRES_IN="7d"
PORT=3001
CORS_ORIGIN="http://localhost:5173"
```

### Frontend (`frontend/.env.local`)
```env
VITE_GOOGLE_MAPS_KEY="sua-api-key-google-maps"
```

## Endpoints da API

- `POST /api/auth/login` — Autenticação
- `GET  /api/auth/me` — Usuário autenticado
- `GET|POST /api/users` — Gestão de usuários (ADMIN)
- `GET|POST /api/stock/materials` — Materiais
- `GET|POST /api/stock/movements` — Movimentações de estoque
- `GET|POST /api/requests` — Pedidos de material
- `PATCH /api/requests/:id/status` — Atualizar status
- `GET|POST /api/orders` — Ordens de separação
- `GET|POST /api/deliveries` — Entregas
- `POST /api/deliveries/:id/signature` — Assinatura digital
- `GET /api/stock/reports/dashboard` — KPIs do dashboard

## Funcionalidades

- ✅ Autenticação JWT com RBAC (5 perfis)
- ✅ Gestão completa de estoque com alertas de nível mínimo
- ✅ Fluxo kanban: Pendente → Aprovado → Separação → Pronto → Despachado → Entregue
- ✅ Rastreamento de entregas em tempo real (Socket.io)
- ✅ Integração Google Maps para exibição de rotas
- ✅ Assinatura digital com `signature_pad`
- ✅ Suporte offline para motoristas (Service Worker + IndexedDB)
- ✅ Interface mobile-first responsiva com Tailwind CSS
- ✅ Dashboard com KPIs em tempo real
