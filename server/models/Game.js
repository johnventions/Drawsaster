var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var gameSchema = new Schema({
    _id: Schema.Types.ObjectId,
    createDate: { type: Date, Default: Date.now },
    code: String,
    started: Boolean,
    completed: Boolean,
    players: [String]
});

var Game = mongoose.model('Game', gameSchema);

module.exports = Game;
