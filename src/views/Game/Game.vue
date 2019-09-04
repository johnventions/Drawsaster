<template src="./Game.html"></template>
<style src="./Game.styl" lang="styl"></style>

<script>
// @ is an alias to /src
//import HelloWorld from "@/components/HelloWorld.vue";

export default {
	name: "game",
	data: () => {
		return {
			caption: ""
		};
	},
	computed: {
		mySubmissions() {
			return this.$store.state.mySubmissions;
		},
		myTasks() {
			return this.$store.state.queue;
		},
		currentTask() {
			if (this.myTasks.length > 0) {
				return this.myTasks[0];
			}
			return null;
		},
		code() {
			return this.$store.state.code;
		}
	},
	components: {},
	mounted: function() {},
	methods: {
		getNextPlayer: function() {
			var remainingPlayers = this.app_players.filter( (player) => {
				return this.currentTask.chain.indexOf(player._id) == -1;
			});
			if (remainingPlayers.length) {
				return remainingPlayers[0]._id;
			}
			return null;
		},
		submit: function() {
			var caption = this.currentTask.type == 'drawing' ? this.caption : this.caption;
			var payload = {
				task: this.currentTask._id,
				content: caption,
				nextPlayer: this.getNextPlayer()
			};
			this.$http.post("/api/game/" + this.code + "/submit", payload).then( (res) => {
				console.log("Submitted", payload);
			})
			.catch( (err) => {

			})
		}
	}
};
</script>

