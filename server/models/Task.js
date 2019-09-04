var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var taskSchema = new Schema({
    _id: Schema.Types.ObjectId,
    createDate: { type: Date, Default: Date.now },
    author: { type: Schema.Types.ObjectId, ref: 'Player' },
    game: { type: Schema.Types.ObjectId, ref: 'Game' },
    chain: [Schema.Types.ObjectId],
    completed: { type: Boolean, Default: 0 },
    type: String,
    contentString: String,
    prompt: String,
    contentImg: Buffer
});

var Task = mongoose.model('Task', taskSchema);

module.exports = Task;
