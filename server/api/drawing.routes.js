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

            // let base64Image = Buffer.from(drawing.contentImg, 'base64');
            // const im = base64Image.toString().split(",")[1];
            // const img = Buffer.from(im, 'base64');
            // console.log("Generating Image");
            // res.writeHead(200, {
            //     'Content-Type': 'image/png',
            //     'Content-Length': img.length
            // });
            // // res.end(img);
            // // console.log(drawing.contentImg.toString('base64'));
            // return res.end( img );
        } else {
            return null;
        }
    });

    return routes;
}