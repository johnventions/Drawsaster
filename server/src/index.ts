import path from 'node:path';
import { createApp } from './app.ts';
import { config } from './config.ts';
import { GameStore } from './game/GameStore.ts';
import { createObjectStore } from './storage/index.ts';

const games = new GameStore({
	minPlayers: config.minPlayers,
	idleGameMs: config.idleGameMs,
	finishedGameMs: config.finishedGameMs
});

const { server } = createApp({
	games,
	store: createObjectStore(),
	staticDir: path.resolve('dist')
});

setInterval(() => {
	const removed = games.sweep();
	if (removed.length) console.log(`Removed ${removed.length} idle games: ${removed.join(', ')}`);
}, 5 * 60_000).unref();

server.listen(config.port, () => {
	console.log(`Drawsaster API on port ${config.port} (env: ${config.appEnv}, images: ${config.imageStore})`);
});
