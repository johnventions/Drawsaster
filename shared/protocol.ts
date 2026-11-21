// Types shared by the server and the browser client.
// The client is JavaScript and can reference these through JSDoc:
//   /** @typedef {import('../shared/protocol').GameSnapshot} GameSnapshot */

export type Phase = 'lobby' | 'playing' | 'done';

/** start = write any phrase, drawing = draw the text prompt, caption = describe the image prompt */
export type StepType = 'start' | 'drawing' | 'caption';

/** What a client keeps (in localStorage) to prove who it is. */
export interface Session {
	code: string;
	playerId: string;
	token: string;
}

export interface PlayerView {
	id: string;
	name: string;
	isHost: boolean;
	connected: boolean;
	/** Left the game for good; their turns are skipped automatically. */
	left: boolean;
	/** Steps assigned to this player that are ready to play now. */
	waiting: number;
	/** Steps this player has finished (skipped ones are not counted). */
	completed: number;
}

export interface TaskView {
	chain: number;
	step: number;
	type: StepType;
	/** Phrase to draw, for drawing tasks. */
	promptText: string | null;
	/** URL of the drawing to caption, for caption tasks. */
	promptImage: string | null;
}

export interface GameSnapshot {
	gameId: string;
	code: string;
	phase: Phase;
	minPlayers: number;
	you: { id: string; name: string; isHost: boolean };
	/** In seat order once the game has started, join order before that. */
	players: PlayerView[];
	/** Your playable tasks, oldest first. tasks[0] is the current one. */
	tasks: TaskView[];
	progress: { done: number; total: number };
}

export interface SummaryStep {
	type: StepType;
	authorId: string;
	skipped: boolean;
	text: string | null;
	image: string | null;
}

export interface GameSummary {
	gameId: string;
	code: string;
	finishedAt: string;
	players: { id: string; name: string }[];
	chains: { ownerId: string; steps: SummaryStep[] }[];
}

export interface ChatMessage {
	playerId: string;
	name: string;
	/** PNG data URL. Chat is relayed only and never stored. */
	image: string;
	at: number;
}

export type Ack<T = object> = (result: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface ClientToServerEvents {
	'game:create': (req: { name: string }, ack: Ack<{ session: Session }>) => void;
	'game:join': (req: { code: string; name: string }, ack: Ack<{ session: Session }>) => void;
	'session:resume': (req: Session, ack: Ack) => void;
	'game:start': (ack: Ack) => void;
	'host:skip': (req: { playerId: string }, ack: Ack) => void;
	'chat:send': (req: { image: string }, ack: Ack) => void;
	'game:leave': (ack: Ack) => void;
}

export interface ServerToClientEvents {
	'game:state': (snapshot: GameSnapshot) => void;
	'chat:message': (message: ChatMessage) => void;
	/** This player left the game (for example from another tab); forget the session. */
	'session:ended': () => void;
}

// HTTP API
//   PUT /api/games/:code/chains/:chain/steps/:step   Authorization: Bearer <token>
//       Content-Type: image/png         raw PNG body, for drawing steps
//       Content-Type: application/json  { "text": "..." }, for start and caption steps
//   GET /api/games/:gameId/summary      GameSummary, once the game is done
//   GET /api/images/<key>               the image (redirects to a signed S3 URL with the S3 store)
export const LIMITS = {
	nameLength: 24,
	textLength: 140,
	drawingBytes: 1_000_000,
	chatBytes: 300_000
} as const;
