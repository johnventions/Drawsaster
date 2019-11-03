const GameService = require("../utils/GameService.js");

module.exports = function (db, io) {
    const routes = require('express').Router();

    routes.get('/:drawingid', async function(req, res) {
        var id = req.params.drawingid;
        var drawing = await GameService.FindTask(id);
        if (drawing) {
            const path = './drawings/' + id + '.png'
            try {
                if (fs.existsSync(path)) {
                    return res.status(200).contentType("image/png").end( );
                } else {

                }
            } catch (err) {
                console.error(err);
                res.send("Error");
            }
            //not found
            return res.send("Fail");
        } else {
            return null;
        }
    });

    return routes;
}