<template src="./Lobby.html"></template>
<style src="./Lobby.styl" lang="styl"></style>

<script>
// @ is an alias to /src
import CookieService from "@/cookies.js";

export default {
	name: "lobby",
	data: () => {
		return {
			pending: false,
			started: false,
		};
	},
	components: {

	},
	mounted: function() {
		CookieService.setCookie("code", this.app_gamecode, 7);
		CookieService.setCookie("user", this.app_username, 7);
		CookieService.setCookie("userID", this.app_userid, 7);
	},
	methods: {
		isAdmin: function() {
			var s = this.$store.getters.status;
			return s.admin;
		},
		status: function() {
			return this.$store.getters.status;
		},
		players: function() {
			return this.$store.getters.players;
		},
		displayStart: function() {
			if (!this.isAdmin()) {
				return false;
			}
			if (this.$settings.minPlayers <= this.players().length) {
				return true;
			}
			return false;
		},
		startGame: function() {
			this.pending = true;
			this.$http.post("/api/game/" + this.app_gameid + "/start", {})
				.then( function() {
					this.started = true;
			}.bind(this))
			.catch(function(err) {
				console.log("ERROR", err);
			});
		},
		canShare: function() {
			if (navigator.share) {
				return true;
			}
			return false;
		},
		share: function() {
			if (navigator.share) {
				navigator.share({
					title: document.title,
					text: "Lets play Drawsaster!",
					url: "https://www.drawsaster.com/join?code=" + this.app_gamecode 
				}).then(() => console.log('Successful share'))
				.catch(error => console.log('Error sharing:', error));
			}
		}
	}
};
</script>

