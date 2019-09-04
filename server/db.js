const settings = require("./settings");

module.exports = function (mongoose, session) {
    // Mongo DB
    var Schema = mongoose.Schema;
    var mongoURL = process.env.MONGODB_URI || settings.mongoURL;
    mongoose.connect(mongoURL, { useNewUrlParser: true });

    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        console.log("Database Connection Ready!");
    });

    return db;
}