<template src="./Game.html"></template>
<style src="./Game.styl" lang="styl"></style>

<script>
// @ is an alias to /src
	import shuffle from "@/shuffle";

export default {
	name: "game",
	data: () => {
		return {
			caption: "",
		};
	},
	computed: {
		signaturePad() {
			return this.$refs['signaturePad'] ? this.$refs['signaturePad'].signaturePad : null;
		},

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
	methods: {
		getNextPlayer: function() {
			var n = this.app_next_player;
			//check if the next player already worked on this chain
			if (this.currentTask.chain.indexOf(n) > -1) {
				return null;
			}
			return n;
		},
		submit: function() {
			var data = this.currentTask.type == 'drawing' ? this.signaturePad.toDataURL() : this.caption;
			var payload = {
				task: this.currentTask._id,
				content: data,
				nextPlayer: this.getNextPlayer()
			};
			this.$http.post("/api/game/" + this.code + "/submit", payload)
				.then( (res) => {
					console.log("Submitted", payload);
					this.$store.commit("POP_QUEUE")
				})
				.catch( (err) => {

				});
		}
	}
};
</script>

