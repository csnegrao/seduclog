# seduclog
Aplicativo de acompanhamento e gerenciamento de entregas

## Features — PASSO 7: Rastreamento em Tempo Real

### Backend (`/backend`)
- **Socket.io** server with rooms per `deliveryOrderId` (`delivery:{id}`)
- Drivers join their delivery room and broadcast location updates
- Status changes are broadcast to all room subscribers
- `GET /api/requests/:id/tracking` — returns current driver position, ETA, and order status
- `PUT /api/requests/:id/tracking` — set the delivery destination
- `GET /api/notifications/vapid-public-key` — public VAPID key for Web Push
- `POST /api/notifications/subscribe` — save a push subscription
- `POST /api/notifications/unsubscribe` — remove a push subscription

### Frontend (`/frontend`)
- **RequestDetail** page with embedded real-time tracking screen
- **TrackingMap** — Google Maps component showing: destination pin (📦), driver marker (🚚), route polyline
- **ETADisplay** — ETA updated in real-time from `driver:location` socket events
- **StatusTimeline** — steps: Pedido Aprovado → Coletando → Despachado → Chegando → Entregue
- **NotificationPermission** — prompt on first access to allow push notifications
- **Service Worker** (`/public/sw.js`) for handling incoming push notifications

## Quick Start

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Configure environment

**Backend** — copy `backend/.env.example` to `backend/.env` and set VAPID keys:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your VAPID keys (generate with: node -e "const wp=require('web-push');console.log(wp.generateVAPIDKeys())")
```

**Frontend** — copy `frontend/.env.example` to `frontend/.env.local`:
```bash
cp frontend/.env.example frontend/.env.local
# Add your VITE_GOOGLE_MAPS_API_KEY
```

### 3. Run

```bash
# Terminal 1 — backend (port 3001)
npm run start:backend

# Terminal 2 — frontend (port 5173)
npm run start:frontend
```

Open http://localhost:5173?orderId=my-order-1&userId=my-user-1

### 4. Run tests

```bash
npm test
```

## Socket Events

| Event | Direction | Payload |
|---|---|---|
| `driver:join` | client → server | `{ deliveryOrderId, driverId, destination }` |
| `requester:join` | client → server | `{ deliveryOrderId }` |
| `driver:location` | client → server | `{ deliveryOrderId, lat, lng, eta }` |
| `driver:status` | client → server | `{ deliveryOrderId, status }` |
| `delivery:updated` | server → room | Full delivery object |
| `driver:location` | server → room | `{ driverLocation, eta }` |
| `delivery:status` | server → room | `{ status }` |

