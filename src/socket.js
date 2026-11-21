import io from 'socket.io-client';

// Small replacement for vue-socket.io: exposes the shared socket as this.$socket.
// The client stays on socket.io 2.x so it can talk to the socket.io 2 server.
export function createSocket() {
	// In dev, Vite proxies /socket.io to the API server, so the page origin works everywhere.
	const socket = io(window.location.origin);
	return {
		socket,
		install(app) {
			app.config.globalProperties.$socket = socket;
		}
	};
}
