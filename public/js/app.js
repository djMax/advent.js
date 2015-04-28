'use strict';

var JsOutput = require('./jsOutput');
$(function () {

    var appName = document.location.pathname.substring(1);

    if (window.location.search.substring(1).indexOf("p=") === 0) {
        var prog = window.location.search.substring(3).split('&')[0];
        $('#editor').text(LZString.decompressFromEncodedURIComponent(prog));
    }

    var jsConfig = {
        onCommand: loggerInput,
        console: console
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

    var prompted = false;
    jsOutput.onNewPrompt(function (callback) {
        if (!prompted) {
            prompted = true;
            return callback('The output of your program will appear here.');
        }
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
    $('#clear').on('click', function () {
        jsOutput.clear();
    });
    $('#share').on('click', function () {
        var url = window.location.href.split('?')[0];
        var enc = LZString.compressToEncodedURIComponent(editor.getSession().getValue());
        $('#urlModal textarea').val(url + '?p=' + enc);
        $('#urlModal').modal();
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
        output.renderOutput(text, function () {
        });
    }, clear = function () {
        output.clear();
    }, readLine = function (callback) {
        var resolver;
        output._config.onCommand = function (line) {
            setTimeout(function () {
                resolver(line);
            }, 0);
            output._config.onCommand = loggerInput;
            output.deactivate();
        };
        editor.blur();
        output.activate();
        return new Promise(function (resolve) {
            resolver = resolve;
        });
    };

    return (function (code) {
        var transformed = babel.transform(code, {stage: 0});
        eval(transformed.code);
    });
}
