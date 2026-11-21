<template src="./Create.html"></template>

<script>
import { loadName, saveName } from "@/session";

export default {
	name: "create",
	data: () => ({
		user: loadName(),
		pending: false,
		error: ""
	}),
	methods: {
		async create() {
			if (this.pending || !this.user.trim()) return;
			this.pending = true;
			this.error = "";
			try {
				const { session } = await this.$request("game:create", { name: this.user });
				saveName(this.user.trim());
				this.$store.commit("SET_SESSION", session);
				this.$router.push("/lobby");
			} catch (err) {
				this.error = err.message;
				this.pending = false;
			}
		}
	}
};
</script>
