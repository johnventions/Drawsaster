<template src="./Game.html"></template>
<style src="./Game.styl" lang="styl"></style>

<script>
import shuffle from "@/shuffle";

export default {
	name: "game",
	data: () => {
		return {
			chatDrawing: false,
			gameMode: true,
			submitting: false,
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
		mySubmissions() {
			return this.$store.state.mySubmissions;
		},
		myTasks() {
			return this.$store.state.queue;
		},
		myChats() {
			var chats = this.$store.state.chats;
			return [...chats].reverse();
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
		signaturePad() {
			return this.$refs['signaturePad'] ? this.$refs['signaturePad'].signaturePad : null;
		},
		chatPad() {
			return this.$refs['chatPad'] ? this.$refs['chatPad'].signaturePad : null;
		},
		authorName: function(id) {
			var p = this.app_players.find( (x) => {
				return x._id == id;
			});
			return p ? p.name : "--";
		},
		getNextPlayer: function() {
			var n = this.app_next_player;
			//check if the next player already worked on this chain
			if (this.currentTask.chain.indexOf(n) > -1) {
				return null;
			}
			return n;
		},
		idToImage: function(_id) {
			return "/api/drawings/" + _id + ".png";
		},
		setBrush: function(brush) {
			this.signaturePad().minWidth = brush.min;
			this.signaturePad().maxWidth = brush.max;
		},
		setColor: function(color) {
			this.signaturePad().penColor = color;
		},
		submit: function() {
			if (this.submitting) {
				return;
			}
			var data = this.currentTask.type == 'drawing' ? document.querySelector("#signature > canvas").toDataURL() : this.caption;
			var payload = {
				task: this.currentTask._id,
				content: data,
				nextPlayer: this.getNextPlayer()
			};
			this.submitting = true;
			this.$http.post("/api/game/" + this.app_gameid + "/submit", payload)
				.then( (res) => {
					this.$store.commit("POP_QUEUE");
					this.caption = "";
					this.gameMode = false;
					this.submitting = false;
				})
				.catch( (err) => {
					this.submitting = false;
				});
		},
		startNext: function() {
			this.gameMode = true;
		},
		addChat() {
			this.chatDrawing = true;
		},
		sendChat() {
			var data = document.querySelector("#signature2 > canvas").toDataURL();
			var payload = {
				player: this.app_userid,
				content: data,
			};
			this.chatDrawing = false;
			this.$http.post("/api/game/" + this.app_gameid + "/chat", payload)
				.then( (res) => {
				})
				.catch( (err) => {

				});
		}
	}
};
</script>

