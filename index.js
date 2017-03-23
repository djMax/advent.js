'use strict';

var express = require('express');
var kraken = require('kraken-js');
var mongoose = require('mongoose');
var enforce = require('express-sslify');

var options, app;

var uristring =
    process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL ||
    'mongodb://localhost/AdventJS';

/*
 * Create and configure application. Also exports application instance for use by tests.
 * See https://github.com/krakenjs/kraken-js#options for additional configuration options.
 */
options = {
    onconfig: function (config, next) {
        /*
         * Add any additional config setup or overrides here. `config` is an initialized
         * `confit` (https://github.com/krakenjs/confit/) configuration object.
         */
        next(null, config);
    }
};

app = module.exports = express();
app.use(enforce.HTTPS({ trustProtoHeader: true }));
app.use(kraken(options));
app.on('start', function () {
    // Makes connection asynchronously.  Mongoose will queue up database
    // operations and release them when the connection is complete.
    mongoose.connect(uristring, function (err, res) {
        if (err) {
            console.log ('ERROR connecting to MongoDB: ' + err);
        } else {
            console.log('Application ready to serve requests.');
            console.log('Environment: %s', app.kraken.get('env:env'));
        }
    });
});
