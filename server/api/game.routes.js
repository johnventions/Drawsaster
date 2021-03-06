
const Game = require("../models/Game.js");
const GameService = require("../utils/GameService.js");
const routes = require('express').Router();
const fs = require('fs');


module.exports = function (db, io) {
    GameService.io = io;

    //create new game
    routes.post("/", async function (req, res) {
        var name = req.body.user;
        var newgame = await GameService.NewGame();
        var newplayer = await GameService.NewPlayer(newgame, name, true);
        newgame.save();
        req.session.code = newgame.code;
        req.session.gameID = newgame._id;
        return res.status(200).json({
        success: true,
            game: GameService.GetGameData(newgame),
            player: GameService.GetPlayerData(newplayer),
            players: [newplayer],
            message: 'Connected!'
        });
    });

    routes.post("/join/:gamecode", async function (req, res) {
        const name = req.body.user;
        const code = req.params.gamecode.toUpperCase();
        var game = await GameService.FindGame(code);
        if (game == null) {
            return res.status(400).json({
                success: false,
                message: "Game not found"
            });
        }
        //check if player exists
        var newplayer = await GameService.FindPlayer(game._id, name);
        if (newplayer == null) {
            //create new player if not found
            if (!game.started) {
                newplayer = await GameService.NewPlayer(game, name, false);
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Player not found"
                });
            }
        }
        var players = await GameService.FindPlayers(game._id);
        var tasks = [];
        if (game.started) {
            tasks = await GameService.FindOpenUserTasks(game._id, newplayer._id);
        }
        game.save();
        io.to(game._id).emit("NEW_PLAYER", players);
        return res.status(200).json({
            success: true,
            game: GameService.GetGameData(game),
            player: GameService.GetPlayerData(newplayer),
            players: players,
            tasks: tasks,
            message: 'Connected!'
        });
    });

    routes.get("/:gameid/players", async function (req, res) {
        var id = req.params.gameid;
        //find game to start
        var game = await GameService.FindGameById(id);
        if (game == null) {
            return res.status(400).json({
                success: false,
                message: "Game not found"
            });
        }
        var players = await GameService.FindPlayers(game._id);
        return res.status(200).json({
            success: true,
            players: players
        });
    });

    routes.post("/:gameid/start", async function(req, res){
        var id = req.params.gameid;
        //find game to start
        var game = await GameService.FindGameById(id);
        if (game == null) {
            return res.status(400).json({
                success: false,
                message: "Game not found"
            });
        }
        var players = await GameService.FindPlayers(game._id);
        GameService.StartGame(game, players);
        return res.status(200).json({
            success: true,
        });
    });


    routes.post("/:gameid/submit", async function (req, res) {
        var id = req.params.gameid;
        const { taskID, content, nextPlayer } = req.body;
        //find game to start
        var game = await GameService.FindGameById(id);
        if (game == null) {
            return res.status(404).json({
                success: false,
            });
        }
        var task = await GameService.FindTask(taskID);
        if (task == null) {
            return res.status(400).json({
                success: false,
                message: "Game not found"
            });
        }
        var completedTask = await GameService.FinishTask(task, content);
        if (task.type == 'drawing') {
            const b64 = content.split("base64,")[1];
            GameService.SaveDrawing(b64, task._id);
        }
        if (nextPlayer) {
            var newTask = await GameService.CreateTask(completedTask.game, completedTask, nextPlayer);
        } else {
            GameService.CompleteChain(game, task);
            game.save();
            console.log("Finished chain");
        }
        GameService.SendUpdate(game._id, game.players);
        return res.status(200).json({
            success: true,
        });
    });

    routes.get("/:gameid/tasks", async function (req, res) {
        var id = req.params.gameid;
        var tasks = await GameService.FindGameTasks(id);
        var players = await GameService.FindPlayers(id);
        tasks = tasks.sort(function(a, b) {
            return a.chain.length > b.chain.length ? 1 : -1;
        });
        return res.status(200).json({
            success: true,
            tasks: tasks,
            players: players
        });
    });

    routes.post("/:gameid/chat", async function (req, res) {
        var id = req.params.gameid;
        var content = req.body.content;
        var player = req.body.player;
        //find game to start
        var game = await GameService.FindGameById(id);
        if (game == null) {

        }
        //save file
        const b64 = content.split("base64,")[1];
        var dwg = GameService.SaveDrawing(b64, null);
        GameService.SendChat(game._id, dwg, player);
        return res.status(200).json({
            success: true,
            drawing: dwg
        });
    });

    return routes;
}













