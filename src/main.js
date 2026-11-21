import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import authGuard from './authGuard';
import store from './store';
import socket from './socket';
import DrawPad from './components/DrawPad.vue';

import './styles/app.scss';
import './styles/form.scss';
import './styles/bubbles.scss';

router.beforeEach(authGuard);

createApp(App)
	.component('DrawPad', DrawPad)
	.use(router)
	.use(store)
	.use(socket)
	.mount('#app');
