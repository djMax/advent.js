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
    console.log('Connected!', socket.id);
    socket.on('player', function (d) {
        socket.broadcast.emit('player', { content: d, source: socket.id });
    });
    socket.on('playerResponse', function (d) {
        socket.broadcast.emit('playerResponse', { content: d, source: socket.id });
    });
    socket.on('chat', function (d) {
        socket.broadcast.emit('chat', { content: d, source: socket.id });
    });
    socket.on('newGame', function (d) {
        socket.broadcast.emit('newGame', { content: d, source: socket.id });
    });
    socket.on('win', function (d) {
        socket.broadcast.emit('win', { content: d, source: socket.id });
    });
    socket.on('share', function (d) {
        socket.broadcast.emit('share', { content: d, source: socket.id });
    });
});
