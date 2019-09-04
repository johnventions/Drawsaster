# Vue Boilerplate for Socket/MongoDB game
This project contains the initial setup for a Vue v3 CLI project that uses Socket.io and MongoDB for player to player interaction. I found myself repeating the same setup code over and over again, so this project is a starting point for all of the future socket game projects I plan on making. Project is not yet complete (as of July 22nd, 2019)

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
npm run api
npm run dev
```
These commands need to be run in two separate terminals, so that you can run the Vue webpack server as well as the backend express server. API calls are proxied to the backend via the `package.json` file settings. The API task is configured with nodemon so that it will auto-refresh upon dev changes. Product builds will not require the two tasks, since everything will be run on the express server.

### Compiles and minifies for production
```
npm run build
```
Then upload the directory to your server and run the `server.js` file
