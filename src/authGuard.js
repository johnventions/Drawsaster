import store from './store';

export default function (to, from, next) {
    if (to.matched.some(record => record.meta.requiresAuth)) {
        var status = store.getters.status;
        // this route requires auth, check if logged in
        // if not, redirect to login page.
        if (!status.loggedIn) {
            next({
                path: '/',
                query: { redirect: to.fullPath }
            })
        } else {
            next()
        }
        next();
    } else {
        next() // make sure to always call next()!
    }
}