(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var JsOutput = require('./jsOutput'),
    _jsListeners = {},
    canvas,
    socket,
    slimSize = false;
;

if (page === 'consoleGame') {
    $(consoleGamePage);
} else if (page === 'canvas') {
    $(canvasPage);
} else if (page === 'loginPage') {
    $(loginPage);
} else if (page === 'minecraft') {
    $(minecraft);
} else if (page === 'game') {
    $(game);
} else if (page === 'scratchcraft') {
    $(scratchcraft);
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

    var tools = ace.require("ace/ext/language_tools");
    var editor = ace.edit('editor');
    editor.setTheme('ace/theme/monokai');
    editor.getSession().setMode('ace/mode/javascript');
    editor.setOptions({
        enableBasicAutocompletion: true
    });

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

function game() {
    var players = {}, myName, current, jsOutput, jsConfig, leftValue, rightValue, curOpFn;

    socket = io();
    $('#login .usernameInput').focus();
    $('#yourNumber').hide();

    function goGame() {
        socket.emit('player', {name: myName});

        jsConfig = {
            console: console,
            onCommand: function (line) {
                socket.emit('chat', {name: myName, text: line});
                jsOutput.clearPrompt();
                jsOutput.renderOutput(myName + ': ' + line, function () {
                });
                return false;
            }
        };
        jsOutput = new JsOutput(jsConfig);
        jsOutput._config = jsConfig;

        var prompted = false;
        jsOutput.onNewPrompt(function (callback) {
            if (!prompted) {
                prompted = true;
                return callback('Welcome to the game! Chat with other players here. Be respectful.<br/>> ');
            }
            callback('> ');
        });

        jsOutput.activate();
    }

    if (window.localStorage.getItem('gameuser')) {
        myName = window.localStorage.getItem('gameuser');
        players[myName] = {name: myName};
        goGame();
        $('#login').hide();
    } else {
        $(window).keydown(function (event) {
            if (myName) {
                return;
            }

            // Auto-focus the current input when a key is typed
            if (!(event.ctrlKey || event.metaKey || event.altKey)) {
                $('#login .usernameInput').focus();
            }
            // When the client hits ENTER on their keyboard
            if (event.which === 13) {
                myName = $('#login .usernameInput').val();
                socket.emit('player', {name: myName});
                window.localStorage.setItem('gameuser', myName);
                goGame();
                $('#login').fadeOut();
            }
        });
    }

    socket.on('player', function (data) {
        console.log('PLAYER', data);
        socket.emit('playerResponse', {name: myName});
    });

    socket.on('playerResponse', function (data) {
        if (!players[data.name]) {
            jsOutput.renderOutput('New Player! ' + data.name, function () {
            });
            players[data.name] = {};
            console.log('new player', data);
        }
    });

    var setupGame = function (p) {
        current = p;
        $('#tgt').text(p.target);
        $('#gameStart').hide();
        $('#yourNumber span').text(p.players[myName].number);
        $('#yourNumber').fadeIn();
    };

    socket.on('newGame', setupGame);

    socket.on('win', function (d) {
        alert(d.name + ' has won.');
    });

    $('#op').click(function () {
        $('#opChoice').fadeIn();
    });

    $('#opChoice button').click(function () {
        var op = $(this).text();
        $('#op').text(op);
        $('#opChoice').hide();
        if (op === '+') {
            curOpFn = function (x, y) {
                return x + y;
            };
        } else if (op === '×') {
            curOpFn = function (x, y) {
                return x * y;
            };
        } else if (op === '-') {
            curOpFn = function (x, y) {
                return x - y;
            };
        }
        checkResult();
    });

    function checkResult() {
        if (curOpFn && leftValue && rightValue && curOpFn(leftValue, rightValue) == current.target) {
            socket.emit('win', {name: myName});
            alert('YOU WIN');
            $('#gameStart').show();
        } else {

        }
    }

    $('#item1').click(function () {
        if (!current) {
            return;
        }
        $('#t1Choice').html('');
        for (var pn in current.players) {
            var k = $('<button/>').addClass('btn btn-lg').text(pn + ' ' + current.players[pn].number);
            $('#t1Choice').append(k);
            k.data('player', pn);
        }
        $('#t1Choice button').on('click', function () {
            var p = current.players[$(this).data('player')];
            $('#item1').text(p.number);
            $('#t1Choice').hide();
            leftValue = p.number;
            checkResult();
        });

        $('#t1Choice').fadeIn();
    });

    $('#item2').click(function () {
        if (!current) {
            return;
        }
        $('#t2Choice').html('');
        for (var pn in current.players) {
            var k = $('<button/>').addClass('btn btn-lg').text(pn + ' ' + current.players[pn].number);
            $('#t2Choice').append(k);
            k.data('player', pn);
        }
        $('#t2Choice button').on('click', function () {
            var p = current.players[$(this).data('player')];
            $('#item2').text(p.number);
            $('#t2Choice').hide();
            rightValue = p.number;
            checkResult();
        });

        $('#t2Choice').fadeIn();
    });

    $('#gameStart').on('click', function () {
        var hand = deal(players);
        socket.emit('newGame', hand);
        setupGame(hand);
        $('#gameStart').hide();
        $('#yourNumber').fadeIn();
    });

    function consoleSizer() {
        var totalHeight = $(window).height();
        $('#consoleRow').height(totalHeight - 300);
    }

    consoleSizer();
    $(window).resize(consoleSizer);

    socket.on('chat', function (data) {
        console.log('CHAT', data);
        jsOutput.renderOutput(data.name + ': ' + data.text, function () {
        });
    });

}

function consoleGamePage() {

    socket = io();
    doWit();
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

    ace.require("ace/ext/language_tools");
    var editor = ace.edit('editor');
    editor.setTheme('ace/theme/monokai');
    editor.getSession().setMode('ace/mode/javascript');
    editor.setOptions({
        enableSnippets: true,
        enableLiveAutocompletion: true,
        enableBasicAutocompletion: true
    });
    consoleCompletes(ace.require("ace/snippets").snippetManager);

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
    $('#run').on('click', function (e) {
        e.preventDefault();
        this.blur();
        run();
    });
    $('#clear').on('click', function () {
        jsOutput.clear();
        jsOutput.renderOutput('>', function () {

        });
    });
    $('#share').on('click', function () {
        var url = window.location.href.split('?')[0];
        var enc = LZString.compressToEncodedURIComponent(editor.getSession().getValue());
        $('#urlModal textarea').val(url + '?p=' + enc);
        $('#urlModal').modal();
    });

    var context = closure(socket, editor, jsOutput);

    socket.on('chat', function (m) {
        if (_jsListeners[m.content.type]) {
            _jsListeners[m.content.type].forEach(function (fn) {
                try {
                    fn(m.content.message, m.source, m.content.type);
                } catch (x) {
                    console.log(x);
                }
            });
        } else {
            console.log('Unhandled message', m);
        }
    });

    $('#copyprog').on('click', function () {
        socket.emit('share', {
            code: editor.getSession().getValue(),
            type: 'console'
        });
    });

    var shareProg;
    socket.on('share', function (m) {
        if (m.content.type === 'console') {
            $('#getprog').fadeIn();
            shareProg = m.content.code;
        }
    });

    $('#getprog').on('click', function () {
        editor.getSession().setValue(shareProg);
    });

    function run(code) {
        try {
            _jsListeners = {};
            context(code || editor.getSession().getValue());
        } catch (x) {
            var trace;
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

function canvasPage() {

    socket = io();
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

    canvas = $('#canvas')[0];

    sizer();
    $(window).resize(sizer);
    $('#showCode').click(function () {
        slimSize = false;
        $('#slimButtons').hide();
        $('#fatButtons').show();
        sizer();
    });

    if (window.localStorage.getItem('code' + appName)) {
        $('#editor').text(window.localStorage.getItem('code' + appName));
    }

    ace.require("ace/ext/language_tools");
    var editor = ace.edit('editor');
    editor.setTheme('ace/theme/monokai');
    editor.getSession().setMode('ace/mode/javascript');
    editor.setOptions({
        enableSnippets: true,
        enableLiveAutocompletion: true,
        enableBasicAutocompletion: true
    });
    canvasCompletes(ace.require("ace/snippets").snippetManager);

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
            var canvasContext = canvas.getContext('2d');
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        }
    });
    $('#run').on('click', function (e) {
        e.preventDefault();
        $('#fatButtons').hide();
        $('#slimButtons').show();
        slimSize = true;
        this.blur();
        sizer();
        run();
    });
    $('#clear').on('click', function () {
        var canvasContext = canvas.getContext('2d');
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    });
    $('#share').on('click', function () {
        var url = window.location.href.split('?')[0];
        var enc = LZString.compressToEncodedURIComponent(editor.getSession().getValue());
        $('#urlModal textarea').val(url + '?p=' + enc);
        $('#urlModal').modal();
    });

    var context = canvasClosure(socket, editor);

    socket.on('chat', function (m) {
        if (_jsListeners[m.content.type]) {
            _jsListeners[m.content.type].forEach(function (fn) {
                try {
                    fn(m.content.message, m.source, m.content.type);
                } catch (x) {
                    console.log(x);
                }
            });
        }
    });

    $('#copyprog').on('click', function () {
        socket.emit('share', {
            code: editor.getSession().getValue(),
            type: 'canvas'
        });
    });

    var callKeyFn = function (name, code) {
        if (_jsListeners[name]) {
            _jsListeners[name].forEach(function (fn) {
                try {
                    fn(code);
                } catch (x) {
                    console.log(x);
                }
            });
        }
    };

    // Bind keyup messages to the user-land "on" function. The namespace is shared with sockets, which is weird of course
    $('body').on('keyup', function (event) {
        if (event.target.tagName === 'TEXTAREA') {
            return;
        }
        event.preventDefault();
        var key = event.keyCode;
        callKeyFn('key', key);
        if (key >= 37 && key <= 40) {
            callKeyFn(['left','up','right','down'][key - 37], key);
        }
    });

    var shareProg;
    socket.on('share', function (m) {
        if (m.content.type === 'canvas') {
            $('#getprog').fadeIn();
            shareProg = m.content.code;
        }
    });

    $('#getprog').on('click', function () {
        editor.getSession().setValue(shareProg);
    });

    function run(code) {
        try {
            _jsListeners = {};
            context(code || editor.getSession().getValue());
        } catch (x) {
            var trace;
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

    editor.focus();
}

function loggerInput(text) {
    console.log('Unexpected input', text);
}

function canvasClosure(socket, editor) {
    var red = '#FF0000', green = '#00FF00', blue = '#0000FF', white = '#FFFFFF', black = '#000',
        filled = true,
        empty = false,
        line = function (c, x, y, w, h) {
            var canvasContext = canvas.getContext('2d');
            canvasContext.beginPath();
            canvasContext.moveTo(x, y);
            canvasContext.lineTo(x + w, y + h);
            canvasContext.strokeStyle = c;
            canvasContext.stroke();
        }, clear = function () {
            var canvasContext = canvas.getContext('2d');
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        }, circle = function (color, centerX, centerY, radius, f) {
            var canvasContext = canvas.getContext('2d');
            canvasContext.beginPath();
            canvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
            if (f) {
                canvasContext.fillStyle = color;
                canvasContext.fill();
            }
            canvasContext.lineWidth = 5;
            canvasContext.strokeStyle = color;
            canvasContext.stroke();
        }, fill = function (color) {
            var canvasContext = canvas.getContext('2d');
            canvasContext.beginPath();
            canvasContext.rect(0, 0, canvas.width, canvas.height);
            canvasContext.fillStyle = color;
            canvasContext.fill();
        }, rect = function (c, x, y, w, h, f) {
            var canvasContext = canvas.getContext('2d');
            canvasContext.beginPath();
            canvasContext.rect(x, y, w, h);
            if (f || f === undefined) {
                canvasContext.fillStyle = c;
                canvasContext.fill();
            }
            canvasContext.strokeStyle = c;
            canvasContext.stroke();
        }, print = function (color, x, y, message, font) {
            var canvasContext = canvas.getContext('2d');
            canvasContext.beginPath();
            canvasContext.font = '40pt Calibri';
            canvasContext.fillStyle = color || 'white';
            canvasContext.fillText(message, x, y);
        },
        send = function (type, message) {
            if (type && !message) {
                message = type;
                type = null;
            }
            socket.emit('chat', {type: type, message: message});
        }, on = function (e, fn) {
            _jsListeners[e] = _jsListeners[e] || [];
            _jsListeners[e].push(fn);
        };

    return (function (code) {
        var me = socket.id;
        console.trace('Running code');
        var transformed = babel.transform('var programFunction = async function () { ' + code + '}; programFunction();', {stage: 0});
        var width = canvas.width, height = canvas.height;
        eval(transformed.code);
    });
}

function closure(socket, editor, output) {
    var random = function (high) {
            return Math.floor(Math.random() * high) + 1;
        }, addLetter = function (c, v) {
            if (typeof v === 'string') {
                v = v.charCodeAt(0);
            }
            return String.fromCharCode((c.charCodeAt(0) + v) % 256);
        },
        addletter = addLetter,
        print = function (text) {
            output.renderOutput(text, function () {
            });
        }, clear = function () {
            output.clear();
            output.renderOutput('>', function () {

            });
        }, readLine = function (message) {
            if (message) {
                print(message);
            }
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
        }, readline = readLine,
        send = function (type, message) {
            if (type && !message) {
                message = type;
                type = null;
            }
            socket.emit('chat', {type: type, message: message});
        }, on = function (e, fn) {
            _jsListeners[e] = _jsListeners[e] || [];
            _jsListeners[e].push(fn);
        };

    return (function (code) {
        var me = socket.id;
        console.trace('Running code');
        var transformed = babel.transform('var programFunction = async function () { ' + code + '}; programFunction();', {stage: 0});
        eval(transformed.code);
    });
}

function sizer() {
    var totalHeight = $(window).height();
    if (slimSize) {
        $('#editorRow').height(50);
        $('#consoleRow').height(totalHeight - 50);
    } else {
        $('#editorRow').height(Math.floor(totalHeight / 2));
        $('#consoleRow').height(Math.floor(totalHeight / 2));
    }
    if (canvas) {
        canvas.width = $('#canvas').width();
        canvas.height = $('#canvas').height();
    }
}

function sha1(str1) {
    for (
        var blockstart = 0,
            i = 0,
            W = [],
            A, B, C, D, F, G,
            H = [A = 0x67452301, B = 0xEFCDAB89, ~A, ~B, 0xC3D2E1F0],
            word_array = [],
            temp2,
            s = unescape(encodeURI(str1)),
            str_len = s.length;

        i <= str_len;
    ) {
        word_array[i >> 2] |= (s.charCodeAt(i) || 128) << (8 * (3 - i++ % 4));
    }
    word_array[temp2 = ((str_len + 8) >> 6 << 4) + 15] = str_len << 3;

    for (; blockstart <= temp2; blockstart += 16) {
        A = H;
        i = 0;

        for (; i < 80;
               A = [[
                   (G = ((s = A[0]) << 5 | s >>> 27) + A[4] + (W[i] = (i < 16) ? ~~word_array[blockstart + i] : G << 1 | G >>> 31) + 1518500249) + ((B = A[1]) & (C = A[2]) | ~B & (D = A[3])),
                   F = G + (B ^ C ^ D) + 341275144,
                   G + (B & C | B & D | C & D) + 882459459,
                   F + 1535694389
               ][0 | ((i++) / 20)] | 0, s, B << 30 | B >>> 2, C, D]
        ) {
            G = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
        }

        for (i = 5; i;) H[--i] = H[i] + A[i] | 0;
    }

    for (str1 = ''; i < 40;)str1 += (H[i >> 3] >> (7 - i++ % 8) * 4 & 15).toString(16);
    return str1;
}

function deal(players) {
    var target = parseInt(Math.random() * 50) * 2;
    var playerCount = 0;
    for (var p in players) {
        playerCount++;
    }
    console.log('dealing', playerCount);
    var lastPlayer = null;
    for (var p in players) {
        if (lastPlayer) {
            players[p].number = Math.abs(target - lastPlayer);
        } else {
            players[p].number = parseInt(Math.random() * 50) * 2;
        }
        lastPlayer = players[p].number;
    }
    return {
        target: target,
        players: players
    };
}

function scratchcraft() {
    var blocklyArea = document.getElementById('blocklyArea');
    var blocklyDiv = document.getElementById('blocklyDiv');
    var workspace = Blockly.inject(blocklyDiv,
        {
            media: '/js/blockly/media/',
            toolbox: document.getElementById('toolbox')
        });
    var blocklyResize = function (e) {
        // Compute the absolute coordinates and dimensions of blocklyArea.
        var element = blocklyArea;
        var x = 0;
        var y = 0;
        do {
            x += element.offsetLeft;
            y += element.offsetTop;
            element = element.offsetParent;
        } while (element);
        // Position blocklyDiv over blocklyArea.
        blocklyDiv.style.left = x + 'px';
        blocklyDiv.style.top = y + 'px';
        blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
        blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
    };
    window.addEventListener('resize', blocklyResize, false);
    blocklyResize();
}


function consoleCompletes(snips) {

    snips.register([{
        tabTrigger: 'pr',
        name: 'print',
        content: 'print(\'${1:message}\');',
        docHTML: '<b>Print a message to the bottom screen.</b><hr/>print("Hello World");<br/>print("The value is " + aVariable);'
    }, {
        tabTrigger: 're',
        name: 'readLine',
        content: 'var ${1:answer} = await readLine(\'${2:question}\');',
        docHTML: '<b>Read a Line of Text</b><br/>Read a line of text from the user and wait until they hit "Return." Leave the result in <i>answer</i>.<hr/>var ${1:answer} = await readLine(\'${2:question}\');'
    }, {
        tabTrigger: 'cl',
        name: 'clear',
        content: 'clear();',
        docHTML: '<b>Clear the screen</b><hr/>clear();'
    }, {
        tabTrigger: 'ra',
        name: 'random',
        content: 'random(${1:maximum});',
        docHTML: '<b>Choose a random number betweeen 1 and <i>maximum</i></b><hr/>random(100);'
    }, {
        tabTrigger: 'addl',
        name: 'addLetter',
        content: 'addLetter(${1:base},${2:add})',
        docHTML: '<b>Add one letter to another</b><hr/>addLetter(\"a\",\"z\");'
    }]);

    var basicSnippets = ['for', 'fun', 'wh', 'if', 'setTimeout'];
    var register = snips.register;
    snips.register = function (snippets, scope) {
        register.call(snips, snippets.filter(function (s) {
            if (basicSnippets.indexOf(s.tabTrigger) >= 0) {
                return true;
            }
            return false;
        }), scope);
    }
}


function canvasCompletes(snips) {

    snips.register([{
        tabTrigger: 'pr',
        name: 'print',
        content: 'print(\'${1:color}\', ${2:startX}, ${3:startY}, \'${4:message}\');',
        docHTML: '<b>Draw Text</b><br/>Draw message at startX,startY.<hr/>print("red", 0, 0, \'Hello World!\');'
    }, {
        tabTrigger: 'ci',
        name: 'circle',
        content: 'circle(\'${1:color}\', ${2:centerX}, ${3:centerY}, ${4:radius}, ${5:filled});',
        docHTML: '<b>Draw a Circle</b><br/>Draw a circle centered at centerX,centerY with a radius.<br/>If filled is <i>true</i> then fill the rectangle with the color.<hr/>circle("red", 100, 100, 50, true);'
    }, {
        tabTrigger: 'fi',
        name: 'fill',
        content: 'fill(\'${1:color}\');',
        docHTML: '<b>Fill the Screen With Color</b><hr/>fill("white");'
    }, {
        tabTrigger: 'li',
        name: 'line',
        content: 'line(\'${1:color}\', ${2:startX}, ${3:startY}, ${4:width}, ${5:height});',
        docHTML: '<b>Draw a Line</b><br/>Draw a line starting at startX,startY and ending at startX+width,startY+height<hr/>line("red", 0, 0, 100, 100);'
    }, {
        tabTrigger: 're',
        name: 'rect',
        content: 'rect(\'${1:color}\', ${2:startX}, ${3:startY}, ${4:width}, ${5:height}, ${6:filled});',
        docHTML: '<b>Draw a Rectangle</b><br/>Draw a rectangle from startX,startY and ending at startX+width,startY+height.<br/>If filled is <i>true</i> then fill the rectangle with the color.<hr/>rect("red", 0, 0, 100, 100, true);'
    }, {
        tabTrigger: 'cl',
        name: 'clear',
        content: 'clear();',
        caption: 'Clear the canvas'
    }]);

    var basicSnippets = ['for', 'fun', 'wh', 'if', 'setTimeout'];
    var register = snips.register;
    snips.register = function (snippets, scope) {
        register.call(snips, snippets.filter(function (s) {
            if (basicSnippets.indexOf(s.tabTrigger) >= 0) {
                return true;
            }
            console.log('Ignoring snippet', s.tabTrigger, scope, s);
            return false;
        }), scope);
    }
}


function doWit() {
    var mic = new Wit.Microphone(document.getElementById("microphone"));

    mic.onready = function () {
        console.log("Microphone is ready to record");
    };
    mic.onaudiostart = function () {
        console.log("Recording started");
    };
    mic.onaudioend = function () {
        console.log("Recording stopped, processing started");
    };
    mic.onresult = function (intent, entities) {
        console.log(intent,entities);
        var r = kv("intent", intent);

        for (var k in entities) {
            var e = entities[k];

            if (!(e instanceof Array)) {
                r += kv(k, e.value);
            } else {
                for (var i = 0; i < e.length; i++) {
                    r += kv(k, e[i].value);
                }
            }
        }

        if (_jsListeners[intent]) {
            _jsListeners[intent].forEach(function (fn) {
                try {
                    fn(entities, intent);
                } catch (x) {
                    console.log(x);
                }
            });
        } else {
            console.log('Unhandled message', intent);
        }
    };
    mic.onerror = function (err) {
        console.log("Error: " + err);
    };
    mic.onconnecting = function () {
        console.log("Microphone is connecting");
    };
    mic.ondisconnected = function () {
        console.log("Microphone is not connected");
    };

    mic.connect("K5KE5YMK2JV5W3LY4MZPRPLS57K62LKV");
    // mic.start();
    // mic.stop();

    function kv (k, v) {
        if (toString.call(v) !== "[object String]") {
            v = JSON.stringify(v);
        }
        return k + "=" + v + "\n";
    }
}

},{"./jsOutput":2}],2:[function(require,module,exports){
/* ------------------------------------------------------------------------*
 * Copyright 2013-2014 Arne F. Claassen
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *-------------------------------------------------------------------------*/

var Josh = window["Josh"] || {};
(function(root, $, _) {
    module.exports = Josh.Shell = function(config) {
        config = config || {};

        // instance fields
        var _console = config.console || (Josh.Debug && root.console ? root.console : {
                log: function() {
                }
            });
        var _noEvents = false;
        var _prompt = config.prompt || 'jsh$';
        var _shell_view_id = config.shell_view_id || 'shell-view';
        var _shell_panel_id = config.shell_panel_id || 'shell-panel';
        var _input_id = config.input_id || 'shell-cli';
        var _blinktime = config.blinktime || 500;
        var _history = config.history || new Josh.History();
        var _readline = config.readline || new Josh.ReadLine({history: _history, console: _console});
        var _active = false;
        var _cursor_visible = false;
        var _activationHandler;
        var _deactivationHandler;
        var _cmdHandlers = {
            _default: {
                exec: function(cmd, args, callback) {

                    callback(self.templates.bad_command({cmd: cmd}));
                },
                completion: function(cmd, arg, line, callback) {
                    if(!arg) {
                        arg = cmd;
                    }
                    return callback(self.bestMatch(arg, self.commands()))
                }
            },
            input_search: {
                exec: function (cmd, args, callback) {
                    config.run();
                }
            },
            clear: {
                exec: function (cmd, args, callback) {
                    $(id(_input_id)).parent().empty();
                    self.refresh();
                    callback('');
                }
            }
        };
        var _line = {
            text: '',
            cursor: 0
        };
        var _searchMatch = '';
        var _view, _panel;
        var _promptHandler;
        var _initializationHandler;
        var _initialized;

        _readline.bind({'char': 'L', ctrlKey: true}, 'clear');
        _readline.bind({'char': 'R', ctrlKey: true}, 'run');

        // public methods
        var self = {
            commands: commands,
            templates: {
                history: _.template("<div><% _.each(items, function(cmd, i) { %><div><%- i %>&nbsp;<%- cmd %></div><% }); %></div>"),
                help: _.template("<div><div><strong>Commands:</strong></div><% _.each(commands, function(cmd) { %><div>&nbsp;<%- cmd %></div><% }); %></div>"),
                bad_command: _.template('<div><strong>Unrecognized command:&nbsp;</strong><%=cmd%></div>'),
                input_cmd: _.template('<div id="<%- id %>" class="promptLine"><span class="prompt"></span><span class="input"><span class="left"/><span class="cursor"/><span class="right"/></span></div>'),
                suggest: _.template("<div><% _.each(suggestions, function(suggestion) { %><div><%- suggestion %></div><% }); %></div>")
            },
            isActive: function() {
                return _readline.isActive();
            },
            activate: function() {
                if($(id(_shell_view_id)).length == 0) {
                    _active = false;
                    return;
                }
                _line.text = '';
                _line.cursor = 0;
                _noEvents = true;
                _readline.setLine(_line);
                _noEvents = false;
                _readline.activate();
            },
            clearPrompt: function () {
                _line = {text: '', cursor: 0}
            },
            clear: function () {
                $(id(_input_id)).parent().empty();
                self.refresh();
            },
            deactivate: function() {
                _console.log("deactivating");
                _active = false;
                _readline.deactivate();
            },
            setCommandHandler: function(cmd, cmdHandler) {
                _cmdHandlers[cmd] = cmdHandler;
            },
            getCommandHandler: function(cmd) {
                return _cmdHandlers[cmd];
            },
            setPrompt: function(prompt) {
                _prompt = prompt;
                if(!_active) {
                    return;
                }
                self.refresh();
            },
            onEOT: function(completionHandler) {
                _readline.onEOT(completionHandler);
            },
            onCancel: function(completionHandler) {
                _readline.onCancel(completionHandler);
            },
            onInitialize: function(completionHandler) {
                _initializationHandler = completionHandler;
            },
            onActivate: function(completionHandler) {
                _activationHandler = completionHandler;
            },
            onDeactivate: function(completionHandler) {
                _deactivationHandler = completionHandler;
            },
            onNewPrompt: function(completionHandler) {
                _promptHandler = completionHandler;
            },
            renderOutput: renderOutput,
            render: function() {
                var text = _line.text || '';
                _console.log('Start render', text);
                var cursorIdx = _line.cursor || 0;
                if(_searchMatch) {
                    cursorIdx = _searchMatch.cursoridx || 0;
                    text = _searchMatch.text || '';
                    $(id(_input_id) + ' .searchterm').text(_searchMatch.term);
                }
                var left = _.escape(text.substr(0, cursorIdx)).replace(/ /g, '&nbsp;');
                var cursor = text.substr(cursorIdx, 1);
                var right = _.escape(text.substr(cursorIdx + 1)).replace(/ /g, '&nbsp;');
                $(id(_input_id) + ' .prompt').html(_prompt);
                $(id(_input_id) + ' .input .left').html(left);
                if(!cursor) {
                    $(id(_input_id) + ' .input .cursor').html('&nbsp;').css('textDecoration', 'underline');
                } else {
                    $(id(_input_id) + ' .input .cursor').text(cursor).css('textDecoration', 'underline');
                }
                $(id(_input_id) + ' .input .right').html(right);
                _cursor_visible = true;
                self.scrollToBottom();
                _console.log('rendered "' + text + '" w/ cursor at ' + cursorIdx);
            },
            refresh: function() {
                $(id(_input_id)).replaceWith(self.templates.input_cmd({id:_input_id}));
                self.render();
                _console.log('refreshed ' + _input_id);

            },
            scrollToBottom: function() {
                _panel.animate({scrollTop: _view.height()}, 0);
            },
            bestMatch: function(partial, possible) {
                _console.log("bestMatch on partial '" + partial + "'");
                var result = {
                    completion: null,
                    suggestions: []
                };
                if(!possible || possible.length == 0) {
                    return result;
                }
                var common = '';
                if(!partial) {
                    if(possible.length == 1) {
                        result.completion = possible[0];
                        result.suggestions = possible;
                        return result;
                    }
                    if(!_.every(possible, function(x) {
                            return possible[0][0] == x[0]
                        })) {
                        result.suggestions = possible;
                        return result;
                    }
                }
                for(var i = 0; i < possible.length; i++) {
                    var option = possible[i];
                    if(option.slice(0, partial.length) == partial) {
                        result.suggestions.push(option);
                        if(!common) {
                            common = option;
                            _console.log("initial common:" + common);
                        } else if(option.slice(0, common.length) != common) {
                            _console.log("find common stem for '" + common + "' and '" + option + "'");
                            var j = partial.length;
                            while(j < common.length && j < option.length) {
                                if(common[j] != option[j]) {
                                    common = common.substr(0, j);
                                    break;
                                }
                                j++;
                            }
                        }
                    }
                }
                result.completion = common.substr(partial.length);
                return result;
            }
        };

        function id(id) {
            return "#"+id;
        }

        function commands() {
            return _.chain(_cmdHandlers).keys().filter(function(x) {
                return x[0] != "_"
            }).value();
        }

        function blinkCursor() {
            if(!_active) {
                return;
            }
            root.setTimeout(function() {
                if(!_active) {
                    return;
                }
                _cursor_visible = !_cursor_visible;
                if(_cursor_visible) {
                    $(id(_input_id) + ' .input .cursor').css('textDecoration', 'underline');
                } else {
                    $(id(_input_id) + ' .input .cursor').css('textDecoration', '');
                }
                blinkCursor();
            }, _blinktime);
        }

        function split(str) {
            return _.filter(str.split(/\s+/), function(x) {
                return x;
            });
        }

        function getHandler(cmd) {
            return _cmdHandlers[cmd] || _cmdHandlers._default;
        }

        function renderOutput(output, callback) {
            $('.promptLine:has(span.input:empty)').height(0);
            if(output) {
                $(id(_input_id)).after(output);
            }
            $(id(_input_id) + ' .input .cursor').css('textDecoration', '');
            $(id(_input_id)).removeAttr('id');
            $(id(_shell_view_id)).append(self.templates.input_cmd({id:_input_id}));
            if(_promptHandler) {
                return _promptHandler(function(prompt) {
                    self.setPrompt(prompt);
                    return callback();
                });
            }
            return callback();
        }

        function activate() {
            _console.log("activating shell");
            if(!_view) {
                _view = $(id(_shell_view_id));
            }
            if(!_panel) {
                _panel = $(id(_shell_panel_id));
            }
            if($(id(_input_id)).length == 0) {
                _view.append(self.templates.input_cmd({id:_input_id}));
            }
            self.refresh();
            _active = true;
            blinkCursor();
            if(_promptHandler) {
                _promptHandler(function(prompt) {
                    self.setPrompt(prompt);
                })
            }
            if(_activationHandler) {
                _activationHandler();
            }
        }

        // init
        _readline.onActivate(function() {
            if(!_initialized) {
                _initialized = true;
                if(_initializationHandler) {
                    return _initializationHandler(activate);
                }
            }
            return activate();
        });
        _readline.onDeactivate(function() {
            if(_deactivationHandler) {
                _deactivationHandler();
            }
        });
        _readline.onChange(function(line) {
            if (!_noEvents) {
                _line = line;
                self.render();
            }
        });
        _readline.onClear(function() {
            _cmdHandlers.clear.exec(null, null, function() {
                renderOutput(null, function() {
                });
            });
        });
        _readline.onRun(config.run);
        _readline.onSearchStart(function() {
            $(id(_input_id)).replaceWith(self.templates.input_search({id:_input_id}));
            _console.log('started search');
        });
        _readline.onSearchEnd(function() {
            $(id(_input_id)).replaceWith(self.templates.input_cmd({id:_input_id}));
            _searchMatch = null;
            self.render();
            _console.log("ended search");
        });
        _readline.onSearchChange(function(match) {
            _searchMatch = match;
            self.render();
        });
        _readline.onEnter(function(cmdtext, callback) {
            _console.log("got command: " + cmdtext);
            cmdtext = config.onCommand(cmdtext) === false ? '' : cmdtext;
            callback(cmdtext);
        });
        _readline.onCompletion(function(line, callback) {
            if(!line) {
                return callback();
            }
            var text = line.text.substr(0, line.cursor);
            var parts = split(text);

            var cmd = parts.shift() || '';
            var arg = parts.pop() || '';
            _console.log("getting completion handler for " + cmd);
            var handler = getHandler(cmd);
            if(handler != _cmdHandlers._default && cmd && cmd == text) {

                _console.log("valid cmd, no args: append space");
                // the text to complete is just a valid command, append a space
                return callback(' ');
            }
            if(!handler.completion) {
                // handler has no completion function, so we can't complete
                return callback();
            }
            _console.log("calling completion handler for " + cmd);
            return handler.completion(cmd, arg, line, function(match) {
                _console.log("completion: " + JSON.stringify(match));
                if(!match) {
                    return callback();
                }
                if(match.suggestions && match.suggestions.length > 1) {
                    return renderOutput(self.templates.suggest({suggestions: match.suggestions}), function() {
                        callback(match.completion);
                    });
                }
                return callback(match.completion);
            });
        });
        return self;
    }
})(window, $, _);

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9rcmFrZW4tZGV2dG9vbHMtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21lbWV0cmFsL2Rldi9wZXJzb25hbC9hZHZlbnQuanMvcHVibGljL2pzL2FwcC5qcyIsIi9Vc2Vycy9tZW1ldHJhbC9kZXYvcGVyc29uYWwvYWR2ZW50LmpzL3B1YmxpYy9qcy9qc091dHB1dC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3OUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgSnNPdXRwdXQgPSByZXF1aXJlKCcuL2pzT3V0cHV0JyksXG4gICAgX2pzTGlzdGVuZXJzID0ge30sXG4gICAgY2FudmFzLFxuICAgIHNvY2tldCxcbiAgICBzbGltU2l6ZSA9IGZhbHNlO1xuO1xuXG5pZiAocGFnZSA9PT0gJ2NvbnNvbGVHYW1lJykge1xuICAgICQoY29uc29sZUdhbWVQYWdlKTtcbn0gZWxzZSBpZiAocGFnZSA9PT0gJ2NhbnZhcycpIHtcbiAgICAkKGNhbnZhc1BhZ2UpO1xufSBlbHNlIGlmIChwYWdlID09PSAnbG9naW5QYWdlJykge1xuICAgICQobG9naW5QYWdlKTtcbn0gZWxzZSBpZiAocGFnZSA9PT0gJ21pbmVjcmFmdCcpIHtcbiAgICAkKG1pbmVjcmFmdCk7XG59IGVsc2UgaWYgKHBhZ2UgPT09ICdnYW1lJykge1xuICAgICQoZ2FtZSk7XG59IGVsc2UgaWYgKHBhZ2UgPT09ICdzY3JhdGNoY3JhZnQnKSB7XG4gICAgJChzY3JhdGNoY3JhZnQpO1xufVxuXG5mdW5jdGlvbiBsb2dpblBhZ2UoKSB7XG4gICAgJChcIiNsb2dpbiBidXR0b25cIikuY2xpY2soZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgdXJsOiBcIi9sb2dpblwiLFxuICAgICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBfY3NyZjogX2NzcmYsXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6ICQoXCJpbnB1dFtuYW1lPXVzZXJuYW1lXVwiKS52YWwoKSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZDogJChcImlucHV0W25hbWU9cGFzc3dvcmRdXCIpLnZhbCgpXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChcIkxvZ2luIGZhaWxlZCEgXCIgKyByZXNwb25zZS5lcnJvcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQubG9jYXRpb24gPSAnL34nICsgcmVzcG9uc2UucHJvZmlsZS5uYW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBhbGVydChcIkxvZ2luIGZhaWxlZCEgXCIgKyBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gbWluZWNyYWZ0KCkge1xuICAgIHNpemVyKCk7XG4gICAgJCh3aW5kb3cpLnJlc2l6ZShzaXplcik7XG5cbiAgICB2YXIgdG9vbHMgPSBhY2UucmVxdWlyZShcImFjZS9leHQvbGFuZ3VhZ2VfdG9vbHNcIik7XG4gICAgdmFyIGVkaXRvciA9IGFjZS5lZGl0KCdlZGl0b3InKTtcbiAgICBlZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgZWRpdG9yLmdldFNlc3Npb24oKS5zZXRNb2RlKCdhY2UvbW9kZS9qYXZhc2NyaXB0Jyk7XG4gICAgZWRpdG9yLnNldE9wdGlvbnMoe1xuICAgICAgICBlbmFibGVCYXNpY0F1dG9jb21wbGV0aW9uOiB0cnVlXG4gICAgfSk7XG5cbiAgICAkKCcjc2F2ZScpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHVybDogXCIvc2F2ZVwiLFxuICAgICAgICAgICAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBfY3NyZjogX2NzcmYsXG4gICAgICAgICAgICAgICAgY29udGVudDogZWRpdG9yLmdldFNlc3Npb24oKS5nZXRWYWx1ZSgpXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChcIlNhdmUgZmFpbGVkISBcIiArIHJlc3BvbnNlLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgYWxlcnQoXCJTYXZlIGZhaWxlZCEgXCIgKyBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2FtZSgpIHtcbiAgICB2YXIgcGxheWVycyA9IHt9LCBteU5hbWUsIGN1cnJlbnQsIGpzT3V0cHV0LCBqc0NvbmZpZywgbGVmdFZhbHVlLCByaWdodFZhbHVlLCBjdXJPcEZuO1xuXG4gICAgc29ja2V0ID0gaW8oKTtcbiAgICAkKCcjbG9naW4gLnVzZXJuYW1lSW5wdXQnKS5mb2N1cygpO1xuICAgICQoJyN5b3VyTnVtYmVyJykuaGlkZSgpO1xuXG4gICAgZnVuY3Rpb24gZ29HYW1lKCkge1xuICAgICAgICBzb2NrZXQuZW1pdCgncGxheWVyJywge25hbWU6IG15TmFtZX0pO1xuXG4gICAgICAgIGpzQ29uZmlnID0ge1xuICAgICAgICAgICAgY29uc29sZTogY29uc29sZSxcbiAgICAgICAgICAgIG9uQ29tbWFuZDogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgICAgICAgICBzb2NrZXQuZW1pdCgnY2hhdCcsIHtuYW1lOiBteU5hbWUsIHRleHQ6IGxpbmV9KTtcbiAgICAgICAgICAgICAgICBqc091dHB1dC5jbGVhclByb21wdCgpO1xuICAgICAgICAgICAgICAgIGpzT3V0cHV0LnJlbmRlck91dHB1dChteU5hbWUgKyAnOiAnICsgbGluZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAganNPdXRwdXQgPSBuZXcgSnNPdXRwdXQoanNDb25maWcpO1xuICAgICAgICBqc091dHB1dC5fY29uZmlnID0ganNDb25maWc7XG5cbiAgICAgICAgdmFyIHByb21wdGVkID0gZmFsc2U7XG4gICAgICAgIGpzT3V0cHV0Lm9uTmV3UHJvbXB0KGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKCFwcm9tcHRlZCkge1xuICAgICAgICAgICAgICAgIHByb21wdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soJ1dlbGNvbWUgdG8gdGhlIGdhbWUhIENoYXQgd2l0aCBvdGhlciBwbGF5ZXJzIGhlcmUuIEJlIHJlc3BlY3RmdWwuPGJyLz4+ICcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2soJz4gJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGpzT3V0cHV0LmFjdGl2YXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZ2FtZXVzZXInKSkge1xuICAgICAgICBteU5hbWUgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2dhbWV1c2VyJyk7XG4gICAgICAgIHBsYXllcnNbbXlOYW1lXSA9IHtuYW1lOiBteU5hbWV9O1xuICAgICAgICBnb0dhbWUoKTtcbiAgICAgICAgJCgnI2xvZ2luJykuaGlkZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgICQod2luZG93KS5rZXlkb3duKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgaWYgKG15TmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXV0by1mb2N1cyB0aGUgY3VycmVudCBpbnB1dCB3aGVuIGEga2V5IGlzIHR5cGVkXG4gICAgICAgICAgICBpZiAoIShldmVudC5jdHJsS2V5IHx8IGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuYWx0S2V5KSkge1xuICAgICAgICAgICAgICAgICQoJyNsb2dpbiAudXNlcm5hbWVJbnB1dCcpLmZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBXaGVuIHRoZSBjbGllbnQgaGl0cyBFTlRFUiBvbiB0aGVpciBrZXlib2FyZFxuICAgICAgICAgICAgaWYgKGV2ZW50LndoaWNoID09PSAxMykge1xuICAgICAgICAgICAgICAgIG15TmFtZSA9ICQoJyNsb2dpbiAudXNlcm5hbWVJbnB1dCcpLnZhbCgpO1xuICAgICAgICAgICAgICAgIHNvY2tldC5lbWl0KCdwbGF5ZXInLCB7bmFtZTogbXlOYW1lfSk7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdnYW1ldXNlcicsIG15TmFtZSk7XG4gICAgICAgICAgICAgICAgZ29HYW1lKCk7XG4gICAgICAgICAgICAgICAgJCgnI2xvZ2luJykuZmFkZU91dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzb2NrZXQub24oJ3BsYXllcicsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdQTEFZRVInLCBkYXRhKTtcbiAgICAgICAgc29ja2V0LmVtaXQoJ3BsYXllclJlc3BvbnNlJywge25hbWU6IG15TmFtZX0pO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdwbGF5ZXJSZXNwb25zZScsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGlmICghcGxheWVyc1tkYXRhLm5hbWVdKSB7XG4gICAgICAgICAgICBqc091dHB1dC5yZW5kZXJPdXRwdXQoJ05ldyBQbGF5ZXIhICcgKyBkYXRhLm5hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcGxheWVyc1tkYXRhLm5hbWVdID0ge307XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbmV3IHBsYXllcicsIGRhdGEpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgc2V0dXBHYW1lID0gZnVuY3Rpb24gKHApIHtcbiAgICAgICAgY3VycmVudCA9IHA7XG4gICAgICAgICQoJyN0Z3QnKS50ZXh0KHAudGFyZ2V0KTtcbiAgICAgICAgJCgnI2dhbWVTdGFydCcpLmhpZGUoKTtcbiAgICAgICAgJCgnI3lvdXJOdW1iZXIgc3BhbicpLnRleHQocC5wbGF5ZXJzW215TmFtZV0ubnVtYmVyKTtcbiAgICAgICAgJCgnI3lvdXJOdW1iZXInKS5mYWRlSW4oKTtcbiAgICB9O1xuXG4gICAgc29ja2V0Lm9uKCduZXdHYW1lJywgc2V0dXBHYW1lKTtcblxuICAgIHNvY2tldC5vbignd2luJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgYWxlcnQoZC5uYW1lICsgJyBoYXMgd29uLicpO1xuICAgIH0pO1xuXG4gICAgJCgnI29wJykuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAkKCcjb3BDaG9pY2UnKS5mYWRlSW4oKTtcbiAgICB9KTtcblxuICAgICQoJyNvcENob2ljZSBidXR0b24nKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvcCA9ICQodGhpcykudGV4dCgpO1xuICAgICAgICAkKCcjb3AnKS50ZXh0KG9wKTtcbiAgICAgICAgJCgnI29wQ2hvaWNlJykuaGlkZSgpO1xuICAgICAgICBpZiAob3AgPT09ICcrJykge1xuICAgICAgICAgICAgY3VyT3BGbiA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHggKyB5O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChvcCA9PT0gJ8OXJykge1xuICAgICAgICAgICAgY3VyT3BGbiA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHggKiB5O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChvcCA9PT0gJy0nKSB7XG4gICAgICAgICAgICBjdXJPcEZuID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geCAtIHk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGNoZWNrUmVzdWx0KCk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBjaGVja1Jlc3VsdCgpIHtcbiAgICAgICAgaWYgKGN1ck9wRm4gJiYgbGVmdFZhbHVlICYmIHJpZ2h0VmFsdWUgJiYgY3VyT3BGbihsZWZ0VmFsdWUsIHJpZ2h0VmFsdWUpID09IGN1cnJlbnQudGFyZ2V0KSB7XG4gICAgICAgICAgICBzb2NrZXQuZW1pdCgnd2luJywge25hbWU6IG15TmFtZX0pO1xuICAgICAgICAgICAgYWxlcnQoJ1lPVSBXSU4nKTtcbiAgICAgICAgICAgICQoJyNnYW1lU3RhcnQnKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgfVxuICAgIH1cblxuICAgICQoJyNpdGVtMScpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFjdXJyZW50KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJCgnI3QxQ2hvaWNlJykuaHRtbCgnJyk7XG4gICAgICAgIGZvciAodmFyIHBuIGluIGN1cnJlbnQucGxheWVycykge1xuICAgICAgICAgICAgdmFyIGsgPSAkKCc8YnV0dG9uLz4nKS5hZGRDbGFzcygnYnRuIGJ0bi1sZycpLnRleHQocG4gKyAnICcgKyBjdXJyZW50LnBsYXllcnNbcG5dLm51bWJlcik7XG4gICAgICAgICAgICAkKCcjdDFDaG9pY2UnKS5hcHBlbmQoayk7XG4gICAgICAgICAgICBrLmRhdGEoJ3BsYXllcicsIHBuKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcjdDFDaG9pY2UgYnV0dG9uJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHAgPSBjdXJyZW50LnBsYXllcnNbJCh0aGlzKS5kYXRhKCdwbGF5ZXInKV07XG4gICAgICAgICAgICAkKCcjaXRlbTEnKS50ZXh0KHAubnVtYmVyKTtcbiAgICAgICAgICAgICQoJyN0MUNob2ljZScpLmhpZGUoKTtcbiAgICAgICAgICAgIGxlZnRWYWx1ZSA9IHAubnVtYmVyO1xuICAgICAgICAgICAgY2hlY2tSZXN1bHQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI3QxQ2hvaWNlJykuZmFkZUluKCk7XG4gICAgfSk7XG5cbiAgICAkKCcjaXRlbTInKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghY3VycmVudCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgICQoJyN0MkNob2ljZScpLmh0bWwoJycpO1xuICAgICAgICBmb3IgKHZhciBwbiBpbiBjdXJyZW50LnBsYXllcnMpIHtcbiAgICAgICAgICAgIHZhciBrID0gJCgnPGJ1dHRvbi8+JykuYWRkQ2xhc3MoJ2J0biBidG4tbGcnKS50ZXh0KHBuICsgJyAnICsgY3VycmVudC5wbGF5ZXJzW3BuXS5udW1iZXIpO1xuICAgICAgICAgICAgJCgnI3QyQ2hvaWNlJykuYXBwZW5kKGspO1xuICAgICAgICAgICAgay5kYXRhKCdwbGF5ZXInLCBwbik7XG4gICAgICAgIH1cbiAgICAgICAgJCgnI3QyQ2hvaWNlIGJ1dHRvbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBwID0gY3VycmVudC5wbGF5ZXJzWyQodGhpcykuZGF0YSgncGxheWVyJyldO1xuICAgICAgICAgICAgJCgnI2l0ZW0yJykudGV4dChwLm51bWJlcik7XG4gICAgICAgICAgICAkKCcjdDJDaG9pY2UnKS5oaWRlKCk7XG4gICAgICAgICAgICByaWdodFZhbHVlID0gcC5udW1iZXI7XG4gICAgICAgICAgICBjaGVja1Jlc3VsdCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjdDJDaG9pY2UnKS5mYWRlSW4oKTtcbiAgICB9KTtcblxuICAgICQoJyNnYW1lU3RhcnQnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBoYW5kID0gZGVhbChwbGF5ZXJzKTtcbiAgICAgICAgc29ja2V0LmVtaXQoJ25ld0dhbWUnLCBoYW5kKTtcbiAgICAgICAgc2V0dXBHYW1lKGhhbmQpO1xuICAgICAgICAkKCcjZ2FtZVN0YXJ0JykuaGlkZSgpO1xuICAgICAgICAkKCcjeW91ck51bWJlcicpLmZhZGVJbigpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gY29uc29sZVNpemVyKCkge1xuICAgICAgICB2YXIgdG90YWxIZWlnaHQgPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG4gICAgICAgICQoJyNjb25zb2xlUm93JykuaGVpZ2h0KHRvdGFsSGVpZ2h0IC0gMzAwKTtcbiAgICB9XG5cbiAgICBjb25zb2xlU2l6ZXIoKTtcbiAgICAkKHdpbmRvdykucmVzaXplKGNvbnNvbGVTaXplcik7XG5cbiAgICBzb2NrZXQub24oJ2NoYXQnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBjb25zb2xlLmxvZygnQ0hBVCcsIGRhdGEpO1xuICAgICAgICBqc091dHB1dC5yZW5kZXJPdXRwdXQoZGF0YS5uYW1lICsgJzogJyArIGRhdGEudGV4dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICB9KTtcbiAgICB9KTtcblxufVxuXG5mdW5jdGlvbiBjb25zb2xlR2FtZVBhZ2UoKSB7XG5cbiAgICBzb2NrZXQgPSBpbygpO1xuICAgIGRvV2l0KCk7XG4gICAgdmFyIGFwcE5hbWUgPSBkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHJpbmcoMSk7XG5cbiAgICBpZiAod2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMSkuaW5kZXhPZihcInA9XCIpID09PSAwKSB7XG4gICAgICAgIHZhciBwcm9nID0gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMykuc3BsaXQoJyYnKVswXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHByb2cgPSBMWlN0cmluZy5kZWNvbXByZXNzRnJvbUVuY29kZWRVUklDb21wb25lbnQocHJvZyk7XG4gICAgICAgICAgICAkKCcjZWRpdG9yJykudGV4dChwcm9nKTtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIHdhcyBhIHByb2dyYW0gbGluaywga2VlcCBsb2NhbCBjaGFuZ2VzXG4gICAgICAgICAgICBhcHBOYW1lID0gc2hhMShwcm9nKTtcbiAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgLy8gV2Fzbid0IGEgcHJvZ3JhbSBpbiB0aGUgbGluay4uLlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGpzQ29uZmlnID0ge1xuICAgICAgICBvbkNvbW1hbmQ6IGxvZ2dlcklucHV0LFxuICAgICAgICBjb25zb2xlOiBjb25zb2xlLFxuICAgICAgICBydW46IHJ1blxuICAgIH07XG4gICAgdmFyIGpzT3V0cHV0ID0gbmV3IEpzT3V0cHV0KGpzQ29uZmlnKTtcbiAgICBqc091dHB1dC5fY29uZmlnID0ganNDb25maWc7XG5cbiAgICBzaXplcigpO1xuICAgICQod2luZG93KS5yZXNpemUoc2l6ZXIpO1xuXG4gICAgdmFyIHByb21wdGVkID0gZmFsc2U7XG4gICAganNPdXRwdXQub25OZXdQcm9tcHQoZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghcHJvbXB0ZWQpIHtcbiAgICAgICAgICAgIHByb21wdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygnVGhlIG91dHB1dCBvZiB5b3VyIHByb2dyYW0gd2lsbCBhcHBlYXIgaGVyZS4nKTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjaygnJyk7XG4gICAgfSk7XG5cbiAgICBpZiAod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjb2RlJyArIGFwcE5hbWUpKSB7XG4gICAgICAgICQoJyNlZGl0b3InKS50ZXh0KHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY29kZScgKyBhcHBOYW1lKSk7XG4gICAgfVxuXG4gICAgYWNlLnJlcXVpcmUoXCJhY2UvZXh0L2xhbmd1YWdlX3Rvb2xzXCIpO1xuICAgIHZhciBlZGl0b3IgPSBhY2UuZWRpdCgnZWRpdG9yJyk7XG4gICAgZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgIGVkaXRvci5nZXRTZXNzaW9uKCkuc2V0TW9kZSgnYWNlL21vZGUvamF2YXNjcmlwdCcpO1xuICAgIGVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgZW5hYmxlU25pcHBldHM6IHRydWUsXG4gICAgICAgIGVuYWJsZUxpdmVBdXRvY29tcGxldGlvbjogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQmFzaWNBdXRvY29tcGxldGlvbjogdHJ1ZVxuICAgIH0pO1xuICAgIGNvbnNvbGVDb21wbGV0ZXMoYWNlLnJlcXVpcmUoXCJhY2Uvc25pcHBldHNcIikuc25pcHBldE1hbmFnZXIpO1xuXG4gICAgZWRpdG9yLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY29kZScgKyBhcHBOYW1lLCBlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCkpO1xuICAgICAgICBpZiAoJCgnI2F1dG9SdW4nKS5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcnVuKCk7XG4gICAgICAgICAgICB9IGNhdGNoICh4KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGVkaXRvci5vbignZm9jdXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGpzT3V0cHV0LmRlYWN0aXZhdGUoKTtcbiAgICB9KTtcblxuICAgIGVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kKHtcbiAgICAgICAgbmFtZTogJ1J1bicsXG4gICAgICAgIGJpbmRLZXk6ICdDdHJsLVInLFxuICAgICAgICBleGVjOiBmdW5jdGlvbiAoZWRpdG9yKSB7XG4gICAgICAgICAgICBydW4oKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kKHtcbiAgICAgICAgbmFtZTogJ0NsZWFyJyxcbiAgICAgICAgYmluZEtleTogJ0N0cmwtTCcsXG4gICAgICAgIGV4ZWM6IGZ1bmN0aW9uIChlZGl0b3IpIHtcbiAgICAgICAgICAgIGpzT3V0cHV0LmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICAkKCcjcnVuJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLmJsdXIoKTtcbiAgICAgICAgcnVuKCk7XG4gICAgfSk7XG4gICAgJCgnI2NsZWFyJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBqc091dHB1dC5jbGVhcigpO1xuICAgICAgICBqc091dHB1dC5yZW5kZXJPdXRwdXQoJz4nLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgJCgnI3NoYXJlJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYuc3BsaXQoJz8nKVswXTtcbiAgICAgICAgdmFyIGVuYyA9IExaU3RyaW5nLmNvbXByZXNzVG9FbmNvZGVkVVJJQ29tcG9uZW50KGVkaXRvci5nZXRTZXNzaW9uKCkuZ2V0VmFsdWUoKSk7XG4gICAgICAgICQoJyN1cmxNb2RhbCB0ZXh0YXJlYScpLnZhbCh1cmwgKyAnP3A9JyArIGVuYyk7XG4gICAgICAgICQoJyN1cmxNb2RhbCcpLm1vZGFsKCk7XG4gICAgfSk7XG5cbiAgICB2YXIgY29udGV4dCA9IGNsb3N1cmUoc29ja2V0LCBlZGl0b3IsIGpzT3V0cHV0KTtcblxuICAgIHNvY2tldC5vbignY2hhdCcsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChfanNMaXN0ZW5lcnNbbS5jb250ZW50LnR5cGVdKSB7XG4gICAgICAgICAgICBfanNMaXN0ZW5lcnNbbS5jb250ZW50LnR5cGVdLmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgZm4obS5jb250ZW50Lm1lc3NhZ2UsIG0uc291cmNlLCBtLmNvbnRlbnQudHlwZSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVbmhhbmRsZWQgbWVzc2FnZScsIG0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAkKCcjY29weXByb2cnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNvY2tldC5lbWl0KCdzaGFyZScsIHtcbiAgICAgICAgICAgIGNvZGU6IGVkaXRvci5nZXRTZXNzaW9uKCkuZ2V0VmFsdWUoKSxcbiAgICAgICAgICAgIHR5cGU6ICdjb25zb2xlJ1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBzaGFyZVByb2c7XG4gICAgc29ja2V0Lm9uKCdzaGFyZScsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChtLmNvbnRlbnQudHlwZSA9PT0gJ2NvbnNvbGUnKSB7XG4gICAgICAgICAgICAkKCcjZ2V0cHJvZycpLmZhZGVJbigpO1xuICAgICAgICAgICAgc2hhcmVQcm9nID0gbS5jb250ZW50LmNvZGU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgICQoJyNnZXRwcm9nJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBlZGl0b3IuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKHNoYXJlUHJvZyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBydW4oY29kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgX2pzTGlzdGVuZXJzID0ge307XG4gICAgICAgICAgICBjb250ZXh0KGNvZGUgfHwgZWRpdG9yLmdldFNlc3Npb24oKS5nZXRWYWx1ZSgpKTtcbiAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgdmFyIHRyYWNlO1xuICAgICAgICAgICAgaWYgKHdpbmRvd1tcInByaW50U3RhY2tUcmFjZVwiXSkge1xuICAgICAgICAgICAgICAgIHRyYWNlID0gcHJpbnRTdGFja1RyYWNlKHtlOiB4fSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBsYXN0TGluZSA9IHRyYWNlID8gdHJhY2VbMF0ubWF0Y2goLzxhbm9ueW1vdXM+OihcXGQrKTooXFxkKykvKSA6IG51bGw7XG4gICAgICAgICAgICBpZiAobGFzdExpbmUgJiYgbGFzdExpbmUubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGJvb3Rib3guZGlhbG9nKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZXJlIHdhcyBhbiBlcnJvciE8YnIvPjxiPicgKyB4Lm1lc3NhZ2UgKyAnPC9iPjxici8+PGJyLz5PbiBMaW5lICMnICsgKGxhc3RMaW5lWzFdIC0gMiksXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIk9vcHMhXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYm9vdGJveC5hbGVydCh4Lm1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAganNPdXRwdXQuYWN0aXZhdGUoKTtcbiAgICBlZGl0b3IuZm9jdXMoKTtcbn1cblxuZnVuY3Rpb24gY2FudmFzUGFnZSgpIHtcblxuICAgIHNvY2tldCA9IGlvKCk7XG4gICAgdmFyIGFwcE5hbWUgPSBkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHJpbmcoMSk7XG5cbiAgICBpZiAod2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMSkuaW5kZXhPZihcInA9XCIpID09PSAwKSB7XG4gICAgICAgIHZhciBwcm9nID0gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMykuc3BsaXQoJyYnKVswXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHByb2cgPSBMWlN0cmluZy5kZWNvbXByZXNzRnJvbUVuY29kZWRVUklDb21wb25lbnQocHJvZyk7XG4gICAgICAgICAgICAkKCcjZWRpdG9yJykudGV4dChwcm9nKTtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIHdhcyBhIHByb2dyYW0gbGluaywga2VlcCBsb2NhbCBjaGFuZ2VzXG4gICAgICAgICAgICBhcHBOYW1lID0gc2hhMShwcm9nKTtcbiAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgLy8gV2Fzbid0IGEgcHJvZ3JhbSBpbiB0aGUgbGluay4uLlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2FudmFzID0gJCgnI2NhbnZhcycpWzBdO1xuXG4gICAgc2l6ZXIoKTtcbiAgICAkKHdpbmRvdykucmVzaXplKHNpemVyKTtcbiAgICAkKCcjc2hvd0NvZGUnKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNsaW1TaXplID0gZmFsc2U7XG4gICAgICAgICQoJyNzbGltQnV0dG9ucycpLmhpZGUoKTtcbiAgICAgICAgJCgnI2ZhdEJ1dHRvbnMnKS5zaG93KCk7XG4gICAgICAgIHNpemVyKCk7XG4gICAgfSk7XG5cbiAgICBpZiAod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjb2RlJyArIGFwcE5hbWUpKSB7XG4gICAgICAgICQoJyNlZGl0b3InKS50ZXh0KHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY29kZScgKyBhcHBOYW1lKSk7XG4gICAgfVxuXG4gICAgYWNlLnJlcXVpcmUoXCJhY2UvZXh0L2xhbmd1YWdlX3Rvb2xzXCIpO1xuICAgIHZhciBlZGl0b3IgPSBhY2UuZWRpdCgnZWRpdG9yJyk7XG4gICAgZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgIGVkaXRvci5nZXRTZXNzaW9uKCkuc2V0TW9kZSgnYWNlL21vZGUvamF2YXNjcmlwdCcpO1xuICAgIGVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgZW5hYmxlU25pcHBldHM6IHRydWUsXG4gICAgICAgIGVuYWJsZUxpdmVBdXRvY29tcGxldGlvbjogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQmFzaWNBdXRvY29tcGxldGlvbjogdHJ1ZVxuICAgIH0pO1xuICAgIGNhbnZhc0NvbXBsZXRlcyhhY2UucmVxdWlyZShcImFjZS9zbmlwcGV0c1wiKS5zbmlwcGV0TWFuYWdlcik7XG5cbiAgICBlZGl0b3Iub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjb2RlJyArIGFwcE5hbWUsIGVkaXRvci5nZXRTZXNzaW9uKCkuZ2V0VmFsdWUoKSk7XG4gICAgICAgIGlmICgkKCcjYXV0b1J1bicpLnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBydW4oKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKHgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZWRpdG9yLm9uKCdmb2N1cycsIGZ1bmN0aW9uICgpIHtcbiAgICB9KTtcblxuICAgIGVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kKHtcbiAgICAgICAgbmFtZTogJ1J1bicsXG4gICAgICAgIGJpbmRLZXk6ICdDdHJsLVInLFxuICAgICAgICBleGVjOiBmdW5jdGlvbiAoZWRpdG9yKSB7XG4gICAgICAgICAgICBydW4oKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kKHtcbiAgICAgICAgbmFtZTogJ0NsZWFyJyxcbiAgICAgICAgYmluZEtleTogJ0N0cmwtTCcsXG4gICAgICAgIGV4ZWM6IGZ1bmN0aW9uIChlZGl0b3IpIHtcbiAgICAgICAgICAgIHZhciBjYW52YXNDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgJCgnI3J1bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgJCgnI2ZhdEJ1dHRvbnMnKS5oaWRlKCk7XG4gICAgICAgICQoJyNzbGltQnV0dG9ucycpLnNob3coKTtcbiAgICAgICAgc2xpbVNpemUgPSB0cnVlO1xuICAgICAgICB0aGlzLmJsdXIoKTtcbiAgICAgICAgc2l6ZXIoKTtcbiAgICAgICAgcnVuKCk7XG4gICAgfSk7XG4gICAgJCgnI2NsZWFyJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBjYW52YXNDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgIH0pO1xuICAgICQoJyNzaGFyZScpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCc/JylbMF07XG4gICAgICAgIHZhciBlbmMgPSBMWlN0cmluZy5jb21wcmVzc1RvRW5jb2RlZFVSSUNvbXBvbmVudChlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCkpO1xuICAgICAgICAkKCcjdXJsTW9kYWwgdGV4dGFyZWEnKS52YWwodXJsICsgJz9wPScgKyBlbmMpO1xuICAgICAgICAkKCcjdXJsTW9kYWwnKS5tb2RhbCgpO1xuICAgIH0pO1xuXG4gICAgdmFyIGNvbnRleHQgPSBjYW52YXNDbG9zdXJlKHNvY2tldCwgZWRpdG9yKTtcblxuICAgIHNvY2tldC5vbignY2hhdCcsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChfanNMaXN0ZW5lcnNbbS5jb250ZW50LnR5cGVdKSB7XG4gICAgICAgICAgICBfanNMaXN0ZW5lcnNbbS5jb250ZW50LnR5cGVdLmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgZm4obS5jb250ZW50Lm1lc3NhZ2UsIG0uc291cmNlLCBtLmNvbnRlbnQudHlwZSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgJCgnI2NvcHlwcm9nJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzb2NrZXQuZW1pdCgnc2hhcmUnLCB7XG4gICAgICAgICAgICBjb2RlOiBlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCksXG4gICAgICAgICAgICB0eXBlOiAnY2FudmFzJ1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBjYWxsS2V5Rm4gPSBmdW5jdGlvbiAobmFtZSwgY29kZSkge1xuICAgICAgICBpZiAoX2pzTGlzdGVuZXJzW25hbWVdKSB7XG4gICAgICAgICAgICBfanNMaXN0ZW5lcnNbbmFtZV0uZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBmbihjb2RlKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIEJpbmQga2V5dXAgbWVzc2FnZXMgdG8gdGhlIHVzZXItbGFuZCBcIm9uXCIgZnVuY3Rpb24uIFRoZSBuYW1lc3BhY2UgaXMgc2hhcmVkIHdpdGggc29ja2V0cywgd2hpY2ggaXMgd2VpcmQgb2YgY291cnNlXG4gICAgJCgnYm9keScpLm9uKCdrZXl1cCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LnRhZ05hbWUgPT09ICdURVhUQVJFQScpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIga2V5ID0gZXZlbnQua2V5Q29kZTtcbiAgICAgICAgY2FsbEtleUZuKCdrZXknLCBrZXkpO1xuICAgICAgICBpZiAoa2V5ID49IDM3ICYmIGtleSA8PSA0MCkge1xuICAgICAgICAgICAgY2FsbEtleUZuKFsnbGVmdCcsJ3VwJywncmlnaHQnLCdkb3duJ11ba2V5IC0gMzddLCBrZXkpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgc2hhcmVQcm9nO1xuICAgIHNvY2tldC5vbignc2hhcmUnLCBmdW5jdGlvbiAobSkge1xuICAgICAgICBpZiAobS5jb250ZW50LnR5cGUgPT09ICdjYW52YXMnKSB7XG4gICAgICAgICAgICAkKCcjZ2V0cHJvZycpLmZhZGVJbigpO1xuICAgICAgICAgICAgc2hhcmVQcm9nID0gbS5jb250ZW50LmNvZGU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgICQoJyNnZXRwcm9nJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBlZGl0b3IuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKHNoYXJlUHJvZyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBydW4oY29kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgX2pzTGlzdGVuZXJzID0ge307XG4gICAgICAgICAgICBjb250ZXh0KGNvZGUgfHwgZWRpdG9yLmdldFNlc3Npb24oKS5nZXRWYWx1ZSgpKTtcbiAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgdmFyIHRyYWNlO1xuICAgICAgICAgICAgaWYgKHdpbmRvd1tcInByaW50U3RhY2tUcmFjZVwiXSkge1xuICAgICAgICAgICAgICAgIHRyYWNlID0gcHJpbnRTdGFja1RyYWNlKHtlOiB4fSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBsYXN0TGluZSA9IHRyYWNlID8gdHJhY2VbMF0ubWF0Y2goLzxhbm9ueW1vdXM+OihcXGQrKTooXFxkKykvKSA6IG51bGw7XG4gICAgICAgICAgICBpZiAobGFzdExpbmUgJiYgbGFzdExpbmUubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGJvb3Rib3guZGlhbG9nKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZXJlIHdhcyBhbiBlcnJvciE8YnIvPjxiPicgKyB4Lm1lc3NhZ2UgKyAnPC9iPjxici8+PGJyLz5PbiBMaW5lICMnICsgKGxhc3RMaW5lWzFdIC0gMiksXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIk9vcHMhXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYm9vdGJveC5hbGVydCh4Lm1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZWRpdG9yLmZvY3VzKCk7XG59XG5cbmZ1bmN0aW9uIGxvZ2dlcklucHV0KHRleHQpIHtcbiAgICBjb25zb2xlLmxvZygnVW5leHBlY3RlZCBpbnB1dCcsIHRleHQpO1xufVxuXG5mdW5jdGlvbiBjYW52YXNDbG9zdXJlKHNvY2tldCwgZWRpdG9yKSB7XG4gICAgdmFyIHJlZCA9ICcjRkYwMDAwJywgZ3JlZW4gPSAnIzAwRkYwMCcsIGJsdWUgPSAnIzAwMDBGRicsIHdoaXRlID0gJyNGRkZGRkYnLCBibGFjayA9ICcjMDAwJyxcbiAgICAgICAgZmlsbGVkID0gdHJ1ZSxcbiAgICAgICAgZW1wdHkgPSBmYWxzZSxcbiAgICAgICAgbGluZSA9IGZ1bmN0aW9uIChjLCB4LCB5LCB3LCBoKSB7XG4gICAgICAgICAgICB2YXIgY2FudmFzQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQubW92ZVRvKHgsIHkpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5saW5lVG8oeCArIHcsIHkgKyBoKTtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuc3Ryb2tlU3R5bGUgPSBjO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5zdHJva2UoKTtcbiAgICAgICAgfSwgY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY2FudmFzQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgfSwgY2lyY2xlID0gZnVuY3Rpb24gKGNvbG9yLCBjZW50ZXJYLCBjZW50ZXJZLCByYWRpdXMsIGYpIHtcbiAgICAgICAgICAgIHZhciBjYW52YXNDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5hcmMoY2VudGVyWCwgY2VudGVyWSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xuICAgICAgICAgICAgaWYgKGYpIHtcbiAgICAgICAgICAgICAgICBjYW52YXNDb250ZXh0LmZpbGxTdHlsZSA9IGNvbG9yO1xuICAgICAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5saW5lV2lkdGggPSA1O1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5zdHJva2VTdHlsZSA9IGNvbG9yO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5zdHJva2UoKTtcbiAgICAgICAgfSwgZmlsbCA9IGZ1bmN0aW9uIChjb2xvcikge1xuICAgICAgICAgICAgdmFyIGNhbnZhc0NvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LnJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbFN0eWxlID0gY29sb3I7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmZpbGwoKTtcbiAgICAgICAgfSwgcmVjdCA9IGZ1bmN0aW9uIChjLCB4LCB5LCB3LCBoLCBmKSB7XG4gICAgICAgICAgICB2YXIgY2FudmFzQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQucmVjdCh4LCB5LCB3LCBoKTtcbiAgICAgICAgICAgIGlmIChmIHx8IGYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbFN0eWxlID0gYztcbiAgICAgICAgICAgICAgICBjYW52YXNDb250ZXh0LmZpbGwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuc3Ryb2tlU3R5bGUgPSBjO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5zdHJva2UoKTtcbiAgICAgICAgfSwgcHJpbnQgPSBmdW5jdGlvbiAoY29sb3IsIHgsIHksIG1lc3NhZ2UsIGZvbnQpIHtcbiAgICAgICAgICAgIHZhciBjYW52YXNDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5mb250ID0gJzQwcHQgQ2FsaWJyaSc7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmZpbGxTdHlsZSA9IGNvbG9yIHx8ICd3aGl0ZSc7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmZpbGxUZXh0KG1lc3NhZ2UsIHgsIHkpO1xuICAgICAgICB9LFxuICAgICAgICBzZW5kID0gZnVuY3Rpb24gKHR5cGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0eXBlICYmICFtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IHR5cGU7XG4gICAgICAgICAgICAgICAgdHlwZSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzb2NrZXQuZW1pdCgnY2hhdCcsIHt0eXBlOiB0eXBlLCBtZXNzYWdlOiBtZXNzYWdlfSk7XG4gICAgICAgIH0sIG9uID0gZnVuY3Rpb24gKGUsIGZuKSB7XG4gICAgICAgICAgICBfanNMaXN0ZW5lcnNbZV0gPSBfanNMaXN0ZW5lcnNbZV0gfHwgW107XG4gICAgICAgICAgICBfanNMaXN0ZW5lcnNbZV0ucHVzaChmbik7XG4gICAgICAgIH07XG5cbiAgICByZXR1cm4gKGZ1bmN0aW9uIChjb2RlKSB7XG4gICAgICAgIHZhciBtZSA9IHNvY2tldC5pZDtcbiAgICAgICAgY29uc29sZS50cmFjZSgnUnVubmluZyBjb2RlJyk7XG4gICAgICAgIHZhciB0cmFuc2Zvcm1lZCA9IGJhYmVsLnRyYW5zZm9ybSgndmFyIHByb2dyYW1GdW5jdGlvbiA9IGFzeW5jIGZ1bmN0aW9uICgpIHsgJyArIGNvZGUgKyAnfTsgcHJvZ3JhbUZ1bmN0aW9uKCk7Jywge3N0YWdlOiAwfSk7XG4gICAgICAgIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aCwgaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcbiAgICAgICAgZXZhbCh0cmFuc2Zvcm1lZC5jb2RlKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY2xvc3VyZShzb2NrZXQsIGVkaXRvciwgb3V0cHV0KSB7XG4gICAgdmFyIHJhbmRvbSA9IGZ1bmN0aW9uIChoaWdoKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaGlnaCkgKyAxO1xuICAgICAgICB9LCBhZGRMZXR0ZXIgPSBmdW5jdGlvbiAoYywgdikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHYgPSB2LmNoYXJDb2RlQXQoMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgoYy5jaGFyQ29kZUF0KDApICsgdikgJSAyNTYpO1xuICAgICAgICB9LFxuICAgICAgICBhZGRsZXR0ZXIgPSBhZGRMZXR0ZXIsXG4gICAgICAgIHByaW50ID0gZnVuY3Rpb24gKHRleHQpIHtcbiAgICAgICAgICAgIG91dHB1dC5yZW5kZXJPdXRwdXQodGV4dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3V0cHV0LmNsZWFyKCk7XG4gICAgICAgICAgICBvdXRwdXQucmVuZGVyT3V0cHV0KCc+JywgZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgcmVhZExpbmUgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBwcmludChtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByZXNvbHZlcjtcbiAgICAgICAgICAgIG91dHB1dC5fY29uZmlnLm9uQ29tbWFuZCA9IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmVyKGxpbmUpO1xuICAgICAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgICAgICAgIG91dHB1dC5fY29uZmlnLm9uQ29tbWFuZCA9IGxvZ2dlcklucHV0O1xuICAgICAgICAgICAgICAgIG91dHB1dC5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZWRpdG9yLmJsdXIoKTtcbiAgICAgICAgICAgIG91dHB1dC5hY3RpdmF0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZXIgPSByZXNvbHZlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIHJlYWRsaW5lID0gcmVhZExpbmUsXG4gICAgICAgIHNlbmQgPSBmdW5jdGlvbiAodHlwZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKHR5cGUgJiYgIW1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gdHlwZTtcbiAgICAgICAgICAgICAgICB0eXBlID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNvY2tldC5lbWl0KCdjaGF0Jywge3R5cGU6IHR5cGUsIG1lc3NhZ2U6IG1lc3NhZ2V9KTtcbiAgICAgICAgfSwgb24gPSBmdW5jdGlvbiAoZSwgZm4pIHtcbiAgICAgICAgICAgIF9qc0xpc3RlbmVyc1tlXSA9IF9qc0xpc3RlbmVyc1tlXSB8fCBbXTtcbiAgICAgICAgICAgIF9qc0xpc3RlbmVyc1tlXS5wdXNoKGZuKTtcbiAgICAgICAgfTtcblxuICAgIHJldHVybiAoZnVuY3Rpb24gKGNvZGUpIHtcbiAgICAgICAgdmFyIG1lID0gc29ja2V0LmlkO1xuICAgICAgICBjb25zb2xlLnRyYWNlKCdSdW5uaW5nIGNvZGUnKTtcbiAgICAgICAgdmFyIHRyYW5zZm9ybWVkID0gYmFiZWwudHJhbnNmb3JtKCd2YXIgcHJvZ3JhbUZ1bmN0aW9uID0gYXN5bmMgZnVuY3Rpb24gKCkgeyAnICsgY29kZSArICd9OyBwcm9ncmFtRnVuY3Rpb24oKTsnLCB7c3RhZ2U6IDB9KTtcbiAgICAgICAgZXZhbCh0cmFuc2Zvcm1lZC5jb2RlKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc2l6ZXIoKSB7XG4gICAgdmFyIHRvdGFsSGVpZ2h0ID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuICAgIGlmIChzbGltU2l6ZSkge1xuICAgICAgICAkKCcjZWRpdG9yUm93JykuaGVpZ2h0KDUwKTtcbiAgICAgICAgJCgnI2NvbnNvbGVSb3cnKS5oZWlnaHQodG90YWxIZWlnaHQgLSA1MCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgJCgnI2VkaXRvclJvdycpLmhlaWdodChNYXRoLmZsb29yKHRvdGFsSGVpZ2h0IC8gMikpO1xuICAgICAgICAkKCcjY29uc29sZVJvdycpLmhlaWdodChNYXRoLmZsb29yKHRvdGFsSGVpZ2h0IC8gMikpO1xuICAgIH1cbiAgICBpZiAoY2FudmFzKSB7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9ICQoJyNjYW52YXMnKS53aWR0aCgpO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gJCgnI2NhbnZhcycpLmhlaWdodCgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc2hhMShzdHIxKSB7XG4gICAgZm9yIChcbiAgICAgICAgdmFyIGJsb2Nrc3RhcnQgPSAwLFxuICAgICAgICAgICAgaSA9IDAsXG4gICAgICAgICAgICBXID0gW10sXG4gICAgICAgICAgICBBLCBCLCBDLCBELCBGLCBHLFxuICAgICAgICAgICAgSCA9IFtBID0gMHg2NzQ1MjMwMSwgQiA9IDB4RUZDREFCODksIH5BLCB+QiwgMHhDM0QyRTFGMF0sXG4gICAgICAgICAgICB3b3JkX2FycmF5ID0gW10sXG4gICAgICAgICAgICB0ZW1wMixcbiAgICAgICAgICAgIHMgPSB1bmVzY2FwZShlbmNvZGVVUkkoc3RyMSkpLFxuICAgICAgICAgICAgc3RyX2xlbiA9IHMubGVuZ3RoO1xuXG4gICAgICAgIGkgPD0gc3RyX2xlbjtcbiAgICApIHtcbiAgICAgICAgd29yZF9hcnJheVtpID4+IDJdIHw9IChzLmNoYXJDb2RlQXQoaSkgfHwgMTI4KSA8PCAoOCAqICgzIC0gaSsrICUgNCkpO1xuICAgIH1cbiAgICB3b3JkX2FycmF5W3RlbXAyID0gKChzdHJfbGVuICsgOCkgPj4gNiA8PCA0KSArIDE1XSA9IHN0cl9sZW4gPDwgMztcblxuICAgIGZvciAoOyBibG9ja3N0YXJ0IDw9IHRlbXAyOyBibG9ja3N0YXJ0ICs9IDE2KSB7XG4gICAgICAgIEEgPSBIO1xuICAgICAgICBpID0gMDtcblxuICAgICAgICBmb3IgKDsgaSA8IDgwO1xuICAgICAgICAgICAgICAgQSA9IFtbXG4gICAgICAgICAgICAgICAgICAgKEcgPSAoKHMgPSBBWzBdKSA8PCA1IHwgcyA+Pj4gMjcpICsgQVs0XSArIChXW2ldID0gKGkgPCAxNikgPyB+fndvcmRfYXJyYXlbYmxvY2tzdGFydCArIGldIDogRyA8PCAxIHwgRyA+Pj4gMzEpICsgMTUxODUwMDI0OSkgKyAoKEIgPSBBWzFdKSAmIChDID0gQVsyXSkgfCB+QiAmIChEID0gQVszXSkpLFxuICAgICAgICAgICAgICAgICAgIEYgPSBHICsgKEIgXiBDIF4gRCkgKyAzNDEyNzUxNDQsXG4gICAgICAgICAgICAgICAgICAgRyArIChCICYgQyB8IEIgJiBEIHwgQyAmIEQpICsgODgyNDU5NDU5LFxuICAgICAgICAgICAgICAgICAgIEYgKyAxNTM1Njk0Mzg5XG4gICAgICAgICAgICAgICBdWzAgfCAoKGkrKykgLyAyMCldIHwgMCwgcywgQiA8PCAzMCB8IEIgPj4+IDIsIEMsIERdXG4gICAgICAgICkge1xuICAgICAgICAgICAgRyA9IFdbaSAtIDNdIF4gV1tpIC0gOF0gXiBXW2kgLSAxNF0gXiBXW2kgLSAxNl07XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSA1OyBpOykgSFstLWldID0gSFtpXSArIEFbaV0gfCAwO1xuICAgIH1cblxuICAgIGZvciAoc3RyMSA9ICcnOyBpIDwgNDA7KXN0cjEgKz0gKEhbaSA+PiAzXSA+PiAoNyAtIGkrKyAlIDgpICogNCAmIDE1KS50b1N0cmluZygxNik7XG4gICAgcmV0dXJuIHN0cjE7XG59XG5cbmZ1bmN0aW9uIGRlYWwocGxheWVycykge1xuICAgIHZhciB0YXJnZXQgPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogNTApICogMjtcbiAgICB2YXIgcGxheWVyQ291bnQgPSAwO1xuICAgIGZvciAodmFyIHAgaW4gcGxheWVycykge1xuICAgICAgICBwbGF5ZXJDb3VudCsrO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygnZGVhbGluZycsIHBsYXllckNvdW50KTtcbiAgICB2YXIgbGFzdFBsYXllciA9IG51bGw7XG4gICAgZm9yICh2YXIgcCBpbiBwbGF5ZXJzKSB7XG4gICAgICAgIGlmIChsYXN0UGxheWVyKSB7XG4gICAgICAgICAgICBwbGF5ZXJzW3BdLm51bWJlciA9IE1hdGguYWJzKHRhcmdldCAtIGxhc3RQbGF5ZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGxheWVyc1twXS5udW1iZXIgPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogNTApICogMjtcbiAgICAgICAgfVxuICAgICAgICBsYXN0UGxheWVyID0gcGxheWVyc1twXS5udW1iZXI7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIHRhcmdldDogdGFyZ2V0LFxuICAgICAgICBwbGF5ZXJzOiBwbGF5ZXJzXG4gICAgfTtcbn1cblxuZnVuY3Rpb24gc2NyYXRjaGNyYWZ0KCkge1xuICAgIHZhciBibG9ja2x5QXJlYSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibG9ja2x5QXJlYScpO1xuICAgIHZhciBibG9ja2x5RGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Jsb2NrbHlEaXYnKTtcbiAgICB2YXIgd29ya3NwYWNlID0gQmxvY2tseS5pbmplY3QoYmxvY2tseURpdixcbiAgICAgICAge1xuICAgICAgICAgICAgbWVkaWE6ICcvanMvYmxvY2tseS9tZWRpYS8nLFxuICAgICAgICAgICAgdG9vbGJveDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Rvb2xib3gnKVxuICAgICAgICB9KTtcbiAgICB2YXIgYmxvY2tseVJlc2l6ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIC8vIENvbXB1dGUgdGhlIGFic29sdXRlIGNvb3JkaW5hdGVzIGFuZCBkaW1lbnNpb25zIG9mIGJsb2NrbHlBcmVhLlxuICAgICAgICB2YXIgZWxlbWVudCA9IGJsb2NrbHlBcmVhO1xuICAgICAgICB2YXIgeCA9IDA7XG4gICAgICAgIHZhciB5ID0gMDtcbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgeCArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgICAgICB5ICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgICAgICB9IHdoaWxlIChlbGVtZW50KTtcbiAgICAgICAgLy8gUG9zaXRpb24gYmxvY2tseURpdiBvdmVyIGJsb2NrbHlBcmVhLlxuICAgICAgICBibG9ja2x5RGl2LnN0eWxlLmxlZnQgPSB4ICsgJ3B4JztcbiAgICAgICAgYmxvY2tseURpdi5zdHlsZS50b3AgPSB5ICsgJ3B4JztcbiAgICAgICAgYmxvY2tseURpdi5zdHlsZS53aWR0aCA9IGJsb2NrbHlBcmVhLm9mZnNldFdpZHRoICsgJ3B4JztcbiAgICAgICAgYmxvY2tseURpdi5zdHlsZS5oZWlnaHQgPSBibG9ja2x5QXJlYS5vZmZzZXRIZWlnaHQgKyAncHgnO1xuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGJsb2NrbHlSZXNpemUsIGZhbHNlKTtcbiAgICBibG9ja2x5UmVzaXplKCk7XG59XG5cblxuZnVuY3Rpb24gY29uc29sZUNvbXBsZXRlcyhzbmlwcykge1xuXG4gICAgc25pcHMucmVnaXN0ZXIoW3tcbiAgICAgICAgdGFiVHJpZ2dlcjogJ3ByJyxcbiAgICAgICAgbmFtZTogJ3ByaW50JyxcbiAgICAgICAgY29udGVudDogJ3ByaW50KFxcJyR7MTptZXNzYWdlfVxcJyk7JyxcbiAgICAgICAgZG9jSFRNTDogJzxiPlByaW50IGEgbWVzc2FnZSB0byB0aGUgYm90dG9tIHNjcmVlbi48L2I+PGhyLz5wcmludChcIkhlbGxvIFdvcmxkXCIpOzxici8+cHJpbnQoXCJUaGUgdmFsdWUgaXMgXCIgKyBhVmFyaWFibGUpOydcbiAgICB9LCB7XG4gICAgICAgIHRhYlRyaWdnZXI6ICdyZScsXG4gICAgICAgIG5hbWU6ICdyZWFkTGluZScsXG4gICAgICAgIGNvbnRlbnQ6ICd2YXIgJHsxOmFuc3dlcn0gPSBhd2FpdCByZWFkTGluZShcXCckezI6cXVlc3Rpb259XFwnKTsnLFxuICAgICAgICBkb2NIVE1MOiAnPGI+UmVhZCBhIExpbmUgb2YgVGV4dDwvYj48YnIvPlJlYWQgYSBsaW5lIG9mIHRleHQgZnJvbSB0aGUgdXNlciBhbmQgd2FpdCB1bnRpbCB0aGV5IGhpdCBcIlJldHVybi5cIiBMZWF2ZSB0aGUgcmVzdWx0IGluIDxpPmFuc3dlcjwvaT4uPGhyLz52YXIgJHsxOmFuc3dlcn0gPSBhd2FpdCByZWFkTGluZShcXCckezI6cXVlc3Rpb259XFwnKTsnXG4gICAgfSwge1xuICAgICAgICB0YWJUcmlnZ2VyOiAnY2wnLFxuICAgICAgICBuYW1lOiAnY2xlYXInLFxuICAgICAgICBjb250ZW50OiAnY2xlYXIoKTsnLFxuICAgICAgICBkb2NIVE1MOiAnPGI+Q2xlYXIgdGhlIHNjcmVlbjwvYj48aHIvPmNsZWFyKCk7J1xuICAgIH0sIHtcbiAgICAgICAgdGFiVHJpZ2dlcjogJ3JhJyxcbiAgICAgICAgbmFtZTogJ3JhbmRvbScsXG4gICAgICAgIGNvbnRlbnQ6ICdyYW5kb20oJHsxOm1heGltdW19KTsnLFxuICAgICAgICBkb2NIVE1MOiAnPGI+Q2hvb3NlIGEgcmFuZG9tIG51bWJlciBiZXR3ZWVlbiAxIGFuZCA8aT5tYXhpbXVtPC9pPjwvYj48aHIvPnJhbmRvbSgxMDApOydcbiAgICB9LCB7XG4gICAgICAgIHRhYlRyaWdnZXI6ICdhZGRsJyxcbiAgICAgICAgbmFtZTogJ2FkZExldHRlcicsXG4gICAgICAgIGNvbnRlbnQ6ICdhZGRMZXR0ZXIoJHsxOmJhc2V9LCR7MjphZGR9KScsXG4gICAgICAgIGRvY0hUTUw6ICc8Yj5BZGQgb25lIGxldHRlciB0byBhbm90aGVyPC9iPjxoci8+YWRkTGV0dGVyKFxcXCJhXFxcIixcXFwielxcXCIpOydcbiAgICB9XSk7XG5cbiAgICB2YXIgYmFzaWNTbmlwcGV0cyA9IFsnZm9yJywgJ2Z1bicsICd3aCcsICdpZicsICdzZXRUaW1lb3V0J107XG4gICAgdmFyIHJlZ2lzdGVyID0gc25pcHMucmVnaXN0ZXI7XG4gICAgc25pcHMucmVnaXN0ZXIgPSBmdW5jdGlvbiAoc25pcHBldHMsIHNjb3BlKSB7XG4gICAgICAgIHJlZ2lzdGVyLmNhbGwoc25pcHMsIHNuaXBwZXRzLmZpbHRlcihmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgaWYgKGJhc2ljU25pcHBldHMuaW5kZXhPZihzLnRhYlRyaWdnZXIpID49IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSksIHNjb3BlKTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gY2FudmFzQ29tcGxldGVzKHNuaXBzKSB7XG5cbiAgICBzbmlwcy5yZWdpc3Rlcihbe1xuICAgICAgICB0YWJUcmlnZ2VyOiAncHInLFxuICAgICAgICBuYW1lOiAncHJpbnQnLFxuICAgICAgICBjb250ZW50OiAncHJpbnQoXFwnJHsxOmNvbG9yfVxcJywgJHsyOnN0YXJ0WH0sICR7MzpzdGFydFl9LCBcXCckezQ6bWVzc2FnZX1cXCcpOycsXG4gICAgICAgIGRvY0hUTUw6ICc8Yj5EcmF3IFRleHQ8L2I+PGJyLz5EcmF3IG1lc3NhZ2UgYXQgc3RhcnRYLHN0YXJ0WS48aHIvPnByaW50KFwicmVkXCIsIDAsIDAsIFxcJ0hlbGxvIFdvcmxkIVxcJyk7J1xuICAgIH0sIHtcbiAgICAgICAgdGFiVHJpZ2dlcjogJ2NpJyxcbiAgICAgICAgbmFtZTogJ2NpcmNsZScsXG4gICAgICAgIGNvbnRlbnQ6ICdjaXJjbGUoXFwnJHsxOmNvbG9yfVxcJywgJHsyOmNlbnRlclh9LCAkezM6Y2VudGVyWX0sICR7NDpyYWRpdXN9LCAkezU6ZmlsbGVkfSk7JyxcbiAgICAgICAgZG9jSFRNTDogJzxiPkRyYXcgYSBDaXJjbGU8L2I+PGJyLz5EcmF3IGEgY2lyY2xlIGNlbnRlcmVkIGF0IGNlbnRlclgsY2VudGVyWSB3aXRoIGEgcmFkaXVzLjxici8+SWYgZmlsbGVkIGlzIDxpPnRydWU8L2k+IHRoZW4gZmlsbCB0aGUgcmVjdGFuZ2xlIHdpdGggdGhlIGNvbG9yLjxoci8+Y2lyY2xlKFwicmVkXCIsIDEwMCwgMTAwLCA1MCwgdHJ1ZSk7J1xuICAgIH0sIHtcbiAgICAgICAgdGFiVHJpZ2dlcjogJ2ZpJyxcbiAgICAgICAgbmFtZTogJ2ZpbGwnLFxuICAgICAgICBjb250ZW50OiAnZmlsbChcXCckezE6Y29sb3J9XFwnKTsnLFxuICAgICAgICBkb2NIVE1MOiAnPGI+RmlsbCB0aGUgU2NyZWVuIFdpdGggQ29sb3I8L2I+PGhyLz5maWxsKFwid2hpdGVcIik7J1xuICAgIH0sIHtcbiAgICAgICAgdGFiVHJpZ2dlcjogJ2xpJyxcbiAgICAgICAgbmFtZTogJ2xpbmUnLFxuICAgICAgICBjb250ZW50OiAnbGluZShcXCckezE6Y29sb3J9XFwnLCAkezI6c3RhcnRYfSwgJHszOnN0YXJ0WX0sICR7NDp3aWR0aH0sICR7NTpoZWlnaHR9KTsnLFxuICAgICAgICBkb2NIVE1MOiAnPGI+RHJhdyBhIExpbmU8L2I+PGJyLz5EcmF3IGEgbGluZSBzdGFydGluZyBhdCBzdGFydFgsc3RhcnRZIGFuZCBlbmRpbmcgYXQgc3RhcnRYK3dpZHRoLHN0YXJ0WStoZWlnaHQ8aHIvPmxpbmUoXCJyZWRcIiwgMCwgMCwgMTAwLCAxMDApOydcbiAgICB9LCB7XG4gICAgICAgIHRhYlRyaWdnZXI6ICdyZScsXG4gICAgICAgIG5hbWU6ICdyZWN0JyxcbiAgICAgICAgY29udGVudDogJ3JlY3QoXFwnJHsxOmNvbG9yfVxcJywgJHsyOnN0YXJ0WH0sICR7MzpzdGFydFl9LCAkezQ6d2lkdGh9LCAkezU6aGVpZ2h0fSwgJHs2OmZpbGxlZH0pOycsXG4gICAgICAgIGRvY0hUTUw6ICc8Yj5EcmF3IGEgUmVjdGFuZ2xlPC9iPjxici8+RHJhdyBhIHJlY3RhbmdsZSBmcm9tIHN0YXJ0WCxzdGFydFkgYW5kIGVuZGluZyBhdCBzdGFydFgrd2lkdGgsc3RhcnRZK2hlaWdodC48YnIvPklmIGZpbGxlZCBpcyA8aT50cnVlPC9pPiB0aGVuIGZpbGwgdGhlIHJlY3RhbmdsZSB3aXRoIHRoZSBjb2xvci48aHIvPnJlY3QoXCJyZWRcIiwgMCwgMCwgMTAwLCAxMDAsIHRydWUpOydcbiAgICB9LCB7XG4gICAgICAgIHRhYlRyaWdnZXI6ICdjbCcsXG4gICAgICAgIG5hbWU6ICdjbGVhcicsXG4gICAgICAgIGNvbnRlbnQ6ICdjbGVhcigpOycsXG4gICAgICAgIGNhcHRpb246ICdDbGVhciB0aGUgY2FudmFzJ1xuICAgIH1dKTtcblxuICAgIHZhciBiYXNpY1NuaXBwZXRzID0gWydmb3InLCAnZnVuJywgJ3doJywgJ2lmJywgJ3NldFRpbWVvdXQnXTtcbiAgICB2YXIgcmVnaXN0ZXIgPSBzbmlwcy5yZWdpc3RlcjtcbiAgICBzbmlwcy5yZWdpc3RlciA9IGZ1bmN0aW9uIChzbmlwcGV0cywgc2NvcGUpIHtcbiAgICAgICAgcmVnaXN0ZXIuY2FsbChzbmlwcywgc25pcHBldHMuZmlsdGVyKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICBpZiAoYmFzaWNTbmlwcGV0cy5pbmRleE9mKHMudGFiVHJpZ2dlcikgPj0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0lnbm9yaW5nIHNuaXBwZXQnLCBzLnRhYlRyaWdnZXIsIHNjb3BlLCBzKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSksIHNjb3BlKTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gZG9XaXQoKSB7XG4gICAgdmFyIG1pYyA9IG5ldyBXaXQuTWljcm9waG9uZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pY3JvcGhvbmVcIikpO1xuXG4gICAgbWljLm9ucmVhZHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTWljcm9waG9uZSBpcyByZWFkeSB0byByZWNvcmRcIik7XG4gICAgfTtcbiAgICBtaWMub25hdWRpb3N0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGluZyBzdGFydGVkXCIpO1xuICAgIH07XG4gICAgbWljLm9uYXVkaW9lbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkaW5nIHN0b3BwZWQsIHByb2Nlc3Npbmcgc3RhcnRlZFwiKTtcbiAgICB9O1xuICAgIG1pYy5vbnJlc3VsdCA9IGZ1bmN0aW9uIChpbnRlbnQsIGVudGl0aWVzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGludGVudCxlbnRpdGllcyk7XG4gICAgICAgIHZhciByID0ga3YoXCJpbnRlbnRcIiwgaW50ZW50KTtcblxuICAgICAgICBmb3IgKHZhciBrIGluIGVudGl0aWVzKSB7XG4gICAgICAgICAgICB2YXIgZSA9IGVudGl0aWVzW2tdO1xuXG4gICAgICAgICAgICBpZiAoIShlIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgciArPSBrdihrLCBlLnZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHIgKz0ga3YoaywgZVtpXS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF9qc0xpc3RlbmVyc1tpbnRlbnRdKSB7XG4gICAgICAgICAgICBfanNMaXN0ZW5lcnNbaW50ZW50XS5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGZuKGVudGl0aWVzLCBpbnRlbnQpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnVW5oYW5kbGVkIG1lc3NhZ2UnLCBpbnRlbnQpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBtaWMub25lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFcnJvcjogXCIgKyBlcnIpO1xuICAgIH07XG4gICAgbWljLm9uY29ubmVjdGluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJNaWNyb3Bob25lIGlzIGNvbm5lY3RpbmdcIik7XG4gICAgfTtcbiAgICBtaWMub25kaXNjb25uZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTWljcm9waG9uZSBpcyBub3QgY29ubmVjdGVkXCIpO1xuICAgIH07XG5cbiAgICBtaWMuY29ubmVjdChcIks1S0U1WU1LMkpWNVczTFk0TVpQUlBMUzU3SzYyTEtWXCIpO1xuICAgIC8vIG1pYy5zdGFydCgpO1xuICAgIC8vIG1pYy5zdG9wKCk7XG5cbiAgICBmdW5jdGlvbiBrdiAoaywgdikge1xuICAgICAgICBpZiAodG9TdHJpbmcuY2FsbCh2KSAhPT0gXCJbb2JqZWN0IFN0cmluZ11cIikge1xuICAgICAgICAgICAgdiA9IEpTT04uc3RyaW5naWZ5KHYpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBrICsgXCI9XCIgKyB2ICsgXCJcXG5cIjtcbiAgICB9XG59XG4iLCIvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE0IEFybmUgRi4gQ2xhYXNzZW5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcblxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbnZhciBKb3NoID0gd2luZG93W1wiSm9zaFwiXSB8fCB7fTtcbihmdW5jdGlvbihyb290LCAkLCBfKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBKb3NoLlNoZWxsID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcblxuICAgICAgICAvLyBpbnN0YW5jZSBmaWVsZHNcbiAgICAgICAgdmFyIF9jb25zb2xlID0gY29uZmlnLmNvbnNvbGUgfHwgKEpvc2guRGVidWcgJiYgcm9vdC5jb25zb2xlID8gcm9vdC5jb25zb2xlIDoge1xuICAgICAgICAgICAgICAgIGxvZzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIHZhciBfbm9FdmVudHMgPSBmYWxzZTtcbiAgICAgICAgdmFyIF9wcm9tcHQgPSBjb25maWcucHJvbXB0IHx8ICdqc2gkJztcbiAgICAgICAgdmFyIF9zaGVsbF92aWV3X2lkID0gY29uZmlnLnNoZWxsX3ZpZXdfaWQgfHwgJ3NoZWxsLXZpZXcnO1xuICAgICAgICB2YXIgX3NoZWxsX3BhbmVsX2lkID0gY29uZmlnLnNoZWxsX3BhbmVsX2lkIHx8ICdzaGVsbC1wYW5lbCc7XG4gICAgICAgIHZhciBfaW5wdXRfaWQgPSBjb25maWcuaW5wdXRfaWQgfHwgJ3NoZWxsLWNsaSc7XG4gICAgICAgIHZhciBfYmxpbmt0aW1lID0gY29uZmlnLmJsaW5rdGltZSB8fCA1MDA7XG4gICAgICAgIHZhciBfaGlzdG9yeSA9IGNvbmZpZy5oaXN0b3J5IHx8IG5ldyBKb3NoLkhpc3RvcnkoKTtcbiAgICAgICAgdmFyIF9yZWFkbGluZSA9IGNvbmZpZy5yZWFkbGluZSB8fCBuZXcgSm9zaC5SZWFkTGluZSh7aGlzdG9yeTogX2hpc3RvcnksIGNvbnNvbGU6IF9jb25zb2xlfSk7XG4gICAgICAgIHZhciBfYWN0aXZlID0gZmFsc2U7XG4gICAgICAgIHZhciBfY3Vyc29yX3Zpc2libGUgPSBmYWxzZTtcbiAgICAgICAgdmFyIF9hY3RpdmF0aW9uSGFuZGxlcjtcbiAgICAgICAgdmFyIF9kZWFjdGl2YXRpb25IYW5kbGVyO1xuICAgICAgICB2YXIgX2NtZEhhbmRsZXJzID0ge1xuICAgICAgICAgICAgX2RlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICBleGVjOiBmdW5jdGlvbihjbWQsIGFyZ3MsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soc2VsZi50ZW1wbGF0ZXMuYmFkX2NvbW1hbmQoe2NtZDogY21kfSkpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY29tcGxldGlvbjogZnVuY3Rpb24oY21kLCBhcmcsIGxpbmUsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFhcmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZyA9IGNtZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soc2VsZi5iZXN0TWF0Y2goYXJnLCBzZWxmLmNvbW1hbmRzKCkpKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbnB1dF9zZWFyY2g6IHtcbiAgICAgICAgICAgICAgICBleGVjOiBmdW5jdGlvbiAoY21kLCBhcmdzLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcucnVuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNsZWFyOiB7XG4gICAgICAgICAgICAgICAgZXhlYzogZnVuY3Rpb24gKGNtZCwgYXJncywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpKS5wYXJlbnQoKS5lbXB0eSgpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdmFyIF9saW5lID0ge1xuICAgICAgICAgICAgdGV4dDogJycsXG4gICAgICAgICAgICBjdXJzb3I6IDBcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIF9zZWFyY2hNYXRjaCA9ICcnO1xuICAgICAgICB2YXIgX3ZpZXcsIF9wYW5lbDtcbiAgICAgICAgdmFyIF9wcm9tcHRIYW5kbGVyO1xuICAgICAgICB2YXIgX2luaXRpYWxpemF0aW9uSGFuZGxlcjtcbiAgICAgICAgdmFyIF9pbml0aWFsaXplZDtcblxuICAgICAgICBfcmVhZGxpbmUuYmluZCh7J2NoYXInOiAnTCcsIGN0cmxLZXk6IHRydWV9LCAnY2xlYXInKTtcbiAgICAgICAgX3JlYWRsaW5lLmJpbmQoeydjaGFyJzogJ1InLCBjdHJsS2V5OiB0cnVlfSwgJ3J1bicpO1xuXG4gICAgICAgIC8vIHB1YmxpYyBtZXRob2RzXG4gICAgICAgIHZhciBzZWxmID0ge1xuICAgICAgICAgICAgY29tbWFuZHM6IGNvbW1hbmRzLFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgaGlzdG9yeTogXy50ZW1wbGF0ZShcIjxkaXY+PCUgXy5lYWNoKGl0ZW1zLCBmdW5jdGlvbihjbWQsIGkpIHsgJT48ZGl2PjwlLSBpICU+Jm5ic3A7PCUtIGNtZCAlPjwvZGl2PjwlIH0pOyAlPjwvZGl2PlwiKSxcbiAgICAgICAgICAgICAgICBoZWxwOiBfLnRlbXBsYXRlKFwiPGRpdj48ZGl2PjxzdHJvbmc+Q29tbWFuZHM6PC9zdHJvbmc+PC9kaXY+PCUgXy5lYWNoKGNvbW1hbmRzLCBmdW5jdGlvbihjbWQpIHsgJT48ZGl2PiZuYnNwOzwlLSBjbWQgJT48L2Rpdj48JSB9KTsgJT48L2Rpdj5cIiksXG4gICAgICAgICAgICAgICAgYmFkX2NvbW1hbmQ6IF8udGVtcGxhdGUoJzxkaXY+PHN0cm9uZz5VbnJlY29nbml6ZWQgY29tbWFuZDombmJzcDs8L3N0cm9uZz48JT1jbWQlPjwvZGl2PicpLFxuICAgICAgICAgICAgICAgIGlucHV0X2NtZDogXy50ZW1wbGF0ZSgnPGRpdiBpZD1cIjwlLSBpZCAlPlwiIGNsYXNzPVwicHJvbXB0TGluZVwiPjxzcGFuIGNsYXNzPVwicHJvbXB0XCI+PC9zcGFuPjxzcGFuIGNsYXNzPVwiaW5wdXRcIj48c3BhbiBjbGFzcz1cImxlZnRcIi8+PHNwYW4gY2xhc3M9XCJjdXJzb3JcIi8+PHNwYW4gY2xhc3M9XCJyaWdodFwiLz48L3NwYW4+PC9kaXY+JyksXG4gICAgICAgICAgICAgICAgc3VnZ2VzdDogXy50ZW1wbGF0ZShcIjxkaXY+PCUgXy5lYWNoKHN1Z2dlc3Rpb25zLCBmdW5jdGlvbihzdWdnZXN0aW9uKSB7ICU+PGRpdj48JS0gc3VnZ2VzdGlvbiAlPjwvZGl2PjwlIH0pOyAlPjwvZGl2PlwiKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlzQWN0aXZlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX3JlYWRsaW5lLmlzQWN0aXZlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWN0aXZhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmKCQoaWQoX3NoZWxsX3ZpZXdfaWQpKS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBfYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgX2xpbmUudGV4dCA9ICcnO1xuICAgICAgICAgICAgICAgIF9saW5lLmN1cnNvciA9IDA7XG4gICAgICAgICAgICAgICAgX25vRXZlbnRzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBfcmVhZGxpbmUuc2V0TGluZShfbGluZSk7XG4gICAgICAgICAgICAgICAgX25vRXZlbnRzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgX3JlYWRsaW5lLmFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2xlYXJQcm9tcHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBfbGluZSA9IHt0ZXh0OiAnJywgY3Vyc29yOiAwfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpKS5wYXJlbnQoKS5lbXB0eSgpO1xuICAgICAgICAgICAgICAgIHNlbGYucmVmcmVzaCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlYWN0aXZhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImRlYWN0aXZhdGluZ1wiKTtcbiAgICAgICAgICAgICAgICBfYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgX3JlYWRsaW5lLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRDb21tYW5kSGFuZGxlcjogZnVuY3Rpb24oY21kLCBjbWRIYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX2NtZEhhbmRsZXJzW2NtZF0gPSBjbWRIYW5kbGVyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENvbW1hbmRIYW5kbGVyOiBmdW5jdGlvbihjbWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX2NtZEhhbmRsZXJzW2NtZF07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0UHJvbXB0OiBmdW5jdGlvbihwcm9tcHQpIHtcbiAgICAgICAgICAgICAgICBfcHJvbXB0ID0gcHJvbXB0O1xuICAgICAgICAgICAgICAgIGlmKCFfYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FT1Q6IGZ1bmN0aW9uKGNvbXBsZXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX3JlYWRsaW5lLm9uRU9UKGNvbXBsZXRpb25IYW5kbGVyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkNhbmNlbDogZnVuY3Rpb24oY29tcGxldGlvbkhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBfcmVhZGxpbmUub25DYW5jZWwoY29tcGxldGlvbkhhbmRsZXIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uSW5pdGlhbGl6ZTogZnVuY3Rpb24oY29tcGxldGlvbkhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBfaW5pdGlhbGl6YXRpb25IYW5kbGVyID0gY29tcGxldGlvbkhhbmRsZXI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25BY3RpdmF0ZTogZnVuY3Rpb24oY29tcGxldGlvbkhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBfYWN0aXZhdGlvbkhhbmRsZXIgPSBjb21wbGV0aW9uSGFuZGxlcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkRlYWN0aXZhdGU6IGZ1bmN0aW9uKGNvbXBsZXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX2RlYWN0aXZhdGlvbkhhbmRsZXIgPSBjb21wbGV0aW9uSGFuZGxlcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbk5ld1Byb21wdDogZnVuY3Rpb24oY29tcGxldGlvbkhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBfcHJvbXB0SGFuZGxlciA9IGNvbXBsZXRpb25IYW5kbGVyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlbmRlck91dHB1dDogcmVuZGVyT3V0cHV0LFxuICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IF9saW5lLnRleHQgfHwgJyc7XG4gICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKCdTdGFydCByZW5kZXInLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICB2YXIgY3Vyc29ySWR4ID0gX2xpbmUuY3Vyc29yIHx8IDA7XG4gICAgICAgICAgICAgICAgaWYoX3NlYXJjaE1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvcklkeCA9IF9zZWFyY2hNYXRjaC5jdXJzb3JpZHggfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgdGV4dCA9IF9zZWFyY2hNYXRjaC50ZXh0IHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkgKyAnIC5zZWFyY2h0ZXJtJykudGV4dChfc2VhcmNoTWF0Y2gudGVybSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBsZWZ0ID0gXy5lc2NhcGUodGV4dC5zdWJzdHIoMCwgY3Vyc29ySWR4KSkucmVwbGFjZSgvIC9nLCAnJm5ic3A7Jyk7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnNvciA9IHRleHQuc3Vic3RyKGN1cnNvcklkeCwgMSk7XG4gICAgICAgICAgICAgICAgdmFyIHJpZ2h0ID0gXy5lc2NhcGUodGV4dC5zdWJzdHIoY3Vyc29ySWR4ICsgMSkpLnJlcGxhY2UoLyAvZywgJyZuYnNwOycpO1xuICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSArICcgLnByb21wdCcpLmh0bWwoX3Byb21wdCk7XG4gICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpICsgJyAuaW5wdXQgLmxlZnQnKS5odG1sKGxlZnQpO1xuICAgICAgICAgICAgICAgIGlmKCFjdXJzb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpICsgJyAuaW5wdXQgLmN1cnNvcicpLmh0bWwoJyZuYnNwOycpLmNzcygndGV4dERlY29yYXRpb24nLCAndW5kZXJsaW5lJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpICsgJyAuaW5wdXQgLmN1cnNvcicpLnRleHQoY3Vyc29yKS5jc3MoJ3RleHREZWNvcmF0aW9uJywgJ3VuZGVybGluZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkgKyAnIC5pbnB1dCAucmlnaHQnKS5odG1sKHJpZ2h0KTtcbiAgICAgICAgICAgICAgICBfY3Vyc29yX3Zpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHNlbGYuc2Nyb2xsVG9Cb3R0b20oKTtcbiAgICAgICAgICAgICAgICBfY29uc29sZS5sb2coJ3JlbmRlcmVkIFwiJyArIHRleHQgKyAnXCIgdy8gY3Vyc29yIGF0ICcgKyBjdXJzb3JJZHgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlZnJlc2g6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSkucmVwbGFjZVdpdGgoc2VsZi50ZW1wbGF0ZXMuaW5wdXRfY21kKHtpZDpfaW5wdXRfaWR9KSk7XG4gICAgICAgICAgICAgICAgc2VsZi5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICBfY29uc29sZS5sb2coJ3JlZnJlc2hlZCAnICsgX2lucHV0X2lkKTtcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNjcm9sbFRvQm90dG9tOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBfcGFuZWwuYW5pbWF0ZSh7c2Nyb2xsVG9wOiBfdmlldy5oZWlnaHQoKX0sIDApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJlc3RNYXRjaDogZnVuY3Rpb24ocGFydGlhbCwgcG9zc2libGUpIHtcbiAgICAgICAgICAgICAgICBfY29uc29sZS5sb2coXCJiZXN0TWF0Y2ggb24gcGFydGlhbCAnXCIgKyBwYXJ0aWFsICsgXCInXCIpO1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRpb246IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb25zOiBbXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYoIXBvc3NpYmxlIHx8IHBvc3NpYmxlLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBjb21tb24gPSAnJztcbiAgICAgICAgICAgICAgICBpZighcGFydGlhbCkge1xuICAgICAgICAgICAgICAgICAgICBpZihwb3NzaWJsZS5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvbXBsZXRpb24gPSBwb3NzaWJsZVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zdWdnZXN0aW9ucyA9IHBvc3NpYmxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZighXy5ldmVyeShwb3NzaWJsZSwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwb3NzaWJsZVswXVswXSA9PSB4WzBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnN1Z2dlc3Rpb25zID0gcG9zc2libGU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBwb3NzaWJsZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb3B0aW9uID0gcG9zc2libGVbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmKG9wdGlvbi5zbGljZSgwLCBwYXJ0aWFsLmxlbmd0aCkgPT0gcGFydGlhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnN1Z2dlc3Rpb25zLnB1c2gob3B0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFjb21tb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tb24gPSBvcHRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiaW5pdGlhbCBjb21tb246XCIgKyBjb21tb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKG9wdGlvbi5zbGljZSgwLCBjb21tb24ubGVuZ3RoKSAhPSBjb21tb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY29uc29sZS5sb2coXCJmaW5kIGNvbW1vbiBzdGVtIGZvciAnXCIgKyBjb21tb24gKyBcIicgYW5kICdcIiArIG9wdGlvbiArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaiA9IHBhcnRpYWwubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKGogPCBjb21tb24ubGVuZ3RoICYmIGogPCBvcHRpb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNvbW1vbltqXSAhPSBvcHRpb25bal0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1vbiA9IGNvbW1vbi5zdWJzdHIoMCwgaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBqKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdC5jb21wbGV0aW9uID0gY29tbW9uLnN1YnN0cihwYXJ0aWFsLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBpZChpZCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiI1wiK2lkO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY29tbWFuZHMoKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5jaGFpbihfY21kSGFuZGxlcnMpLmtleXMoKS5maWx0ZXIoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4WzBdICE9IFwiX1wiXG4gICAgICAgICAgICB9KS52YWx1ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYmxpbmtDdXJzb3IoKSB7XG4gICAgICAgICAgICBpZighX2FjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvb3Quc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZighX2FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF9jdXJzb3JfdmlzaWJsZSA9ICFfY3Vyc29yX3Zpc2libGU7XG4gICAgICAgICAgICAgICAgaWYoX2N1cnNvcl92aXNpYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSArICcgLmlucHV0IC5jdXJzb3InKS5jc3MoJ3RleHREZWNvcmF0aW9uJywgJ3VuZGVybGluZScpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSArICcgLmlucHV0IC5jdXJzb3InKS5jc3MoJ3RleHREZWNvcmF0aW9uJywgJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBibGlua0N1cnNvcigpO1xuICAgICAgICAgICAgfSwgX2JsaW5rdGltZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzcGxpdChzdHIpIHtcbiAgICAgICAgICAgIHJldHVybiBfLmZpbHRlcihzdHIuc3BsaXQoL1xccysvKSwgZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRIYW5kbGVyKGNtZCkge1xuICAgICAgICAgICAgcmV0dXJuIF9jbWRIYW5kbGVyc1tjbWRdIHx8IF9jbWRIYW5kbGVycy5fZGVmYXVsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlbmRlck91dHB1dChvdXRwdXQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAkKCcucHJvbXB0TGluZTpoYXMoc3Bhbi5pbnB1dDplbXB0eSknKS5oZWlnaHQoMCk7XG4gICAgICAgICAgICBpZihvdXRwdXQpIHtcbiAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkpLmFmdGVyKG91dHB1dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkgKyAnIC5pbnB1dCAuY3Vyc29yJykuY3NzKCd0ZXh0RGVjb3JhdGlvbicsICcnKTtcbiAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSkucmVtb3ZlQXR0cignaWQnKTtcbiAgICAgICAgICAgICQoaWQoX3NoZWxsX3ZpZXdfaWQpKS5hcHBlbmQoc2VsZi50ZW1wbGF0ZXMuaW5wdXRfY21kKHtpZDpfaW5wdXRfaWR9KSk7XG4gICAgICAgICAgICBpZihfcHJvbXB0SGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBfcHJvbXB0SGFuZGxlcihmdW5jdGlvbihwcm9tcHQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXRQcm9tcHQocHJvbXB0KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiYWN0aXZhdGluZyBzaGVsbFwiKTtcbiAgICAgICAgICAgIGlmKCFfdmlldykge1xuICAgICAgICAgICAgICAgIF92aWV3ID0gJChpZChfc2hlbGxfdmlld19pZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoIV9wYW5lbCkge1xuICAgICAgICAgICAgICAgIF9wYW5lbCA9ICQoaWQoX3NoZWxsX3BhbmVsX2lkKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZigkKGlkKF9pbnB1dF9pZCkpLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgX3ZpZXcuYXBwZW5kKHNlbGYudGVtcGxhdGVzLmlucHV0X2NtZCh7aWQ6X2lucHV0X2lkfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VsZi5yZWZyZXNoKCk7XG4gICAgICAgICAgICBfYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIGJsaW5rQ3Vyc29yKCk7XG4gICAgICAgICAgICBpZihfcHJvbXB0SGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9wcm9tcHRIYW5kbGVyKGZ1bmN0aW9uKHByb21wdCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnNldFByb21wdChwcm9tcHQpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihfYWN0aXZhdGlvbkhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBfYWN0aXZhdGlvbkhhbmRsZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGluaXRcbiAgICAgICAgX3JlYWRsaW5lLm9uQWN0aXZhdGUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZighX2luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgX2luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZihfaW5pdGlhbGl6YXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfaW5pdGlhbGl6YXRpb25IYW5kbGVyKGFjdGl2YXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYWN0aXZhdGUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIF9yZWFkbGluZS5vbkRlYWN0aXZhdGUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZihfZGVhY3RpdmF0aW9uSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9kZWFjdGl2YXRpb25IYW5kbGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBfcmVhZGxpbmUub25DaGFuZ2UoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgaWYgKCFfbm9FdmVudHMpIHtcbiAgICAgICAgICAgICAgICBfbGluZSA9IGxpbmU7XG4gICAgICAgICAgICAgICAgc2VsZi5yZW5kZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIF9yZWFkbGluZS5vbkNsZWFyKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX2NtZEhhbmRsZXJzLmNsZWFyLmV4ZWMobnVsbCwgbnVsbCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmVuZGVyT3V0cHV0KG51bGwsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBfcmVhZGxpbmUub25SdW4oY29uZmlnLnJ1bik7XG4gICAgICAgIF9yZWFkbGluZS5vblNlYXJjaFN0YXJ0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpKS5yZXBsYWNlV2l0aChzZWxmLnRlbXBsYXRlcy5pbnB1dF9zZWFyY2goe2lkOl9pbnB1dF9pZH0pKTtcbiAgICAgICAgICAgIF9jb25zb2xlLmxvZygnc3RhcnRlZCBzZWFyY2gnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIF9yZWFkbGluZS5vblNlYXJjaEVuZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSkucmVwbGFjZVdpdGgoc2VsZi50ZW1wbGF0ZXMuaW5wdXRfY21kKHtpZDpfaW5wdXRfaWR9KSk7XG4gICAgICAgICAgICBfc2VhcmNoTWF0Y2ggPSBudWxsO1xuICAgICAgICAgICAgc2VsZi5yZW5kZXIoKTtcbiAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImVuZGVkIHNlYXJjaFwiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIF9yZWFkbGluZS5vblNlYXJjaENoYW5nZShmdW5jdGlvbihtYXRjaCkge1xuICAgICAgICAgICAgX3NlYXJjaE1hdGNoID0gbWF0Y2g7XG4gICAgICAgICAgICBzZWxmLnJlbmRlcigpO1xuICAgICAgICB9KTtcbiAgICAgICAgX3JlYWRsaW5lLm9uRW50ZXIoZnVuY3Rpb24oY21kdGV4dCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImdvdCBjb21tYW5kOiBcIiArIGNtZHRleHQpO1xuICAgICAgICAgICAgY21kdGV4dCA9IGNvbmZpZy5vbkNvbW1hbmQoY21kdGV4dCkgPT09IGZhbHNlID8gJycgOiBjbWR0ZXh0O1xuICAgICAgICAgICAgY2FsbGJhY2soY21kdGV4dCk7XG4gICAgICAgIH0pO1xuICAgICAgICBfcmVhZGxpbmUub25Db21wbGV0aW9uKGZ1bmN0aW9uKGxpbmUsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpZighbGluZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHRleHQgPSBsaW5lLnRleHQuc3Vic3RyKDAsIGxpbmUuY3Vyc29yKTtcbiAgICAgICAgICAgIHZhciBwYXJ0cyA9IHNwbGl0KHRleHQpO1xuXG4gICAgICAgICAgICB2YXIgY21kID0gcGFydHMuc2hpZnQoKSB8fCAnJztcbiAgICAgICAgICAgIHZhciBhcmcgPSBwYXJ0cy5wb3AoKSB8fCAnJztcbiAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImdldHRpbmcgY29tcGxldGlvbiBoYW5kbGVyIGZvciBcIiArIGNtZCk7XG4gICAgICAgICAgICB2YXIgaGFuZGxlciA9IGdldEhhbmRsZXIoY21kKTtcbiAgICAgICAgICAgIGlmKGhhbmRsZXIgIT0gX2NtZEhhbmRsZXJzLl9kZWZhdWx0ICYmIGNtZCAmJiBjbWQgPT0gdGV4dCkge1xuXG4gICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwidmFsaWQgY21kLCBubyBhcmdzOiBhcHBlbmQgc3BhY2VcIik7XG4gICAgICAgICAgICAgICAgLy8gdGhlIHRleHQgdG8gY29tcGxldGUgaXMganVzdCBhIHZhbGlkIGNvbW1hbmQsIGFwcGVuZCBhIHNwYWNlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCcgJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZighaGFuZGxlci5jb21wbGV0aW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gaGFuZGxlciBoYXMgbm8gY29tcGxldGlvbiBmdW5jdGlvbiwgc28gd2UgY2FuJ3QgY29tcGxldGVcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImNhbGxpbmcgY29tcGxldGlvbiBoYW5kbGVyIGZvciBcIiArIGNtZCk7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlci5jb21wbGV0aW9uKGNtZCwgYXJnLCBsaW5lLCBmdW5jdGlvbihtYXRjaCkge1xuICAgICAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImNvbXBsZXRpb246IFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2gpKTtcbiAgICAgICAgICAgICAgICBpZighbWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKG1hdGNoLnN1Z2dlc3Rpb25zICYmIG1hdGNoLnN1Z2dlc3Rpb25zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlbmRlck91dHB1dChzZWxmLnRlbXBsYXRlcy5zdWdnZXN0KHtzdWdnZXN0aW9uczogbWF0Y2guc3VnZ2VzdGlvbnN9KSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhtYXRjaC5jb21wbGV0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhtYXRjaC5jb21wbGV0aW9uKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfVxufSkod2luZG93LCAkLCBfKTtcbiJdfQ==
