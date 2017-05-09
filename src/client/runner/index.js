import fetch from 'isomorphic-fetch';
import levenshtein from './levenshtein';
import babeler from './babeler';

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
    };
    // These functions will automatically have "await" applied to them to
    // allow easier entry into the concept of async programming. Perhaps
    // outputting a warning would be a good thing.
    this.asyncFunctions = ['readLine', 'readline', 'delay', 'choose', 'fetch'];
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
    this.print(options.map((opt, ix) => `${ix + 1}. ${opt}`).join('\n'));
    const input = await this.readLine();
    if (Number.isInteger(Number(input))) {
      return Number(input);
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
      return await response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  delay(seconds) {
    return new Promise(accept => setTimeout(accept, seconds * 1000));
  }
}
