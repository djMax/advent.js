export class CodeRunner {
  constructor(delegate) {
    this.delegate = delegate;
  }

  run(codeText) {
    const argNames = [];
    const argFns = [];
    Object.entries(this.functions).forEach((kv) => {
      argNames.push(kv[0]);
      argFns.push(kv[1]);
    });
    const asyncs = ['readLine', 'readline', 'delay'];
    const visited = new WeakSet();
    const { code } = window.Babel.transform(
      `async function _user_function_(${argNames.join(',')}) { ${codeText} }
      _user_function_;`, {
        presets: ['es2017'],
        plugins: [({ types: t }) => {
          return {
            visitor: {
              Function(fnPath) {
                if (!fnPath.node.async) {
                  return;
                }

                fnPath.traverse({
                  Function(innerFn) {
                    innerFn.skip();
                  },
                  CallExpression(path) {
                    if (visited.has(path.node)) {
                      return;
                    }
                    const callee = path.get("callee");
                    const isAsync = asyncs.find(name => callee.isIdentifier({ name }));
                    if (isAsync) {
                      visited.add(path.node);
                      path.replaceWith(t.awaitExpression(path.node));
                    }
                  }
                });
              },
            },
          };
        }],
      });
    const fn = eval(code);
    fn.apply(null, argFns).then(() => {
      this.delegate.print('\n\n-- PROGRAM FINISHED --')
    }).catch((e) => {
      this.delegate.print(`\nOops... An error occurred:\n\n${e.stack}`);
    });
  }

  print = (value) => {
    this.delegate.print(value);
  }

  readLine = (question) => {
    return new Promise((accept) => {
      this.delegate.getInput(question, accept);
    });
  }

  delay(seconds) {
    return new Promise(accept => setTimeout(accept, seconds * 1000));
  }

  get functions() {
    return {
      print: this.print,
      delay: this.delay,
      readLine: this.readLine,
      readline: this.readLine,
    };
  }
}
