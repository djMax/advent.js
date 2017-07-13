import fetch from 'isomorphic-fetch';
import levenshtein from './levenshtein';
import babeler from './babeler';
import qs from 'query-string';
import { SocketIO } from '../socket';
import { LocalStorage } from '../storage';

export class CodeRunner {
  constructor(delegate) {
    this.delegate = delegate;
    // These functions will be passed to the user-entered code
    this.functions = {
      print: this.print,
      delay: this.delay,
      random: this.random,
      readLine: this.readLine,
      readline: this.readLine,
      choose: this.choose,
      clear: this.clear,
      fetch: this.fetch,
      getSetting: this.getSetting,
      saveSetting: this.saveSetting,
      getOrAsk: this.getOrAsk,
      pickRandom: this.pickRandom,
      playSound: this.playSound,
      show: this.show,
      wait: this.wait,
      youtube: this.youtube,
      send: this.send,
      require: this.require,
    };

    // These functions will automatically have "await" applied to them to
    // allow easier entry into the concept of async programming. Perhaps
    // outputting a warning would be a good thing.
    this.asyncFunctions = ['readLine', 'readline', 'delay', 'choose', 'fetch', 'getOrAsk', 'wait', 'require'];
    SocketIO.on('message', (c, s) => {
      console.log('GOT IT', c, s);
    });
  }

  run(codeText) {
    this.moduleCache = {};
    this.handlers = {};
    const argNames = [];
    const argFns = [];
    Object.entries(this.functions).forEach((kv) => {
      argNames.push(kv[0]);
      argFns.push(kv[1]);
    });
    const transpiled = babeler(
      `async function _user_function_(${argNames.join(',')}) {
        ${codeText}
      }
      _user_function_;`,
      this.asyncFunctions,
    );
    const fn = eval(transpiled);
    fn.apply(null, argFns).then(() => {
      this.delegate.runComplete();
    }).catch((e) => {
      this.delegate.runComplete(e);
    });
  }

  print = (...values) => {
    this.delegate.print(values.join(' '));
  }

  random(minOrMax, optionalMax) {
    let min = minOrMax;
    let max = optionalMax;
    if (maxOrNull === undefined) {
      min = 1;
      max = minOrMax;
    }
    const rand = Math.floor(Math.random() * Math.abs(max - min));
    return Math.min(min, max) + rand;
  }

  send = (content, type) => {
    const msg = typeof content === 'string' ? { content, type } : content;
    SocketIO.send('message', msg);
  }

  show = (image, opts) => {
    if (!image) {
      this.delegate.print('show() must be passed an image/media argument');
    }
    const re = /https?:\/\/[^\/]+\.youtube\.com\//i;
    if (typeof image === 'string' && re.test(image)) {
      this.youtube(image, opts);
    } else {
      this.delegate.show(image, opts);
    }
  }

  youtube = (id) => {
    let videoId = id;
    if (id.indexOf('?') >= 0) {
      const part = qs.parse(id.substring(id.indexOf('?')));
      videoId = part.v || videoId;
    }
    this.delegate.youtube(videoId);
  }

  readLine = (question) => {
    return new Promise((accept) => {
      this.delegate.getInput(question, accept);
    });
  }

  choose = async (options) => {
    if (!options || !Array.isArray(options)) {
      throw new Error(
        `choose() must be passed an array (e.g. ['one','two','three']) of choices. You passed ${options}`,
      );
    }
    options.forEach((opt, ix) => {
      this.delegate.print(`${ix + 1}. ${opt}`, {
        onClick: () => {
          console.error('Choice clicked');
          this.delegate.gotInput(String(ix + 1));
        },
      });
    });
    const input = await this.readLine();
    if (Number.isInteger(Number(input))) {
      return Number(input) - 1;
    }
    const matches = options
      .map((opt, ix) => ({
        index: ix,
        edit: levenshtein(opt, input),
      }))
      .sort((a, b) => (a.edit - b.edit));
    return matches[0].index;
  }

  clear = () => { this.delegate.clear() }

  fetch = async (url, body, method = 'POST', message) => {
    const headers = {
      'Request-Source': 'ajax',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    this.delegate.showLoader(true, message || (`Fetching ${url}`));
    try {
      const response = await fetch(url, {
        credentials: 'include',
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers,
      });
      const data = await response.json();
      this.delegate.showLoader(false);
      return data;
    } catch (error) {
      console.error(error);
      this.delegate.showLoader(false);
      throw error;
    }
  }

  require = async (moduleSpec) => {
    if (this.moduleCache[moduleSpec]) {
      return this.moduleCache[moduleSpec];
    }
    const response = await fetch(`/library/get`, {
      credentials: 'include',
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: `/rooms/${moduleSpec}` }),
    });
    const { code } = await response.json();
    const argNames = [];
    const argFns = [];
    Object.entries(this.functions).forEach((kv) => {
      argNames.push(kv[0]);
      argFns.push(kv[1]);
    });
    const transpiled = babeler(`(async function (${argNames.join(',')}) {
      module = { exports: {}, parent: 'index.js' };
      ${code}
      return module.exports;
    })`, this.asyncFunctions);
    const fn = eval(transpiled);
    const mod = await fn.apply(null, argFns);
    this.moduleCache[moduleSpec] = mod;
    return mod;
  }

  delay(seconds) {
    return new Promise(accept => setTimeout(accept, seconds * 1000));
  }

  getSetting = (name) => {
    return LocalStorage.getItem(`user-${name}`);
  }

  saveSetting = (name, value) => {
    return LocalStorage.setItem(`user-${name}`, value);
  }

  getOrAsk = async (name, question) => {
    let s = this.getSetting(name);
    if (!s) {
      s = await this.readLine(question);
      this.saveSetting(name, s);
    }
    return s;
  }

  playSound = (url) => {
    const audio = new Audio(url);
    audio.play();
    return audio;
  }

  /**
   * Pick a random value from an array of weighted items or comma delimited spec
   * formatted like: Option1(50),Option2(50) which would mean 50% option1, 50% option2
   */
  pickRandom(...options) {
    const split = options.length > 1 ? options : options[0].split(',');
    let totalPoints = 0;
    const withPoints = split.map((s) => {
      const match = s.match(/\s*(.*)\((\d+).*\)\s*/);
      if (match) {
        totalPoints += Number(match[2]);
        return {
          name: match[1],
          weight: Number(match[2]),
        };
      }
      totalPoints += 1;
      return {
        name: s,
        weight: 1,
      };
    });
    let picked = parseInt(Math.random() * totalPoints);
    for (let i = 0; i < withPoints.length; i += 1) {
      picked -= withPoints[i].weight;
      if (picked <= 0) {
        return withPoints[i].name;
      }
    }
    return withPoints[withPoints.length - 1].name;
  }

  async wait(promise) {
    return promise;
  }
}
