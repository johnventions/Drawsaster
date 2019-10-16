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
			brushes: [
				{
					"min": 1,
					"max": 3,
					"display": "5px"
				},
				{
					"min": 4,
					"max": 8,
					"display": "10px"
				},
				{
					"min": 9,
					"max": 14,
					"display": "15px"
				}
			],
			colors: [
				"black",
				"white",
				"red",
				"orange",
				"yellow",
				"green",
				"blue",
				"purple"
			]
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
		taskImage: function(task) {
			return "/api/drawings/" + task.prompt + ".png";
		},
		setBrush: function(brush) {
			this.signaturePad.minWidth = brush.min;
			this.signaturePad.maxWidth = brush.max;
		},
		setColor: function(color) {
			this.signaturePad.penColor = color;
		},
		submit: function() {
			var data = this.currentTask.type == 'drawing' ? this.signaturePad.toDataURL() : this.caption;
			var payload = {
				task: this.currentTask._id,
				content: data,
				nextPlayer: this.getNextPlayer()
			};
			this.$http.post("/api/game/" + this.app_gameid + "/submit", payload)
				.then( (res) => {
					console.log("Submitted", payload);
					this.$store.commit("POP_QUEUE");
					this.caption = "";
				})
				.catch( (err) => {

				});
		}
	}
};
</script>

