# Drawsaster
This project is a rebuild of the game Drawsaster. This implementation is a VueJS front-end with an Express server w/MongoDB backend, running socketIO for quick communication.

## Requirements
This project requires Vue3 CLI, NodeJS, MongoDB (running as a service)

## Project setup
```
npm install
npm install -g nodemon
```

Then update the `server/settings.js` file to include your individual project settings

### Compiles and hot-reloads for development
```
npm run dev
```
These commands need to be run in two separate terminals, so that you can run the Vue webpack server as well as the backend express server. API calls are proxied to the backend via the `package.json` file settings. The API task is configured with nodemon so that it will auto-refresh upon dev changes. Product builds will not require the two tasks, since everything will be run on the express server.

### Compiles and minifies for production
```
npm run build
```
Then upload the directory to your server and run the `server.js` file
