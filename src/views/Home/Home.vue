<template src="./Home.html"></template>
<style src="./Home.scss" lang="scss"></style>

<script>
export default {
	name: "home",
	computed: {
		session() {
			return this.$store.state.session;
		},
		resumePath() {
			return this.$store.state.snapshot?.phase === "playing" ? "/game" : "/lobby";
		}
	}
};
</script>
