import Vue from 'vue'
import App from './App.vue'
import router from './router'
import authGuard from './authGuard'
import VueSocketIO from 'vue-socket.io'
import settings from "./settings";
import store from './store'
import Axios from "axios";
import VueSignaturePad from './vendor/vue-signature-pad.esm';

Vue.use(VueSignaturePad);

require('./styles/form.styl')
require('./styles/bubbles.styl')

router.beforeEach(authGuard);

Vue.prototype.$http = Axios;
Vue.prototype.$settings = settings;
Vue.config.productionTip = false;

var socketURL = window.location.origin;
if (socketURL.indexOf("localhost") > -1) {
	socketURL = "http://localhost:5050";
}

Vue.use(new VueSocketIO({
	debug: true,
	connection: socketURL
}))

Vue.mixin({
	computed: {
		app_gamecode() {
			return this.$store.state.code;
		},
		app_gameid() {
			return this.$store.state.gameID;
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
		joinRoom: function(gameID, playerid) {
			this.$socket.emit('Join', gameID);
			this.$socket.emit('Join', playerid);
		},
		getPlayersBegin: function () {
			this.$http.get("/api/game/" + this.app_gameid + "/players")
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