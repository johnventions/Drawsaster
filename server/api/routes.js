
module.exports = function (db, io) {
    const routes = require('express').Router();
    const game = require("./game.routes")(db, io);
    const drawing = require("./drawing.routes")(db, io);

    routes.use("/game", game);
    routes.use("/drawings", drawing);

    routes.get('/', (req, res) => {
        res.status(200).json({ message: 'Connected!' });
    });

    return routes;
}