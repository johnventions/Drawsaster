<template src="./Home.html"></template>
<style src="./Home.styl" lang="styl"></style>

<script>
// @ is an alias to /src
//import HelloWorld from "@/components/HelloWorld.vue";
export default {
	name: "home",
	data: () => {
		return {};
	},
	components: {},
	mounted: function() {
		console.log(this.sockets);
		this.sockets.unsubscribe("message");
		this.sockets.subscribe("message", m => {
			this.receive(m);
		});
	},
	methods: {
		receive: function(m) {
			console.log(m);
		}
	}
};
</script>

