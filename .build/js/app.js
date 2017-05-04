(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

function levenshtein(a, b) {
    var tmp;
    if (a.length === 0) { return b.length; }
    if (b.length === 0) { return a.length; }
    if (a.length > b.length) { tmp = a; a = b; b = tmp; }

    var i, j, res, alen = a.length, blen = b.length, row = Array(alen);
    for (i = 0; i <= alen; i++) { row[i] = i; }

    for (i = 1; i <= blen; i++) {
        res = i;
        for (j = 1; j <= alen; j++) {
            tmp = row[j - 1];
            row[j - 1] = res;
            res = b[i - 1] === a[j - 1] ? tmp : Math.min(tmp + 1, Math.min(res + 1, row[j] + 1));
        }
    }
    return res;
}

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
        socket.emit('player', { name: myName });

        jsConfig = {
            console: console,
            onCommand: function (line) {
                socket.emit('chat', { name: myName, text: line });
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
        players[myName] = { name: myName };
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
                socket.emit('player', { name: myName });
                window.localStorage.setItem('gameuser', myName);
                goGame();
                $('#login').fadeOut();
            }
        });
    }

    socket.on('player', function (data) {
        console.log('PLAYER', data);
        socket.emit('playerResponse', { name: myName });
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
            socket.emit('win', { name: myName });
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
                trace = printStackTrace({ e: x })
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
            callKeyFn(['left', 'up', 'right', 'down'][key - 37], key);
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
                trace = printStackTrace({ e: x })
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
            socket.emit('chat', { type: type, message: message });
        }, on = function (e, fn) {
            _jsListeners[e] = _jsListeners[e] || [];
            _jsListeners[e].push(fn);
        };

    return (function (code) {
        var me = socket.id;
        console.trace('Running code');
        var transformed = babel.transform('var programFunction = async function () { ' + code + '}; programFunction();', { stage: 0 });
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
            const speechResolver = (text) => {
                output._config.onCommand = loggerInput;
                output.deactivate();
                resolver(text);
            };
            try {
                speech.start(speechResolver);
            } catch (err) {
                console.error(err);
            }
            var resolver;
            output._config.onCommand = function (line) {
                setTimeout(function () {
                    resolver(line);
                }, 0);
                try {
                    speech.stop();
                } catch (error) {
                    console.error(error);
                }
                output._config.onCommand = loggerInput;
                output.deactivate();
            };
            editor.blur();
            output.activate();
            return new Promise(function (resolve) {
                resolver = resolve;
            });
        }, readline = readLine,
        choose = function (choices) {
            choices.forEach((c, ix) => {
                output.renderOutput(`${ix + 1}. ${c}`, () => { });
            });
            readLine().then((v) => {
                const tops = choices.map((c, ix) => ({
                    index: ix,
                    edit: levenshtein(c, v),
                }));
                console.log('SORT EDIT');
                tops.sort((a, b) => (a.edit - b.edit));
                console.log(tops);
                return String(tops[0].index);
            });
        },
        send = function (type, message) {
            if (type && !message) {
                message = type;
                type = null;
            }
            socket.emit('chat', { type: type, message: message });
        }, on = function (e, fn) {
            _jsListeners[e] = _jsListeners[e] || [];
            _jsListeners[e].push(fn);
        }, delay = function (t) {
            return new Promise(function (resolve) {
                setTimeout(resolve, t * 1000);
            });
        }, rooms = function () {
            return new Promise(function (resolve) {
                $.ajax({
                    url: '/game-map',
                    type: 'GET',
                    success: function (response) {
                        resolve(response);
                    },
                    error: function (e) {
                        console.error(e);
                        alert('Map failed ' + e.message);
                    }
                })
            });
        };
    var speech = doSpeech(print);
    return (function (code) {
        var me = socket.id;
        console.trace('Running code');
        var transformed = babel.transform('var programFunction = async function () { ' + code + '}; programFunction();', { stage: 0 });
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
        console.log(intent, entities);
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

    function kv(k, v) {
        if (toString.call(v) !== "[object String]") {
            v = JSON.stringify(v);
        }
        return k + "=" + v + "\n";
    }
}

function doSpeech(print) {
    const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
    const SpeechGrammarList = window.SpeechGrammarList || webkitSpeechGrammarList;
    const SpeechRecognitionEvent = window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
    let results;

    const recognition = new SpeechRecognition();
    recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const response = event.results[last][0].transcript;
        console.log(response);
        if (results) {
            results(response);
        }
    };

    recognition.onspeechend = function () {
        recognition.stop();
    }

    recognition.onnomatch = function (event) {
        print('Say what now?');
    }

    recognition.onerror = function (event) {
        console.error('Error occurred in recognition', event.error);
    }

    return {
        start(handler) {
            results = handler;
            recognition.start();
        },
        stop() {
            recognition.stop();
        }
    }
    return recognition;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9rcmFrZW4tZGV2dG9vbHMtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21lbWV0cmFsL2Rldi9wZXJzb25hbC9hZHZlbnQuanMvcHVibGljL2pzL2FwcC5qcyIsIi9Vc2Vycy9tZW1ldHJhbC9kZXYvcGVyc29uYWwvYWR2ZW50LmpzL3B1YmxpYy9qcy9qc091dHB1dC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0a0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBsZXZlbnNodGVpbihhLCBiKSB7XG4gICAgdmFyIHRtcDtcbiAgICBpZiAoYS5sZW5ndGggPT09IDApIHsgcmV0dXJuIGIubGVuZ3RoOyB9XG4gICAgaWYgKGIubGVuZ3RoID09PSAwKSB7IHJldHVybiBhLmxlbmd0aDsgfVxuICAgIGlmIChhLmxlbmd0aCA+IGIubGVuZ3RoKSB7IHRtcCA9IGE7IGEgPSBiOyBiID0gdG1wOyB9XG5cbiAgICB2YXIgaSwgaiwgcmVzLCBhbGVuID0gYS5sZW5ndGgsIGJsZW4gPSBiLmxlbmd0aCwgcm93ID0gQXJyYXkoYWxlbik7XG4gICAgZm9yIChpID0gMDsgaSA8PSBhbGVuOyBpKyspIHsgcm93W2ldID0gaTsgfVxuXG4gICAgZm9yIChpID0gMTsgaSA8PSBibGVuOyBpKyspIHtcbiAgICAgICAgcmVzID0gaTtcbiAgICAgICAgZm9yIChqID0gMTsgaiA8PSBhbGVuOyBqKyspIHtcbiAgICAgICAgICAgIHRtcCA9IHJvd1tqIC0gMV07XG4gICAgICAgICAgICByb3dbaiAtIDFdID0gcmVzO1xuICAgICAgICAgICAgcmVzID0gYltpIC0gMV0gPT09IGFbaiAtIDFdID8gdG1wIDogTWF0aC5taW4odG1wICsgMSwgTWF0aC5taW4ocmVzICsgMSwgcm93W2pdICsgMSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbnZhciBKc091dHB1dCA9IHJlcXVpcmUoJy4vanNPdXRwdXQnKSxcbiAgICBfanNMaXN0ZW5lcnMgPSB7fSxcbiAgICBjYW52YXMsXG4gICAgc29ja2V0LFxuICAgIHNsaW1TaXplID0gZmFsc2U7XG47XG5cbmlmIChwYWdlID09PSAnY29uc29sZUdhbWUnKSB7XG4gICAgJChjb25zb2xlR2FtZVBhZ2UpO1xufSBlbHNlIGlmIChwYWdlID09PSAnY2FudmFzJykge1xuICAgICQoY2FudmFzUGFnZSk7XG59IGVsc2UgaWYgKHBhZ2UgPT09ICdsb2dpblBhZ2UnKSB7XG4gICAgJChsb2dpblBhZ2UpO1xufSBlbHNlIGlmIChwYWdlID09PSAnbWluZWNyYWZ0Jykge1xuICAgICQobWluZWNyYWZ0KTtcbn0gZWxzZSBpZiAocGFnZSA9PT0gJ2dhbWUnKSB7XG4gICAgJChnYW1lKTtcbn0gZWxzZSBpZiAocGFnZSA9PT0gJ3NjcmF0Y2hjcmFmdCcpIHtcbiAgICAkKHNjcmF0Y2hjcmFmdCk7XG59XG5cbmZ1bmN0aW9uIGxvZ2luUGFnZSgpIHtcbiAgICAkKFwiI2xvZ2luIGJ1dHRvblwiKS5jbGljayhmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IFwiL2xvZ2luXCIsXG4gICAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIF9jc3JmOiBfY3NyZixcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogJChcImlucHV0W25hbWU9dXNlcm5hbWVdXCIpLnZhbCgpLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkOiAkKFwiaW5wdXRbbmFtZT1wYXNzd29yZF1cIikudmFsKClcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiTG9naW4gZmFpbGVkISBcIiArIHJlc3BvbnNlLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5sb2NhdGlvbiA9ICcvficgKyByZXNwb25zZS5wcm9maWxlLm5hbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGFsZXJ0KFwiTG9naW4gZmFpbGVkISBcIiArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBtaW5lY3JhZnQoKSB7XG4gICAgc2l6ZXIoKTtcbiAgICAkKHdpbmRvdykucmVzaXplKHNpemVyKTtcblxuICAgIHZhciB0b29scyA9IGFjZS5yZXF1aXJlKFwiYWNlL2V4dC9sYW5ndWFnZV90b29sc1wiKTtcbiAgICB2YXIgZWRpdG9yID0gYWNlLmVkaXQoJ2VkaXRvcicpO1xuICAgIGVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICBlZGl0b3IuZ2V0U2Vzc2lvbigpLnNldE1vZGUoJ2FjZS9tb2RlL2phdmFzY3JpcHQnKTtcbiAgICBlZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgIGVuYWJsZUJhc2ljQXV0b2NvbXBsZXRpb246IHRydWVcbiAgICB9KTtcblxuICAgICQoJyNzYXZlJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgdXJsOiBcIi9zYXZlXCIsXG4gICAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIF9jc3JmOiBfY3NyZixcbiAgICAgICAgICAgICAgICBjb250ZW50OiBlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKClcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiU2F2ZSBmYWlsZWQhIFwiICsgcmVzcG9uc2UuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBhbGVydChcIlNhdmUgZmFpbGVkISBcIiArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnYW1lKCkge1xuICAgIHZhciBwbGF5ZXJzID0ge30sIG15TmFtZSwgY3VycmVudCwganNPdXRwdXQsIGpzQ29uZmlnLCBsZWZ0VmFsdWUsIHJpZ2h0VmFsdWUsIGN1ck9wRm47XG5cbiAgICBzb2NrZXQgPSBpbygpO1xuICAgICQoJyNsb2dpbiAudXNlcm5hbWVJbnB1dCcpLmZvY3VzKCk7XG4gICAgJCgnI3lvdXJOdW1iZXInKS5oaWRlKCk7XG5cbiAgICBmdW5jdGlvbiBnb0dhbWUoKSB7XG4gICAgICAgIHNvY2tldC5lbWl0KCdwbGF5ZXInLCB7IG5hbWU6IG15TmFtZSB9KTtcblxuICAgICAgICBqc0NvbmZpZyA9IHtcbiAgICAgICAgICAgIGNvbnNvbGU6IGNvbnNvbGUsXG4gICAgICAgICAgICBvbkNvbW1hbmQ6IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgICAgICAgICAgc29ja2V0LmVtaXQoJ2NoYXQnLCB7IG5hbWU6IG15TmFtZSwgdGV4dDogbGluZSB9KTtcbiAgICAgICAgICAgICAgICBqc091dHB1dC5jbGVhclByb21wdCgpO1xuICAgICAgICAgICAgICAgIGpzT3V0cHV0LnJlbmRlck91dHB1dChteU5hbWUgKyAnOiAnICsgbGluZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAganNPdXRwdXQgPSBuZXcgSnNPdXRwdXQoanNDb25maWcpO1xuICAgICAgICBqc091dHB1dC5fY29uZmlnID0ganNDb25maWc7XG5cbiAgICAgICAgdmFyIHByb21wdGVkID0gZmFsc2U7XG4gICAgICAgIGpzT3V0cHV0Lm9uTmV3UHJvbXB0KGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKCFwcm9tcHRlZCkge1xuICAgICAgICAgICAgICAgIHByb21wdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soJ1dlbGNvbWUgdG8gdGhlIGdhbWUhIENoYXQgd2l0aCBvdGhlciBwbGF5ZXJzIGhlcmUuIEJlIHJlc3BlY3RmdWwuPGJyLz4+ICcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2soJz4gJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGpzT3V0cHV0LmFjdGl2YXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZ2FtZXVzZXInKSkge1xuICAgICAgICBteU5hbWUgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2dhbWV1c2VyJyk7XG4gICAgICAgIHBsYXllcnNbbXlOYW1lXSA9IHsgbmFtZTogbXlOYW1lIH07XG4gICAgICAgIGdvR2FtZSgpO1xuICAgICAgICAkKCcjbG9naW4nKS5oaWRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgJCh3aW5kb3cpLmtleWRvd24oZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAobXlOYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRvLWZvY3VzIHRoZSBjdXJyZW50IGlucHV0IHdoZW4gYSBrZXkgaXMgdHlwZWRcbiAgICAgICAgICAgIGlmICghKGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQubWV0YUtleSB8fCBldmVudC5hbHRLZXkpKSB7XG4gICAgICAgICAgICAgICAgJCgnI2xvZ2luIC51c2VybmFtZUlucHV0JykuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFdoZW4gdGhlIGNsaWVudCBoaXRzIEVOVEVSIG9uIHRoZWlyIGtleWJvYXJkXG4gICAgICAgICAgICBpZiAoZXZlbnQud2hpY2ggPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgbXlOYW1lID0gJCgnI2xvZ2luIC51c2VybmFtZUlucHV0JykudmFsKCk7XG4gICAgICAgICAgICAgICAgc29ja2V0LmVtaXQoJ3BsYXllcicsIHsgbmFtZTogbXlOYW1lIH0pO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZ2FtZXVzZXInLCBteU5hbWUpO1xuICAgICAgICAgICAgICAgIGdvR2FtZSgpO1xuICAgICAgICAgICAgICAgICQoJyNsb2dpbicpLmZhZGVPdXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc29ja2V0Lm9uKCdwbGF5ZXInLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBjb25zb2xlLmxvZygnUExBWUVSJywgZGF0YSk7XG4gICAgICAgIHNvY2tldC5lbWl0KCdwbGF5ZXJSZXNwb25zZScsIHsgbmFtZTogbXlOYW1lIH0pO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdwbGF5ZXJSZXNwb25zZScsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGlmICghcGxheWVyc1tkYXRhLm5hbWVdKSB7XG4gICAgICAgICAgICBqc091dHB1dC5yZW5kZXJPdXRwdXQoJ05ldyBQbGF5ZXIhICcgKyBkYXRhLm5hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcGxheWVyc1tkYXRhLm5hbWVdID0ge307XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbmV3IHBsYXllcicsIGRhdGEpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgc2V0dXBHYW1lID0gZnVuY3Rpb24gKHApIHtcbiAgICAgICAgY3VycmVudCA9IHA7XG4gICAgICAgICQoJyN0Z3QnKS50ZXh0KHAudGFyZ2V0KTtcbiAgICAgICAgJCgnI2dhbWVTdGFydCcpLmhpZGUoKTtcbiAgICAgICAgJCgnI3lvdXJOdW1iZXIgc3BhbicpLnRleHQocC5wbGF5ZXJzW215TmFtZV0ubnVtYmVyKTtcbiAgICAgICAgJCgnI3lvdXJOdW1iZXInKS5mYWRlSW4oKTtcbiAgICB9O1xuXG4gICAgc29ja2V0Lm9uKCduZXdHYW1lJywgc2V0dXBHYW1lKTtcblxuICAgIHNvY2tldC5vbignd2luJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgYWxlcnQoZC5uYW1lICsgJyBoYXMgd29uLicpO1xuICAgIH0pO1xuXG4gICAgJCgnI29wJykuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAkKCcjb3BDaG9pY2UnKS5mYWRlSW4oKTtcbiAgICB9KTtcblxuICAgICQoJyNvcENob2ljZSBidXR0b24nKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvcCA9ICQodGhpcykudGV4dCgpO1xuICAgICAgICAkKCcjb3AnKS50ZXh0KG9wKTtcbiAgICAgICAgJCgnI29wQ2hvaWNlJykuaGlkZSgpO1xuICAgICAgICBpZiAob3AgPT09ICcrJykge1xuICAgICAgICAgICAgY3VyT3BGbiA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHggKyB5O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChvcCA9PT0gJ8OXJykge1xuICAgICAgICAgICAgY3VyT3BGbiA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHggKiB5O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChvcCA9PT0gJy0nKSB7XG4gICAgICAgICAgICBjdXJPcEZuID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geCAtIHk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGNoZWNrUmVzdWx0KCk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBjaGVja1Jlc3VsdCgpIHtcbiAgICAgICAgaWYgKGN1ck9wRm4gJiYgbGVmdFZhbHVlICYmIHJpZ2h0VmFsdWUgJiYgY3VyT3BGbihsZWZ0VmFsdWUsIHJpZ2h0VmFsdWUpID09IGN1cnJlbnQudGFyZ2V0KSB7XG4gICAgICAgICAgICBzb2NrZXQuZW1pdCgnd2luJywgeyBuYW1lOiBteU5hbWUgfSk7XG4gICAgICAgICAgICBhbGVydCgnWU9VIFdJTicpO1xuICAgICAgICAgICAgJCgnI2dhbWVTdGFydCcpLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICB9XG4gICAgfVxuXG4gICAgJCgnI2l0ZW0xJykuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIWN1cnJlbnQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkKCcjdDFDaG9pY2UnKS5odG1sKCcnKTtcbiAgICAgICAgZm9yICh2YXIgcG4gaW4gY3VycmVudC5wbGF5ZXJzKSB7XG4gICAgICAgICAgICB2YXIgayA9ICQoJzxidXR0b24vPicpLmFkZENsYXNzKCdidG4gYnRuLWxnJykudGV4dChwbiArICcgJyArIGN1cnJlbnQucGxheWVyc1twbl0ubnVtYmVyKTtcbiAgICAgICAgICAgICQoJyN0MUNob2ljZScpLmFwcGVuZChrKTtcbiAgICAgICAgICAgIGsuZGF0YSgncGxheWVyJywgcG4pO1xuICAgICAgICB9XG4gICAgICAgICQoJyN0MUNob2ljZSBidXR0b24nKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcCA9IGN1cnJlbnQucGxheWVyc1skKHRoaXMpLmRhdGEoJ3BsYXllcicpXTtcbiAgICAgICAgICAgICQoJyNpdGVtMScpLnRleHQocC5udW1iZXIpO1xuICAgICAgICAgICAgJCgnI3QxQ2hvaWNlJykuaGlkZSgpO1xuICAgICAgICAgICAgbGVmdFZhbHVlID0gcC5udW1iZXI7XG4gICAgICAgICAgICBjaGVja1Jlc3VsdCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjdDFDaG9pY2UnKS5mYWRlSW4oKTtcbiAgICB9KTtcblxuICAgICQoJyNpdGVtMicpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFjdXJyZW50KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJCgnI3QyQ2hvaWNlJykuaHRtbCgnJyk7XG4gICAgICAgIGZvciAodmFyIHBuIGluIGN1cnJlbnQucGxheWVycykge1xuICAgICAgICAgICAgdmFyIGsgPSAkKCc8YnV0dG9uLz4nKS5hZGRDbGFzcygnYnRuIGJ0bi1sZycpLnRleHQocG4gKyAnICcgKyBjdXJyZW50LnBsYXllcnNbcG5dLm51bWJlcik7XG4gICAgICAgICAgICAkKCcjdDJDaG9pY2UnKS5hcHBlbmQoayk7XG4gICAgICAgICAgICBrLmRhdGEoJ3BsYXllcicsIHBuKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcjdDJDaG9pY2UgYnV0dG9uJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHAgPSBjdXJyZW50LnBsYXllcnNbJCh0aGlzKS5kYXRhKCdwbGF5ZXInKV07XG4gICAgICAgICAgICAkKCcjaXRlbTInKS50ZXh0KHAubnVtYmVyKTtcbiAgICAgICAgICAgICQoJyN0MkNob2ljZScpLmhpZGUoKTtcbiAgICAgICAgICAgIHJpZ2h0VmFsdWUgPSBwLm51bWJlcjtcbiAgICAgICAgICAgIGNoZWNrUmVzdWx0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyN0MkNob2ljZScpLmZhZGVJbigpO1xuICAgIH0pO1xuXG4gICAgJCgnI2dhbWVTdGFydCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhhbmQgPSBkZWFsKHBsYXllcnMpO1xuICAgICAgICBzb2NrZXQuZW1pdCgnbmV3R2FtZScsIGhhbmQpO1xuICAgICAgICBzZXR1cEdhbWUoaGFuZCk7XG4gICAgICAgICQoJyNnYW1lU3RhcnQnKS5oaWRlKCk7XG4gICAgICAgICQoJyN5b3VyTnVtYmVyJykuZmFkZUluKCk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBjb25zb2xlU2l6ZXIoKSB7XG4gICAgICAgIHZhciB0b3RhbEhlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKTtcbiAgICAgICAgJCgnI2NvbnNvbGVSb3cnKS5oZWlnaHQodG90YWxIZWlnaHQgLSAzMDApO1xuICAgIH1cblxuICAgIGNvbnNvbGVTaXplcigpO1xuICAgICQod2luZG93KS5yZXNpemUoY29uc29sZVNpemVyKTtcblxuICAgIHNvY2tldC5vbignY2hhdCcsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdDSEFUJywgZGF0YSk7XG4gICAgICAgIGpzT3V0cHV0LnJlbmRlck91dHB1dChkYXRhLm5hbWUgKyAnOiAnICsgZGF0YS50ZXh0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG59XG5cbmZ1bmN0aW9uIGNvbnNvbGVHYW1lUGFnZSgpIHtcbiAgICBzb2NrZXQgPSBpbygpO1xuICAgIHZhciBhcHBOYW1lID0gZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWUuc3Vic3RyaW5nKDEpO1xuXG4gICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3Vic3RyaW5nKDEpLmluZGV4T2YoXCJwPVwiKSA9PT0gMCkge1xuICAgICAgICB2YXIgcHJvZyA9IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3Vic3RyaW5nKDMpLnNwbGl0KCcmJylbMF07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwcm9nID0gTFpTdHJpbmcuZGVjb21wcmVzc0Zyb21FbmNvZGVkVVJJQ29tcG9uZW50KHByb2cpO1xuICAgICAgICAgICAgJCgnI2VkaXRvcicpLnRleHQocHJvZyk7XG4gICAgICAgICAgICAvLyBJZiB0aGVyZSB3YXMgYSBwcm9ncmFtIGxpbmssIGtlZXAgbG9jYWwgY2hhbmdlc1xuICAgICAgICAgICAgYXBwTmFtZSA9IHNoYTEocHJvZyk7XG4gICAgICAgIH0gY2F0Y2ggKHgpIHtcbiAgICAgICAgICAgIC8vIFdhc24ndCBhIHByb2dyYW0gaW4gdGhlIGxpbmsuLi5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBqc0NvbmZpZyA9IHtcbiAgICAgICAgb25Db21tYW5kOiBsb2dnZXJJbnB1dCxcbiAgICAgICAgY29uc29sZTogY29uc29sZSxcbiAgICAgICAgcnVuOiBydW5cbiAgICB9O1xuICAgIHZhciBqc091dHB1dCA9IG5ldyBKc091dHB1dChqc0NvbmZpZyk7XG4gICAganNPdXRwdXQuX2NvbmZpZyA9IGpzQ29uZmlnO1xuXG4gICAgc2l6ZXIoKTtcbiAgICAkKHdpbmRvdykucmVzaXplKHNpemVyKTtcblxuICAgIHZhciBwcm9tcHRlZCA9IGZhbHNlO1xuICAgIGpzT3V0cHV0Lm9uTmV3UHJvbXB0KGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXByb21wdGVkKSB7XG4gICAgICAgICAgICBwcm9tcHRlZCA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soJ1RoZSBvdXRwdXQgb2YgeW91ciBwcm9ncmFtIHdpbGwgYXBwZWFyIGhlcmUuJyk7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soJycpO1xuICAgIH0pO1xuXG4gICAgaWYgKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY29kZScgKyBhcHBOYW1lKSkge1xuICAgICAgICAkKCcjZWRpdG9yJykudGV4dCh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NvZGUnICsgYXBwTmFtZSkpO1xuICAgIH1cblxuICAgIGFjZS5yZXF1aXJlKFwiYWNlL2V4dC9sYW5ndWFnZV90b29sc1wiKTtcbiAgICB2YXIgZWRpdG9yID0gYWNlLmVkaXQoJ2VkaXRvcicpO1xuICAgIGVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICBlZGl0b3IuZ2V0U2Vzc2lvbigpLnNldE1vZGUoJ2FjZS9tb2RlL2phdmFzY3JpcHQnKTtcbiAgICBlZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgIGVuYWJsZVNuaXBwZXRzOiB0cnVlLFxuICAgICAgICBlbmFibGVMaXZlQXV0b2NvbXBsZXRpb246IHRydWUsXG4gICAgICAgIGVuYWJsZUJhc2ljQXV0b2NvbXBsZXRpb246IHRydWVcbiAgICB9KTtcbiAgICBjb25zb2xlQ29tcGxldGVzKGFjZS5yZXF1aXJlKFwiYWNlL3NuaXBwZXRzXCIpLnNuaXBwZXRNYW5hZ2VyKTtcblxuICAgIGVkaXRvci5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NvZGUnICsgYXBwTmFtZSwgZWRpdG9yLmdldFNlc3Npb24oKS5nZXRWYWx1ZSgpKTtcbiAgICAgICAgaWYgKCQoJyNhdXRvUnVuJykucHJvcCgnY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJ1bigpO1xuICAgICAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlZGl0b3Iub24oJ2ZvY3VzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBqc091dHB1dC5kZWFjdGl2YXRlKCk7XG4gICAgfSk7XG5cbiAgICBlZGl0b3IuY29tbWFuZHMuYWRkQ29tbWFuZCh7XG4gICAgICAgIG5hbWU6ICdSdW4nLFxuICAgICAgICBiaW5kS2V5OiAnQ3RybC1SJyxcbiAgICAgICAgZXhlYzogZnVuY3Rpb24gKGVkaXRvcikge1xuICAgICAgICAgICAgcnVuKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBlZGl0b3IuY29tbWFuZHMuYWRkQ29tbWFuZCh7XG4gICAgICAgIG5hbWU6ICdDbGVhcicsXG4gICAgICAgIGJpbmRLZXk6ICdDdHJsLUwnLFxuICAgICAgICBleGVjOiBmdW5jdGlvbiAoZWRpdG9yKSB7XG4gICAgICAgICAgICBqc091dHB1dC5jbGVhcigpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgJCgnI3J1bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5ibHVyKCk7XG4gICAgICAgIHJ1bigpO1xuICAgIH0pO1xuICAgICQoJyNjbGVhcicpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAganNPdXRwdXQuY2xlYXIoKTtcbiAgICAgICAganNPdXRwdXQucmVuZGVyT3V0cHV0KCc+JywgZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgICQoJyNzaGFyZScpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCc/JylbMF07XG4gICAgICAgIHZhciBlbmMgPSBMWlN0cmluZy5jb21wcmVzc1RvRW5jb2RlZFVSSUNvbXBvbmVudChlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCkpO1xuICAgICAgICAkKCcjdXJsTW9kYWwgdGV4dGFyZWEnKS52YWwodXJsICsgJz9wPScgKyBlbmMpO1xuICAgICAgICAkKCcjdXJsTW9kYWwnKS5tb2RhbCgpO1xuICAgIH0pO1xuXG4gICAgdmFyIGNvbnRleHQgPSBjbG9zdXJlKHNvY2tldCwgZWRpdG9yLCBqc091dHB1dCk7XG5cbiAgICBzb2NrZXQub24oJ2NoYXQnLCBmdW5jdGlvbiAobSkge1xuICAgICAgICBpZiAoX2pzTGlzdGVuZXJzW20uY29udGVudC50eXBlXSkge1xuICAgICAgICAgICAgX2pzTGlzdGVuZXJzW20uY29udGVudC50eXBlXS5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGZuKG0uY29udGVudC5tZXNzYWdlLCBtLnNvdXJjZSwgbS5jb250ZW50LnR5cGUpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnVW5oYW5kbGVkIG1lc3NhZ2UnLCBtKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgJCgnI2NvcHlwcm9nJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzb2NrZXQuZW1pdCgnc2hhcmUnLCB7XG4gICAgICAgICAgICBjb2RlOiBlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCksXG4gICAgICAgICAgICB0eXBlOiAnY29uc29sZSdcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB2YXIgc2hhcmVQcm9nO1xuICAgIHNvY2tldC5vbignc2hhcmUnLCBmdW5jdGlvbiAobSkge1xuICAgICAgICBpZiAobS5jb250ZW50LnR5cGUgPT09ICdjb25zb2xlJykge1xuICAgICAgICAgICAgJCgnI2dldHByb2cnKS5mYWRlSW4oKTtcbiAgICAgICAgICAgIHNoYXJlUHJvZyA9IG0uY29udGVudC5jb2RlO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAkKCcjZ2V0cHJvZycpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZWRpdG9yLmdldFNlc3Npb24oKS5zZXRWYWx1ZShzaGFyZVByb2cpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gcnVuKGNvZGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIF9qc0xpc3RlbmVycyA9IHt9O1xuICAgICAgICAgICAgY29udGV4dChjb2RlIHx8IGVkaXRvci5nZXRTZXNzaW9uKCkuZ2V0VmFsdWUoKSk7XG4gICAgICAgIH0gY2F0Y2ggKHgpIHtcbiAgICAgICAgICAgIHZhciB0cmFjZTtcbiAgICAgICAgICAgIGlmICh3aW5kb3dbXCJwcmludFN0YWNrVHJhY2VcIl0pIHtcbiAgICAgICAgICAgICAgICB0cmFjZSA9IHByaW50U3RhY2tUcmFjZSh7IGU6IHggfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBsYXN0TGluZSA9IHRyYWNlID8gdHJhY2VbMF0ubWF0Y2goLzxhbm9ueW1vdXM+OihcXGQrKTooXFxkKykvKSA6IG51bGw7XG4gICAgICAgICAgICBpZiAobGFzdExpbmUgJiYgbGFzdExpbmUubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGJvb3Rib3guZGlhbG9nKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZXJlIHdhcyBhbiBlcnJvciE8YnIvPjxiPicgKyB4Lm1lc3NhZ2UgKyAnPC9iPjxici8+PGJyLz5PbiBMaW5lICMnICsgKGxhc3RMaW5lWzFdIC0gMiksXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIk9vcHMhXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYm9vdGJveC5hbGVydCh4Lm1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAganNPdXRwdXQuYWN0aXZhdGUoKTtcbiAgICBlZGl0b3IuZm9jdXMoKTtcbn1cblxuZnVuY3Rpb24gY2FudmFzUGFnZSgpIHtcblxuICAgIHNvY2tldCA9IGlvKCk7XG4gICAgdmFyIGFwcE5hbWUgPSBkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHJpbmcoMSk7XG5cbiAgICBpZiAod2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMSkuaW5kZXhPZihcInA9XCIpID09PSAwKSB7XG4gICAgICAgIHZhciBwcm9nID0gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMykuc3BsaXQoJyYnKVswXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHByb2cgPSBMWlN0cmluZy5kZWNvbXByZXNzRnJvbUVuY29kZWRVUklDb21wb25lbnQocHJvZyk7XG4gICAgICAgICAgICAkKCcjZWRpdG9yJykudGV4dChwcm9nKTtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIHdhcyBhIHByb2dyYW0gbGluaywga2VlcCBsb2NhbCBjaGFuZ2VzXG4gICAgICAgICAgICBhcHBOYW1lID0gc2hhMShwcm9nKTtcbiAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgLy8gV2Fzbid0IGEgcHJvZ3JhbSBpbiB0aGUgbGluay4uLlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2FudmFzID0gJCgnI2NhbnZhcycpWzBdO1xuXG4gICAgc2l6ZXIoKTtcbiAgICAkKHdpbmRvdykucmVzaXplKHNpemVyKTtcbiAgICAkKCcjc2hvd0NvZGUnKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNsaW1TaXplID0gZmFsc2U7XG4gICAgICAgICQoJyNzbGltQnV0dG9ucycpLmhpZGUoKTtcbiAgICAgICAgJCgnI2ZhdEJ1dHRvbnMnKS5zaG93KCk7XG4gICAgICAgIHNpemVyKCk7XG4gICAgfSk7XG5cbiAgICBpZiAod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjb2RlJyArIGFwcE5hbWUpKSB7XG4gICAgICAgICQoJyNlZGl0b3InKS50ZXh0KHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY29kZScgKyBhcHBOYW1lKSk7XG4gICAgfVxuXG4gICAgYWNlLnJlcXVpcmUoXCJhY2UvZXh0L2xhbmd1YWdlX3Rvb2xzXCIpO1xuICAgIHZhciBlZGl0b3IgPSBhY2UuZWRpdCgnZWRpdG9yJyk7XG4gICAgZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgIGVkaXRvci5nZXRTZXNzaW9uKCkuc2V0TW9kZSgnYWNlL21vZGUvamF2YXNjcmlwdCcpO1xuICAgIGVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgZW5hYmxlU25pcHBldHM6IHRydWUsXG4gICAgICAgIGVuYWJsZUxpdmVBdXRvY29tcGxldGlvbjogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQmFzaWNBdXRvY29tcGxldGlvbjogdHJ1ZVxuICAgIH0pO1xuICAgIGNhbnZhc0NvbXBsZXRlcyhhY2UucmVxdWlyZShcImFjZS9zbmlwcGV0c1wiKS5zbmlwcGV0TWFuYWdlcik7XG5cbiAgICBlZGl0b3Iub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjb2RlJyArIGFwcE5hbWUsIGVkaXRvci5nZXRTZXNzaW9uKCkuZ2V0VmFsdWUoKSk7XG4gICAgICAgIGlmICgkKCcjYXV0b1J1bicpLnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBydW4oKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKHgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZWRpdG9yLm9uKCdmb2N1cycsIGZ1bmN0aW9uICgpIHtcbiAgICB9KTtcblxuICAgIGVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kKHtcbiAgICAgICAgbmFtZTogJ1J1bicsXG4gICAgICAgIGJpbmRLZXk6ICdDdHJsLVInLFxuICAgICAgICBleGVjOiBmdW5jdGlvbiAoZWRpdG9yKSB7XG4gICAgICAgICAgICBydW4oKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kKHtcbiAgICAgICAgbmFtZTogJ0NsZWFyJyxcbiAgICAgICAgYmluZEtleTogJ0N0cmwtTCcsXG4gICAgICAgIGV4ZWM6IGZ1bmN0aW9uIChlZGl0b3IpIHtcbiAgICAgICAgICAgIHZhciBjYW52YXNDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgJCgnI3J1bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgJCgnI2ZhdEJ1dHRvbnMnKS5oaWRlKCk7XG4gICAgICAgICQoJyNzbGltQnV0dG9ucycpLnNob3coKTtcbiAgICAgICAgc2xpbVNpemUgPSB0cnVlO1xuICAgICAgICB0aGlzLmJsdXIoKTtcbiAgICAgICAgc2l6ZXIoKTtcbiAgICAgICAgcnVuKCk7XG4gICAgfSk7XG4gICAgJCgnI2NsZWFyJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBjYW52YXNDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgIH0pO1xuICAgICQoJyNzaGFyZScpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCc/JylbMF07XG4gICAgICAgIHZhciBlbmMgPSBMWlN0cmluZy5jb21wcmVzc1RvRW5jb2RlZFVSSUNvbXBvbmVudChlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCkpO1xuICAgICAgICAkKCcjdXJsTW9kYWwgdGV4dGFyZWEnKS52YWwodXJsICsgJz9wPScgKyBlbmMpO1xuICAgICAgICAkKCcjdXJsTW9kYWwnKS5tb2RhbCgpO1xuICAgIH0pO1xuXG4gICAgdmFyIGNvbnRleHQgPSBjYW52YXNDbG9zdXJlKHNvY2tldCwgZWRpdG9yKTtcblxuICAgIHNvY2tldC5vbignY2hhdCcsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChfanNMaXN0ZW5lcnNbbS5jb250ZW50LnR5cGVdKSB7XG4gICAgICAgICAgICBfanNMaXN0ZW5lcnNbbS5jb250ZW50LnR5cGVdLmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgZm4obS5jb250ZW50Lm1lc3NhZ2UsIG0uc291cmNlLCBtLmNvbnRlbnQudHlwZSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgJCgnI2NvcHlwcm9nJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzb2NrZXQuZW1pdCgnc2hhcmUnLCB7XG4gICAgICAgICAgICBjb2RlOiBlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCksXG4gICAgICAgICAgICB0eXBlOiAnY2FudmFzJ1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBjYWxsS2V5Rm4gPSBmdW5jdGlvbiAobmFtZSwgY29kZSkge1xuICAgICAgICBpZiAoX2pzTGlzdGVuZXJzW25hbWVdKSB7XG4gICAgICAgICAgICBfanNMaXN0ZW5lcnNbbmFtZV0uZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBmbihjb2RlKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIEJpbmQga2V5dXAgbWVzc2FnZXMgdG8gdGhlIHVzZXItbGFuZCBcIm9uXCIgZnVuY3Rpb24uIFRoZSBuYW1lc3BhY2UgaXMgc2hhcmVkIHdpdGggc29ja2V0cywgd2hpY2ggaXMgd2VpcmQgb2YgY291cnNlXG4gICAgJCgnYm9keScpLm9uKCdrZXl1cCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LnRhZ05hbWUgPT09ICdURVhUQVJFQScpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIga2V5ID0gZXZlbnQua2V5Q29kZTtcbiAgICAgICAgY2FsbEtleUZuKCdrZXknLCBrZXkpO1xuICAgICAgICBpZiAoa2V5ID49IDM3ICYmIGtleSA8PSA0MCkge1xuICAgICAgICAgICAgY2FsbEtleUZuKFsnbGVmdCcsICd1cCcsICdyaWdodCcsICdkb3duJ11ba2V5IC0gMzddLCBrZXkpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgc2hhcmVQcm9nO1xuICAgIHNvY2tldC5vbignc2hhcmUnLCBmdW5jdGlvbiAobSkge1xuICAgICAgICBpZiAobS5jb250ZW50LnR5cGUgPT09ICdjYW52YXMnKSB7XG4gICAgICAgICAgICAkKCcjZ2V0cHJvZycpLmZhZGVJbigpO1xuICAgICAgICAgICAgc2hhcmVQcm9nID0gbS5jb250ZW50LmNvZGU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgICQoJyNnZXRwcm9nJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBlZGl0b3IuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKHNoYXJlUHJvZyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBydW4oY29kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgX2pzTGlzdGVuZXJzID0ge307XG4gICAgICAgICAgICBjb250ZXh0KGNvZGUgfHwgZWRpdG9yLmdldFNlc3Npb24oKS5nZXRWYWx1ZSgpKTtcbiAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgdmFyIHRyYWNlO1xuICAgICAgICAgICAgaWYgKHdpbmRvd1tcInByaW50U3RhY2tUcmFjZVwiXSkge1xuICAgICAgICAgICAgICAgIHRyYWNlID0gcHJpbnRTdGFja1RyYWNlKHsgZTogeCB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGxhc3RMaW5lID0gdHJhY2UgPyB0cmFjZVswXS5tYXRjaCgvPGFub255bW91cz46KFxcZCspOihcXGQrKS8pIDogbnVsbDtcbiAgICAgICAgICAgIGlmIChsYXN0TGluZSAmJiBsYXN0TGluZS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgYm9vdGJveC5kaWFsb2coe1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlcmUgd2FzIGFuIGVycm9yITxici8+PGI+JyArIHgubWVzc2FnZSArICc8L2I+PGJyLz48YnIvPk9uIExpbmUgIycgKyAobGFzdExpbmVbMV0gLSAyKSxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiT29wcyFcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBib290Ym94LmFsZXJ0KHgubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBlZGl0b3IuZm9jdXMoKTtcbn1cblxuZnVuY3Rpb24gbG9nZ2VySW5wdXQodGV4dCkge1xuICAgIGNvbnNvbGUubG9nKCdVbmV4cGVjdGVkIGlucHV0JywgdGV4dCk7XG59XG5cbmZ1bmN0aW9uIGNhbnZhc0Nsb3N1cmUoc29ja2V0LCBlZGl0b3IpIHtcbiAgICB2YXIgcmVkID0gJyNGRjAwMDAnLCBncmVlbiA9ICcjMDBGRjAwJywgYmx1ZSA9ICcjMDAwMEZGJywgd2hpdGUgPSAnI0ZGRkZGRicsIGJsYWNrID0gJyMwMDAnLFxuICAgICAgICBmaWxsZWQgPSB0cnVlLFxuICAgICAgICBlbXB0eSA9IGZhbHNlLFxuICAgICAgICBsaW5lID0gZnVuY3Rpb24gKGMsIHgsIHksIHcsIGgpIHtcbiAgICAgICAgICAgIHZhciBjYW52YXNDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5tb3ZlVG8oeCwgeSk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmxpbmVUbyh4ICsgdywgeSArIGgpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5zdHJva2VTdHlsZSA9IGM7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LnN0cm9rZSgpO1xuICAgICAgICB9LCBjbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjYW52YXNDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICB9LCBjaXJjbGUgPSBmdW5jdGlvbiAoY29sb3IsIGNlbnRlclgsIGNlbnRlclksIHJhZGl1cywgZikge1xuICAgICAgICAgICAgdmFyIGNhbnZhc0NvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmFyYyhjZW50ZXJYLCBjZW50ZXJZLCByYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XG4gICAgICAgICAgICBpZiAoZikge1xuICAgICAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbFN0eWxlID0gY29sb3I7XG4gICAgICAgICAgICAgICAgY2FudmFzQ29udGV4dC5maWxsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmxpbmVXaWR0aCA9IDU7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LnN0cm9rZVN0eWxlID0gY29sb3I7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LnN0cm9rZSgpO1xuICAgICAgICB9LCBmaWxsID0gZnVuY3Rpb24gKGNvbG9yKSB7XG4gICAgICAgICAgICB2YXIgY2FudmFzQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQucmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5maWxsU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbCgpO1xuICAgICAgICB9LCByZWN0ID0gZnVuY3Rpb24gKGMsIHgsIHksIHcsIGgsIGYpIHtcbiAgICAgICAgICAgIHZhciBjYW52YXNDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5yZWN0KHgsIHksIHcsIGgpO1xuICAgICAgICAgICAgaWYgKGYgfHwgZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY2FudmFzQ29udGV4dC5maWxsU3R5bGUgPSBjO1xuICAgICAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5zdHJva2VTdHlsZSA9IGM7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LnN0cm9rZSgpO1xuICAgICAgICB9LCBwcmludCA9IGZ1bmN0aW9uIChjb2xvciwgeCwgeSwgbWVzc2FnZSwgZm9udCkge1xuICAgICAgICAgICAgdmFyIGNhbnZhc0NvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmZvbnQgPSAnNDBwdCBDYWxpYnJpJztcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbFN0eWxlID0gY29sb3IgfHwgJ3doaXRlJztcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbFRleHQobWVzc2FnZSwgeCwgeSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNlbmQgPSBmdW5jdGlvbiAodHlwZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKHR5cGUgJiYgIW1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gdHlwZTtcbiAgICAgICAgICAgICAgICB0eXBlID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNvY2tldC5lbWl0KCdjaGF0JywgeyB0eXBlOiB0eXBlLCBtZXNzYWdlOiBtZXNzYWdlIH0pO1xuICAgICAgICB9LCBvbiA9IGZ1bmN0aW9uIChlLCBmbikge1xuICAgICAgICAgICAgX2pzTGlzdGVuZXJzW2VdID0gX2pzTGlzdGVuZXJzW2VdIHx8IFtdO1xuICAgICAgICAgICAgX2pzTGlzdGVuZXJzW2VdLnB1c2goZm4pO1xuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIChmdW5jdGlvbiAoY29kZSkge1xuICAgICAgICB2YXIgbWUgPSBzb2NrZXQuaWQ7XG4gICAgICAgIGNvbnNvbGUudHJhY2UoJ1J1bm5pbmcgY29kZScpO1xuICAgICAgICB2YXIgdHJhbnNmb3JtZWQgPSBiYWJlbC50cmFuc2Zvcm0oJ3ZhciBwcm9ncmFtRnVuY3Rpb24gPSBhc3luYyBmdW5jdGlvbiAoKSB7ICcgKyBjb2RlICsgJ307IHByb2dyYW1GdW5jdGlvbigpOycsIHsgc3RhZ2U6IDAgfSk7XG4gICAgICAgIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aCwgaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcbiAgICAgICAgZXZhbCh0cmFuc2Zvcm1lZC5jb2RlKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY2xvc3VyZShzb2NrZXQsIGVkaXRvciwgb3V0cHV0KSB7XG4gICAgdmFyIHJhbmRvbSA9IGZ1bmN0aW9uIChoaWdoKSB7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBoaWdoKSArIDE7XG4gICAgfSwgYWRkTGV0dGVyID0gZnVuY3Rpb24gKGMsIHYpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdiA9IHYuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgoYy5jaGFyQ29kZUF0KDApICsgdikgJSAyNTYpO1xuICAgIH0sXG4gICAgICAgIGFkZGxldHRlciA9IGFkZExldHRlcixcbiAgICAgICAgcHJpbnQgPSBmdW5jdGlvbiAodGV4dCkge1xuICAgICAgICAgICAgb3V0cHV0LnJlbmRlck91dHB1dCh0ZXh0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBvdXRwdXQuY2xlYXIoKTtcbiAgICAgICAgICAgIG91dHB1dC5yZW5kZXJPdXRwdXQoJz4nLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCByZWFkTGluZSA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIHByaW50KG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgc3BlZWNoUmVzb2x2ZXIgPSAodGV4dCkgPT4ge1xuICAgICAgICAgICAgICAgIG91dHB1dC5fY29uZmlnLm9uQ29tbWFuZCA9IGxvZ2dlcklucHV0O1xuICAgICAgICAgICAgICAgIG91dHB1dC5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZXIodGV4dCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzcGVlY2guc3RhcnQoc3BlZWNoUmVzb2x2ZXIpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlc29sdmVyO1xuICAgICAgICAgICAgb3V0cHV0Ll9jb25maWcub25Db21tYW5kID0gZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZXIobGluZSk7XG4gICAgICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgc3BlZWNoLnN0b3AoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0cHV0Ll9jb25maWcub25Db21tYW5kID0gbG9nZ2VySW5wdXQ7XG4gICAgICAgICAgICAgICAgb3V0cHV0LmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBlZGl0b3IuYmx1cigpO1xuICAgICAgICAgICAgb3V0cHV0LmFjdGl2YXRlKCk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlciA9IHJlc29sdmU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgcmVhZGxpbmUgPSByZWFkTGluZSxcbiAgICAgICAgY2hvb3NlID0gZnVuY3Rpb24gKGNob2ljZXMpIHtcbiAgICAgICAgICAgIGNob2ljZXMuZm9yRWFjaCgoYywgaXgpID0+IHtcbiAgICAgICAgICAgICAgICBvdXRwdXQucmVuZGVyT3V0cHV0KGAke2l4ICsgMX0uICR7Y31gLCAoKSA9PiB7IH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZWFkTGluZSgpLnRoZW4oKHYpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3BzID0gY2hvaWNlcy5tYXAoKGMsIGl4KSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICBpbmRleDogaXgsXG4gICAgICAgICAgICAgICAgICAgIGVkaXQ6IGxldmVuc2h0ZWluKGMsIHYpLFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU09SVCBFRElUJyk7XG4gICAgICAgICAgICAgICAgdG9wcy5zb3J0KChhLCBiKSA9PiAoYS5lZGl0IC0gYi5lZGl0KSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codG9wcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh0b3BzWzBdLmluZGV4KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBzZW5kID0gZnVuY3Rpb24gKHR5cGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0eXBlICYmICFtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IHR5cGU7XG4gICAgICAgICAgICAgICAgdHlwZSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzb2NrZXQuZW1pdCgnY2hhdCcsIHsgdHlwZTogdHlwZSwgbWVzc2FnZTogbWVzc2FnZSB9KTtcbiAgICAgICAgfSwgb24gPSBmdW5jdGlvbiAoZSwgZm4pIHtcbiAgICAgICAgICAgIF9qc0xpc3RlbmVyc1tlXSA9IF9qc0xpc3RlbmVyc1tlXSB8fCBbXTtcbiAgICAgICAgICAgIF9qc0xpc3RlbmVyc1tlXS5wdXNoKGZuKTtcbiAgICAgICAgfSwgZGVsYXkgPSBmdW5jdGlvbiAodCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChyZXNvbHZlLCB0ICogMTAwMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgcm9vbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUpIHtcbiAgICAgICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICB1cmw6ICcvZ2FtZS1tYXAnLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJyxcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ01hcCBmYWlsZWQgJyArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgdmFyIHNwZWVjaCA9IGRvU3BlZWNoKHByaW50KTtcbiAgICByZXR1cm4gKGZ1bmN0aW9uIChjb2RlKSB7XG4gICAgICAgIHZhciBtZSA9IHNvY2tldC5pZDtcbiAgICAgICAgY29uc29sZS50cmFjZSgnUnVubmluZyBjb2RlJyk7XG4gICAgICAgIHZhciB0cmFuc2Zvcm1lZCA9IGJhYmVsLnRyYW5zZm9ybSgndmFyIHByb2dyYW1GdW5jdGlvbiA9IGFzeW5jIGZ1bmN0aW9uICgpIHsgJyArIGNvZGUgKyAnfTsgcHJvZ3JhbUZ1bmN0aW9uKCk7JywgeyBzdGFnZTogMCB9KTtcbiAgICAgICAgZXZhbCh0cmFuc2Zvcm1lZC5jb2RlKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc2l6ZXIoKSB7XG4gICAgdmFyIHRvdGFsSGVpZ2h0ID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuICAgIGlmIChzbGltU2l6ZSkge1xuICAgICAgICAkKCcjZWRpdG9yUm93JykuaGVpZ2h0KDUwKTtcbiAgICAgICAgJCgnI2NvbnNvbGVSb3cnKS5oZWlnaHQodG90YWxIZWlnaHQgLSA1MCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgJCgnI2VkaXRvclJvdycpLmhlaWdodChNYXRoLmZsb29yKHRvdGFsSGVpZ2h0IC8gMikpO1xuICAgICAgICAkKCcjY29uc29sZVJvdycpLmhlaWdodChNYXRoLmZsb29yKHRvdGFsSGVpZ2h0IC8gMikpO1xuICAgIH1cbiAgICBpZiAoY2FudmFzKSB7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9ICQoJyNjYW52YXMnKS53aWR0aCgpO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gJCgnI2NhbnZhcycpLmhlaWdodCgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc2hhMShzdHIxKSB7XG4gICAgZm9yIChcbiAgICAgICAgdmFyIGJsb2Nrc3RhcnQgPSAwLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgVyA9IFtdLFxuICAgICAgICBBLCBCLCBDLCBELCBGLCBHLFxuICAgICAgICBIID0gW0EgPSAweDY3NDUyMzAxLCBCID0gMHhFRkNEQUI4OSwgfkEsIH5CLCAweEMzRDJFMUYwXSxcbiAgICAgICAgd29yZF9hcnJheSA9IFtdLFxuICAgICAgICB0ZW1wMixcbiAgICAgICAgcyA9IHVuZXNjYXBlKGVuY29kZVVSSShzdHIxKSksXG4gICAgICAgIHN0cl9sZW4gPSBzLmxlbmd0aDtcblxuICAgICAgICBpIDw9IHN0cl9sZW47XG4gICAgKSB7XG4gICAgICAgIHdvcmRfYXJyYXlbaSA+PiAyXSB8PSAocy5jaGFyQ29kZUF0KGkpIHx8IDEyOCkgPDwgKDggKiAoMyAtIGkrKyAlIDQpKTtcbiAgICB9XG4gICAgd29yZF9hcnJheVt0ZW1wMiA9ICgoc3RyX2xlbiArIDgpID4+IDYgPDwgNCkgKyAxNV0gPSBzdHJfbGVuIDw8IDM7XG5cbiAgICBmb3IgKDsgYmxvY2tzdGFydCA8PSB0ZW1wMjsgYmxvY2tzdGFydCArPSAxNikge1xuICAgICAgICBBID0gSDtcbiAgICAgICAgaSA9IDA7XG5cbiAgICAgICAgZm9yICg7IGkgPCA4MDtcbiAgICAgICAgICAgIEEgPSBbW1xuICAgICAgICAgICAgICAgIChHID0gKChzID0gQVswXSkgPDwgNSB8IHMgPj4+IDI3KSArIEFbNF0gKyAoV1tpXSA9IChpIDwgMTYpID8gfn53b3JkX2FycmF5W2Jsb2Nrc3RhcnQgKyBpXSA6IEcgPDwgMSB8IEcgPj4+IDMxKSArIDE1MTg1MDAyNDkpICsgKChCID0gQVsxXSkgJiAoQyA9IEFbMl0pIHwgfkIgJiAoRCA9IEFbM10pKSxcbiAgICAgICAgICAgICAgICBGID0gRyArIChCIF4gQyBeIEQpICsgMzQxMjc1MTQ0LFxuICAgICAgICAgICAgICAgIEcgKyAoQiAmIEMgfCBCICYgRCB8IEMgJiBEKSArIDg4MjQ1OTQ1OSxcbiAgICAgICAgICAgICAgICBGICsgMTUzNTY5NDM4OVxuICAgICAgICAgICAgXVswIHwgKChpKyspIC8gMjApXSB8IDAsIHMsIEIgPDwgMzAgfCBCID4+PiAyLCBDLCBEXVxuICAgICAgICApIHtcbiAgICAgICAgICAgIEcgPSBXW2kgLSAzXSBeIFdbaSAtIDhdIF4gV1tpIC0gMTRdIF4gV1tpIC0gMTZdO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChpID0gNTsgaTspIEhbLS1pXSA9IEhbaV0gKyBBW2ldIHwgMDtcbiAgICB9XG5cbiAgICBmb3IgKHN0cjEgPSAnJzsgaSA8IDQwOylzdHIxICs9IChIW2kgPj4gM10gPj4gKDcgLSBpKysgJSA4KSAqIDQgJiAxNSkudG9TdHJpbmcoMTYpO1xuICAgIHJldHVybiBzdHIxO1xufVxuXG5mdW5jdGlvbiBkZWFsKHBsYXllcnMpIHtcbiAgICB2YXIgdGFyZ2V0ID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDUwKSAqIDI7XG4gICAgdmFyIHBsYXllckNvdW50ID0gMDtcbiAgICBmb3IgKHZhciBwIGluIHBsYXllcnMpIHtcbiAgICAgICAgcGxheWVyQ291bnQrKztcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ2RlYWxpbmcnLCBwbGF5ZXJDb3VudCk7XG4gICAgdmFyIGxhc3RQbGF5ZXIgPSBudWxsO1xuICAgIGZvciAodmFyIHAgaW4gcGxheWVycykge1xuICAgICAgICBpZiAobGFzdFBsYXllcikge1xuICAgICAgICAgICAgcGxheWVyc1twXS5udW1iZXIgPSBNYXRoLmFicyh0YXJnZXQgLSBsYXN0UGxheWVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBsYXllcnNbcF0ubnVtYmVyID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDUwKSAqIDI7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdFBsYXllciA9IHBsYXllcnNbcF0ubnVtYmVyO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICB0YXJnZXQ6IHRhcmdldCxcbiAgICAgICAgcGxheWVyczogcGxheWVyc1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHNjcmF0Y2hjcmFmdCgpIHtcbiAgICB2YXIgYmxvY2tseUFyZWEgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxvY2tseUFyZWEnKTtcbiAgICB2YXIgYmxvY2tseURpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibG9ja2x5RGl2Jyk7XG4gICAgdmFyIHdvcmtzcGFjZSA9IEJsb2NrbHkuaW5qZWN0KGJsb2NrbHlEaXYsXG4gICAgICAgIHtcbiAgICAgICAgICAgIG1lZGlhOiAnL2pzL2Jsb2NrbHkvbWVkaWEvJyxcbiAgICAgICAgICAgIHRvb2xib3g6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b29sYm94JylcbiAgICAgICAgfSk7XG4gICAgdmFyIGJsb2NrbHlSZXNpemUgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAvLyBDb21wdXRlIHRoZSBhYnNvbHV0ZSBjb29yZGluYXRlcyBhbmQgZGltZW5zaW9ucyBvZiBibG9ja2x5QXJlYS5cbiAgICAgICAgdmFyIGVsZW1lbnQgPSBibG9ja2x5QXJlYTtcbiAgICAgICAgdmFyIHggPSAwO1xuICAgICAgICB2YXIgeSA9IDA7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIHggKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgeSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfSB3aGlsZSAoZWxlbWVudCk7XG4gICAgICAgIC8vIFBvc2l0aW9uIGJsb2NrbHlEaXYgb3ZlciBibG9ja2x5QXJlYS5cbiAgICAgICAgYmxvY2tseURpdi5zdHlsZS5sZWZ0ID0geCArICdweCc7XG4gICAgICAgIGJsb2NrbHlEaXYuc3R5bGUudG9wID0geSArICdweCc7XG4gICAgICAgIGJsb2NrbHlEaXYuc3R5bGUud2lkdGggPSBibG9ja2x5QXJlYS5vZmZzZXRXaWR0aCArICdweCc7XG4gICAgICAgIGJsb2NrbHlEaXYuc3R5bGUuaGVpZ2h0ID0gYmxvY2tseUFyZWEub2Zmc2V0SGVpZ2h0ICsgJ3B4JztcbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBibG9ja2x5UmVzaXplLCBmYWxzZSk7XG4gICAgYmxvY2tseVJlc2l6ZSgpO1xufVxuXG5cbmZ1bmN0aW9uIGNvbnNvbGVDb21wbGV0ZXMoc25pcHMpIHtcblxuICAgIHNuaXBzLnJlZ2lzdGVyKFt7XG4gICAgICAgIHRhYlRyaWdnZXI6ICdwcicsXG4gICAgICAgIG5hbWU6ICdwcmludCcsXG4gICAgICAgIGNvbnRlbnQ6ICdwcmludChcXCckezE6bWVzc2FnZX1cXCcpOycsXG4gICAgICAgIGRvY0hUTUw6ICc8Yj5QcmludCBhIG1lc3NhZ2UgdG8gdGhlIGJvdHRvbSBzY3JlZW4uPC9iPjxoci8+cHJpbnQoXCJIZWxsbyBXb3JsZFwiKTs8YnIvPnByaW50KFwiVGhlIHZhbHVlIGlzIFwiICsgYVZhcmlhYmxlKTsnXG4gICAgfSwge1xuICAgICAgICB0YWJUcmlnZ2VyOiAncmUnLFxuICAgICAgICBuYW1lOiAncmVhZExpbmUnLFxuICAgICAgICBjb250ZW50OiAndmFyICR7MTphbnN3ZXJ9ID0gYXdhaXQgcmVhZExpbmUoXFwnJHsyOnF1ZXN0aW9ufVxcJyk7JyxcbiAgICAgICAgZG9jSFRNTDogJzxiPlJlYWQgYSBMaW5lIG9mIFRleHQ8L2I+PGJyLz5SZWFkIGEgbGluZSBvZiB0ZXh0IGZyb20gdGhlIHVzZXIgYW5kIHdhaXQgdW50aWwgdGhleSBoaXQgXCJSZXR1cm4uXCIgTGVhdmUgdGhlIHJlc3VsdCBpbiA8aT5hbnN3ZXI8L2k+Ljxoci8+dmFyICR7MTphbnN3ZXJ9ID0gYXdhaXQgcmVhZExpbmUoXFwnJHsyOnF1ZXN0aW9ufVxcJyk7J1xuICAgIH0sIHtcbiAgICAgICAgdGFiVHJpZ2dlcjogJ2NsJyxcbiAgICAgICAgbmFtZTogJ2NsZWFyJyxcbiAgICAgICAgY29udGVudDogJ2NsZWFyKCk7JyxcbiAgICAgICAgZG9jSFRNTDogJzxiPkNsZWFyIHRoZSBzY3JlZW48L2I+PGhyLz5jbGVhcigpOydcbiAgICB9LCB7XG4gICAgICAgIHRhYlRyaWdnZXI6ICdyYScsXG4gICAgICAgIG5hbWU6ICdyYW5kb20nLFxuICAgICAgICBjb250ZW50OiAncmFuZG9tKCR7MTptYXhpbXVtfSk7JyxcbiAgICAgICAgZG9jSFRNTDogJzxiPkNob29zZSBhIHJhbmRvbSBudW1iZXIgYmV0d2VlZW4gMSBhbmQgPGk+bWF4aW11bTwvaT48L2I+PGhyLz5yYW5kb20oMTAwKTsnXG4gICAgfSwge1xuICAgICAgICB0YWJUcmlnZ2VyOiAnYWRkbCcsXG4gICAgICAgIG5hbWU6ICdhZGRMZXR0ZXInLFxuICAgICAgICBjb250ZW50OiAnYWRkTGV0dGVyKCR7MTpiYXNlfSwkezI6YWRkfSknLFxuICAgICAgICBkb2NIVE1MOiAnPGI+QWRkIG9uZSBsZXR0ZXIgdG8gYW5vdGhlcjwvYj48aHIvPmFkZExldHRlcihcXFwiYVxcXCIsXFxcInpcXFwiKTsnXG4gICAgfV0pO1xuXG4gICAgdmFyIGJhc2ljU25pcHBldHMgPSBbJ2ZvcicsICdmdW4nLCAnd2gnLCAnaWYnLCAnc2V0VGltZW91dCddO1xuICAgIHZhciByZWdpc3RlciA9IHNuaXBzLnJlZ2lzdGVyO1xuICAgIHNuaXBzLnJlZ2lzdGVyID0gZnVuY3Rpb24gKHNuaXBwZXRzLCBzY29wZSkge1xuICAgICAgICByZWdpc3Rlci5jYWxsKHNuaXBzLCBzbmlwcGV0cy5maWx0ZXIoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgIGlmIChiYXNpY1NuaXBwZXRzLmluZGV4T2Yocy50YWJUcmlnZ2VyKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pLCBzY29wZSk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGNhbnZhc0NvbXBsZXRlcyhzbmlwcykge1xuXG4gICAgc25pcHMucmVnaXN0ZXIoW3tcbiAgICAgICAgdGFiVHJpZ2dlcjogJ3ByJyxcbiAgICAgICAgbmFtZTogJ3ByaW50JyxcbiAgICAgICAgY29udGVudDogJ3ByaW50KFxcJyR7MTpjb2xvcn1cXCcsICR7MjpzdGFydFh9LCAkezM6c3RhcnRZfSwgXFwnJHs0Om1lc3NhZ2V9XFwnKTsnLFxuICAgICAgICBkb2NIVE1MOiAnPGI+RHJhdyBUZXh0PC9iPjxici8+RHJhdyBtZXNzYWdlIGF0IHN0YXJ0WCxzdGFydFkuPGhyLz5wcmludChcInJlZFwiLCAwLCAwLCBcXCdIZWxsbyBXb3JsZCFcXCcpOydcbiAgICB9LCB7XG4gICAgICAgIHRhYlRyaWdnZXI6ICdjaScsXG4gICAgICAgIG5hbWU6ICdjaXJjbGUnLFxuICAgICAgICBjb250ZW50OiAnY2lyY2xlKFxcJyR7MTpjb2xvcn1cXCcsICR7MjpjZW50ZXJYfSwgJHszOmNlbnRlcll9LCAkezQ6cmFkaXVzfSwgJHs1OmZpbGxlZH0pOycsXG4gICAgICAgIGRvY0hUTUw6ICc8Yj5EcmF3IGEgQ2lyY2xlPC9iPjxici8+RHJhdyBhIGNpcmNsZSBjZW50ZXJlZCBhdCBjZW50ZXJYLGNlbnRlclkgd2l0aCBhIHJhZGl1cy48YnIvPklmIGZpbGxlZCBpcyA8aT50cnVlPC9pPiB0aGVuIGZpbGwgdGhlIHJlY3RhbmdsZSB3aXRoIHRoZSBjb2xvci48aHIvPmNpcmNsZShcInJlZFwiLCAxMDAsIDEwMCwgNTAsIHRydWUpOydcbiAgICB9LCB7XG4gICAgICAgIHRhYlRyaWdnZXI6ICdmaScsXG4gICAgICAgIG5hbWU6ICdmaWxsJyxcbiAgICAgICAgY29udGVudDogJ2ZpbGwoXFwnJHsxOmNvbG9yfVxcJyk7JyxcbiAgICAgICAgZG9jSFRNTDogJzxiPkZpbGwgdGhlIFNjcmVlbiBXaXRoIENvbG9yPC9iPjxoci8+ZmlsbChcIndoaXRlXCIpOydcbiAgICB9LCB7XG4gICAgICAgIHRhYlRyaWdnZXI6ICdsaScsXG4gICAgICAgIG5hbWU6ICdsaW5lJyxcbiAgICAgICAgY29udGVudDogJ2xpbmUoXFwnJHsxOmNvbG9yfVxcJywgJHsyOnN0YXJ0WH0sICR7MzpzdGFydFl9LCAkezQ6d2lkdGh9LCAkezU6aGVpZ2h0fSk7JyxcbiAgICAgICAgZG9jSFRNTDogJzxiPkRyYXcgYSBMaW5lPC9iPjxici8+RHJhdyBhIGxpbmUgc3RhcnRpbmcgYXQgc3RhcnRYLHN0YXJ0WSBhbmQgZW5kaW5nIGF0IHN0YXJ0WCt3aWR0aCxzdGFydFkraGVpZ2h0PGhyLz5saW5lKFwicmVkXCIsIDAsIDAsIDEwMCwgMTAwKTsnXG4gICAgfSwge1xuICAgICAgICB0YWJUcmlnZ2VyOiAncmUnLFxuICAgICAgICBuYW1lOiAncmVjdCcsXG4gICAgICAgIGNvbnRlbnQ6ICdyZWN0KFxcJyR7MTpjb2xvcn1cXCcsICR7MjpzdGFydFh9LCAkezM6c3RhcnRZfSwgJHs0OndpZHRofSwgJHs1OmhlaWdodH0sICR7NjpmaWxsZWR9KTsnLFxuICAgICAgICBkb2NIVE1MOiAnPGI+RHJhdyBhIFJlY3RhbmdsZTwvYj48YnIvPkRyYXcgYSByZWN0YW5nbGUgZnJvbSBzdGFydFgsc3RhcnRZIGFuZCBlbmRpbmcgYXQgc3RhcnRYK3dpZHRoLHN0YXJ0WStoZWlnaHQuPGJyLz5JZiBmaWxsZWQgaXMgPGk+dHJ1ZTwvaT4gdGhlbiBmaWxsIHRoZSByZWN0YW5nbGUgd2l0aCB0aGUgY29sb3IuPGhyLz5yZWN0KFwicmVkXCIsIDAsIDAsIDEwMCwgMTAwLCB0cnVlKTsnXG4gICAgfSwge1xuICAgICAgICB0YWJUcmlnZ2VyOiAnY2wnLFxuICAgICAgICBuYW1lOiAnY2xlYXInLFxuICAgICAgICBjb250ZW50OiAnY2xlYXIoKTsnLFxuICAgICAgICBjYXB0aW9uOiAnQ2xlYXIgdGhlIGNhbnZhcydcbiAgICB9XSk7XG5cbiAgICB2YXIgYmFzaWNTbmlwcGV0cyA9IFsnZm9yJywgJ2Z1bicsICd3aCcsICdpZicsICdzZXRUaW1lb3V0J107XG4gICAgdmFyIHJlZ2lzdGVyID0gc25pcHMucmVnaXN0ZXI7XG4gICAgc25pcHMucmVnaXN0ZXIgPSBmdW5jdGlvbiAoc25pcHBldHMsIHNjb3BlKSB7XG4gICAgICAgIHJlZ2lzdGVyLmNhbGwoc25pcHMsIHNuaXBwZXRzLmZpbHRlcihmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgaWYgKGJhc2ljU25pcHBldHMuaW5kZXhPZihzLnRhYlRyaWdnZXIpID49IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdJZ25vcmluZyBzbmlwcGV0Jywgcy50YWJUcmlnZ2VyLCBzY29wZSwgcyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pLCBzY29wZSk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGRvV2l0KCkge1xuICAgIHZhciBtaWMgPSBuZXcgV2l0Lk1pY3JvcGhvbmUoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaWNyb3Bob25lXCIpKTtcblxuICAgIG1pYy5vbnJlYWR5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIk1pY3JvcGhvbmUgaXMgcmVhZHkgdG8gcmVjb3JkXCIpO1xuICAgIH07XG4gICAgbWljLm9uYXVkaW9zdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRpbmcgc3RhcnRlZFwiKTtcbiAgICB9O1xuICAgIG1pYy5vbmF1ZGlvZW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGluZyBzdG9wcGVkLCBwcm9jZXNzaW5nIHN0YXJ0ZWRcIik7XG4gICAgfTtcbiAgICBtaWMub25yZXN1bHQgPSBmdW5jdGlvbiAoaW50ZW50LCBlbnRpdGllcykge1xuICAgICAgICBjb25zb2xlLmxvZyhpbnRlbnQsIGVudGl0aWVzKTtcbiAgICAgICAgdmFyIHIgPSBrdihcImludGVudFwiLCBpbnRlbnQpO1xuXG4gICAgICAgIGZvciAodmFyIGsgaW4gZW50aXRpZXMpIHtcbiAgICAgICAgICAgIHZhciBlID0gZW50aXRpZXNba107XG5cbiAgICAgICAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICByICs9IGt2KGssIGUudmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgciArPSBrdihrLCBlW2ldLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoX2pzTGlzdGVuZXJzW2ludGVudF0pIHtcbiAgICAgICAgICAgIF9qc0xpc3RlbmVyc1tpbnRlbnRdLmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgZm4oZW50aXRpZXMsIGludGVudCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVbmhhbmRsZWQgbWVzc2FnZScsIGludGVudCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIG1pYy5vbmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yOiBcIiArIGVycik7XG4gICAgfTtcbiAgICBtaWMub25jb25uZWN0aW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIk1pY3JvcGhvbmUgaXMgY29ubmVjdGluZ1wiKTtcbiAgICB9O1xuICAgIG1pYy5vbmRpc2Nvbm5lY3RlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJNaWNyb3Bob25lIGlzIG5vdCBjb25uZWN0ZWRcIik7XG4gICAgfTtcblxuICAgIG1pYy5jb25uZWN0KFwiSzVLRTVZTUsySlY1VzNMWTRNWlBSUExTNTdLNjJMS1ZcIik7XG4gICAgLy8gbWljLnN0YXJ0KCk7XG4gICAgLy8gbWljLnN0b3AoKTtcblxuICAgIGZ1bmN0aW9uIGt2KGssIHYpIHtcbiAgICAgICAgaWYgKHRvU3RyaW5nLmNhbGwodikgIT09IFwiW29iamVjdCBTdHJpbmddXCIpIHtcbiAgICAgICAgICAgIHYgPSBKU09OLnN0cmluZ2lmeSh2KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gayArIFwiPVwiICsgdiArIFwiXFxuXCI7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkb1NwZWVjaChwcmludCkge1xuICAgIGNvbnN0IFNwZWVjaFJlY29nbml0aW9uID0gd2luZG93LlNwZWVjaFJlY29nbml0aW9uIHx8IHdlYmtpdFNwZWVjaFJlY29nbml0aW9uO1xuICAgIGNvbnN0IFNwZWVjaEdyYW1tYXJMaXN0ID0gd2luZG93LlNwZWVjaEdyYW1tYXJMaXN0IHx8IHdlYmtpdFNwZWVjaEdyYW1tYXJMaXN0O1xuICAgIGNvbnN0IFNwZWVjaFJlY29nbml0aW9uRXZlbnQgPSB3aW5kb3cuU3BlZWNoUmVjb2duaXRpb25FdmVudCB8fCB3ZWJraXRTcGVlY2hSZWNvZ25pdGlvbkV2ZW50O1xuICAgIGxldCByZXN1bHRzO1xuXG4gICAgY29uc3QgcmVjb2duaXRpb24gPSBuZXcgU3BlZWNoUmVjb2duaXRpb24oKTtcbiAgICByZWNvZ25pdGlvbi5vbnJlc3VsdCA9IChldmVudCkgPT4ge1xuICAgICAgICBjb25zdCBsYXN0ID0gZXZlbnQucmVzdWx0cy5sZW5ndGggLSAxO1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGV2ZW50LnJlc3VsdHNbbGFzdF1bMF0udHJhbnNjcmlwdDtcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xuICAgICAgICBpZiAocmVzdWx0cykge1xuICAgICAgICAgICAgcmVzdWx0cyhyZXNwb25zZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmVjb2duaXRpb24ub25zcGVlY2hlbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlY29nbml0aW9uLnN0b3AoKTtcbiAgICB9XG5cbiAgICByZWNvZ25pdGlvbi5vbm5vbWF0Y2ggPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgcHJpbnQoJ1NheSB3aGF0IG5vdz8nKTtcbiAgICB9XG5cbiAgICByZWNvZ25pdGlvbi5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIG9jY3VycmVkIGluIHJlY29nbml0aW9uJywgZXZlbnQuZXJyb3IpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHN0YXJ0KGhhbmRsZXIpIHtcbiAgICAgICAgICAgIHJlc3VsdHMgPSBoYW5kbGVyO1xuICAgICAgICAgICAgcmVjb2duaXRpb24uc3RhcnQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgc3RvcCgpIHtcbiAgICAgICAgICAgIHJlY29nbml0aW9uLnN0b3AoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVjb2duaXRpb247XG59IiwiLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNCBBcm5lIEYuIENsYWFzc2VuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG5cbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG52YXIgSm9zaCA9IHdpbmRvd1tcIkpvc2hcIl0gfHwge307XG4oZnVuY3Rpb24ocm9vdCwgJCwgXykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gSm9zaC5TaGVsbCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XG5cbiAgICAgICAgLy8gaW5zdGFuY2UgZmllbGRzXG4gICAgICAgIHZhciBfY29uc29sZSA9IGNvbmZpZy5jb25zb2xlIHx8IChKb3NoLkRlYnVnICYmIHJvb3QuY29uc29sZSA/IHJvb3QuY29uc29sZSA6IHtcbiAgICAgICAgICAgICAgICBsb2c6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB2YXIgX25vRXZlbnRzID0gZmFsc2U7XG4gICAgICAgIHZhciBfcHJvbXB0ID0gY29uZmlnLnByb21wdCB8fCAnanNoJCc7XG4gICAgICAgIHZhciBfc2hlbGxfdmlld19pZCA9IGNvbmZpZy5zaGVsbF92aWV3X2lkIHx8ICdzaGVsbC12aWV3JztcbiAgICAgICAgdmFyIF9zaGVsbF9wYW5lbF9pZCA9IGNvbmZpZy5zaGVsbF9wYW5lbF9pZCB8fCAnc2hlbGwtcGFuZWwnO1xuICAgICAgICB2YXIgX2lucHV0X2lkID0gY29uZmlnLmlucHV0X2lkIHx8ICdzaGVsbC1jbGknO1xuICAgICAgICB2YXIgX2JsaW5rdGltZSA9IGNvbmZpZy5ibGlua3RpbWUgfHwgNTAwO1xuICAgICAgICB2YXIgX2hpc3RvcnkgPSBjb25maWcuaGlzdG9yeSB8fCBuZXcgSm9zaC5IaXN0b3J5KCk7XG4gICAgICAgIHZhciBfcmVhZGxpbmUgPSBjb25maWcucmVhZGxpbmUgfHwgbmV3IEpvc2guUmVhZExpbmUoe2hpc3Rvcnk6IF9oaXN0b3J5LCBjb25zb2xlOiBfY29uc29sZX0pO1xuICAgICAgICB2YXIgX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB2YXIgX2N1cnNvcl92aXNpYmxlID0gZmFsc2U7XG4gICAgICAgIHZhciBfYWN0aXZhdGlvbkhhbmRsZXI7XG4gICAgICAgIHZhciBfZGVhY3RpdmF0aW9uSGFuZGxlcjtcbiAgICAgICAgdmFyIF9jbWRIYW5kbGVycyA9IHtcbiAgICAgICAgICAgIF9kZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgZXhlYzogZnVuY3Rpb24oY21kLCBhcmdzLCBjYWxsYmFjaykge1xuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHNlbGYudGVtcGxhdGVzLmJhZF9jb21tYW5kKHtjbWQ6IGNtZH0pKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNvbXBsZXRpb246IGZ1bmN0aW9uKGNtZCwgYXJnLCBsaW5lLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICBpZighYXJnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmcgPSBjbWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHNlbGYuYmVzdE1hdGNoKGFyZywgc2VsZi5jb21tYW5kcygpKSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5wdXRfc2VhcmNoOiB7XG4gICAgICAgICAgICAgICAgZXhlYzogZnVuY3Rpb24gKGNtZCwgYXJncywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLnJ1bigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjbGVhcjoge1xuICAgICAgICAgICAgICAgIGV4ZWM6IGZ1bmN0aW9uIChjbWQsIGFyZ3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSkucGFyZW50KCkuZW1wdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHZhciBfbGluZSA9IHtcbiAgICAgICAgICAgIHRleHQ6ICcnLFxuICAgICAgICAgICAgY3Vyc29yOiAwXG4gICAgICAgIH07XG4gICAgICAgIHZhciBfc2VhcmNoTWF0Y2ggPSAnJztcbiAgICAgICAgdmFyIF92aWV3LCBfcGFuZWw7XG4gICAgICAgIHZhciBfcHJvbXB0SGFuZGxlcjtcbiAgICAgICAgdmFyIF9pbml0aWFsaXphdGlvbkhhbmRsZXI7XG4gICAgICAgIHZhciBfaW5pdGlhbGl6ZWQ7XG5cbiAgICAgICAgX3JlYWRsaW5lLmJpbmQoeydjaGFyJzogJ0wnLCBjdHJsS2V5OiB0cnVlfSwgJ2NsZWFyJyk7XG4gICAgICAgIF9yZWFkbGluZS5iaW5kKHsnY2hhcic6ICdSJywgY3RybEtleTogdHJ1ZX0sICdydW4nKTtcblxuICAgICAgICAvLyBwdWJsaWMgbWV0aG9kc1xuICAgICAgICB2YXIgc2VsZiA9IHtcbiAgICAgICAgICAgIGNvbW1hbmRzOiBjb21tYW5kcyxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIGhpc3Rvcnk6IF8udGVtcGxhdGUoXCI8ZGl2PjwlIF8uZWFjaChpdGVtcywgZnVuY3Rpb24oY21kLCBpKSB7ICU+PGRpdj48JS0gaSAlPiZuYnNwOzwlLSBjbWQgJT48L2Rpdj48JSB9KTsgJT48L2Rpdj5cIiksXG4gICAgICAgICAgICAgICAgaGVscDogXy50ZW1wbGF0ZShcIjxkaXY+PGRpdj48c3Ryb25nPkNvbW1hbmRzOjwvc3Ryb25nPjwvZGl2PjwlIF8uZWFjaChjb21tYW5kcywgZnVuY3Rpb24oY21kKSB7ICU+PGRpdj4mbmJzcDs8JS0gY21kICU+PC9kaXY+PCUgfSk7ICU+PC9kaXY+XCIpLFxuICAgICAgICAgICAgICAgIGJhZF9jb21tYW5kOiBfLnRlbXBsYXRlKCc8ZGl2PjxzdHJvbmc+VW5yZWNvZ25pemVkIGNvbW1hbmQ6Jm5ic3A7PC9zdHJvbmc+PCU9Y21kJT48L2Rpdj4nKSxcbiAgICAgICAgICAgICAgICBpbnB1dF9jbWQ6IF8udGVtcGxhdGUoJzxkaXYgaWQ9XCI8JS0gaWQgJT5cIiBjbGFzcz1cInByb21wdExpbmVcIj48c3BhbiBjbGFzcz1cInByb21wdFwiPjwvc3Bhbj48c3BhbiBjbGFzcz1cImlucHV0XCI+PHNwYW4gY2xhc3M9XCJsZWZ0XCIvPjxzcGFuIGNsYXNzPVwiY3Vyc29yXCIvPjxzcGFuIGNsYXNzPVwicmlnaHRcIi8+PC9zcGFuPjwvZGl2PicpLFxuICAgICAgICAgICAgICAgIHN1Z2dlc3Q6IF8udGVtcGxhdGUoXCI8ZGl2PjwlIF8uZWFjaChzdWdnZXN0aW9ucywgZnVuY3Rpb24oc3VnZ2VzdGlvbikgeyAlPjxkaXY+PCUtIHN1Z2dlc3Rpb24gJT48L2Rpdj48JSB9KTsgJT48L2Rpdj5cIilcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpc0FjdGl2ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9yZWFkbGluZS5pc0FjdGl2ZSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFjdGl2YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZigkKGlkKF9zaGVsbF92aWV3X2lkKSkubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF9saW5lLnRleHQgPSAnJztcbiAgICAgICAgICAgICAgICBfbGluZS5jdXJzb3IgPSAwO1xuICAgICAgICAgICAgICAgIF9ub0V2ZW50cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgX3JlYWRsaW5lLnNldExpbmUoX2xpbmUpO1xuICAgICAgICAgICAgICAgIF9ub0V2ZW50cyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIF9yZWFkbGluZS5hY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNsZWFyUHJvbXB0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgX2xpbmUgPSB7dGV4dDogJycsIGN1cnNvcjogMH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSkucGFyZW50KCkuZW1wdHkoKTtcbiAgICAgICAgICAgICAgICBzZWxmLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWFjdGl2YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBfY29uc29sZS5sb2coXCJkZWFjdGl2YXRpbmdcIik7XG4gICAgICAgICAgICAgICAgX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIF9yZWFkbGluZS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0Q29tbWFuZEhhbmRsZXI6IGZ1bmN0aW9uKGNtZCwgY21kSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9jbWRIYW5kbGVyc1tjbWRdID0gY21kSGFuZGxlcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRDb21tYW5kSGFuZGxlcjogZnVuY3Rpb24oY21kKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9jbWRIYW5kbGVyc1tjbWRdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldFByb21wdDogZnVuY3Rpb24ocHJvbXB0KSB7XG4gICAgICAgICAgICAgICAgX3Byb21wdCA9IHByb21wdDtcbiAgICAgICAgICAgICAgICBpZighX2FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbGYucmVmcmVzaCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRU9UOiBmdW5jdGlvbihjb21wbGV0aW9uSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9yZWFkbGluZS5vbkVPVChjb21wbGV0aW9uSGFuZGxlcik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DYW5jZWw6IGZ1bmN0aW9uKGNvbXBsZXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX3JlYWRsaW5lLm9uQ2FuY2VsKGNvbXBsZXRpb25IYW5kbGVyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkluaXRpYWxpemU6IGZ1bmN0aW9uKGNvbXBsZXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX2luaXRpYWxpemF0aW9uSGFuZGxlciA9IGNvbXBsZXRpb25IYW5kbGVyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQWN0aXZhdGU6IGZ1bmN0aW9uKGNvbXBsZXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX2FjdGl2YXRpb25IYW5kbGVyID0gY29tcGxldGlvbkhhbmRsZXI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25EZWFjdGl2YXRlOiBmdW5jdGlvbihjb21wbGV0aW9uSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9kZWFjdGl2YXRpb25IYW5kbGVyID0gY29tcGxldGlvbkhhbmRsZXI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25OZXdQcm9tcHQ6IGZ1bmN0aW9uKGNvbXBsZXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX3Byb21wdEhhbmRsZXIgPSBjb21wbGV0aW9uSGFuZGxlcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZW5kZXJPdXRwdXQ6IHJlbmRlck91dHB1dCxcbiAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRleHQgPSBfbGluZS50ZXh0IHx8ICcnO1xuICAgICAgICAgICAgICAgIF9jb25zb2xlLmxvZygnU3RhcnQgcmVuZGVyJywgdGV4dCk7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnNvcklkeCA9IF9saW5lLmN1cnNvciB8fCAwO1xuICAgICAgICAgICAgICAgIGlmKF9zZWFyY2hNYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3JJZHggPSBfc2VhcmNoTWF0Y2guY3Vyc29yaWR4IHx8IDA7XG4gICAgICAgICAgICAgICAgICAgIHRleHQgPSBfc2VhcmNoTWF0Y2gudGV4dCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpICsgJyAuc2VhcmNodGVybScpLnRleHQoX3NlYXJjaE1hdGNoLnRlcm0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgbGVmdCA9IF8uZXNjYXBlKHRleHQuc3Vic3RyKDAsIGN1cnNvcklkeCkpLnJlcGxhY2UoLyAvZywgJyZuYnNwOycpO1xuICAgICAgICAgICAgICAgIHZhciBjdXJzb3IgPSB0ZXh0LnN1YnN0cihjdXJzb3JJZHgsIDEpO1xuICAgICAgICAgICAgICAgIHZhciByaWdodCA9IF8uZXNjYXBlKHRleHQuc3Vic3RyKGN1cnNvcklkeCArIDEpKS5yZXBsYWNlKC8gL2csICcmbmJzcDsnKTtcbiAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkgKyAnIC5wcm9tcHQnKS5odG1sKF9wcm9tcHQpO1xuICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSArICcgLmlucHV0IC5sZWZ0JykuaHRtbChsZWZ0KTtcbiAgICAgICAgICAgICAgICBpZighY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSArICcgLmlucHV0IC5jdXJzb3InKS5odG1sKCcmbmJzcDsnKS5jc3MoJ3RleHREZWNvcmF0aW9uJywgJ3VuZGVybGluZScpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSArICcgLmlucHV0IC5jdXJzb3InKS50ZXh0KGN1cnNvcikuY3NzKCd0ZXh0RGVjb3JhdGlvbicsICd1bmRlcmxpbmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpICsgJyAuaW5wdXQgLnJpZ2h0JykuaHRtbChyaWdodCk7XG4gICAgICAgICAgICAgICAgX2N1cnNvcl92aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzZWxmLnNjcm9sbFRvQm90dG9tKCk7XG4gICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKCdyZW5kZXJlZCBcIicgKyB0ZXh0ICsgJ1wiIHcvIGN1cnNvciBhdCAnICsgY3Vyc29ySWR4KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWZyZXNoOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkpLnJlcGxhY2VXaXRoKHNlbGYudGVtcGxhdGVzLmlucHV0X2NtZCh7aWQ6X2lucHV0X2lkfSkpO1xuICAgICAgICAgICAgICAgIHNlbGYucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKCdyZWZyZXNoZWQgJyArIF9pbnB1dF9pZCk7XG5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzY3JvbGxUb0JvdHRvbTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgX3BhbmVsLmFuaW1hdGUoe3Njcm9sbFRvcDogX3ZpZXcuaGVpZ2h0KCl9LCAwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBiZXN0TWF0Y2g6IGZ1bmN0aW9uKHBhcnRpYWwsIHBvc3NpYmxlKSB7XG4gICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiYmVzdE1hdGNoIG9uIHBhcnRpYWwgJ1wiICsgcGFydGlhbCArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgICAgICBjb21wbGV0aW9uOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBzdWdnZXN0aW9uczogW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmKCFwb3NzaWJsZSB8fCBwb3NzaWJsZS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY29tbW9uID0gJyc7XG4gICAgICAgICAgICAgICAgaWYoIXBhcnRpYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYocG9zc2libGUubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb21wbGV0aW9uID0gcG9zc2libGVbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc3VnZ2VzdGlvbnMgPSBwb3NzaWJsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYoIV8uZXZlcnkocG9zc2libGUsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcG9zc2libGVbMF1bMF0gPT0geFswXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zdWdnZXN0aW9ucyA9IHBvc3NpYmxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcG9zc2libGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9wdGlvbiA9IHBvc3NpYmxlW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZihvcHRpb24uc2xpY2UoMCwgcGFydGlhbC5sZW5ndGgpID09IHBhcnRpYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zdWdnZXN0aW9ucy5wdXNoKG9wdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZighY29tbW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbW9uID0gb3B0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImluaXRpYWwgY29tbW9uOlwiICsgY29tbW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZihvcHRpb24uc2xpY2UoMCwgY29tbW9uLmxlbmd0aCkgIT0gY29tbW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiZmluZCBjb21tb24gc3RlbSBmb3IgJ1wiICsgY29tbW9uICsgXCInIGFuZCAnXCIgKyBvcHRpb24gKyBcIidcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGogPSBwYXJ0aWFsLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZShqIDwgY29tbW9uLmxlbmd0aCAmJiBqIDwgb3B0aW9uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjb21tb25bal0gIT0gb3B0aW9uW2pdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tb24gPSBjb21tb24uc3Vic3RyKDAsIGopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQuY29tcGxldGlvbiA9IGNvbW1vbi5zdWJzdHIocGFydGlhbC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gaWQoaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBcIiNcIitpZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNvbW1hbmRzKCkge1xuICAgICAgICAgICAgcmV0dXJuIF8uY2hhaW4oX2NtZEhhbmRsZXJzKS5rZXlzKCkuZmlsdGVyKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geFswXSAhPSBcIl9cIlxuICAgICAgICAgICAgfSkudmFsdWUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGJsaW5rQ3Vyc29yKCkge1xuICAgICAgICAgICAgaWYoIV9hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByb290LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYoIV9hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBfY3Vyc29yX3Zpc2libGUgPSAhX2N1cnNvcl92aXNpYmxlO1xuICAgICAgICAgICAgICAgIGlmKF9jdXJzb3JfdmlzaWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkgKyAnIC5pbnB1dCAuY3Vyc29yJykuY3NzKCd0ZXh0RGVjb3JhdGlvbicsICd1bmRlcmxpbmUnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkgKyAnIC5pbnB1dCAuY3Vyc29yJykuY3NzKCd0ZXh0RGVjb3JhdGlvbicsICcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYmxpbmtDdXJzb3IoKTtcbiAgICAgICAgICAgIH0sIF9ibGlua3RpbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3BsaXQoc3RyKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5maWx0ZXIoc3RyLnNwbGl0KC9cXHMrLyksIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0SGFuZGxlcihjbWQpIHtcbiAgICAgICAgICAgIHJldHVybiBfY21kSGFuZGxlcnNbY21kXSB8fCBfY21kSGFuZGxlcnMuX2RlZmF1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW5kZXJPdXRwdXQob3V0cHV0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgJCgnLnByb21wdExpbmU6aGFzKHNwYW4uaW5wdXQ6ZW1wdHkpJykuaGVpZ2h0KDApO1xuICAgICAgICAgICAgaWYob3V0cHV0KSB7XG4gICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpKS5hZnRlcihvdXRwdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpICsgJyAuaW5wdXQgLmN1cnNvcicpLmNzcygndGV4dERlY29yYXRpb24nLCAnJyk7XG4gICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkpLnJlbW92ZUF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAkKGlkKF9zaGVsbF92aWV3X2lkKSkuYXBwZW5kKHNlbGYudGVtcGxhdGVzLmlucHV0X2NtZCh7aWQ6X2lucHV0X2lkfSkpO1xuICAgICAgICAgICAgaWYoX3Byb21wdEhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX3Byb21wdEhhbmRsZXIoZnVuY3Rpb24ocHJvbXB0KSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0UHJvbXB0KHByb21wdCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbiAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImFjdGl2YXRpbmcgc2hlbGxcIik7XG4gICAgICAgICAgICBpZighX3ZpZXcpIHtcbiAgICAgICAgICAgICAgICBfdmlldyA9ICQoaWQoX3NoZWxsX3ZpZXdfaWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKCFfcGFuZWwpIHtcbiAgICAgICAgICAgICAgICBfcGFuZWwgPSAkKGlkKF9zaGVsbF9wYW5lbF9pZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoJChpZChfaW5wdXRfaWQpKS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgIF92aWV3LmFwcGVuZChzZWxmLnRlbXBsYXRlcy5pbnB1dF9jbWQoe2lkOl9pbnB1dF9pZH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlbGYucmVmcmVzaCgpO1xuICAgICAgICAgICAgX2FjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICBibGlua0N1cnNvcigpO1xuICAgICAgICAgICAgaWYoX3Byb21wdEhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBfcHJvbXB0SGFuZGxlcihmdW5jdGlvbihwcm9tcHQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXRQcm9tcHQocHJvbXB0KTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoX2FjdGl2YXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX2FjdGl2YXRpb25IYW5kbGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpbml0XG4gICAgICAgIF9yZWFkbGluZS5vbkFjdGl2YXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYoIV9pbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgIF9pbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYoX2luaXRpYWxpemF0aW9uSGFuZGxlcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX2luaXRpYWxpemF0aW9uSGFuZGxlcihhY3RpdmF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFjdGl2YXRlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBfcmVhZGxpbmUub25EZWFjdGl2YXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYoX2RlYWN0aXZhdGlvbkhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBfZGVhY3RpdmF0aW9uSGFuZGxlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgX3JlYWRsaW5lLm9uQ2hhbmdlKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIGlmICghX25vRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgX2xpbmUgPSBsaW5lO1xuICAgICAgICAgICAgICAgIHNlbGYucmVuZGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBfcmVhZGxpbmUub25DbGVhcihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF9jbWRIYW5kbGVycy5jbGVhci5leGVjKG51bGwsIG51bGwsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJlbmRlck91dHB1dChudWxsLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgX3JlYWRsaW5lLm9uUnVuKGNvbmZpZy5ydW4pO1xuICAgICAgICBfcmVhZGxpbmUub25TZWFyY2hTdGFydChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSkucmVwbGFjZVdpdGgoc2VsZi50ZW1wbGF0ZXMuaW5wdXRfc2VhcmNoKHtpZDpfaW5wdXRfaWR9KSk7XG4gICAgICAgICAgICBfY29uc29sZS5sb2coJ3N0YXJ0ZWQgc2VhcmNoJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBfcmVhZGxpbmUub25TZWFyY2hFbmQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkpLnJlcGxhY2VXaXRoKHNlbGYudGVtcGxhdGVzLmlucHV0X2NtZCh7aWQ6X2lucHV0X2lkfSkpO1xuICAgICAgICAgICAgX3NlYXJjaE1hdGNoID0gbnVsbDtcbiAgICAgICAgICAgIHNlbGYucmVuZGVyKCk7XG4gICAgICAgICAgICBfY29uc29sZS5sb2coXCJlbmRlZCBzZWFyY2hcIik7XG4gICAgICAgIH0pO1xuICAgICAgICBfcmVhZGxpbmUub25TZWFyY2hDaGFuZ2UoZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgICAgICAgIF9zZWFyY2hNYXRjaCA9IG1hdGNoO1xuICAgICAgICAgICAgc2VsZi5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIF9yZWFkbGluZS5vbkVudGVyKGZ1bmN0aW9uKGNtZHRleHQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBfY29uc29sZS5sb2coXCJnb3QgY29tbWFuZDogXCIgKyBjbWR0ZXh0KTtcbiAgICAgICAgICAgIGNtZHRleHQgPSBjb25maWcub25Db21tYW5kKGNtZHRleHQpID09PSBmYWxzZSA/ICcnIDogY21kdGV4dDtcbiAgICAgICAgICAgIGNhbGxiYWNrKGNtZHRleHQpO1xuICAgICAgICB9KTtcbiAgICAgICAgX3JlYWRsaW5lLm9uQ29tcGxldGlvbihmdW5jdGlvbihsaW5lLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYoIWxpbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB0ZXh0ID0gbGluZS50ZXh0LnN1YnN0cigwLCBsaW5lLmN1cnNvcik7XG4gICAgICAgICAgICB2YXIgcGFydHMgPSBzcGxpdCh0ZXh0KTtcblxuICAgICAgICAgICAgdmFyIGNtZCA9IHBhcnRzLnNoaWZ0KCkgfHwgJyc7XG4gICAgICAgICAgICB2YXIgYXJnID0gcGFydHMucG9wKCkgfHwgJyc7XG4gICAgICAgICAgICBfY29uc29sZS5sb2coXCJnZXR0aW5nIGNvbXBsZXRpb24gaGFuZGxlciBmb3IgXCIgKyBjbWQpO1xuICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBnZXRIYW5kbGVyKGNtZCk7XG4gICAgICAgICAgICBpZihoYW5kbGVyICE9IF9jbWRIYW5kbGVycy5fZGVmYXVsdCAmJiBjbWQgJiYgY21kID09IHRleHQpIHtcblxuICAgICAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcInZhbGlkIGNtZCwgbm8gYXJnczogYXBwZW5kIHNwYWNlXCIpO1xuICAgICAgICAgICAgICAgIC8vIHRoZSB0ZXh0IHRvIGNvbXBsZXRlIGlzIGp1c3QgYSB2YWxpZCBjb21tYW5kLCBhcHBlbmQgYSBzcGFjZVxuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygnICcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoIWhhbmRsZXIuY29tcGxldGlvbikge1xuICAgICAgICAgICAgICAgIC8vIGhhbmRsZXIgaGFzIG5vIGNvbXBsZXRpb24gZnVuY3Rpb24sIHNvIHdlIGNhbid0IGNvbXBsZXRlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfY29uc29sZS5sb2coXCJjYWxsaW5nIGNvbXBsZXRpb24gaGFuZGxlciBmb3IgXCIgKyBjbWQpO1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXIuY29tcGxldGlvbihjbWQsIGFyZywgbGluZSwgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgICAgICAgICAgICBfY29uc29sZS5sb2coXCJjb21wbGV0aW9uOiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoKSk7XG4gICAgICAgICAgICAgICAgaWYoIW1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZihtYXRjaC5zdWdnZXN0aW9ucyAmJiBtYXRjaC5zdWdnZXN0aW9ucy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZW5kZXJPdXRwdXQoc2VsZi50ZW1wbGF0ZXMuc3VnZ2VzdCh7c3VnZ2VzdGlvbnM6IG1hdGNoLnN1Z2dlc3Rpb25zfSksIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobWF0Y2guY29tcGxldGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobWF0Y2guY29tcGxldGlvbik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgIH1cbn0pKHdpbmRvdywgJCwgXyk7XG4iXX0=
