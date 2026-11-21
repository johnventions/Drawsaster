<template>
	<div id="app">
		<router-view />
	</div>
</template>

<script>
export default {
	name: "app",
	computed: {
		phase() {
			return this.$store.state.snapshot?.phase ?? null;
		}
	},
	watch: {
		// The server decides where everyone is; follow the game's phase.
		phase(phase) {
			// Create/Join route themselves once they have saved the session
			if (!this.$store.state.session) return;
			const route = this.$route.name;
			if (phase === 'lobby' && ['create', 'join', 'game'].includes(route)) {
				this.$router.push('/lobby');
			} else if (phase === 'playing' && ['create', 'join', 'lobby'].includes(route)) {
				this.$router.push('/game');
			} else if (phase === 'done') {
				const gameId = this.$store.state.snapshot.gameId;
				this.$store.commit('SET_SESSION', null);
				this.$router.push('/game/' + gameId);
			}
		}
	},
	mounted() {
		this.handlers = {
			connect: () => this.resume(),
			'game:state': snapshot => this.$store.commit('SET_SNAPSHOT', snapshot),
			'chat:message': chat => this.$store.commit('ADD_CHAT', chat)
		};
		for (const [event, handler] of Object.entries(this.handlers)) {
			this.$socket.on(event, handler);
		}
		if (this.$socket.connected) this.resume();
	},
	beforeUnmount() {
		for (const [event, handler] of Object.entries(this.handlers)) {
			this.$socket.off(event, handler);
		}
	},
	methods: {
		// On every (re)connect, tell the server who we are; it answers with fresh state.
		async resume() {
			const session = this.$store.state.session;
			if (!session) return;
			try {
				await this.$request('session:resume', session);
			} catch (err) {
				console.warn('Could not rejoin game:', err.message);
				this.$store.commit('SET_SESSION', null);
				if (this.$route.meta.requiresAuth) this.$router.push('/');
			}
		}
	}
};
</script>
