import fetch from 'isomorphic-fetch';
import levenshtein from './levenshtein';
import babeler from './babeler';
import { LocalStorage } from '../storage';

export class CodeRunner {
  constructor(delegate) {
    this.delegate = delegate;
    // These functions will be passed to the user-entered code
    this.functions = {
      print: this.print,
      delay: this.delay,
      readLine: this.readLine,
      readline: this.readLine,
      choose: this.choose,
      clear: this.clear,
      fetch: this.fetch,
      getSetting: this.getSetting,
      saveSetting: this.saveSetting,
      getOrAsk: this.getOrAsk,
      playSound: this.playSound,
      show: this.show,
    };

    // These functions will automatically have "await" applied to them to
    // allow easier entry into the concept of async programming. Perhaps
    // outputting a warning would be a good thing.
    this.asyncFunctions = ['readLine', 'readline', 'delay', 'choose', 'fetch', 'getOrAsk'];
  }

  run(codeText) {
    const argNames = [];
    const argFns = [];
    Object.entries(this.functions).forEach((kv) => {
      argNames.push(kv[0]);
      argFns.push(kv[1]);
    });
    const transpiled = babeler(
      `async function _user_function_(${argNames.join(',')}) { ${codeText} }
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

  show = (image) => {
    this.delegate.show(image);
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
}
