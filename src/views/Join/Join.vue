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
		};
	},
	components: {},
	mounted: function() {},
	methods: {
		join: function() {
			if (this.pending) return;
			if (this.user != "" && this.code.length == 4) {
				this.pending = true;
				this.$http.post("/api/game/" +this.code + "/join", {
					user: this.user
				}).then( function(res) {
					this.pending = false;
					this.$store.commit('setup', {player: res.data.player, game: res.data.game, players: res.data.players});
					if ( res.data.game.started ) {
						this.$router.push("/game");
					} else {
						this.$router.push("/lobby");
					}
				}.bind(this))
				.catch( (err) => {
					console.log("ERROR", err);
					this.pending = false;
				});
			}
		}
	}
};
</script>

