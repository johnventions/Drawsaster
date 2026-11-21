<template src="./Home.html"></template>
<style src="./Home.scss" lang="scss"></style>

<script>
import { leaveGame } from "@/leave";

export default {
	name: "home",
	computed: {
		session() {
			return this.$store.state.session;
		},
		resumePath() {
			return this.$store.state.snapshot?.phase === "playing" ? "/game" : "/lobby";
		}
	},
	methods: {
		leave() {
			leaveGame(this);
		}
	}
};
</script>
