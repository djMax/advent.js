advent.js
=========

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/djMax/advent.js.git)

advent.js is a playground for Javascript console games. It allows you to write programs
like this:

```
const name = readline('What is your name?'); // is actually transformed to an async call
delay(1); // waits 1 second
print(`Hello ${name}`);
```

It also allows classrooms to work collaboratively on the code by sending and receiving the
code to each other and sending/receiving other messages. The "runtime" provides a set of functions to
hide various complexities of HTML/JS while attempting not to prevent you from using those complex
constructions if you want to.

This Repo
=========
This site is implemented in React and uses ACE/Cloud9 editor with custom Babel transforms.