/** @typedef {import('../shared/protocol').Session} Session */

/**
 * Submit one step over HTTP. Drawings go as a raw PNG Blob, text as JSON.
 * The server treats a repeated submit as success, so network failures are retried.
 * @param {Session} session
 * @param {{ chain: number, step: number }} task
 * @param {Blob | string} content
 */
export async function submitStep(session, task, content) {
	const isDrawing = content instanceof Blob;
	const url = `/api/games/${session.code}/chains/${task.chain}/steps/${task.step}`;
	const init = {
		method: 'PUT',
		headers: {
			authorization: `Bearer ${session.token}`,
			'content-type': isDrawing ? 'image/png' : 'application/json'
		},
		body: isDrawing ? content : JSON.stringify({ text: content })
	};

	let lastError;
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const res = await fetch(url, init);
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { final: true });
			return data;
		} catch (err) {
			if (err.final) throw err;
			lastError = err;
			await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
		}
	}
	throw lastError;
}

export async function fetchSummary(gameId) {
	const res = await fetch(`/api/games/${gameId}/summary`);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data.error || 'Could not load this game');
	return data;
}

/** Turn a canvas data URL into a PNG Blob for upload. */
export async function dataUrlToBlob(dataUrl) {
	return (await fetch(dataUrl)).blob();
}
