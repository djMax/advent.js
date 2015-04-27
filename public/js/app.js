'use strict';
var JsOutput = require('./jsOutput');

$(function () {

    var jsConfig = {
        onCommand: loggerInput
    };
    var jsOutput = new JsOutput(jsConfig);
    jsOutput._config = jsConfig;

    function sizer() {
        var totalHeight = $(window).height();
        $('#editorRow').height(Math.floor(totalHeight / 2));
        $('#consoleRow').height(Math.floor(totalHeight / 2));
    }

    sizer();
    $(window).resize(sizer);

    jsOutput.onNewPrompt(function (callback) {
        callback('');
    });

    jsOutput.setCommandHandler("hello", {
        exec: function (cmd, args, callback) {
            var arg = args[0] || '';
            var response = "who is this " + arg + " you are talking to?";
            if (arg === 'josh') {
                response = 'pleased to meet you.';
            } else if (arg === 'world') {
                response = 'world says hi.'
            } else if (!arg) {
                response = 'who are you saying hello to?';
            }
            callback(response);
        },
        completion: function (cmd, arg, line, callback) {
            callback(shell.bestMatch(arg, ['world', 'josh']))
        }
    });

    if (window.localStorage.getItem('code')) {
        $('#editor').text(window.localStorage.getItem('code'));
    }

    var editor = ace.edit('editor');
    editor.setTheme('ace/theme/monokai');
    editor.getSession().setMode('ace/mode/javascript');

    editor.on('change', function () {
        window.localStorage.setItem('code', editor.getSession().getValue());
        if ($('#autoRun').prop('checked')) {
            try {
                run();
            } catch (x) {
                console.log(x);
            }
        }
    });
    editor.on('focus', function () {
       jsOutput.deactivate();
    });

    editor.commands.addCommand({
        name: 'Run',
        bindKey: 'Ctrl-R',
        exec: function (editor) {
            run();
        }
    });
    $('#run').on('click', function () {
        run();
    });

    var context = closure(editor, jsOutput);

    function run(code) {
        context(code || editor.getSession().getValue());
    }

    jsOutput.activate();
    jsOutput.deactivate();
});

function loggerInput(text) {
    console.log('Unexpected input', text);
}

function closure(editor, output) {
    var print = function (text) {
        console.log('print');
        output.renderOutput(text, function () {});
    }, readLine = function (callback) {
        console.log('Called readLine', arguments);
        var resolver;
        output._config.onCommand = function (line) {
            console.log('Got expected input', line);
            resolver(line);
            output._config.onCommand = loggerInput;
            output.deactivate();
        }
        output.activate();
        return new Promise(function (resolve)  {
            resolver = resolve;
        });
    };

    return function (code) {
        var transformed = babel.transform(code,{stage:2,optional:["asyncToGenerator"]});
        console.log(transformed);
        eval(transformed.code);
    }
}
