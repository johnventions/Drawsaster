/**
 * Leave the current game for good: the server removes you (lobby) or skips your
 * remaining turns (started game), and this browser forgets the session.
 * Pass the component (`this`). Returns false if the player cancelled.
 */
export async function leaveGame(vm) {
	const playing = vm.$store.state.snapshot?.phase === 'playing';
	const message = playing
		? 'Leave this game? Your remaining turns will be skipped and you can\'t rejoin.'
		: 'Leave this game?';
	if (!confirm(message)) return false;
	try {
		await vm.$request('game:leave');
	} catch (err) {
		// the game may already be gone; forgetting it locally is what matters
		console.warn('Leave:', err.message);
	}
	vm.$store.commit('SET_SESSION', null);
	if (vm.$route.path !== '/') vm.$router.push('/');
	return true;
}
