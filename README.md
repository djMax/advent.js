web-starter-kit
===============
This project is a bare bones starter kit for a GasBuddy web application.

Naming
======
From the [Standards](https://github.com/gas-buddy/Standards) repo:
```
If your project hosts a public API, call it something-api.
If your project hosts an internal service, call it something-serv.
If your project hosts a web site, call it something-web.
```

Project Structure
===================
|Item|Contents|
|---|---|
|api|The swagger document provided by this service, and a package.json that allows publishing that specification as an independent module|
|src|ES6 source files that implement server side route handlers, server/client React components as well as utility code for those things|
|src/routes|Server side route handlers|
|src/common|React components that can run client and server side|
|src/client|Client-side only functionality such as ajax handling or CSS|
|config|Runtime configuration for the service|
|tests|Tests for the web app or any other components that need testing|
|wercker.yml|A CI pipeline which can be run using wercker.com or the wercker CLI|
|.*|Various project settings are in .babelrc, .eslintrc, and .*ignore|
|README.md|THIS FILE, WHICH YOU BETTER REPLACE WITH A DESCRIPTION OF YOUR SERVICE|

A simple test is included which can be run with ```npm test```. It uses our shared test
infrastructure to start and stop the express server on each test run and make schema
validation a bit easier.

Logging
=======
One of the things that gb-services does for you is setup a log infrastructure that includes
a "correlation id" that will survive across service calls in the infrastructure. In practice this
means two important things:

1) You should use req.gb.logger in your handlers to log stuff.
```
async function myHandlerFunction(req, res) {
  req.gb.logger.info('The most incredible things are about to happen.');
}
```
2) Your library code should typically take a "context" parameter as the first arg if it needs to log stuff,
which handlers will pass to you (by passing req).
```
export function someHelperMethod(context, someArg) {
  context.logger.info('I do what I am told');
}
```

Services
========
Connections can be made to other GasBuddy swagger-based services via the "connections:services" key in your configuration

```
  "connections": {
    "services": {
      "payment-activation": "require:@gasbuddy/payment-activation-spec"
    }
  },
```

That service would be made available as req.gb.services.PaymentActivation. If you include the keys "username"
and "password" in your endpoint definition for a service (not in serviceConnections but in "endpoints," basic
authentication will be configured for the swagger client.

```
"connections": {
  "services": {
    "endpoints": {
      "payment-activation": {
        "username": "foobar",
        "password": "keytar:aGoodKeyName"
      }
    }
  }
}
```

By default, web projects have IdentityServ available to do authentication.

Recipes
=======

Making a new "page"
-------------------
A "page" is kind of an anti-React way of thinking about things, but it's also often the way people experience your service. In order to add a "container" like this, I take the following steps:

1. Create a React component in src/common/containers/some_group/something.js
2. Create a reducer in src/common/reducers - this is the place where application state will be modified in response to actions (e.g. when an ajax call is made or completed)
3. Add the route to the component in #1 to src/common/router.js. If your service is going to be at all complex, you probably want to subdivide the contents into some categories