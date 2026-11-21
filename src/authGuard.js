import store from './store';

// Send players who aren't in a game back to the home page.
export default function authGuard(to) {
	if (to.matched.some(record => record.meta.requiresAuth) && !store.getters.status.loggedIn) {
		return { path: '/', query: { redirect: to.fullPath } };
	}
}
