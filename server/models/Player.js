var mongoose = require("mongoose");
var Schema = mongoose.Schema;


var playerSchema = new Schema({
    _id: Schema.Types.ObjectId,
    createDate: { type: Date, Default: Date.now },
    name: String,
    game: Schema.Types.ObjectId,
    admin: Boolean,
    playOrder: Number,
    queue: { type: [Schema.Types.ObjectId], default: []}
});

var Player = mongoose.model('Player', playerSchema);

module.exports = Player;
