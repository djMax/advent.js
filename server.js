'use strict';

var app = require('./index');
var http = require('http');


var server;

/*
 * Create and start HTTP server.
 */

server = http.createServer(app);
var io = require('socket.io')(server);
server.listen(process.env.PORT || 8000);

server.on('listening', function () {
    console.log('Server listening on http://localhost:%d', this.address().port);
});

io.on('connection', function (socket) {
    socket.on('player', function (d) {
        socket.broadcast.emit('player', d);
    });
    socket.on('playerResponse', function (d) {
        socket.broadcast.emit('playerResponse', d);
    });
    socket.on('chat', function (d) {
        socket.broadcast.emit('chat', d);
    });
    socket.on('newGame', function (d) {
        socket.broadcast.emit('newGame', d);
    });
    socket.on('win', function (d) {
        socket.broadcast.emit('win', d);
    });
    socket.on('share', function (d) {
        socket.broadcast.emit('share', d);
    });
});
