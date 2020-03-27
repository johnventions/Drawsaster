<template src="./Join.html"></template>
<style src="./Join.styl" lang="styl" scoped></style>

<script>
import CookieService from "@/cookies.js";

export default {
	name: "join",
	data: () => {
		return {
			user: CookieService.getCookie("user") || "",
			code: CookieService.getCookie("code") || "",
			pending: false,
			loginError: false,
			errorMessage: ""
		};
	},
	components: {},
	mounted: function() {
		var urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('code')) {
			this.code = urlParams.get("code");
		}
	},
	methods: {
		join: function() {
			if (this.pending) return;
			if (this.user != "" && this.code.length == 4) {
				this.pending = true;
				this.loginError = false;
				this.$http.post("/api/game/join/" + this.code, {
					user: this.user
				}).then( (res) => {
					this.pending = false;
					this.$store.commit('setup', {
						player: res.data.player, 
						game: res.data.game, 
						players: res.data.players,
						tasks: res.data.tasks
					});
					this.joinRoom(this.app_gameid, this.app_userid);
					if ( res.data.game.started ) {
						if (res.data.game.completed) {
							this.$router.push("/game/" + res.data.game._id);
						} else {
							this.$router.push("/game");
						}
					} else {
						this.$router.push("/lobby");
					}
				})
				.catch( (err) => {
					this.loginError = true;
					this.errorMessage = err.response.data.message;
					this.pending = false;
				});
			}
		}
	}
};
</script>

