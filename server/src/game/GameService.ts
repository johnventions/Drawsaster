import type { Server } from 'socket.io';
import type { ClientToServerEvents, GameSummary, ServerToClientEvents } from '../../../shared/protocol.ts';
import type { ObjectStore } from '../storage/ObjectStore.ts';
import type { Game } from './Game.ts';
import type { GameStore } from './GameStore.ts';

export type IO = Server<ClientToServerEvents, ServerToClientEvents>;

export const summaryKey = (gameId: string) => `games/${gameId}/summary.json`;
export const drawingKey = (gameId: string, chain: number, step: number) => `games/${gameId}/${chain}-${step}.png`;
export const roomFor = (game: Game) => `game:${game.code}`;

/** Glue between the in-memory games, storage and connected sockets. */
export class GameService {
	readonly games: GameStore;
	readonly store: ObjectStore;
	private readonly io: IO;
	private readonly summariesSaved = new WeakSet<Game>();

	constructor(games: GameStore, store: ObjectStore, io: IO) {
		this.games = games;
		this.store = store;
		this.io = io;
	}

	/** Call after every change: saves the summary once the game is done, then pushes fresh state to everyone. */
	async changed(game: Game): Promise<void> {
		if (game.phase === 'done' && !this.summariesSaved.has(game)) {
			this.summariesSaved.add(game);
			try {
				await this.store.put(summaryKey(game.id), Buffer.from(JSON.stringify(game.summary())), 'application/json');
			} catch (err) {
				this.summariesSaved.delete(game);
				console.error(`Could not save summary for ${game.code}`, err);
			}
		}
		for (const player of game.connectedPlayers()) {
			this.io.to([...player.socketIds]).emit('game:state', game.snapshotFor(player.id));
		}
	}

	async summary(gameId: string): Promise<GameSummary | 'not-finished' | null> {
		const live = this.games.getById(gameId);
		if (live) return live.phase === 'done' ? live.summary() : 'not-finished';
		const saved = await this.store.get(summaryKey(gameId));
		return saved ? JSON.parse(saved.toString('utf8')) as GameSummary : null;
	}
}
