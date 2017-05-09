import session from 'express-session';
import mongoose from 'mongoose';
import ConnectMongo from 'connect-mongo';

const MongoStore = ConnectMongo(session);

module.exports = function (sessionConfig, mongoConfig) {

  // add the 'store' property to our session configuration
  sessionConfig.store = new MongoStore({
    mongooseConnection: mongoose.connection
  });

  // create the actual middleware
  return session(sessionConfig);
};