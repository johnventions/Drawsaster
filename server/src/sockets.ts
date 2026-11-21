import type { Socket } from 'socket.io';
import {
	LIMITS,
	type Ack,
	type ClientToServerEvents,
	type ServerToClientEvents,
	type Session
} from '../../shared/protocol.ts';
import { cleanName, type Game, GameError, type Player } from './game/Game.ts';
import { type GameService, type IO, roomFor } from './game/GameService.ts';
import { isPng } from './storage/ObjectStore.ts';

interface SocketData {
	code?: string;
	playerId?: string;
}

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

const PNG_DATA_URL = 'data:image/png;base64,';

export function registerSockets(io: IO, service: GameService): void {
	io.on('connection', (rawSocket) => {
		const socket = rawSocket as GameSocket;

		/** Run a handler and answer its ack with { ok: true, ... } or { ok: false, error }. */
		function handle<T extends object>(ack: unknown, fn: () => Promise<T> | T): void {
			const reply: Ack<T> = typeof ack === 'function' ? ack as Ack<T> : () => {};
			Promise.resolve()
				.then(fn)
				.then(result => reply({ ok: true, ...result }))
				.catch((err: unknown) => {
					if (!(err instanceof GameError)) console.error(err);
					reply({ ok: false, error: err instanceof GameError ? err.message : 'Something went wrong' });
				});
		}

		function current(): { game: Game; player: Player } {
			const game = socket.data.code ? service.games.get(socket.data.code) : undefined;
			const player = game && socket.data.playerId ? game.players.get(socket.data.playerId) : undefined;
			if (!game || !player) throw new GameError('You are not in a game', 401);
			return { game, player };
		}

		async function bind(game: Game, player: Player): Promise<Session> {
			// a socket belongs to one player at a time
			const previous = socket.data.code ? service.games.get(socket.data.code) : undefined;
			if (previous && socket.data.playerId) {
				previous.removeSocket(socket.data.playerId, socket.id);
				if (previous !== game) {
					await socket.leave(roomFor(previous));
					await service.changed(previous);
				}
			}
			socket.data = { code: game.code, playerId: player.id };
			game.addSocket(player.id, socket.id);
			await socket.join(roomFor(game));
			await service.changed(game);
			return { code: game.code, playerId: player.id, token: player.token };
		}

		socket.on('game:create', (req, ack) => handle(ack, async () => {
			const name = cleanName(req?.name);
			const game = service.games.create();
			return { session: await bind(game, game.addPlayer(name)) };
		}));

		socket.on('game:join', (req, ack) => handle(ack, async () => {
			const game = service.games.get(String(req?.code ?? ''));
			if (!game) throw new GameError('Game not found');
			return { session: await bind(game, game.addPlayer(req.name)) };
		}));

		socket.on('session:resume', (req, ack) => handle(ack, async () => {
			const game = service.games.get(String(req?.code ?? ''));
			const player = game && typeof req.token === 'string' ? game.playerByToken(req.token) : undefined;
			if (!game || !player || player.id !== req.playerId) {
				throw new GameError('That game has ended or expired');
			}
			await bind(game, player);
			return {};
		}));

		socket.on('game:start', (ack) => handle(ack, async () => {
			const { game, player } = current();
			game.start(player.id);
			await service.changed(game);
			return {};
		}));

		socket.on('host:skip', (req, ack) => handle(ack, async () => {
			const { game, player } = current();
			game.skip(player.id, String(req?.playerId ?? ''));
			await service.changed(game);
			return {};
		}));

		// Chat drawings are relayed to the room and never stored.
		socket.on('chat:send', (req, ack) => handle(ack, () => {
			const { game, player } = current();
			const image = req?.image;
			if (typeof image !== 'string' || !image.startsWith(PNG_DATA_URL)) {
				throw new GameError('Chat needs a PNG drawing');
			}
			const bytes = Buffer.from(image.slice(PNG_DATA_URL.length), 'base64');
			if (bytes.length > LIMITS.chatBytes) throw new GameError('That drawing is too large');
			if (!isPng(bytes)) throw new GameError('Chat needs a PNG drawing');
			io.to(roomFor(game)).emit('chat:message', { playerId: player.id, name: player.name, image, at: Date.now() });
			return {};
		}));

		// Leave for good: every tab of this player is detached, and the game carries on without them.
		socket.on('game:leave', (ack) => handle(ack, async () => {
			const { game, player } = current();
			const { socketIds, empty } = game.leave(player.id);
			for (const id of socketIds) {
				const other = io.sockets.sockets.get(id) as GameSocket | undefined;
				if (!other) continue;
				other.data = {};
				await other.leave(roomFor(game));
				if (other !== socket) other.emit('session:ended');
			}
			if (empty) {
				service.games.delete(game.code);
			} else {
				await service.changed(game);
			}
			return {};
		}));

		socket.on('disconnect', () => {
			const game = socket.data.code ? service.games.get(socket.data.code) : undefined;
			const player = game && socket.data.playerId ? game.players.get(socket.data.playerId) : undefined;
			if (game && player) {
				game.removeSocket(player.id, socket.id);
				void service.changed(game);
			}
		});
	});
}
