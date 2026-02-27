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
