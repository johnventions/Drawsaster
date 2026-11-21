import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/Home/Home.vue';
import About from './views/About/About.vue';
import Create from './views/Create/Create.vue';
import Join from './views/Join/Join.vue';
import Lobby from './views/Lobby/Lobby.vue';
import Game from './views/Game/Game.vue';
import Summary from './views/Summary/Summary.vue';

export default createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{ path: '/', name: 'home', component: Home },
		{ path: '/about', name: 'about', component: About },
		{ path: '/create', name: 'create', component: Create },
		{ path: '/join', name: 'join', component: Join },
		{ path: '/lobby', name: 'lobby', component: Lobby, meta: { requiresAuth: true } },
		{ path: '/game', name: 'game', component: Game, meta: { requiresAuth: true } },
		{ path: '/game/:id', name: 'summary', component: Summary }
	],
	scrollBehavior(to, from, savedPosition) {
		return new Promise(resolve => {
			setTimeout(() => {
				resolve(savedPosition || { left: 0, top: 0 });
			}, 600);
		});
	}
});
