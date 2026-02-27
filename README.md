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
