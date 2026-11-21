<template src="./Lobby.html"></template>
<style src="./Lobby.scss" lang="scss"></style>

<script>
import { mapGetters } from "vuex";

export default {
	name: "lobby",
	data: () => ({
		pending: false,
		error: ""
	}),
	computed: {
		...mapGetters(["you", "players"]),
		code() {
			return this.$store.state.session?.code ?? "";
		},
		minPlayers() {
			return this.$store.state.snapshot?.minPlayers ?? 3;
		},
		canStart() {
			return this.you?.isHost && this.players.length >= this.minPlayers;
		},
		shareURL() {
			return window.location.origin + "/join?code=" + this.code;
		}
	},
	methods: {
		async startGame() {
			this.pending = true;
			this.error = "";
			try {
				await this.$request("game:start");
				// App moves everyone to /game when the state says the game is playing
			} catch (err) {
				this.error = err.message;
				this.pending = false;
			}
		},
		async share() {
			if (navigator.share) {
				navigator.share({
					title: document.title,
					text: "Lets play Drawsaster!",
					url: this.shareURL
				}).catch(() => {});
				return;
			}
			try {
				await navigator.clipboard.writeText(this.shareURL);
				alert("Share URL copied to clipboard");
			} catch {
				this.$refs.shareURL.select();
			}
		}
	}
};
</script>
