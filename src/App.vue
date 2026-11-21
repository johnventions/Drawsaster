<template>
	<div id="app">
		<router-view />
	</div>
</template>

<script>
const EVENTS = ['NEW_PLAYER', 'NEW_TASK', 'END_GAME', 'NEW_CHAT', 'GAME_UPDATE', 'reconnect', 'disconnect'];

export default {
	name: "app",
	mounted() {
		this.handlers = {
			NEW_PLAYER: players => {
				this.$store.commit('SET_PLAYERS', players);
			},
			NEW_TASK: task => {
				this.$store.commit('ADD_TASK', { task: task, callback: this.getPlayersBegin });
				if (navigator.vibrate) {
					navigator.vibrate([150, 100, 150]);
				}
			},
			END_GAME: id => {
				this.$router.push("/game/" + id);
			},
			NEW_CHAT: chat => {
				this.$store.commit('ADD_CHAT', chat);
			},
			GAME_UPDATE: update => {
				this.$store.commit('GAME_UPDATE', update);
			},
			reconnect: () => {
				console.log("Reconnected!");
				if (this.app_gamecode) {
					this.joinRoom(this.app_gameid, this.app_userid);
				}
			},
			disconnect: () => {
				console.log("Disconnected!");
			}
		};
		EVENTS.forEach(name => this.$socket.on(name, this.handlers[name]));
	},
	beforeUnmount() {
		EVENTS.forEach(name => this.$socket.off(name, this.handlers[name]));
	}
};
</script>
