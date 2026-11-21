import express, { type NextFunction, type Request, type Response } from 'express';
import { LIMITS } from '../../../shared/protocol.ts';
import { GameError } from '../game/Game.ts';
import { drawingKey, type GameService } from '../game/GameService.ts';
import { isPng, isValidKey } from '../storage/ObjectStore.ts';

const UUID = /^[0-9a-f-]{36}$/;

export function apiRoutes(service: GameService): express.Router {
	const router = express.Router();
	const inFlight = new Set<string>();

	// for Docker health checks and deploy verification
	router.get('/health', (req, res) => {
		res.json({ ok: true, games: service.games.size });
	});

	/**
	 * Submit one step. Drawings are raw PNG bodies; text steps are JSON { text }.
	 * Safe to retry: a step the player already submitted returns 200 again.
	 */
	router.put(
		'/games/:code/chains/:chain/steps/:step',
		express.raw({ type: 'image/png', limit: LIMITS.drawingBytes }),
		express.json({ limit: '10kb' }),
		async (req, res) => {
			const game = service.games.get(String(req.params.code));
			if (!game) throw new GameError('Game not found', 404);
			const token = /^Bearer (.+)$/.exec(req.get('authorization') ?? '')?.[1];
			const player = token ? game.playerByToken(token) : undefined;
			if (!player) throw new GameError('Not a player in this game', 401);

			const chain = Number(req.params.chain);
			const step = Number(req.params.step);
			const turn = game.checkTurn(player.id, chain, step);
			if (turn.status === 'done') {
				res.json({ ok: true, duplicate: true });
				return;
			}

			const lock = `${game.id}:${chain}:${step}`;
			if (inFlight.has(lock)) throw new GameError('This step is already being submitted', 409);
			inFlight.add(lock);
			try {
				if (turn.type === 'drawing') {
					const body: unknown = req.body;
					if (!req.is('image/png') || !Buffer.isBuffer(body) || !isPng(body)) {
						throw new GameError('This step needs a PNG drawing', 415);
					}
					const key = drawingKey(game.id, chain, step);
					await service.store.put(key, body, 'image/png');
					// the host may have skipped the step during the upload; submit checks again
					game.submit(player.id, chain, step, { imageKey: key });
				} else {
					const text = (req.body as { text?: unknown } | undefined)?.text;
					if (typeof text !== 'string') throw new GameError('This step needs text', 415);
					game.submit(player.id, chain, step, { text });
				}
			} finally {
				inFlight.delete(lock);
			}
			await service.changed(game);
			res.json({ ok: true });
		}
	);

	router.get('/games/:gameId/summary', async (req, res) => {
		const gameId = String(req.params.gameId);
		if (!UUID.test(gameId)) throw new GameError('Game not found', 404);
		const summary = await service.summary(gameId);
		if (summary === 'not-finished') throw new GameError('This game is not finished yet', 409);
		if (!summary) throw new GameError('Game not found', 404);
		res.json(summary);
	});

	router.get('/images/*key', async (req, res) => {
		const key = (req.params as { key: string[] }).key.join('/');
		if (!isValidKey(key) || !key.endsWith('.png')) throw new GameError('Not found', 404);
		// ?inline=1 always sends the bytes from this origin, so the browser can draw the
		// image on a canvas and export it (a redirect to S3 would make the canvas unexportable)
		const url = req.query.inline === '1' ? null : await service.store.readUrl(key);
		if (url) {
			res.set('Cache-Control', 'private, max-age=600').redirect(302, url);
			return;
		}
		const body = await service.store.get(key);
		if (!body) throw new GameError('Not found', 404);
		res.set('Cache-Control', 'private, max-age=86400, immutable').type('png').send(body);
	});

	router.use((req, res) => {
		res.status(404).json({ ok: false, error: 'Not found' });
	});

	router.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
		if (err instanceof GameError) {
			res.status(err.status).json({ ok: false, error: err.message });
			return;
		}
		if ((err as { status?: number }).status === 413) {
			res.status(413).json({ ok: false, error: 'That drawing is too large' });
			return;
		}
		console.error(err);
		res.status(500).json({ ok: false, error: 'Something went wrong' });
	});

	return router;
}
