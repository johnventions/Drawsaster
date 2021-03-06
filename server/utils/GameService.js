const Game = require("../models/Game.js");
const Player = require("../models/Player.js");
const Task = require("../models/Task.js");
const fs = require('fs');
var mongoose = require("mongoose");

const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const makecode = () => {
    var code = "";
    for (var i = 0; i < 4; i++)
        code += alpha.charAt(Math.floor(Math.random() * alpha.length));
    return code;
}

const nameSanitize = (name) => name.trim().toLowerCase();

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
        return prevTask._id;
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
            players: []
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
            name: name.trim(),
            nameLower: nameSanitize(name),
            game: game._id,
            playOrder: Math.floor(Math.random() * 100),
            admin: admin
        });
        return p.save().then( function() {
            game.players.push(p._id);
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

    /** @param {string} code */
    FindGameById: async function (id) {
        return Game.findById(id, function (err, game) {
            if (err) {
                return null;
            }
            return game;
        });
    },


    /** @param {id} gameID */
    /** @param {string} name */
    FindPlayer: async function(gameID, name) {
        const nameLower = nameSanitize(name);
        return Player.findOne({ game: gameID, nameLower: nameLower}, function(err, p) {
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

    /** @param {id} gameID */
    /** @param {id} playerID */
    FindOpenUserTasks: async function (gameID, playerID) {
        return Task.find({ game: gameID, 
                author: playerID, 
                completed: false }, function (err, t) {
            if (err) {
                return [];
            }
            return t;
        })
    },

    /**  @param { id } gameID */
    FindGameTasks: async function (gameID) {
        return Task.find({
            game: gameID,
        }
        , "_id chain type author contentString"
        , function (err, tasks) {
            if (err) {
                return [];
            }
            return tasks;
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
        players.forEach( (player) => {
            this.CreateTask(game._id, null, player._id);
        });
    },

    FindTask: async function (taskID) {
        //find the task
        return Task.findById(taskID, function (err, t) {
            return t;
        });
    },

    FinishTask: async function(task, content) {
        task.completed = true;
        if (task.type == 'drawing') {
            task.contentImg = content;
        } else {
            task.contentString = content;
        }
        return task.save()
            .then( t => {
                return t;
            });
    },

    CreateTask: async function(gameID, prevTask, playerID) {
        var t = new Task({
            _id: new mongoose.Types.ObjectId,
            createDate: Date.now(),
            author: playerID,
            game: gameID,
            chain: buildChain(prevTask, playerID),
            type: nextStep(prevTask),
            prompt: getPrompt(prevTask),
            completed: 0,
        });
        await t.save();
        this.io.to(playerID).emit("NEW_TASK", t);
        return t;
    },

    SendUpdate: async function(gameID, players) {
        const openTasks = await Task.find({ game: gameID, completed: 0 }, (err, tasks) => {
            return tasks;
        });
        if (openTasks && openTasks.length > 0) {
            const tasksByPlayer = {};
            players.forEach((playerID) => {
                tasksByPlayer[playerID] = openTasks.filter( x => x.author == playerID).length;
            });
            this.io.to(gameID).emit("GAME_UPDATE", tasksByPlayer);
        }
    },

    CompleteChain: function (game) {
        //check if there are any open tasks
        Task.find({game: game._id, completed: 1}, '_id', (err, tasks) => {
            // if there are the correct number of completed tasks
            const playerCount = game.players.length;
            if (tasks.length == (playerCount * playerCount)) {
                game.completed = true;
                console.log("Ending " + game.code);
                this.io.to(game._id).emit("END_GAME", game._id);
            }
        });
    },

    SaveDrawing(b64, _id) {
        if (_id == null) {
            _id = mongoose.Types.ObjectId();
        }
        fs.writeFile("./drawings/" + _id + ".png", b64, 'base64', function (err) {
            if (err) {
                console.log(err);
            }
        });
        return _id;
    },

    SendChat(gameID, _id, player) {
        this.io.to(gameID).emit("NEW_CHAT", { drawing: _id, player: player} );
    }
}
