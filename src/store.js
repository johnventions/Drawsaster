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
		nextPlayer: null,
		players: [],
		queue: [],
		mySubmissions: [],
		chats: []
	},
	mutations: {
		setup(state, payload) {
			this.commit('SET_LOGIN', payload.player);
			this.commit('SET_GAME', payload.game);
			this.commit('SET_PLAYERS', payload.players)
			this.commit('SET_QUEUE', payload.tasks)
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
			state.players = players.sort( function(a, b) {
				return a.playOrder > b.playOrder ? 1 : -1;
			});
			var curPlayer = state.userID;
			var i = state.players.findIndex( p => {
				return p._id == curPlayer;
			});
			if (i == state.players.length - 1) {
				this.commit("SET_NEXT_PLAYER", players[0]._id);
			} else {
				this.commit("SET_NEXT_PLAYER", players[ i + 1 ]._id);
			}
		},
		SET_NEXT_PLAYER(state, playerID) {
			state.nextPlayer = playerID;
		},
		SET_QUEUE(state, tasks) {
			state.queue = tasks || [];
		},
		ADD_TASK(state, payload) {
			state.queue.push(payload.task);
			if (!state.started) {
				state.started = true;
				if (payload.callback) {
					payload.callback();
				}
			}
		},
		ADD_CHAT(state, payload) {
			state.chats.push(payload);
		},
		POP_QUEUE(state) {
			state.queue.shift();
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