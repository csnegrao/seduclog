# AlmoxarifadoEdu — Sistema de Gestão de Almoxarifado SEDUC

Sistema web completo para gerenciamento de almoxarifado da Secretaria de Educação (SEDUC), com controle de estoque, pedidos, separação, entregas com rastreamento e assinatura digital.

## Stack Tecnológica

| Camada | Tecnologias |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Banco | MariaDB/MySQL + Prisma ORM |
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

## Implantação em Produção

### Pré-requisitos do Servidor

- Sistema operacional: Ubuntu 22.04 LTS (ou equivalente)
- [Docker Engine 24+](https://docs.docker.com/engine/install/) e Docker Compose v2 (`docker compose`)
- `git`
- Mínimo recomendado: 2 GB RAM · 20 GB de disco
- Portas `80`, `443` e `3306` liberadas no firewall (443 somente se usar HTTPS)

### 1. Clonar o Repositório

```bash
git clone https://github.com/csnegrao/seduclog.git
cd seduclog
```

### 2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Gere senhas seguras antes de editar o arquivo:

```bash
echo "DB_PASSWORD=$(openssl rand -hex 16)"
echo "DB_ROOT_PASSWORD=$(openssl rand -hex 16)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
```

Edite `.env` substituindo **todos** os valores de exemplo pelas strings geradas:

```env
# Application
APP_ENV=production
APP_DEBUG=false
APP_URL=https://seu-dominio.com       # URL pública da aplicação

# MariaDB / MySQL Database
DB_HOST=mariadb
DB_PORT=3306
DB_DATABASE=seduclog
DB_USERNAME=seduclog_user
DB_PASSWORD=cole_aqui_o_valor_gerado
DB_ROOT_PASSWORD=cole_aqui_o_valor_gerado

# Backend API
JWT_SECRET=cole_aqui_o_valor_gerado
JWT_EXPIRES_IN=7d
NODE_ENV=production
CORS_ORIGIN=https://seu-dominio.com   # mesmo valor de APP_URL
```

> ⚠️ **Nunca** faça commit do arquivo `.env` em repositórios públicos.

### 3. Build do Frontend

O React precisa ser compilado para arquivos estáticos antes da implantação:

```bash
cd frontend
npm ci
# Opcional: defina a chave do Google Maps antes do build
# export VITE_GOOGLE_MAPS_KEY=sua_chave_aqui
npm run build
cd ..
```

Os arquivos gerados ficam em `frontend/dist/` e serão servidos pelo LiteSpeed.

### 4. Subir a Stack em Produção

Use o override de produção que ajusta o backend para `NODE_ENV=production`,
compila o TypeScript e executa as migrações automaticamente:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Aguarde os serviços iniciarem e verifique os logs:

```bash
docker compose logs -f backend   # aguarde "Server is running on port 3001"
docker compose logs -f litespeed
```

### 5. Verificar a Implantação

| Serviço | URL padrão |
|---------|-----------|
| Aplicação | `http://seu-dominio.com` |
| API | `http://seu-dominio.com/api/auth/login` |
| LiteSpeed WebAdmin | `http://seu-servidor:7080` |

Faça login com as credenciais iniciais da tabela [Credenciais de Teste](#credenciais-de-teste-após-seed) e **altere as senhas imediatamente** após o primeiro acesso.

### 6. Popular o Banco (seed inicial — opcional)

Execute o seed apenas se quiser usuários e dados de demonstração:

```bash
docker compose exec backend npx ts-node prisma/seed.ts
```

### Configuração de HTTPS (Recomendado)

Para habilitar HTTPS com certificado gratuito via Let's Encrypt, acesse o painel LiteSpeed WebAdmin (`http://seu-servidor:7080`, credenciais padrão: `admin` / `123456`) e siga:

> ⚠️ **Altere imediatamente** a senha do WebAdmin após o primeiro acesso em **Preferences → Change Password**.

1. **Listeners** → Adicione um listener na porta 443 com SSL habilitado
2. **Virtual Hosts** → Ative o certificado Let's Encrypt pelo assistente integrado
3. Adicione regra de redirecionamento HTTP → HTTPS no listener da porta 80

Mais detalhes: [Documentação LiteSpeed — Let's Encrypt](https://docs.litespeedtech.com/lsws/config/ssl/).

### Comandos Úteis de Manutenção

```bash
# Ver status dos containers
docker compose ps

# Reiniciar apenas o backend
docker compose restart backend

# Executar migrações manualmente
docker compose exec backend npx prisma migrate deploy

# Fazer backup do banco de dados
docker compose exec mariadb sh -c \
  "mysqldump -u root -p\$MARIADB_ROOT_PASSWORD seduclog" > backup_$(date +%F).sql

# Atualizar a aplicação
git pull
cd frontend && npm ci && npm run build && cd ..
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build backend
```

---

## Início Rápido (desenvolvimento local, sem Docker)

### 1. Pré-requisitos

- Node.js 18+
- npm
- MariaDB 11 (ou MySQL 8) instalado e em execução localmente

### 2. Banco de dados

Crie o banco de dados e o usuário no MariaDB/MySQL local:

```sql
CREATE DATABASE seduclog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'seduclog_user'@'localhost' IDENTIFIED BY 'your_password_here';
GRANT ALL PRIVILEGES ON seduclog.* TO 'seduclog_user'@'localhost';
FLUSH PRIVILEGES;
```

> **Dica:** você pode executar o script `docker/mariadb/init.sql` para criar as tabelas iniciais:
> ```bash
> mysql -u root -p seduclog < docker/mariadb/init.sql
> ```

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edite .env e defina DATABASE_URL com a senha escolhida, p. ex.:
# DATABASE_URL="mysql://seduclog_user:your_password_here@127.0.0.1:3306/seduclog"

npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

O backend ficará disponível em http://localhost:3001.

### 4. Frontend

```bash
cd frontend
# Opcional: crie .env.local com VITE_GOOGLE_MAPS_KEY=sua_chave

npm install
npm run dev
```

O frontend ficará disponível em http://localhost:5173

---

## Desenvolvimento com Docker (alternativa)

Se preferir subir o banco de dados via Docker e rodar o backend/frontend localmente:

```bash
# Apenas o banco de dados
docker compose up -d mariadb
```

Depois siga os passos 3 e 4 acima.

Para subir **toda** a stack via Docker:

```bash
cp .env.example .env
# Edite .env com suas credenciais
docker compose up -d
```

Acesse `http://localhost` no navegador.  
O painel de administração do LiteSpeed está disponível em `http://localhost:7080`.

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
DATABASE_URL="mysql://seduclog_user:your_password_here@127.0.0.1:3306/seduclog"
JWT_SECRET="seu-segredo-jwt-aqui"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
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
