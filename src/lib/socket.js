import socketio from 'socket.io';

export default class SocketWrapper {
  constructor(context) {
    this.logger = context.logger;
  }

  setup(server) {
    this.logger.info('Attaching Socket.IO');
    this.io = socketio(server);
    this.io.on('connection', s => this.handler(s));
  }

  handler(socket) {
    this.logger.info('Socket connected');

    socket.on('share', (content) => {
      this.logger.info('new code received');
      socket.broadcast.emit('share', {
        content,
        source: socket.id,
      });
    });
  }
}
