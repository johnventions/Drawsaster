<template src="./Game.html"></template>
<style src="./Game.scss" lang="scss"></style>

<script>
import { mapGetters } from "vuex";
import { dataUrlToBlob, submitStep } from "@/api";

export default {
	name: "game",
	data: () => ({
		chatDrawing: false,
		chatMode: 1, // 1 == view chats, 2 == status
		gameMode: true,
		submitting: false,
		error: "",
		caption: "",
		activeColor: "black",
		activeBrush: null,
		brushes: [
			{ dotSize: 2, minWidth: 2, maxWidth: 3, display: "5px" },
			{ dotSize: 5, minWidth: 5, maxWidth: 8, display: "10px" },
			{ dotSize: 12, minWidth: 12, maxWidth: 14, display: "15px" }
		],
		colors: ["black", "white", "red", "orange", "yellow", "green", "blue", "purple"]
	}),
	computed: {
		...mapGetters(["you", "players", "tasks"]),
		options() {
			return {
				backgroundColor: "white",
				dotSize: 3,
				minWidth: 2,
				maxWidth: 3,
				minDistance: 5,
				penColor: this.activeColor
			};
		},
		currentTask() {
			return this.tasks[0] ?? null;
		},
		taskKey() {
			return this.currentTask ? `${this.currentTask.chain}-${this.currentTask.step}` : null;
		},
		/** Tasks waiting behind the current one. */
		queued() {
			return Math.max(this.tasks.length - 1, 0);
		},
		progress() {
			return this.$store.state.snapshot?.progress ?? { done: 0, total: 0 };
		},
		showAlert() {
			return this.$store.state.showAlert;
		},
		myChats() {
			return [...this.$store.state.chats].reverse();
		}
	},
	watch: {
		// a new task arrived while this page is open: reset the inputs
		taskKey(key, old) {
			if (key === old) return;
			this.caption = "";
			this.error = "";
			if (this.currentTask?.type === "drawing" && this.gameMode) {
				this.$nextTick(() => this.setupCanvas());
			}
		}
	},
	mounted() {
		if (this.currentTask?.type === "drawing") {
			this.setupCanvas();
		}
	},
	methods: {
		pad() {
			return this.$refs.signaturePad?.signaturePad ?? null;
		},
		setupCanvas() {
			if (!this.pad()) return;
			this.setBrush(this.brushes[0]);
			this.setColor("black");
		},
		undo() {
			this.$refs.signaturePad?.undo();
		},
		authorName(id) {
			return this.players.find(p => p.id === id)?.name ?? "--";
		},
		setBrush(brush) {
			this.activeBrush = brush;
			const pad = this.pad();
			if (!pad) return;
			pad.dotSize = brush.dotSize;
			pad.minWidth = brush.minWidth;
			pad.maxWidth = brush.maxWidth;
		},
		setColor(color) {
			this.activeColor = color;
			const pad = this.pad();
			if (pad) pad.penColor = color;
		},
		async submit() {
			const task = this.currentTask;
			if (this.submitting || !task) return;
			let content;
			if (task.type === "drawing") {
				if (this.$refs.signaturePad.isEmpty()) return;
				content = await dataUrlToBlob(this.$refs.signaturePad.toDataURL());
			} else {
				if (this.caption.trim() === "") return;
				content = this.caption;
			}
			this.submitting = true;
			this.error = "";
			try {
				await submitStep(this.$store.state.session, task, content);
				this.caption = "";
				this.gameMode = false;
			} catch (err) {
				this.error = err.message;
			} finally {
				this.submitting = false;
			}
		},
		startNext() {
			this.gameMode = true;
			this.$nextTick(() => this.setupCanvas());
		},
		addChat() {
			this.chatDrawing = true;
		},
		cancelChat() {
			this.chatDrawing = false;
		},
		async sendChat() {
			const chatPad = this.$refs.chatPad;
			if (!chatPad || chatPad.isEmpty()) return;
			const image = chatPad.toDataURL();
			this.chatDrawing = false;
			try {
				await this.$request("chat:send", { image });
			} catch (err) {
				alert(err.message);
			}
		},
		async skip(player) {
			if (!confirm(`Skip ${player.name}'s turn? Their next step will be passed on without them.`)) return;
			try {
				await this.$request("host:skip", { playerId: player.id });
			} catch (err) {
				alert(err.message);
			}
		},
		chatClass(index) {
			return (this.myChats.length - index) % 2 ? "chat-left" : "chat-right";
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
