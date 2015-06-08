'use strict';

var JsOutput = require('./jsOutput');

if (page === 'consoleGame') {
    $(consoleGamePage);
} else if (page === 'loginPage') {
    $(loginPage);
} else if (page === 'minecraft') {
    $(minecraft);
}

function loginPage() {
    $("#login button").click(function (e) {
        e.preventDefault();
        $.ajax({
            url: "/login",
            type: "POST",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({
                _csrf: _csrf,
                username: $("input[name=username]").val(),
                password: $("input[name=password]").val()
            }),
            success: function (response) {
                if (response.error) {
                    alert("Login failed! " + response.error);
                } else {
                    document.location = '/~' + response.profile.name;
                }
            },
            error: function (e) {
                alert("Login failed! " + e.message);
            }
        });
    });
}

function minecraft() {
    sizer();
    $(window).resize(sizer);

    var editor = ace.edit('editor');
    editor.setTheme('ace/theme/monokai');
    editor.getSession().setMode('ace/mode/javascript');

    $('#save').on('click', function () {
        $.ajax({
            url: "/save",
            type: "POST",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({
                _csrf: _csrf,
                content: editor.getSession().getValue()
            }),
            success: function (response) {
                if (response.error) {
                    alert("Save failed! " + response.error);
                }
            },
            error: function (e) {
                alert("Save failed! " + e.message);
            }
        });
    });
}

function consoleGamePage() {

    var appName = document.location.pathname.substring(1);

    if (window.location.search.substring(1).indexOf("p=") === 0) {
        var prog = window.location.search.substring(3).split('&')[0];
        try {
            prog = LZString.decompressFromEncodedURIComponent(prog);
            $('#editor').text(prog);
            // If there was a program link, keep local changes
            appName = sha1(prog);
        } catch (x) {
            // Wasn't a program in the link...
        }
    }

    var jsConfig = {
        onCommand: loggerInput,
        console: console,
        run: run
    };
    var jsOutput = new JsOutput(jsConfig);
    jsOutput._config = jsConfig;

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
        try {
            context(code || editor.getSession().getValue());
        } catch (x) {
            var trace;
            console.log(x);
            if (window["printStackTrace"]) {
                trace = printStackTrace({e: x})
            }
            var lastLine = trace ? trace[0].match(/<anonymous>:(\d+):(\d+)/) : null;
            if (lastLine && lastLine.length > 1) {
                bootbox.dialog({
                    message: 'There was an error!<br/><b>' + x.message + '</b><br/><br/>On Line #' + (lastLine[1] - 2),
                    title: "Oops!"
                });
            } else {
                bootbox.alert(x.message);
            }
        }
    }

    jsOutput.activate();
    editor.focus();
}

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
        var transformed = babel.transform('var programFunction = async function () { ' + code + '}; programFunction();', {stage: 0});
        eval( transformed.code);
    });
}

function sizer() {
    var totalHeight = $(window).height();
    $('#editorRow').height(Math.floor(totalHeight / 2));
    $('#consoleRow').height(Math.floor(totalHeight / 2));
}

function sha1(str1){
    for (
        var blockstart = 0,
            i = 0,
            W = [],
            A, B, C, D, F, G,
            H = [A=0x67452301, B=0xEFCDAB89, ~A, ~B, 0xC3D2E1F0],
            word_array = [],
            temp2,
            s = unescape(encodeURI(str1)),
            str_len = s.length;

        i <= str_len;
    ){
        word_array[i >> 2] |= (s.charCodeAt(i)||128) << (8 * (3 - i++ % 4));
    }
    word_array[temp2 = ((str_len + 8) >> 6 << 4) + 15] = str_len << 3;

    for (; blockstart <= temp2; blockstart += 16) {
        A = H; i = 0;

        for (; i < 80;
               A = [[
                   (G = ((s = A[0]) << 5 | s >>> 27) + A[4] + (W[i] = (i<16) ? ~~word_array[blockstart + i] : G << 1 | G >>> 31) + 1518500249) + ((B = A[1]) & (C = A[2]) | ~B & (D = A[3])),
                   F = G + (B ^ C ^ D) + 341275144,
                   G + (B & C | B & D | C & D) + 882459459,
                   F + 1535694389
               ][0|((i++) / 20)] | 0, s, B << 30 | B >>> 2, C, D]
        ) {
            G = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
        }

        for(i = 5; i; ) H[--i] = H[i] + A[i] | 0;
    }

    for(str1 = ''; i < 40; )str1 += (H[i >> 3] >> (7 - i++ % 8) * 4 & 15).toString(16);
    return str1;
}
