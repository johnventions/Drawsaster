# Drawsaster
A telephone-style drawing party game. Players write a phrase, the next player draws it, the next captions the drawing, and so on. At the end everyone sees how far each phrase drifted.

- **Frontend:** Vue 3 + Vite, Vuex, Sass (`src/`)
- **Server:** TypeScript on Node 24 (run directly, no build step), Express 5 + Socket.IO 4 (`server/src/`)
- **Shared types:** `shared/protocol.ts` (socket events and API payloads)

## How it works
- **Game state lives in server memory** (`GameStore`). The server assigns every turn: players are shuffled into seats, and step *s* of chain *c* belongs to seat *(c + s) mod N*. Clients only submit what they were asked for.
- **Clients** keep `{ code, playerId, token }` in `localStorage` and send `session:resume` on every connect, so reloads and dropped connections rejoin the same game. The server pushes a full `game:state` snapshot to each player after every change.
- **Turns** are submitted with `PUT /api/games/:code/chains/:chain/steps/:step` (raw PNG for drawings, JSON for text). Retries are safe.
- **Images and finished-game summaries** are stored in S3 (or on local disk in development), under a prefix per environment: `<APP_ENV>/games/<gameId>/...`. Chat drawings are only relayed, never stored.
- **The host** can skip a player who is away; the chain continues from the last real step.

Because games are in memory, run a **single server instance**; restarting it ends games in progress (finished summaries survive in storage).

## Requirements
Node.js 24.11 or newer. No database.

## Development
```
npm install
npm run dev
```
This runs Vite on http://localhost:8080 and the API on port 5050 (Vite proxies `/api` and `/socket.io`). Images are written to `./storage/dev/`.

Copy `.env.example` to `.env` to change settings.

```
npm test           # server unit + integration tests (node:test)
npm run typecheck  # tsc --noEmit on server and shared code
npm run lint       # ESLint on the frontend
```

## Production
```
npm run build      # builds the frontend into dist/
npm start          # serves dist/ and the API on $PORT
```

| Variable | Default | |
|---|---|---|
| `APP_ENV` | `dev` | Storage prefix, e.g. `staging`, `prod` |
| `PORT` | `5050` | |
| `IMAGE_STORE` | `local` | `local` or `s3` |
| `S3_BUCKET` | | Required for `s3` |
| `AWS_REGION` | `us-east-1` | Credentials come from the standard AWS chain |
| `S3_ENDPOINT` | | Optional S3-compatible endpoint for testing |
| `MIN_PLAYERS` | `3` | |
| `IDLE_GAME_MINUTES` | `360` | Unfinished games are removed after this long idle |
| `FINISHED_GAME_MINUTES` | `60` | Finished games leave memory after this (summary stays in storage) |

The S3 bucket should be private; the server hands out short-lived signed URLs. Add a lifecycle rule per prefix to expire old drawings (for example `dev/` after 1 day, `prod/` after 30 days).
