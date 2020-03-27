<template>
	<div id="app">
		<router-view />
	</div>
</template>
<style lang="stylus" src="./app.styl"></style>
<script>
export default {
	name: "app",
	data: () => {
		return {};
	},
	components: {},
	mounted: function() {
		this.sockets.subscribe("NEW_PLAYER", players => {
			this.$store.commit('SET_PLAYERS', players);
		});

		this.sockets.subscribe("NEW_TASK", task => {
			var start = this.$store.commit('ADD_TASK', { task: task, callback: this.getPlayersBegin} );
			if (navigator.vibrate) {
				navigator.vibrate([150, 100, 150]);
			}
		});

		this.sockets.subscribe("END_GAME", id => {
			this.$router.push("/game/" + id);
		});

		this.sockets.subscribe("NEW_CHAT", chat => {
			this.$store.commit('ADD_CHAT', chat );
		});

		this.sockets.subscribe("GAME_UPDATE", update => {
			this.$store.commit('GAME_UPDATE', update );
		});

		//reconnect logic
		this.$socket.on("reconnect", function() {
			console.log("Reconnected!");
			if (this.app_gamecode) {
				this.joinRoom(this.app_gameid, this.app_userid);
			}
		}.bind(this));

		//disconnect logic
		this.$socket.on("disconnect", () => {
			console.log("Disconnected!");
		});
	},
	methods: {
		
	}
};
</script>