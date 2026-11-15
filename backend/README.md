# kharcha.party backend

Dynamic TypeScript backend for the `kharcha.party` mobile app. It uses Fastify, SQLite, JWT member sessions, Zod validation, and WebSocket group events. SQLite keeps local setup instant; persistence is real and stored in `data/kharcha-party.db`.

## Start

```bash
cp .env.example .env
npm install
npm run dev
```

The API runs at `http://localhost:4000`. Check it with:

```bash
curl http://localhost:4000/health
```

## Create a group

```bash
curl -X POST http://localhost:4000/api/v1/groups \
  -H 'Content-Type: application/json' \
  -d '{"name":"Hunza Scene 2026","creatorName":"Ali","memberNames":["Sara","Hamza","You"]}'
```

The response includes a creator `token`, `group.id`, shared `group.code`, and a separate 4-digit `inviteCode` beside every member. Share each personal code only with its matching member.

Members log in with the shared group code and their personal 4-digit code:

```bash
curl -X POST http://localhost:4000/api/v1/auth/invite \
  -H 'Content-Type: application/json' \
  -d '{"groupCode":"KHP-ABC123","inviteCode":"0427"}'
```

The login response contains that member's JWT. Send it on protected requests:

```bash
curl http://localhost:4000/api/v1/groups/GROUP_ID/dashboard \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## API map

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/groups` | Create a trip and invited members |
| `POST` | `/api/v1/auth/invite` | Login with group code + personal 4-digit code |
| `POST` | `/api/v1/groups/join` | Backwards-compatible alias for invitation login |
| `GET` | `/api/v1/groups/:groupId` | Group and members |
| `POST` | `/api/v1/groups/:groupId/members` | Add invited members |
| `POST` | `/api/v1/groups/:groupId/members/:memberId/invite-code/reset` | Leader rotates a lost personal code |
| `POST` | `/api/v1/groups/:groupId/votes` | Cast or update the current round vote |
| `PUT` | `/api/v1/groups/:groupId/budget` | Propose individual/group budget |
| `POST` | `/api/v1/groups/:groupId/budget/lock` | Leader locks proposed budget |
| `GET/POST` | `/api/v1/groups/:groupId/expenses` | List or submit expenses |
| `PATCH` | `/api/v1/groups/:groupId/expenses/:expenseId/status` | Leader approves/rejects an expense |
| `GET/POST` | `/api/v1/groups/:groupId/voice-logs` | List or parse transcribed voice entries |
| `GET` | `/api/v1/groups/:groupId/dashboard` | Aggregated dynamic dashboard |
| `GET` | `/api/v1/groups/:groupId/settlements` | Calculated minimal payments |
| `WS` | `/api/v1/groups/:groupId/events?token=...` | Realtime group updates |

Invitation codes are never stored as plaintext: the database keeps a group-scoped HMAC hash. Plain 4-digit codes are returned only when members are created or a leader resets a code. Login attempts are rate-limited.

All money is stored as integer PKR. A leader-created expense is approved immediately; a traveller-created expense remains pending until the leader approves it. Settlement calculations use approved expense splits only.

## Commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check
```

## Project structure

- `src/app.ts` — application composition, plugins, errors, lifecycle
- `src/db/` — SQLite schema and repository boundary
- `src/modules/groups/` — groups, members, voting, and budgets
- `src/modules/expenses/` — expenses, approval flow, and voice parsing
- `src/modules/settlements/` — balance and minimum-payment calculation
- `src/modules/realtime/` — authenticated WebSocket updates

For production, set a strong `JWT_SECRET`, restrict `CORS_ORIGIN`, run behind TLS, and move the repository implementation to managed PostgreSQL when horizontal scaling is required. The domain and route layers do not depend directly on SQLite.
