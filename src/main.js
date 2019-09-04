import Vue from 'vue'
import App from './App.vue'
import router from './router'
import authGuard from './authGuard'
import VueSocketIO from 'vue-socket.io'
import settings from "./settings";
import store from './store'
import Axios from "axios";

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
		}
	},
	methods: {
		joinRoom: function(code, playerid) {
			console.log("Joining: ", code);
			this.$socket.emit('Join', code);
			this.$socket.emit('Join', playerid);
		}
	}
});

new Vue({
	router,
	store,
	render: h => h(App)
}).$mount('#app')