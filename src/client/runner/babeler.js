/**
 * This cute little number is courtesy of Logan Smyth of Babel (in)?fam[ey].
 * It finds any call to a function listed in asyncFunctions and puts an
 * await in front of it. Because of the way promises work, duplicate awaits
 * have no effect, so you can either have people remember async for this or not.
 */
export default function transform(source, asyncFunctions) {
  const visited = new WeakSet();
  const { code } = window.Babel.transform(source, {
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
                  const isAsync = asyncFunctions.find(name => callee.isIdentifier({ name }));
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
  return code;
}