import io from 'socket.io-client';
import { EventEmitter } from 'events';

class SocketHandler extends EventEmitter {
  initialize() {
    if (!this.io) {
      this.io = io();

      this.io.on('share', (e) => {
        this.emit('share', e.content.code, e.source);
      });
    }
  }

  send(msg, body) {
    this.io.emit(msg, body);
  }
}

export const SocketIO = new SocketHandler();
