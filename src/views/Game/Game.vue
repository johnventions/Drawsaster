<template src="./Game.html"></template>
<style src="./Game.styl" lang="styl"></style>

<script>
export default {
	name: "game",
	data: () => {
		return {
			chatDrawing: false,
			chatMode: 1, // 1 == view chats, 2 == status
			gameMode: true,
			submitting: false,
			caption: "",
			brushMax: 3,
			activeColor: "black",
			activeBrush: null,
			brushes: [
				{
					"dotSize": 2,
					"minWidth": 2,
					"maxWidth": 3,
					"display": "5px"
				},
				{
					"dotSize": 5,
					"minWidth": 5,
					"maxWidth": 8,
					"display": "10px"
				},
				{
					"dotSize": 12,
					"minWidth": 12,
					"maxWidth": 14,
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
		options() {
			return {
				backgroundColor: "white",
				dotSize: 3,
				minWidth: 2, 
				maxWidth: 3,
				minDistance: 5,
				penColor: this.activeColor,
				onEnd: this.onEnd,
			}
		},
		mySubmissions() {
			return this.$store.state.mySubmissions;
		},
		myTasks() {
			return this.$store.state.queue;
		},
		showAlert() {
			return this.$store.state.showAlert;
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
	mounted: function() {
		if (this.currentTask && this.currentTask.type == 'drawing') {
			this.setupCanvas();
		}
	},
	methods: {
		signaturePad() {
			return this.$refs['signaturePad'] ? this.$refs['signaturePad'].signaturePad : null;
		},
		chatPad() {
			return this.$refs['chatPad'] ? this.$refs['chatPad'].signaturePad : null;
		},
		setupCanvas() {
			this.setBrush( this.brushes[0] );
			this.setColor("black");
		},
		undo() {
			if (this.signaturePad()) {
				const data = this.signaturePad().toData();
				if (data) {
					this.signaturePad().undo();
				}
			}
		},
		onEnd(data) {
			
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
			this.activeBrush = brush;
			this.signaturePad().dotSize = brush.dotSize;
			this.signaturePad().minWidth = brush.minWidth;
			this.signaturePad().maxWidth = brush.maxWidth;
		},
		setColor: function(color) {
			this.activeColor = color;
			this.signaturePad().penColor = color;
		},
		submit: function() {
			if (this.submitting) {
				return;
			}
			if (this.currentTask.type == 'drawing') {
				if ( this.signaturePad().isEmpty() ) {
					return;
				}
			} else if (this.caption.trim() == '') {
				return;
			}
			var data = this.currentTask.type == 'drawing' ? document.querySelector("#signature > canvas").toDataURL() : this.caption;
			var payload = {
				taskID: this.currentTask._id,
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
			this.$nextTick( ()=> {
				this.setupCanvas();
			});
		},
		addChat() {
			this.chatDrawing = true;
		},
		cancelChat() {
			this.chatDrawing = false;
		},
		sendChat() {
			if (this.chatPad().isEmpty()) {
				return;
			}
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
		},
		chatClass(index) {
			var m = (this.myChats.length - index) % 2;
			return m ? "chat-left" : "chat-right";
		},
		toggleChat() {
			this.chatMode = 1;
		},
		toggleStatus() {
			this.chatMode = 2;
		}

	}
};
</script>

