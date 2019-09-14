import Vue from 'vue'
import App from './App.vue'
import router from './router'
import authGuard from './authGuard'
import VueSocketIO from 'vue-socket.io'
import settings from "./settings";
import store from './store'
import Axios from "axios";

import VueSignaturePad from 'vue-signature-pad';

Vue.use(VueSignaturePad);

require('./styles/form.styl')

router.beforeEach(authGuard);

Vue.prototype.$http = Axios;
Vue.prototype.$settings = settings;
Vue.config.productionTip = false;

Vue.use(new VueSocketIO({
	debug: true,
	connection: 'http://localhost:5050/',
}))

Vue.mixin({
	computed: {
		app_gamecode() {
			return this.$store.state.code;
		},
		app_userid() {
			return this.$store.state.userID;
		},
		app_username() {
			return this.$store.state.user;
		},
		app_players() {
			return this.$store.state.players;
		},
		app_next_player() {
			return this.$store.state.nextPlayer;
		}
	},
	methods: {
		joinRoom: function(code, playerid) {
			console.log("Joining: ", code);
			this.$socket.emit('Join', code);
			this.$socket.emit('Join', playerid);
		},
		getPlayersBegin: function () {
			this.$http.get("/api/game/" + this.app_gamecode + "/players")
				.then(response => {
					if (response.data.success) {
						this.$store.commit("SET_PLAYERS", response.data.players);
						this.$router.push("/game");
					}
				});
		}
	}
});

new Vue({
	router,
	store,
	render: h => h(App)
}).$mount('#app')