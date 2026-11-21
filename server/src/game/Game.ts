import { randomBytes, randomUUID } from 'node:crypto';
import {
	LIMITS,
	type GameSnapshot,
	type GameSummary,
	type Phase,
	type PlayerView,
	type StepType,
	type TaskView
} from '../../../shared/protocol.ts';

export class GameError extends Error {
	status: number;
	constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
}

export interface Player {
	id: string;
	name: string;
	nameLower: string;
	token: string;
	/** Open socket connections (a reload or a second device adds one). Empty while away. */
	socketIds: Set<string>;
	seat: number | null;
	completed: number;
	/** Left a started game: their turns are skipped automatically and their token no longer works. */
	left: boolean;
}

export interface Step {
	type: StepType;
	authorId: string;
	skipped: boolean;
	text: string | null;
	imageKey: string | null;
	at: number;
}

interface Chain {
	ownerId: string;
	steps: Step[];
}

export type StepContent = { text: string } | { imageKey: string };

export interface GameOptions {
	code: string;
	minPlayers: number;
	random?: () => number;
	now?: () => number;
}

/**
 * One game, entirely in memory and free of I/O.
 *
 * Turn routing: when the game starts, players are shuffled into seats 0..N-1.
 * There is one chain per seat, and every chain gets N steps. Step s of chain c
 * belongs to seat (c + s) mod N, and is playable once step s-1 is done.
 * Clients never decide who plays next.
 */
export class Game {
	readonly id = randomUUID();
	readonly code: string;
	readonly minPlayers: number;
	phase: Phase = 'lobby';
	hostId: string | null = null;
	readonly players = new Map<string, Player>();
	/** Player ids by seat; filled when the game starts. */
	seats: string[] = [];
	chains: Chain[] = [];
	readonly createdAt: number;
	lastActivity: number;
	finishedAt: number | null = null;

	private readonly random: () => number;
	private readonly now: () => number;

	constructor(options: GameOptions) {
		this.code = options.code;
		this.minPlayers = options.minPlayers;
		this.random = options.random ?? Math.random;
		this.now = options.now ?? Date.now;
		this.createdAt = this.now();
		this.lastActivity = this.createdAt;
	}

	// ---- players -------------------------------------------------------

	addPlayer(rawName: string): Player {
		if (this.phase !== 'lobby') {
			throw new GameError('This game has already started');
		}
		const name = cleanName(rawName);
		const nameLower = name.toLowerCase();
		for (const p of this.players.values()) {
			if (p.nameLower === nameLower) {
				throw new GameError('That name is already taken in this game');
			}
		}
		const player: Player = {
			id: randomUUID(),
			name,
			nameLower,
			token: randomBytes(24).toString('base64url'),
			socketIds: new Set(),
			seat: null,
			completed: 0,
			left: false
		};
		this.players.set(player.id, player);
		this.hostId ??= player.id;
		this.touch();
		return player;
	}

	playerByToken(token: string): Player | undefined {
		for (const p of this.players.values()) {
			if (p.token === token && !p.left) return p;
		}
		return undefined;
	}

	/**
	 * A player leaves for good. In the lobby they are removed; in a started game
	 * they stay in the results, but every turn of theirs is skipped automatically
	 * so the game can still finish. The host role passes to someone still here.
	 * Returns the sockets that were theirs, and whether anyone is left.
	 */
	leave(playerId: string): { socketIds: string[]; empty: boolean } {
		const player = this.requirePlayer(playerId);
		const socketIds = [...player.socketIds];
		player.socketIds.clear();
		if (this.phase === 'lobby') {
			this.players.delete(playerId);
		} else {
			player.left = true;
		}
		if (this.hostId === playerId) {
			this.hostId = this.nextHost();
		}
		if (this.phase === 'playing') {
			this.afterStep();
		}
		this.touch();
		return { socketIds, empty: this.activePlayers().length === 0 };
	}

	addSocket(playerId: string, socketId: string): void {
		this.requirePlayer(playerId).socketIds.add(socketId);
		this.touch();
	}

	removeSocket(playerId: string, socketId: string): void {
		this.players.get(playerId)?.socketIds.delete(socketId);
	}

	// ---- game flow -----------------------------------------------------

	start(byPlayerId: string): void {
		this.requireHost(byPlayerId);
		if (this.phase !== 'lobby') {
			throw new GameError('This game has already started');
		}
		if (this.players.size < this.minPlayers) {
			throw new GameError(`At least ${this.minPlayers} players are needed`);
		}
		this.seats = shuffle([...this.players.keys()], this.random);
		this.seats.forEach((id, seat) => {
			this.requirePlayer(id).seat = seat;
		});
		this.chains = this.seats.map(ownerId => ({ ownerId, steps: [] }));
		this.phase = 'playing';
		this.touch();
	}

	/** The playable steps assigned to a player, oldest first. */
	tasksFor(playerId: string): TaskView[] {
		const player = this.players.get(playerId);
		if (this.phase !== 'playing' || !player || player.seat == null) {
			return [];
		}
		const n = this.seats.length;
		const tasks: TaskView[] = [];
		for (let step = 0; step < n; step++) {
			const chainIndex = mod(player.seat - step, n);
			const chain = this.chains[chainIndex]!;
			if (chain.steps.length === step) {
				tasks.push(this.taskView(chainIndex, chain));
			}
		}
		return tasks;
	}

	/**
	 * Throws unless `playerId` may play step `step` of chain `chain` right now.
	 * Returns 'done' when the player already submitted it, so retries are harmless.
	 */
	checkTurn(playerId: string, chain: number, step: number): { status: 'ready'; type: StepType } | { status: 'done' } {
		const player = this.requirePlayer(playerId);
		if (this.phase === 'lobby') throw new GameError('The game has not started', 409);
		const c = this.chains[chain];
		const n = this.seats.length;
		if (!c || !Number.isInteger(step) || step < 0 || step >= n) {
			throw new GameError('No such step', 404);
		}
		if (mod(chain + step, n) !== player.seat) {
			throw new GameError('That step belongs to another player', 403);
		}
		const existing = c.steps[step];
		if (existing) {
			if (existing.authorId === playerId && !existing.skipped) return { status: 'done' };
			throw new GameError('That step was skipped by the host', 409);
		}
		if (c.steps.length !== step) {
			throw new GameError('That step is not ready yet', 409);
		}
		return { status: 'ready', type: nextType(c) };
	}

	submit(playerId: string, chain: number, step: number, content: StepContent): 'saved' | 'duplicate' {
		const turn = this.checkTurn(playerId, chain, step);
		if (turn.status === 'done') return 'duplicate';

		let text: string | null = null;
		let imageKey: string | null = null;
		if (turn.type === 'drawing') {
			if (!('imageKey' in content)) throw new GameError('This step needs a drawing');
			imageKey = content.imageKey;
		} else {
			if (!('text' in content)) throw new GameError('This step needs text');
			text = content.text.trim().slice(0, LIMITS.textLength);
			if (!text) throw new GameError('Text cannot be empty');
		}

		this.chains[chain]!.steps.push({
			type: turn.type,
			authorId: playerId,
			skipped: false,
			text,
			imageKey,
			at: this.now()
		});
		this.requirePlayer(playerId).completed++;
		this.afterStep();
		return 'saved';
	}

	/**
	 * Host skips the oldest playable step of a player who is away. The chain
	 * carries on from the last real step, so the next player gets that prompt.
	 */
	skip(byPlayerId: string, targetId: string): void {
		this.requireHost(byPlayerId);
		if (this.phase !== 'playing') throw new GameError('The game is not in progress', 409);
		const task = this.tasksFor(targetId)[0];
		if (!task) throw new GameError('That player has nothing to skip', 409);
		this.pushSkip(task, targetId);
		this.afterStep();
	}

	// ---- views ---------------------------------------------------------

	snapshotFor(playerId: string): GameSnapshot {
		const you = this.requirePlayer(playerId);
		const n = this.seats.length;
		const done = this.chains.reduce((sum, c) => sum + c.steps.length, 0);
		return {
			gameId: this.id,
			code: this.code,
			phase: this.phase,
			minPlayers: this.minPlayers,
			you: { id: you.id, name: you.name, isHost: you.id === this.hostId },
			players: this.orderedPlayers().map(p => this.playerView(p)),
			tasks: this.tasksFor(playerId),
			progress: { done, total: n * n }
		};
	}

	summary(): GameSummary {
		return {
			gameId: this.id,
			code: this.code,
			finishedAt: new Date(this.finishedAt ?? this.now()).toISOString(),
			players: this.orderedPlayers().map(p => ({ id: p.id, name: p.name })),
			chains: this.chains.map(c => ({
				ownerId: c.ownerId,
				steps: c.steps.map(s => ({
					type: s.type,
					authorId: s.authorId,
					skipped: s.skipped,
					text: s.text,
					image: s.imageKey ? imageUrl(s.imageKey) : null
				}))
			}))
		};
	}

	connectedPlayers(): Player[] {
		return [...this.players.values()].filter(p => p.socketIds.size > 0);
	}

	// ---- internals -----------------------------------------------------

	private pushSkip(task: TaskView, playerId: string): void {
		this.chains[task.chain]!.steps.push({
			type: task.type,
			authorId: playerId,
			skipped: true,
			text: null,
			imageKey: null,
			at: this.now()
		});
	}

	/** Skip every ready turn of players who left; skipping one can make another ready. */
	private skipLeftPlayers(): void {
		let skipped = true;
		while (skipped) {
			skipped = false;
			for (const p of this.players.values()) {
				if (!p.left) continue;
				for (const task of this.tasksFor(p.id)) {
					this.pushSkip(task, p.id);
					skipped = true;
				}
			}
		}
	}

	private activePlayers(): Player[] {
		return this.orderedPlayers().filter(p => !p.left);
	}

	/** Prefer someone who is connected, then anyone still in the game. */
	private nextHost(): string | null {
		const active = this.activePlayers();
		return (active.find(p => p.socketIds.size > 0) ?? active[0])?.id ?? null;
	}

	private afterStep(): void {
		if (this.phase === 'playing') this.skipLeftPlayers();
		const n = this.seats.length;
		if (this.chains.every(c => c.steps.length === n)) {
			this.phase = 'done';
			this.finishedAt = this.now();
		}
		this.touch();
	}

	private taskView(chainIndex: number, chain: Chain): TaskView {
		const type = nextType(chain);
		const prompt = lastRealStep(chain);
		return {
			chain: chainIndex,
			step: chain.steps.length,
			type,
			promptText: type === 'drawing' ? prompt?.text ?? null : null,
			promptImage: type === 'caption' && prompt?.imageKey ? imageUrl(prompt.imageKey) : null
		};
	}

	private playerView(p: Player): PlayerView {
		return {
			id: p.id,
			name: p.name,
			isHost: p.id === this.hostId,
			connected: p.socketIds.size > 0,
			left: p.left,
			waiting: this.tasksFor(p.id).length,
			completed: p.completed
		};
	}

	private orderedPlayers(): Player[] {
		if (this.seats.length > 0) return this.seats.map(id => this.requirePlayer(id));
		return [...this.players.values()];
	}

	private requirePlayer(playerId: string): Player {
		const player = this.players.get(playerId);
		if (!player) throw new GameError('Player not found', 404);
		return player;
	}

	private requireHost(playerId: string): void {
		this.requirePlayer(playerId);
		if (playerId !== this.hostId) throw new GameError('Only the host can do that', 403);
	}

	private touch(): void {
		this.lastActivity = this.now();
	}
}

/** The type of a chain's next step depends on its last real (not skipped) step. */
function nextType(chain: Chain): StepType {
	const last = lastRealStep(chain);
	if (!last) return 'start';
	return last.imageKey ? 'caption' : 'drawing';
}

function lastRealStep(chain: Chain): Step | undefined {
	for (let i = chain.steps.length - 1; i >= 0; i--) {
		const step = chain.steps[i]!;
		if (!step.skipped) return step;
	}
	return undefined;
}

export function imageUrl(key: string): string {
	return '/api/images/' + key;
}

export function cleanName(raw: unknown): string {
	const name = String(raw ?? '').trim().replace(/\s+/g, ' ').slice(0, LIMITS.nameLength);
	if (!name) throw new GameError('Please enter a name');
	return name;
}

function mod(a: number, n: number): number {
	return ((a % n) + n) % n;
}

function shuffle<T>(items: T[], random: () => number): T[] {
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[items[i], items[j]] = [items[j]!, items[i]!];
	}
	return items;
}
