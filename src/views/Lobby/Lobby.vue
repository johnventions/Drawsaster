<template src="./Lobby.html"></template>
<style src="./Lobby.styl" lang="styl"></style>

<script>
// @ is an alias to /src
import { mapState } from 'vuex'
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
	computed: mapState({
		players: (state) => {
			return state.players;
		},
		shareURL: function() {
			return window.location.origin + "/join?code=" + this.app_gamecode;
		}
	}),
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
		displayStart: function() {
			if (!this.isAdmin()) {
				return false;
			}
			if (this.players && this.$settings.minPlayers <= this.players.length) {
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
			return true;
		},
		share: function() {
			if (navigator.share) {
				navigator.share({
					title: document.title,
					text: "Lets play Drawsaster!",
					url: this.shareURL
				}).then(() => console.log('Successful share'))
				.catch(error => console.log('Error sharing:', error));
			} else {
				navigator.permissions.query({name: "clipboard-write"}).then(result => {
					if (result.state == "granted" || result.state == "prompt") {
						/* write to the clipboard now */
						navigator.clipboard.writeText(this.shareURL);
					} else {
						var copyText = document.getElementById("shareURL");
						copyText.select();
						document.execCommand("copy");
					}
				});
				alert("Share URL copied to clipboard");				
			}
		}
	}
};
</script>

