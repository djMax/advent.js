'use strict';
var JsOutput = require('./jsOutput');
$(function () {

    var appName = document.location.pathname.substring(1);

    var jsConfig = {
        onCommand: loggerInput,
        console:console
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

    if (window.localStorage.getItem('code' + appName)) {
        $('#editor').text(window.localStorage.getItem('code' + appName));
    }

    var editor = ace.edit('editor');
    editor.setTheme('ace/theme/monokai');
    editor.getSession().setMode('ace/mode/javascript');

    editor.on('change', function () {
        window.localStorage.setItem('code' + appName, editor.getSession().getValue());
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
    editor.commands.addCommand({
        name: 'Clear',
        bindKey: 'Ctrl-L',
        exec: function (editor) {
            jsOutput.clear();
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
    editor.focus();
});

function loggerInput(text) {
    console.log('Unexpected input', text);
}

function closure(editor, output) {
    var print = function (text) {
        output.renderOutput(text, function () {});
    }, readLine = function (callback) {
        var resolver;
        output._config.onCommand = function (line) {
            setTimeout(function () {
                resolver(line);
            },0);
            output._config.onCommand = loggerInput;
            output.deactivate();
        };
        editor.blur();
        output.activate();
        return new Promise(function (resolve)  {
            resolver = resolve;
        });
    };

    return function (code) {
        var transformed = babel.transform(code,{stage:0});
        eval(transformed.code);
    }
}
