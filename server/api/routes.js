
module.exports = function (db, io) {
    const routes = require('express').Router();
    const game = require("./game")(db, io);

    routes.use("/game", game);

    routes.get('/', (req, res) => {
        res.status(200).json({ message: 'Connected!' });
    });


    return routes;
}