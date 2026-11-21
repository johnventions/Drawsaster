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

## Deploying to a droplet (Docker + GitHub Actions)
`.github/workflows/deploy.yml` runs the checks on every pull request. On every push to `master` it also builds an image to `ghcr.io/johnventions/drawsaster` and deploys it over SSH.

The droplet runs **one shared Caddy proxy** (`/opt/proxy`) on ports 80/443 for every project, with automatic HTTPS. Each project:
- runs its containers on the external Docker network `web`, without publishing ports;
- drops a site file in `/opt/proxy/sites/<project>.caddy` that maps its domain to its container;
- reloads Caddy (`docker exec caddy caddy reload --config /etc/caddy/Caddyfile`).

Drawsaster's `deploy/deploy.sh` does all three. Copy that pattern for other projects.

### One-time setup
1. Create an SSH key pair just for deploys (no passphrase).
2. On the droplet, as root: `bash setup-droplet.sh "<deploy public key>"` (from `deploy/`). This creates the `deploy` user, the shared proxy, the `web` network, `/opt/drawsaster` and firewall rules.
3. Add these repository secrets in GitHub:
   - `DEPLOY_HOST`: the droplet IP;
   - `DEPLOY_SSH_KEY`: the deploy private key;
   - `DEPLOY_KNOWN_HOSTS`: the output of `ssh-keyscan -t ed25519 <droplet ip>`.
4. Push to `master`, or run the workflow by hand.

The first deploy creates `/opt/drawsaster/.env` from `deploy/env.example`. The app then serves on `http://<droplet ip>`.

### Adding a domain
Point an A record at the droplet, set `SITE_ADDRESS=yourdomain.com` in `/opt/drawsaster/.env`, and redeploy. Caddy gets the certificate automatically.

Each deploy restarts the server, which ends games in progress.
