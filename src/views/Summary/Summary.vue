<template src="./Summary.html"></template>
<style src="./Summary.scss" lang="scss" scoped></style>
<script>
import { fetchSummary } from "@/api";
import { canvasToBlob, renderSnapshot, snapshotFileName } from "@/snapshot";

/** @typedef {import('../../../shared/protocol').GameSummary} GameSummary */

const HINT_KEY = "drawsaster.snapshotHintSeen";

function readFlag(key) {
	try {
		return localStorage.getItem(key) === "1";
	} catch {
		return false;
	}
}

function writeFlag(key) {
	try {
		localStorage.setItem(key, "1");
	} catch {
		// not important if storage is unavailable
	}
}

export default {
	name: "game-summary",
	data: () => ({
		/** @type {GameSummary | null} */
		summary: null,
		error: "",
		activeChain: null,
		/** index (among played steps) of the first step of the selected pair */
		selected: null,
		hintSeen: readFlag(HINT_KEY),
		snapshotOpen: false,
		snapshot: { range: "pair", style: "purple", names: false, footer: true },
		previewUrl: "",
		previewBlob: null,
		rendering: false,
		snapshotError: "",
		canShare: false
	}),
	computed: {
		stories() {
			if (!this.summary) return [];
			return this.summary.chains.map((chain, index) => {
				const first = chain.steps.find(s => !s.skipped && s.text);
				return { index, label: first ? first.text : `${this.authorName(chain.ownerId)}'s story` };
			});
		},
		/** Steps to display, each with its position among played (not skipped) steps. */
		rows() {
			if (this.activeChain == null || !this.summary) return [];
			let played = 0;
			return this.summary.chains[this.activeChain].steps.map(step => ({
				step,
				playIndex: step.skipped ? null : played++
			}));
		},
		playedSteps() {
			return this.rows.filter(r => r.playIndex != null).map(r => r.step);
		},
		/** The steps the snapshot will contain, from the selection and the range option. */
		snapshotSteps() {
			if (this.selected == null) return [];
			const last = this.playedSteps.length - 1;
			let from = this.selected;
			let to = this.selected + 1;
			if (this.snapshot.range === "prev") from = Math.max(0, from - 1);
			if (this.snapshot.range === "next") to = Math.min(last, to + 1);
			if (this.snapshot.range === "all") {
				from = 0;
				to = last;
			}
			return this.playedSteps.slice(from, to + 1);
		}
	},
	watch: {
		activeChain() {
			this.selected = null;
		},
		snapshot: {
			deep: true,
			handler() {
				if (this.snapshotOpen) this.renderPreview();
			}
		}
	},
	mounted() {
		this.load();
		try {
			const probe = new File([new Blob()], "x.png", { type: "image/png" });
			this.canShare = !!navigator.canShare?.({ files: [probe] });
		} catch {
			this.canShare = false;
		}
	},
	beforeUnmount() {
		if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
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
		},
		isSelected(row) {
			return this.selected != null && row.playIndex != null &&
				(row.playIndex === this.selected || row.playIndex === this.selected + 1);
		},
		toggleSelect(row) {
			if (row.playIndex == null || this.playedSteps.length < 2) return;
			const start = Math.min(row.playIndex, this.playedSteps.length - 2);
			this.selected = this.isSelected(row) ? null : start;
			if (!this.hintSeen) {
				this.hintSeen = true;
				writeFlag(HINT_KEY);
			}
		},
		clearSelection() {
			this.selected = null;
		},
		openSnapshot() {
			this.snapshot.range = "pair";
			this.snapshotOpen = true;
			this.renderPreview();
		},
		closeSnapshot() {
			this.snapshotOpen = false;
		},
		async renderPreview() {
			const steps = this.snapshotSteps;
			if (!steps.length) return;
			this.rendering = true;
			this.snapshotError = "";
			try {
				const canvas = await renderSnapshot({
					steps,
					authorName: this.authorName,
					options: { ...this.snapshot }
				});
				const blob = await canvasToBlob(canvas);
				if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
				this.previewBlob = blob;
				this.previewUrl = URL.createObjectURL(blob);
			} catch (err) {
				this.snapshotError = err.message || "Could not create the snapshot";
			} finally {
				this.rendering = false;
			}
		},
		fileName() {
			return snapshotFileName(this.summary?.code ?? "game", this.snapshotSteps);
		},
		download() {
			if (!this.previewUrl) return;
			const a = document.createElement("a");
			a.href = this.previewUrl;
			a.download = this.fileName();
			document.body.appendChild(a);
			a.click();
			a.remove();
		},
		async share() {
			if (!this.previewBlob) return;
			const file = new File([this.previewBlob], this.fileName(), { type: "image/png" });
			try {
				await navigator.share({ files: [file], title: "Drawsaster" });
			} catch (err) {
				if (err.name !== "AbortError") this.snapshotError = "Sharing didn't work. Try Download instead.";
			}
		}
	}
};
</script>
