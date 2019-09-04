const socketIO = require('socket.io');

module.exports = function (server) {
    const io = socketIO(server);

    io.on('connection', (socket) => {
        console.log("Socket Connected!");
        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });

        socket.on('Join', code => {
            socket.join(code);
        });

    });

    return io;
}