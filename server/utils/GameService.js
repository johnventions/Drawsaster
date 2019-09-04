const Game = require("../models/Game.js");
const Player = require("../models/Player.js");
const Task = require("../models/Task.js");
var mongoose = require("mongoose");

const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function makecode() {
    var code = "";
    for (var i = 0; i < 4; i++)
        code += alpha.charAt(Math.floor(Math.random() * alpha.length));
    return code;
}

function shuffle(array) {
    array.sort(() => Math.random() - 0.5);
}

function nextStep(prevTask) {
    if (prevTask == null) {
        return "start";
    }
    //if last was drawing, send caption. Otherwise send drawing
    return prevTask.type == "drawing" ? "caption" : "drawing";
}

function getPrompt(prevTask) {
    if (prevTask == null) {
        return "";
    }
    if (prevTask.type == "drawing") {
        return "/drawings/" + prevTask._id;
    }
    return prevTask.contentString;
}

function buildChain(prevTask, playerID) {
    if (prevTask == null) {
        return [playerID];
    }
    var oldArray = prevTask.chain.slice(0);
    oldArray.push(playerID);
    return oldArray;
}

module.exports = {
    io: null,
    NewGame: async function () {
        var code = makecode();
        var codeapproved = false;
        while (!codeapproved) {
            var existing = await this.FindGame(code);
            if (existing == null) {
                codeapproved = true;
            } else {
                code = makecode();
            }
        }
        var g = new Game({
            _id: new mongoose.Types.ObjectId,
            code: code,
            createDate: Date.now(),
            started: false,
            completed: false,
            players: 0
        });
        return g;
    },

    /** @param {game} game */
    /** @param {string} name */
    /** @param {bool} admin */
    NewPlayer: async function (game, name, admin) {
        var p = new Player({
            _id: new mongoose.Types.ObjectId,
            createDate: Date.now(),
            name: name,
            game: game._id,
            admin: admin
        });
        return p.save().then( function() {
            game.players++;
            return p;
        });
    },


    /** @param {string} code */
    FindGame: async function (code) {
        code = code.toUpperCase();
        return Game.findOne({ code: code }, function (err, game) {
            if (err) {
                return null;
            }
            return game;
        });
    },

    /** @param {id} gameID */
    /** @param {string} name */
    FindPlayer: async function(gameID, name) {
        return Player.findOne({game: gameID, name: name}, function(err, p) {
            if (err) {
                return null;
            }
            return p;
        });
    },

    /** @param {id} gameID */
    FindPlayers: async function(gameID) {
        return Player.find({game: gameID}, function(err, p){
            if (err) {
                return [];
            }
            return p;
        })
    },

    /** @param {game} game */
    GetGameData: function (game) {
        return {
            _id: game._id,
            code: game.code,
            started: game.started,
            completed: game.completed,
            players: game.players
        }
    },

    /** @param {player} player */
    GetPlayerData: function (player) {
        return player;
    },

    /** @param {game} game */
    StartGame: function(game, players) {
        game.started = true;
        game.save();
        //create a task for each player
        players.forEach( (player, i) => {
            this.CreateTask(game, null, player._id);
        });
    },

    FinishTask: async function(game, taskID, content) {
        //find the task
        return Task.findById(taskID, function (err, t) {
            if (err) {
                return null;
            }
            t.completed = 1;
            if (t.type == 'drawing') {
                t.contentImg = content;
            } else {
                t.contentString = content;
            }
            t.save();
            return t;
        });
    },

    CreateTask: async function(game, prevTask, playerID) {
        var t = new Task({
            _id: new mongoose.Types.ObjectId,
            createDate: Date.now(),
            author: playerID,
            game: game._id,
            chain: buildChain(prevTask, playerID),
            type: nextStep(prevTask),
            prompt: getPrompt(prevTask),
            completed: 0,
        });
        t.save();
        this.io.to(playerID).emit("NEW_TASK", t);
        return t;
    }
}
