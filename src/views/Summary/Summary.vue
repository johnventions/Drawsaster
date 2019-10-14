<template src="./Summary.html"></template>
<style src="./Summary.styl" lang="styl"></style>
<script>
// @ is an alias to /src

export default {
	name: "ending",
	data: () => {
		return {
			tasks: [],
			activeStory: null,
			activeTasks: []
		};
	},
	components: {

	},
	computed: {
		stories() {
			return this.tasks.filter( function(x) {
				return x.chain.length == 1;
			})
		}
	},
	mounted: function() {
		this.loadTasks();
	},
	methods: {
		authorName: function(id) {
			var p = this.app_players.find( (x) => {
				return x._id == id;
			});
			return p ? p.name : "--";
		},
		updateStory(task) {
			if (this.tasks != null) {
				this.activeTasks = this.tasks.filter( (v) => {
					return v.chain[0] == task;
				});
			}
		},
		drawingURL: function(id) {
			return `/api/drawings/${id}.png`;
		},
		loadTasks: function() {
			this.$http.get("/api/game/" + this.$route.params.id + "/tasks")
				.then( function(res) {
					this.tasks = res.data.tasks;
					this.$store.commit("SET_PLAYERS", res.data.players);
			}.bind(this))
			.catch(function(err) {
				console.log("ERROR", err);
			});
		}
	}
};
</script>

