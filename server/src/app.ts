import { existsSync } from 'node:fs';
import { createServer, type Server as HttpServer } from 'node:http';
import path from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import { LIMITS } from '../../shared/protocol.ts';
import { GameService, type IO } from './game/GameService.ts';
import type { GameStore } from './game/GameStore.ts';
import { apiRoutes } from './http/routes.ts';
import { registerSockets } from './sockets.ts';
import type { ObjectStore } from './storage/ObjectStore.ts';

export interface AppOptions {
	games: GameStore;
	store: ObjectStore;
	/** Folder with the built frontend to serve, if any. */
	staticDir?: string;
}

export function createApp({ games, store, staticDir }: AppOptions): { server: HttpServer; io: IO; service: GameService } {
	const app = express();
	app.disable('x-powered-by');
	const server = createServer(app);
	const io: IO = new Server(server, {
		// room for one base64 chat drawing plus some slack; turns go over HTTP
		maxHttpBufferSize: Math.ceil(LIMITS.chatBytes * 1.4)
	});
	const service = new GameService(games, store, io);

	registerSockets(io, service);
	app.use('/api', apiRoutes(service));

	// Production: serve the built frontend, with index.html for every client-side route.
	if (staticDir && existsSync(staticDir)) {
		app.use(express.static(staticDir));
		app.get('/{*path}', (req, res) => res.sendFile(path.join(staticDir, 'index.html')));
	}

	return { server, io, service };
}
