import { io } from 'socket.io-client';

/** @typedef {import('../shared/protocol').ClientToServerEvents} ClientToServerEvents */

// Same origin in every environment: in dev, Vite proxies /socket.io to the API server.
export const socket = io({ autoConnect: true });

/**
 * Emit an event and wait for the server's { ok, ... } reply.
 * Rejects with the server's error message when ok is false.
 * @param {keyof ClientToServerEvents} event
 * @param {object} [payload]
 */
export async function request(event, payload) {
	const args = payload === undefined ? [] : [payload];
	const res = await socket.timeout(8000).emitWithAck(event, ...args);
	if (!res.ok) throw new Error(res.error);
	return res;
}

export default {
	install(app) {
		app.config.globalProperties.$socket = socket;
		app.config.globalProperties.$request = request;
	}
};
