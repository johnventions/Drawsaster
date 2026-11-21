import { createApp } from 'vue';
import axios from 'axios';
import App from './App.vue';
import router from './router';
import authGuard from './authGuard';
import store from './store';
import settings from './settings';
import { createSocket } from './socket';
import DrawPad from './components/DrawPad.vue';

import './styles/app.scss';
import './styles/form.scss';
import './styles/bubbles.scss';

router.beforeEach(authGuard);

const app = createApp(App);

app.config.globalProperties.$http = axios;
app.config.globalProperties.$settings = settings;

app.component('DrawPad', DrawPad);

app.mixin({
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
		joinRoom(gameID, playerID) {
			this.$socket.emit('Join', gameID);
			this.$socket.emit('Join', playerID);
		},
		getPlayersBegin() {
			this.$http.get('/api/game/' + this.app_gameid + '/players')
				.then(response => {
					if (response.data.success) {
						this.$store.commit('SET_PLAYERS', response.data.players);
						this.$router.push('/game');
					}
				});
		}
	}
});

app.use(router);
app.use(store);
app.use(createSocket());
app.mount('#app');
