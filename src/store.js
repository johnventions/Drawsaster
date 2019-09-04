import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
	state: {
		token: '',
		loggedIn: 0, // bool for logged in
		user: '',
		userID: '',
		code: '',
		admin: 0,
		gameID: null,
		started: false,
		players: [],
		queue: [],
		mySubmissions: []
	},
	mutations: {
		setup(state, payload) {
			console.log("Setup");
			this.commit('SET_LOGIN', payload.player);
			this.commit('SET_GAME', payload.game);
			this.commit('SET_PLAYERS', payload.players)
		},
		SET_LOGIN(state, player) {
			state.loggedIn = 1;
			state.user = player.name;
			state.userID = player._id;
			state.admin = player.admin;
		},
		SET_GAME(state, game) {
			state.gameID = game._id;
			state.started = game.started;
			state.code = game.code;
		},
		SET_PLAYERS(state, players) {
			state.players = players;
		},
		ADD_TASK(state, payload) {
			state.queue.push(payload.task);
			if (!state.started) {
				state.started = true;
				payload.router.push("/game");
			}
		}
	},
	getters: {
		status: state => {
			return {
				loggedIn: state.loggedIn,
				user: state.user,
				userID: state.userID,
				code: state.code,
				admin: state.admin
			}
		},
		players: state => {
			return state.players;
		}
	},
	actions: {

	}
})