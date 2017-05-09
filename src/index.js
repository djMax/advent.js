#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import repl from 'repl';
import winston from 'winston';
import minimist from 'minimist';
import bluebird from 'bluebird';
import 'source-map-support/register';
import { AdventService } from './AdventService';

const argv = minimist(process.argv.slice(2), {
  boolean: ['built', 'repl', 'nobind'],
});
const name = 'adventjs-web';

// ES6 native promises are kinda slow, and don't get long stack traces (used in tests)
global.Promise = bluebird;

let dirname = path.join(process.cwd(), 'src');

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' || argv.built) {
  dirname = path.join(process.cwd(), 'build');
} else {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require('babel-register');
}

try {
  const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  if (env) {
    for (const envVar of env.split('\n')) {
      const match = envVar.match(/(?:\S+)?\s*([^=]+)\s*=(.*)\s*/);
      if (match) {
        if (!process.env[match[1]]) {
          winston.info(`Read ${match[1]} environment variable from .env`);
          process.env[match[1]] = match[2];
        }
      }
    }
  }
} catch (error) {
  // Nothing to do
}

winston.info(`Starting ${name} from ${dirname}`);

let service;
let server;

if (argv.nobind) {
  service = new AdventService(name);
  service.configure(dirname).catch((err) => {
    winston.error('Configuration failed', service.wrapError(err));
  });
} else {
  server = new AdventService.Server(name);
  service = server.service;

  server
    .create(dirname)
    .catch(() => {
      if (!argv.repl) {
        process.exit(-1);
      }
    });
}

if (argv.repl) {
  const rl = repl.start('> ');
  rl.on('exit', () => {
    service.destroy();
  });
  rl.context.server = server;
  rl.context.service = service;
}
