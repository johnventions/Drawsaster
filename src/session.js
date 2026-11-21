// The session ({ code, playerId, token }) lives in localStorage so a reload or
// a dropped connection can rejoin the same game. Storage can be unavailable
// (private mode), so every access is guarded.

const SESSION_KEY = 'drawsaster.session';
const NAME_KEY = 'drawsaster.name';

function read(key) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function write(key, value) {
	try {
		if (value == null) localStorage.removeItem(key);
		else localStorage.setItem(key, value);
	} catch {
		// ignore: the game still works, it just can't survive a reload
	}
}

export function loadSession() {
	try {
		const session = JSON.parse(read(SESSION_KEY) || 'null');
		return session && session.code && session.playerId && session.token ? session : null;
	} catch {
		return null;
	}
}

export function saveSession(session) {
	write(SESSION_KEY, session ? JSON.stringify(session) : null);
}

export function loadName() {
	return read(NAME_KEY) || '';
}

export function saveName(name) {
	write(NAME_KEY, name);
}
