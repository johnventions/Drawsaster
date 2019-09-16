<template src="./Summary.html"></template>

<script>
// @ is an alias to /src

export default {
	name: "ending",
	data: () => {
		return {
			tasks: [],
			activeTask: null
		};
	},
	components: {

	},
	computed: {
		activeTasks() {
			if (this.tasks != null) {
				return this.tasks.filter( (v, i) => {
					return v.chain[0] == this.activeTask;
				});
			}
			return [];
		},
	},
	mounted: function() {
		this.loadTasks();
	},
	methods: {
		authorName: function(id) {
			var p = this.app_players.find( (x) => {
				return x._id == id;
			});
			console.log(p);
			return p ? p.name : "--";
		},
		drawingURL: function(id) {
			return `/api/drawings/${id}`;
		},
		loadTasks: function() {
			this.$http.get("/api/game/" + this.$route.params.id + "/tasks")
				.then( function(res) {
					this.tasks = res.data.tasks;
					this.$store.commit("SET_PLAYERS", res.data.players);
					this.activeTask = this.tasks[0].author;
			}.bind(this))
			.catch(function(err) {
				console.log("ERROR", err);
			});
		}
	}
};
</script>

