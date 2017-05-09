import mongoose from 'mongoose';

export default class MongoConnection {
  constructor(context, config) {
    this.config = config;
  }

  start(context) {
    return new Promise((accept, reject) => {
      mongoose.connect(this.config.uri, (err, res) => {
        if (err) {
          reject(err);
        } else {
          context.logger.info('Connected to MongoDB');
          accept(this);
        }
      });
    });
  }
}
