<template src="./Join.html"></template>
<style src="./Join.scss" lang="scss" scoped></style>

<script>
import { loadName, saveName } from "@/session";

export default {
	name: "join",
	data: () => ({
		user: loadName(),
		code: "",
		pending: false,
		errorMessage: ""
	}),
	mounted() {
		const code = new URLSearchParams(window.location.search).get("code");
		if (code) this.code = code;
	},
	methods: {
		async join() {
			if (this.pending || !this.user.trim() || this.code.trim().length != 4) return;
			this.pending = true;
			this.errorMessage = "";
			try {
				const { session } = await this.$request("game:join", { code: this.code.trim(), name: this.user });
				saveName(this.user.trim());
				this.$store.commit("SET_SESSION", session);
				// App follows the game's phase from here (lobby, or straight into a running game)
				this.$router.push("/lobby");
			} catch (err) {
				this.errorMessage = err.message;
				this.pending = false;
			}
		}
	}
};
</script>
