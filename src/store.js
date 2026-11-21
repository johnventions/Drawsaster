import { createStore } from 'vuex';
import { loadSession, saveSession } from './session';

/** @typedef {import('../shared/protocol').GameSnapshot} GameSnapshot */

// The server owns the game. The store just keeps the latest snapshot it sent.
export default createStore({
	state: () => ({
		session: loadSession(),
		/** @type {GameSnapshot | null} */
		snapshot: null,
		chats: [],
		showAlert: false
	}),
	getters: {
		status: state => ({ loggedIn: !!state.session }),
		you: state => state.snapshot?.you ?? null,
		players: state => state.snapshot?.players ?? [],
		tasks: state => state.snapshot?.tasks ?? []
	},
	mutations: {
		SET_SESSION(state, session) {
			state.session = session;
			saveSession(session);
			if (!session) {
				state.snapshot = null;
				state.chats = [];
			}
		},
		SET_SNAPSHOT(state, snapshot) {
			const before = state.snapshot?.tasks.length ?? 0;
			const wasPlaying = state.snapshot?.phase === 'playing';
			state.snapshot = snapshot;
			if (wasPlaying && snapshot.tasks.length > before) {
				state.showAlert = true;
				setTimeout(() => {
					state.showAlert = false;
				}, 5000);
				if (navigator.vibrate) {
					navigator.vibrate([150, 100, 150]);
				}
			}
		},
		ADD_CHAT(state, chat) {
			state.chats.push(chat);
			// chat is temporary: keep only recent drawings in memory
			if (state.chats.length > 30) state.chats.shift();
		}
	}
});
