import { Game } from './Game.ts';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O, which look like 1 and 0

export interface GameStoreOptions {
	minPlayers: number;
	idleGameMs: number;
	finishedGameMs: number;
}

/** All live games, in memory. One instance per server process. */
export class GameStore {
	private readonly byCode = new Map<string, Game>();
	private readonly options: GameStoreOptions;

	constructor(options: GameStoreOptions) {
		this.options = options;
	}

	create(): Game {
		let code: string;
		do {
			code = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
		} while (this.byCode.has(code));
		const game = new Game({ code, minPlayers: this.options.minPlayers });
		this.byCode.set(code, game);
		return game;
	}

	get(code: string): Game | undefined {
		return this.byCode.get(String(code).toUpperCase());
	}

	getById(gameId: string): Game | undefined {
		for (const game of this.byCode.values()) {
			if (game.id === gameId) return game;
		}
		return undefined;
	}

	/** Drop idle and long-finished games. Returns the codes removed. */
	sweep(now = Date.now()): string[] {
		const removed: string[] = [];
		for (const [code, game] of this.byCode) {
			const limit = game.phase === 'done' ? this.options.finishedGameMs : this.options.idleGameMs;
			if (now - game.lastActivity > limit) {
				this.byCode.delete(code);
				removed.push(code);
			}
		}
		return removed;
	}

	get size(): number {
		return this.byCode.size;
	}
}
