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
    socket.on('begin', function (d) {
        socket.broadcast.emit('begin', d);
    })
});
