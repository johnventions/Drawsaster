<template src="./Summary.html"></template>
<style src="./Summary.scss" lang="scss" scoped></style>
<script>
import { fetchSummary } from "@/api";

/** @typedef {import('../../../shared/protocol').GameSummary} GameSummary */

export default {
	name: "game-summary",
	data: () => ({
		/** @type {GameSummary | null} */
		summary: null,
		error: "",
		activeChain: null
	}),
	computed: {
		stories() {
			if (!this.summary) return [];
			return this.summary.chains.map((chain, index) => {
				const first = chain.steps.find(s => !s.skipped && s.text);
				return { index, label: first ? first.text : `${this.authorName(chain.ownerId)}'s story` };
			});
		},
		activeSteps() {
			if (this.activeChain == null || !this.summary) return [];
			return this.summary.chains[this.activeChain].steps;
		}
	},
	mounted() {
		this.load();
	},
	methods: {
		authorName(id) {
			return this.summary?.players.find(p => p.id === id)?.name ?? "--";
		},
		async load() {
			try {
				this.summary = await fetchSummary(this.$route.params.id);
			} catch (err) {
				this.error = err.message;
			}
		}
	}
};
</script>
