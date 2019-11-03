<template src="./Create.html"></template>
<style src="./Create.styl" lang="styl"></style>

<script>
import CookieService from "@/cookies.js";

export default {
	name: "create",
	data: () => {
		return {
			user: CookieService.getCookie("user") || "",
			pending: false,
		};
	},
	components: {},
	mounted: function() {},
	methods: {
		create: function() {
			if (this.pending || this.user.length == 0) return;
			this.pending = true;
			if (this.user != "") {
				this.$http.post("/api/game", {
					user: this.user
				}).then( function(res){
					this.$store.commit('setup', {player: res.data.player, game: res.data.game, players: res.data.players});
					this.joinRoom(this.app_gamecode, this.app_userid);
					if ( res.data.game.started ) {
						this.$router.push("/game");
					} else {
						this.$router.push("/lobby");
					}
				}.bind(this)
				).catch( () => {
					this.pending = false;
				});
			}
		}
	}
};
</script>

