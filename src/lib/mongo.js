import mongoose from 'mongoose';

const Code = mongoose.model('Code', {
  name: String,
  code: String,
});

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

  async getCode(name) {
    const code = await Code.findOne({ name });
    if (code) {
      return code.code;
    }
    return null;
  }

  async saveCode(name, code) {
    await Code.findOneAndUpdate({ name }, { name, code }, { upsert: true });
  }
}
