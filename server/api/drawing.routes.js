const GameService = require("../utils/GameService.js");

module.exports = function (db, io) {
    const routes = require('express').Router();

    routes.get('/:drawingid', async function(req, res) {
        var id = req.params.drawingid.toUpperCase();
        var drawing = await GameService.FindTask(id);
        if (drawing) {
            let base64Image = Buffer.from(drawing.contentImg);
            res.setHeader('Content-Type', 'image/png');
            res.status(200);
            return res.end( base64Image);
        }
        return null;

    });

    return routes;
}