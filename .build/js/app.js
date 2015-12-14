(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var JsOutput = require('./jsOutput'),
    _jsListeners = {},
    canvas,
    socket;

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
        this.blur();
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
    $('#editorRow').height(Math.floor(totalHeight / 2));
    $('#consoleRow').height(Math.floor(totalHeight / 2));
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
            console.log('Ignoring snippet', s.tabTrigger, scope, s);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9rcmFrZW4tZGV2dG9vbHMtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21tZXRyYWwvZGV2L2dhbWVzL2FkdmVudC5qcy9wdWJsaWMvanMvYXBwLmpzIiwiL1VzZXJzL21tZXRyYWwvZGV2L2dhbWVzL2FkdmVudC5qcy9wdWJsaWMvanMvanNPdXRwdXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcDNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIEpzT3V0cHV0ID0gcmVxdWlyZSgnLi9qc091dHB1dCcpLFxuICAgIF9qc0xpc3RlbmVycyA9IHt9LFxuICAgIGNhbnZhcyxcbiAgICBzb2NrZXQ7XG5cbmlmIChwYWdlID09PSAnY29uc29sZUdhbWUnKSB7XG4gICAgJChjb25zb2xlR2FtZVBhZ2UpO1xufSBlbHNlIGlmIChwYWdlID09PSAnY2FudmFzJykge1xuICAgICQoY2FudmFzUGFnZSk7XG59IGVsc2UgaWYgKHBhZ2UgPT09ICdsb2dpblBhZ2UnKSB7XG4gICAgJChsb2dpblBhZ2UpO1xufSBlbHNlIGlmIChwYWdlID09PSAnbWluZWNyYWZ0Jykge1xuICAgICQobWluZWNyYWZ0KTtcbn0gZWxzZSBpZiAocGFnZSA9PT0gJ2dhbWUnKSB7XG4gICAgJChnYW1lKTtcbn0gZWxzZSBpZiAocGFnZSA9PT0gJ3NjcmF0Y2hjcmFmdCcpIHtcbiAgICAkKHNjcmF0Y2hjcmFmdCk7XG59XG5cbmZ1bmN0aW9uIGxvZ2luUGFnZSgpIHtcbiAgICAkKFwiI2xvZ2luIGJ1dHRvblwiKS5jbGljayhmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IFwiL2xvZ2luXCIsXG4gICAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIF9jc3JmOiBfY3NyZixcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogJChcImlucHV0W25hbWU9dXNlcm5hbWVdXCIpLnZhbCgpLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkOiAkKFwiaW5wdXRbbmFtZT1wYXNzd29yZF1cIikudmFsKClcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiTG9naW4gZmFpbGVkISBcIiArIHJlc3BvbnNlLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5sb2NhdGlvbiA9ICcvficgKyByZXNwb25zZS5wcm9maWxlLm5hbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGFsZXJ0KFwiTG9naW4gZmFpbGVkISBcIiArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBtaW5lY3JhZnQoKSB7XG4gICAgc2l6ZXIoKTtcbiAgICAkKHdpbmRvdykucmVzaXplKHNpemVyKTtcblxuICAgIHZhciB0b29scyA9IGFjZS5yZXF1aXJlKFwiYWNlL2V4dC9sYW5ndWFnZV90b29sc1wiKTtcbiAgICB2YXIgZWRpdG9yID0gYWNlLmVkaXQoJ2VkaXRvcicpO1xuICAgIGVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICBlZGl0b3IuZ2V0U2Vzc2lvbigpLnNldE1vZGUoJ2FjZS9tb2RlL2phdmFzY3JpcHQnKTtcbiAgICBlZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgIGVuYWJsZUJhc2ljQXV0b2NvbXBsZXRpb246IHRydWVcbiAgICB9KTtcblxuICAgICQoJyNzYXZlJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgdXJsOiBcIi9zYXZlXCIsXG4gICAgICAgICAgICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIF9jc3JmOiBfY3NyZixcbiAgICAgICAgICAgICAgICBjb250ZW50OiBlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKClcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiU2F2ZSBmYWlsZWQhIFwiICsgcmVzcG9uc2UuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBhbGVydChcIlNhdmUgZmFpbGVkISBcIiArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnYW1lKCkge1xuICAgIHZhciBwbGF5ZXJzID0ge30sIG15TmFtZSwgY3VycmVudCwganNPdXRwdXQsIGpzQ29uZmlnLCBsZWZ0VmFsdWUsIHJpZ2h0VmFsdWUsIGN1ck9wRm47XG5cbiAgICBzb2NrZXQgPSBpbygpO1xuICAgICQoJyNsb2dpbiAudXNlcm5hbWVJbnB1dCcpLmZvY3VzKCk7XG4gICAgJCgnI3lvdXJOdW1iZXInKS5oaWRlKCk7XG5cbiAgICBmdW5jdGlvbiBnb0dhbWUoKSB7XG4gICAgICAgIHNvY2tldC5lbWl0KCdwbGF5ZXInLCB7bmFtZTogbXlOYW1lfSk7XG5cbiAgICAgICAganNDb25maWcgPSB7XG4gICAgICAgICAgICBjb25zb2xlOiBjb25zb2xlLFxuICAgICAgICAgICAgb25Db21tYW5kOiBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICAgICAgICAgIHNvY2tldC5lbWl0KCdjaGF0Jywge25hbWU6IG15TmFtZSwgdGV4dDogbGluZX0pO1xuICAgICAgICAgICAgICAgIGpzT3V0cHV0LmNsZWFyUHJvbXB0KCk7XG4gICAgICAgICAgICAgICAganNPdXRwdXQucmVuZGVyT3V0cHV0KG15TmFtZSArICc6ICcgKyBsaW5lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBqc091dHB1dCA9IG5ldyBKc091dHB1dChqc0NvbmZpZyk7XG4gICAgICAgIGpzT3V0cHV0Ll9jb25maWcgPSBqc0NvbmZpZztcblxuICAgICAgICB2YXIgcHJvbXB0ZWQgPSBmYWxzZTtcbiAgICAgICAganNPdXRwdXQub25OZXdQcm9tcHQoZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpZiAoIXByb21wdGVkKSB7XG4gICAgICAgICAgICAgICAgcHJvbXB0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygnV2VsY29tZSB0byB0aGUgZ2FtZSEgQ2hhdCB3aXRoIG90aGVyIHBsYXllcnMgaGVyZS4gQmUgcmVzcGVjdGZ1bC48YnIvPj4gJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsYmFjaygnPiAnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAganNPdXRwdXQuYWN0aXZhdGUoKTtcbiAgICB9XG5cbiAgICBpZiAod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdnYW1ldXNlcicpKSB7XG4gICAgICAgIG15TmFtZSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZ2FtZXVzZXInKTtcbiAgICAgICAgcGxheWVyc1tteU5hbWVdID0ge25hbWU6IG15TmFtZX07XG4gICAgICAgIGdvR2FtZSgpO1xuICAgICAgICAkKCcjbG9naW4nKS5oaWRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgJCh3aW5kb3cpLmtleWRvd24oZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAobXlOYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRvLWZvY3VzIHRoZSBjdXJyZW50IGlucHV0IHdoZW4gYSBrZXkgaXMgdHlwZWRcbiAgICAgICAgICAgIGlmICghKGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQubWV0YUtleSB8fCBldmVudC5hbHRLZXkpKSB7XG4gICAgICAgICAgICAgICAgJCgnI2xvZ2luIC51c2VybmFtZUlucHV0JykuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFdoZW4gdGhlIGNsaWVudCBoaXRzIEVOVEVSIG9uIHRoZWlyIGtleWJvYXJkXG4gICAgICAgICAgICBpZiAoZXZlbnQud2hpY2ggPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgbXlOYW1lID0gJCgnI2xvZ2luIC51c2VybmFtZUlucHV0JykudmFsKCk7XG4gICAgICAgICAgICAgICAgc29ja2V0LmVtaXQoJ3BsYXllcicsIHtuYW1lOiBteU5hbWV9KTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2dhbWV1c2VyJywgbXlOYW1lKTtcbiAgICAgICAgICAgICAgICBnb0dhbWUoKTtcbiAgICAgICAgICAgICAgICAkKCcjbG9naW4nKS5mYWRlT3V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHNvY2tldC5vbigncGxheWVyJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1BMQVlFUicsIGRhdGEpO1xuICAgICAgICBzb2NrZXQuZW1pdCgncGxheWVyUmVzcG9uc2UnLCB7bmFtZTogbXlOYW1lfSk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ3BsYXllclJlc3BvbnNlJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgaWYgKCFwbGF5ZXJzW2RhdGEubmFtZV0pIHtcbiAgICAgICAgICAgIGpzT3V0cHV0LnJlbmRlck91dHB1dCgnTmV3IFBsYXllciEgJyArIGRhdGEubmFtZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBwbGF5ZXJzW2RhdGEubmFtZV0gPSB7fTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCduZXcgcGxheWVyJywgZGF0YSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBzZXR1cEdhbWUgPSBmdW5jdGlvbiAocCkge1xuICAgICAgICBjdXJyZW50ID0gcDtcbiAgICAgICAgJCgnI3RndCcpLnRleHQocC50YXJnZXQpO1xuICAgICAgICAkKCcjZ2FtZVN0YXJ0JykuaGlkZSgpO1xuICAgICAgICAkKCcjeW91ck51bWJlciBzcGFuJykudGV4dChwLnBsYXllcnNbbXlOYW1lXS5udW1iZXIpO1xuICAgICAgICAkKCcjeW91ck51bWJlcicpLmZhZGVJbigpO1xuICAgIH07XG5cbiAgICBzb2NrZXQub24oJ25ld0dhbWUnLCBzZXR1cEdhbWUpO1xuXG4gICAgc29ja2V0Lm9uKCd3aW4nLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBhbGVydChkLm5hbWUgKyAnIGhhcyB3b24uJyk7XG4gICAgfSk7XG5cbiAgICAkKCcjb3AnKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoJyNvcENob2ljZScpLmZhZGVJbigpO1xuICAgIH0pO1xuXG4gICAgJCgnI29wQ2hvaWNlIGJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9wID0gJCh0aGlzKS50ZXh0KCk7XG4gICAgICAgICQoJyNvcCcpLnRleHQob3ApO1xuICAgICAgICAkKCcjb3BDaG9pY2UnKS5oaWRlKCk7XG4gICAgICAgIGlmIChvcCA9PT0gJysnKSB7XG4gICAgICAgICAgICBjdXJPcEZuID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geCArIHk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKG9wID09PSAnw5cnKSB7XG4gICAgICAgICAgICBjdXJPcEZuID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geCAqIHk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKG9wID09PSAnLScpIHtcbiAgICAgICAgICAgIGN1ck9wRm4gPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4IC0geTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgY2hlY2tSZXN1bHQoKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGNoZWNrUmVzdWx0KCkge1xuICAgICAgICBpZiAoY3VyT3BGbiAmJiBsZWZ0VmFsdWUgJiYgcmlnaHRWYWx1ZSAmJiBjdXJPcEZuKGxlZnRWYWx1ZSwgcmlnaHRWYWx1ZSkgPT0gY3VycmVudC50YXJnZXQpIHtcbiAgICAgICAgICAgIHNvY2tldC5lbWl0KCd3aW4nLCB7bmFtZTogbXlOYW1lfSk7XG4gICAgICAgICAgICBhbGVydCgnWU9VIFdJTicpO1xuICAgICAgICAgICAgJCgnI2dhbWVTdGFydCcpLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICB9XG4gICAgfVxuXG4gICAgJCgnI2l0ZW0xJykuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIWN1cnJlbnQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkKCcjdDFDaG9pY2UnKS5odG1sKCcnKTtcbiAgICAgICAgZm9yICh2YXIgcG4gaW4gY3VycmVudC5wbGF5ZXJzKSB7XG4gICAgICAgICAgICB2YXIgayA9ICQoJzxidXR0b24vPicpLmFkZENsYXNzKCdidG4gYnRuLWxnJykudGV4dChwbiArICcgJyArIGN1cnJlbnQucGxheWVyc1twbl0ubnVtYmVyKTtcbiAgICAgICAgICAgICQoJyN0MUNob2ljZScpLmFwcGVuZChrKTtcbiAgICAgICAgICAgIGsuZGF0YSgncGxheWVyJywgcG4pO1xuICAgICAgICB9XG4gICAgICAgICQoJyN0MUNob2ljZSBidXR0b24nKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcCA9IGN1cnJlbnQucGxheWVyc1skKHRoaXMpLmRhdGEoJ3BsYXllcicpXTtcbiAgICAgICAgICAgICQoJyNpdGVtMScpLnRleHQocC5udW1iZXIpO1xuICAgICAgICAgICAgJCgnI3QxQ2hvaWNlJykuaGlkZSgpO1xuICAgICAgICAgICAgbGVmdFZhbHVlID0gcC5udW1iZXI7XG4gICAgICAgICAgICBjaGVja1Jlc3VsdCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjdDFDaG9pY2UnKS5mYWRlSW4oKTtcbiAgICB9KTtcblxuICAgICQoJyNpdGVtMicpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFjdXJyZW50KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJCgnI3QyQ2hvaWNlJykuaHRtbCgnJyk7XG4gICAgICAgIGZvciAodmFyIHBuIGluIGN1cnJlbnQucGxheWVycykge1xuICAgICAgICAgICAgdmFyIGsgPSAkKCc8YnV0dG9uLz4nKS5hZGRDbGFzcygnYnRuIGJ0bi1sZycpLnRleHQocG4gKyAnICcgKyBjdXJyZW50LnBsYXllcnNbcG5dLm51bWJlcik7XG4gICAgICAgICAgICAkKCcjdDJDaG9pY2UnKS5hcHBlbmQoayk7XG4gICAgICAgICAgICBrLmRhdGEoJ3BsYXllcicsIHBuKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcjdDJDaG9pY2UgYnV0dG9uJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHAgPSBjdXJyZW50LnBsYXllcnNbJCh0aGlzKS5kYXRhKCdwbGF5ZXInKV07XG4gICAgICAgICAgICAkKCcjaXRlbTInKS50ZXh0KHAubnVtYmVyKTtcbiAgICAgICAgICAgICQoJyN0MkNob2ljZScpLmhpZGUoKTtcbiAgICAgICAgICAgIHJpZ2h0VmFsdWUgPSBwLm51bWJlcjtcbiAgICAgICAgICAgIGNoZWNrUmVzdWx0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyN0MkNob2ljZScpLmZhZGVJbigpO1xuICAgIH0pO1xuXG4gICAgJCgnI2dhbWVTdGFydCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhhbmQgPSBkZWFsKHBsYXllcnMpO1xuICAgICAgICBzb2NrZXQuZW1pdCgnbmV3R2FtZScsIGhhbmQpO1xuICAgICAgICBzZXR1cEdhbWUoaGFuZCk7XG4gICAgICAgICQoJyNnYW1lU3RhcnQnKS5oaWRlKCk7XG4gICAgICAgICQoJyN5b3VyTnVtYmVyJykuZmFkZUluKCk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBjb25zb2xlU2l6ZXIoKSB7XG4gICAgICAgIHZhciB0b3RhbEhlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKTtcbiAgICAgICAgJCgnI2NvbnNvbGVSb3cnKS5oZWlnaHQodG90YWxIZWlnaHQgLSAzMDApO1xuICAgIH1cblxuICAgIGNvbnNvbGVTaXplcigpO1xuICAgICQod2luZG93KS5yZXNpemUoY29uc29sZVNpemVyKTtcblxuICAgIHNvY2tldC5vbignY2hhdCcsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdDSEFUJywgZGF0YSk7XG4gICAgICAgIGpzT3V0cHV0LnJlbmRlck91dHB1dChkYXRhLm5hbWUgKyAnOiAnICsgZGF0YS50ZXh0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG59XG5cbmZ1bmN0aW9uIGNvbnNvbGVHYW1lUGFnZSgpIHtcblxuICAgIHNvY2tldCA9IGlvKCk7XG4gICAgdmFyIGFwcE5hbWUgPSBkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHJpbmcoMSk7XG5cbiAgICBpZiAod2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMSkuaW5kZXhPZihcInA9XCIpID09PSAwKSB7XG4gICAgICAgIHZhciBwcm9nID0gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMykuc3BsaXQoJyYnKVswXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHByb2cgPSBMWlN0cmluZy5kZWNvbXByZXNzRnJvbUVuY29kZWRVUklDb21wb25lbnQocHJvZyk7XG4gICAgICAgICAgICAkKCcjZWRpdG9yJykudGV4dChwcm9nKTtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIHdhcyBhIHByb2dyYW0gbGluaywga2VlcCBsb2NhbCBjaGFuZ2VzXG4gICAgICAgICAgICBhcHBOYW1lID0gc2hhMShwcm9nKTtcbiAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgLy8gV2Fzbid0IGEgcHJvZ3JhbSBpbiB0aGUgbGluay4uLlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGpzQ29uZmlnID0ge1xuICAgICAgICBvbkNvbW1hbmQ6IGxvZ2dlcklucHV0LFxuICAgICAgICBjb25zb2xlOiBjb25zb2xlLFxuICAgICAgICBydW46IHJ1blxuICAgIH07XG4gICAgdmFyIGpzT3V0cHV0ID0gbmV3IEpzT3V0cHV0KGpzQ29uZmlnKTtcbiAgICBqc091dHB1dC5fY29uZmlnID0ganNDb25maWc7XG5cbiAgICBzaXplcigpO1xuICAgICQod2luZG93KS5yZXNpemUoc2l6ZXIpO1xuXG4gICAgdmFyIHByb21wdGVkID0gZmFsc2U7XG4gICAganNPdXRwdXQub25OZXdQcm9tcHQoZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghcHJvbXB0ZWQpIHtcbiAgICAgICAgICAgIHByb21wdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygnVGhlIG91dHB1dCBvZiB5b3VyIHByb2dyYW0gd2lsbCBhcHBlYXIgaGVyZS4nKTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjaygnJyk7XG4gICAgfSk7XG5cbiAgICBpZiAod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjb2RlJyArIGFwcE5hbWUpKSB7XG4gICAgICAgICQoJyNlZGl0b3InKS50ZXh0KHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY29kZScgKyBhcHBOYW1lKSk7XG4gICAgfVxuXG4gICAgYWNlLnJlcXVpcmUoXCJhY2UvZXh0L2xhbmd1YWdlX3Rvb2xzXCIpO1xuICAgIHZhciBlZGl0b3IgPSBhY2UuZWRpdCgnZWRpdG9yJyk7XG4gICAgZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgIGVkaXRvci5nZXRTZXNzaW9uKCkuc2V0TW9kZSgnYWNlL21vZGUvamF2YXNjcmlwdCcpO1xuICAgIGVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgZW5hYmxlU25pcHBldHM6IHRydWUsXG4gICAgICAgIGVuYWJsZUxpdmVBdXRvY29tcGxldGlvbjogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQmFzaWNBdXRvY29tcGxldGlvbjogdHJ1ZVxuICAgIH0pO1xuICAgIGNvbnNvbGVDb21wbGV0ZXMoYWNlLnJlcXVpcmUoXCJhY2Uvc25pcHBldHNcIikuc25pcHBldE1hbmFnZXIpO1xuXG4gICAgZWRpdG9yLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY29kZScgKyBhcHBOYW1lLCBlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCkpO1xuICAgICAgICBpZiAoJCgnI2F1dG9SdW4nKS5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcnVuKCk7XG4gICAgICAgICAgICB9IGNhdGNoICh4KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGVkaXRvci5vbignZm9jdXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGpzT3V0cHV0LmRlYWN0aXZhdGUoKTtcbiAgICB9KTtcblxuICAgIGVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kKHtcbiAgICAgICAgbmFtZTogJ1J1bicsXG4gICAgICAgIGJpbmRLZXk6ICdDdHJsLVInLFxuICAgICAgICBleGVjOiBmdW5jdGlvbiAoZWRpdG9yKSB7XG4gICAgICAgICAgICBydW4oKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kKHtcbiAgICAgICAgbmFtZTogJ0NsZWFyJyxcbiAgICAgICAgYmluZEtleTogJ0N0cmwtTCcsXG4gICAgICAgIGV4ZWM6IGZ1bmN0aW9uIChlZGl0b3IpIHtcbiAgICAgICAgICAgIGpzT3V0cHV0LmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICAkKCcjcnVuJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLmJsdXIoKTtcbiAgICAgICAgcnVuKCk7XG4gICAgfSk7XG4gICAgJCgnI2NsZWFyJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBqc091dHB1dC5jbGVhcigpO1xuICAgICAgICBqc091dHB1dC5yZW5kZXJPdXRwdXQoJz4nLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgJCgnI3NoYXJlJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYuc3BsaXQoJz8nKVswXTtcbiAgICAgICAgdmFyIGVuYyA9IExaU3RyaW5nLmNvbXByZXNzVG9FbmNvZGVkVVJJQ29tcG9uZW50KGVkaXRvci5nZXRTZXNzaW9uKCkuZ2V0VmFsdWUoKSk7XG4gICAgICAgICQoJyN1cmxNb2RhbCB0ZXh0YXJlYScpLnZhbCh1cmwgKyAnP3A9JyArIGVuYyk7XG4gICAgICAgICQoJyN1cmxNb2RhbCcpLm1vZGFsKCk7XG4gICAgfSk7XG5cbiAgICB2YXIgY29udGV4dCA9IGNsb3N1cmUoc29ja2V0LCBlZGl0b3IsIGpzT3V0cHV0KTtcblxuICAgIHNvY2tldC5vbignY2hhdCcsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChfanNMaXN0ZW5lcnNbbS5jb250ZW50LnR5cGVdKSB7XG4gICAgICAgICAgICBfanNMaXN0ZW5lcnNbbS5jb250ZW50LnR5cGVdLmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgZm4obS5jb250ZW50Lm1lc3NhZ2UsIG0uc291cmNlLCBtLmNvbnRlbnQudHlwZSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVbmhhbmRsZWQgbWVzc2FnZScsIG0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAkKCcjY29weXByb2cnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNvY2tldC5lbWl0KCdzaGFyZScsIHtcbiAgICAgICAgICAgIGNvZGU6IGVkaXRvci5nZXRTZXNzaW9uKCkuZ2V0VmFsdWUoKSxcbiAgICAgICAgICAgIHR5cGU6ICdjb25zb2xlJ1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBzaGFyZVByb2c7XG4gICAgc29ja2V0Lm9uKCdzaGFyZScsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChtLmNvbnRlbnQudHlwZSA9PT0gJ2NvbnNvbGUnKSB7XG4gICAgICAgICAgICAkKCcjZ2V0cHJvZycpLmZhZGVJbigpO1xuICAgICAgICAgICAgc2hhcmVQcm9nID0gbS5jb250ZW50LmNvZGU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgICQoJyNnZXRwcm9nJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBlZGl0b3IuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKHNoYXJlUHJvZyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBydW4oY29kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgX2pzTGlzdGVuZXJzID0ge307XG4gICAgICAgICAgICBjb250ZXh0KGNvZGUgfHwgZWRpdG9yLmdldFNlc3Npb24oKS5nZXRWYWx1ZSgpKTtcbiAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgdmFyIHRyYWNlO1xuICAgICAgICAgICAgaWYgKHdpbmRvd1tcInByaW50U3RhY2tUcmFjZVwiXSkge1xuICAgICAgICAgICAgICAgIHRyYWNlID0gcHJpbnRTdGFja1RyYWNlKHtlOiB4fSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBsYXN0TGluZSA9IHRyYWNlID8gdHJhY2VbMF0ubWF0Y2goLzxhbm9ueW1vdXM+OihcXGQrKTooXFxkKykvKSA6IG51bGw7XG4gICAgICAgICAgICBpZiAobGFzdExpbmUgJiYgbGFzdExpbmUubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGJvb3Rib3guZGlhbG9nKHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZXJlIHdhcyBhbiBlcnJvciE8YnIvPjxiPicgKyB4Lm1lc3NhZ2UgKyAnPC9iPjxici8+PGJyLz5PbiBMaW5lICMnICsgKGxhc3RMaW5lWzFdIC0gMiksXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIk9vcHMhXCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYm9vdGJveC5hbGVydCh4Lm1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAganNPdXRwdXQuYWN0aXZhdGUoKTtcbiAgICBlZGl0b3IuZm9jdXMoKTtcbn1cblxuZnVuY3Rpb24gY2FudmFzUGFnZSgpIHtcblxuICAgIHNvY2tldCA9IGlvKCk7XG4gICAgdmFyIGFwcE5hbWUgPSBkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHJpbmcoMSk7XG5cbiAgICBpZiAod2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMSkuaW5kZXhPZihcInA9XCIpID09PSAwKSB7XG4gICAgICAgIHZhciBwcm9nID0gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMykuc3BsaXQoJyYnKVswXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHByb2cgPSBMWlN0cmluZy5kZWNvbXByZXNzRnJvbUVuY29kZWRVUklDb21wb25lbnQocHJvZyk7XG4gICAgICAgICAgICAkKCcjZWRpdG9yJykudGV4dChwcm9nKTtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIHdhcyBhIHByb2dyYW0gbGluaywga2VlcCBsb2NhbCBjaGFuZ2VzXG4gICAgICAgICAgICBhcHBOYW1lID0gc2hhMShwcm9nKTtcbiAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgLy8gV2Fzbid0IGEgcHJvZ3JhbSBpbiB0aGUgbGluay4uLlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2FudmFzID0gJCgnI2NhbnZhcycpWzBdO1xuXG4gICAgc2l6ZXIoKTtcbiAgICAkKHdpbmRvdykucmVzaXplKHNpemVyKTtcblxuICAgIGlmICh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NvZGUnICsgYXBwTmFtZSkpIHtcbiAgICAgICAgJCgnI2VkaXRvcicpLnRleHQod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjb2RlJyArIGFwcE5hbWUpKTtcbiAgICB9XG5cbiAgICBhY2UucmVxdWlyZShcImFjZS9leHQvbGFuZ3VhZ2VfdG9vbHNcIik7XG4gICAgdmFyIGVkaXRvciA9IGFjZS5lZGl0KCdlZGl0b3InKTtcbiAgICBlZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgZWRpdG9yLmdldFNlc3Npb24oKS5zZXRNb2RlKCdhY2UvbW9kZS9qYXZhc2NyaXB0Jyk7XG4gICAgZWRpdG9yLnNldE9wdGlvbnMoe1xuICAgICAgICBlbmFibGVTbmlwcGV0czogdHJ1ZSxcbiAgICAgICAgZW5hYmxlTGl2ZUF1dG9jb21wbGV0aW9uOiB0cnVlLFxuICAgICAgICBlbmFibGVCYXNpY0F1dG9jb21wbGV0aW9uOiB0cnVlXG4gICAgfSk7XG4gICAgY2FudmFzQ29tcGxldGVzKGFjZS5yZXF1aXJlKFwiYWNlL3NuaXBwZXRzXCIpLnNuaXBwZXRNYW5hZ2VyKTtcblxuICAgIGVkaXRvci5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NvZGUnICsgYXBwTmFtZSwgZWRpdG9yLmdldFNlc3Npb24oKS5nZXRWYWx1ZSgpKTtcbiAgICAgICAgaWYgKCQoJyNhdXRvUnVuJykucHJvcCgnY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJ1bigpO1xuICAgICAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlZGl0b3Iub24oJ2ZvY3VzJywgZnVuY3Rpb24gKCkge1xuICAgIH0pO1xuXG4gICAgZWRpdG9yLmNvbW1hbmRzLmFkZENvbW1hbmQoe1xuICAgICAgICBuYW1lOiAnUnVuJyxcbiAgICAgICAgYmluZEtleTogJ0N0cmwtUicsXG4gICAgICAgIGV4ZWM6IGZ1bmN0aW9uIChlZGl0b3IpIHtcbiAgICAgICAgICAgIHJ1bigpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZWRpdG9yLmNvbW1hbmRzLmFkZENvbW1hbmQoe1xuICAgICAgICBuYW1lOiAnQ2xlYXInLFxuICAgICAgICBiaW5kS2V5OiAnQ3RybC1MJyxcbiAgICAgICAgZXhlYzogZnVuY3Rpb24gKGVkaXRvcikge1xuICAgICAgICAgICAgdmFyIGNhbnZhc0NvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICAkKCcjcnVuJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLmJsdXIoKTtcbiAgICAgICAgcnVuKCk7XG4gICAgfSk7XG4gICAgJCgnI2NsZWFyJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBjYW52YXNDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgIH0pO1xuICAgICQoJyNzaGFyZScpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCc/JylbMF07XG4gICAgICAgIHZhciBlbmMgPSBMWlN0cmluZy5jb21wcmVzc1RvRW5jb2RlZFVSSUNvbXBvbmVudChlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCkpO1xuICAgICAgICAkKCcjdXJsTW9kYWwgdGV4dGFyZWEnKS52YWwodXJsICsgJz9wPScgKyBlbmMpO1xuICAgICAgICAkKCcjdXJsTW9kYWwnKS5tb2RhbCgpO1xuICAgIH0pO1xuXG4gICAgdmFyIGNvbnRleHQgPSBjYW52YXNDbG9zdXJlKHNvY2tldCwgZWRpdG9yKTtcblxuICAgIHNvY2tldC5vbignY2hhdCcsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChfanNMaXN0ZW5lcnNbbS5jb250ZW50LnR5cGVdKSB7XG4gICAgICAgICAgICBfanNMaXN0ZW5lcnNbbS5jb250ZW50LnR5cGVdLmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgZm4obS5jb250ZW50Lm1lc3NhZ2UsIG0uc291cmNlLCBtLmNvbnRlbnQudHlwZSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoeCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgJCgnI2NvcHlwcm9nJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzb2NrZXQuZW1pdCgnc2hhcmUnLCB7XG4gICAgICAgICAgICBjb2RlOiBlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCksXG4gICAgICAgICAgICB0eXBlOiAnY2FudmFzJ1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBzaGFyZVByb2c7XG4gICAgc29ja2V0Lm9uKCdzaGFyZScsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIGlmIChtLmNvbnRlbnQudHlwZSA9PT0gJ2NhbnZhcycpIHtcbiAgICAgICAgICAgICQoJyNnZXRwcm9nJykuZmFkZUluKCk7XG4gICAgICAgICAgICBzaGFyZVByb2cgPSBtLmNvbnRlbnQuY29kZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgJCgnI2dldHByb2cnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGVkaXRvci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoc2hhcmVQcm9nKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIHJ1bihjb2RlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBfanNMaXN0ZW5lcnMgPSB7fTtcbiAgICAgICAgICAgIGNvbnRleHQoY29kZSB8fCBlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCkpO1xuICAgICAgICB9IGNhdGNoICh4KSB7XG4gICAgICAgICAgICB2YXIgdHJhY2U7XG4gICAgICAgICAgICBpZiAod2luZG93W1wicHJpbnRTdGFja1RyYWNlXCJdKSB7XG4gICAgICAgICAgICAgICAgdHJhY2UgPSBwcmludFN0YWNrVHJhY2Uoe2U6IHh9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGxhc3RMaW5lID0gdHJhY2UgPyB0cmFjZVswXS5tYXRjaCgvPGFub255bW91cz46KFxcZCspOihcXGQrKS8pIDogbnVsbDtcbiAgICAgICAgICAgIGlmIChsYXN0TGluZSAmJiBsYXN0TGluZS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgYm9vdGJveC5kaWFsb2coe1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlcmUgd2FzIGFuIGVycm9yITxici8+PGI+JyArIHgubWVzc2FnZSArICc8L2I+PGJyLz48YnIvPk9uIExpbmUgIycgKyAobGFzdExpbmVbMV0gLSAyKSxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiT29wcyFcIlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBib290Ym94LmFsZXJ0KHgubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBlZGl0b3IuZm9jdXMoKTtcbn1cblxuZnVuY3Rpb24gbG9nZ2VySW5wdXQodGV4dCkge1xuICAgIGNvbnNvbGUubG9nKCdVbmV4cGVjdGVkIGlucHV0JywgdGV4dCk7XG59XG5cbmZ1bmN0aW9uIGNhbnZhc0Nsb3N1cmUoc29ja2V0LCBlZGl0b3IpIHtcbiAgICB2YXIgcmVkID0gJyNGRjAwMDAnLCBncmVlbiA9ICcjMDBGRjAwJywgYmx1ZSA9ICcjMDAwMEZGJywgd2hpdGUgPSAnI0ZGRkZGRicsIGJsYWNrID0gJyMwMDAnLFxuICAgICAgICBmaWxsZWQgPSB0cnVlLFxuICAgICAgICBlbXB0eSA9IGZhbHNlLFxuICAgICAgICBsaW5lID0gZnVuY3Rpb24gKGMsIHgsIHksIHcsIGgpIHtcbiAgICAgICAgICAgIHZhciBjYW52YXNDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5tb3ZlVG8oeCwgeSk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmxpbmVUbyh4ICsgdywgeSArIGgpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5zdHJva2VTdHlsZSA9IGM7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LnN0cm9rZSgpO1xuICAgICAgICB9LCBjbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjYW52YXNDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICB9LCBjaXJjbGUgPSBmdW5jdGlvbiAoY29sb3IsIGNlbnRlclgsIGNlbnRlclksIHJhZGl1cywgZikge1xuICAgICAgICAgICAgdmFyIGNhbnZhc0NvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmFyYyhjZW50ZXJYLCBjZW50ZXJZLCByYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XG4gICAgICAgICAgICBpZiAoZikge1xuICAgICAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbFN0eWxlID0gY29sb3I7XG4gICAgICAgICAgICAgICAgY2FudmFzQ29udGV4dC5maWxsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmxpbmVXaWR0aCA9IDU7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LnN0cm9rZVN0eWxlID0gY29sb3I7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LnN0cm9rZSgpO1xuICAgICAgICB9LCBmaWxsID0gZnVuY3Rpb24gKGNvbG9yKSB7XG4gICAgICAgICAgICB2YXIgY2FudmFzQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQucmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5maWxsU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbCgpO1xuICAgICAgICB9LCByZWN0ID0gZnVuY3Rpb24gKGMsIHgsIHksIHcsIGgsIGYpIHtcbiAgICAgICAgICAgIHZhciBjYW52YXNDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5yZWN0KHgsIHksIHcsIGgpO1xuICAgICAgICAgICAgaWYgKGYgfHwgZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY2FudmFzQ29udGV4dC5maWxsU3R5bGUgPSBjO1xuICAgICAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FudmFzQ29udGV4dC5zdHJva2VTdHlsZSA9IGM7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LnN0cm9rZSgpO1xuICAgICAgICB9LCBwcmludCA9IGZ1bmN0aW9uIChjb2xvciwgeCwgeSwgbWVzc2FnZSwgZm9udCkge1xuICAgICAgICAgICAgdmFyIGNhbnZhc0NvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICBjYW52YXNDb250ZXh0LmZvbnQgPSAnNDBwdCBDYWxpYnJpJztcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbFN0eWxlID0gY29sb3IgfHwgJ3doaXRlJztcbiAgICAgICAgICAgIGNhbnZhc0NvbnRleHQuZmlsbFRleHQobWVzc2FnZSwgeCwgeSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNlbmQgPSBmdW5jdGlvbiAodHlwZSwgbWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKHR5cGUgJiYgIW1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gdHlwZTtcbiAgICAgICAgICAgICAgICB0eXBlID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNvY2tldC5lbWl0KCdjaGF0Jywge3R5cGU6IHR5cGUsIG1lc3NhZ2U6IG1lc3NhZ2V9KTtcbiAgICAgICAgfSwgb24gPSBmdW5jdGlvbiAoZSwgZm4pIHtcbiAgICAgICAgICAgIF9qc0xpc3RlbmVyc1tlXSA9IF9qc0xpc3RlbmVyc1tlXSB8fCBbXTtcbiAgICAgICAgICAgIF9qc0xpc3RlbmVyc1tlXS5wdXNoKGZuKTtcbiAgICAgICAgfTtcblxuICAgIHJldHVybiAoZnVuY3Rpb24gKGNvZGUpIHtcbiAgICAgICAgdmFyIG1lID0gc29ja2V0LmlkO1xuICAgICAgICBjb25zb2xlLnRyYWNlKCdSdW5uaW5nIGNvZGUnKTtcbiAgICAgICAgdmFyIHRyYW5zZm9ybWVkID0gYmFiZWwudHJhbnNmb3JtKCd2YXIgcHJvZ3JhbUZ1bmN0aW9uID0gYXN5bmMgZnVuY3Rpb24gKCkgeyAnICsgY29kZSArICd9OyBwcm9ncmFtRnVuY3Rpb24oKTsnLCB7c3RhZ2U6IDB9KTtcbiAgICAgICAgdmFyIHdpZHRoID0gY2FudmFzLndpZHRoLCBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0O1xuICAgICAgICBldmFsKHRyYW5zZm9ybWVkLmNvZGUpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBjbG9zdXJlKHNvY2tldCwgZWRpdG9yLCBvdXRwdXQpIHtcbiAgICB2YXIgcmFuZG9tID0gZnVuY3Rpb24gKGhpZ2gpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBoaWdoKSArIDE7XG4gICAgICAgIH0sIGFkZExldHRlciA9IGZ1bmN0aW9uIChjLCB2KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHYgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdiA9IHYuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKChjLmNoYXJDb2RlQXQoMCkgKyB2KSAlIDI1Nik7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZGxldHRlciA9IGFkZExldHRlcixcbiAgICAgICAgcHJpbnQgPSBmdW5jdGlvbiAodGV4dCkge1xuICAgICAgICAgICAgb3V0cHV0LnJlbmRlck91dHB1dCh0ZXh0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBvdXRwdXQuY2xlYXIoKTtcbiAgICAgICAgICAgIG91dHB1dC5yZW5kZXJPdXRwdXQoJz4nLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCByZWFkTGluZSA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIHByaW50KG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlc29sdmVyO1xuICAgICAgICAgICAgb3V0cHV0Ll9jb25maWcub25Db21tYW5kID0gZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZXIobGluZSk7XG4gICAgICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgICAgICAgb3V0cHV0Ll9jb25maWcub25Db21tYW5kID0gbG9nZ2VySW5wdXQ7XG4gICAgICAgICAgICAgICAgb3V0cHV0LmRlYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBlZGl0b3IuYmx1cigpO1xuICAgICAgICAgICAgb3V0cHV0LmFjdGl2YXRlKCk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlciA9IHJlc29sdmU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgcmVhZGxpbmUgPSByZWFkTGluZSxcbiAgICAgICAgc2VuZCA9IGZ1bmN0aW9uICh0eXBlLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICBpZiAodHlwZSAmJiAhbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSB0eXBlO1xuICAgICAgICAgICAgICAgIHR5cGUgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc29ja2V0LmVtaXQoJ2NoYXQnLCB7dHlwZTogdHlwZSwgbWVzc2FnZTogbWVzc2FnZX0pO1xuICAgICAgICB9LCBvbiA9IGZ1bmN0aW9uIChlLCBmbikge1xuICAgICAgICAgICAgX2pzTGlzdGVuZXJzW2VdID0gX2pzTGlzdGVuZXJzW2VdIHx8IFtdO1xuICAgICAgICAgICAgX2pzTGlzdGVuZXJzW2VdLnB1c2goZm4pO1xuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIChmdW5jdGlvbiAoY29kZSkge1xuICAgICAgICB2YXIgbWUgPSBzb2NrZXQuaWQ7XG4gICAgICAgIGNvbnNvbGUudHJhY2UoJ1J1bm5pbmcgY29kZScpO1xuICAgICAgICB2YXIgdHJhbnNmb3JtZWQgPSBiYWJlbC50cmFuc2Zvcm0oJ3ZhciBwcm9ncmFtRnVuY3Rpb24gPSBhc3luYyBmdW5jdGlvbiAoKSB7ICcgKyBjb2RlICsgJ307IHByb2dyYW1GdW5jdGlvbigpOycsIHtzdGFnZTogMH0pO1xuICAgICAgICBldmFsKHRyYW5zZm9ybWVkLmNvZGUpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzaXplcigpIHtcbiAgICB2YXIgdG90YWxIZWlnaHQgPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG4gICAgJCgnI2VkaXRvclJvdycpLmhlaWdodChNYXRoLmZsb29yKHRvdGFsSGVpZ2h0IC8gMikpO1xuICAgICQoJyNjb25zb2xlUm93JykuaGVpZ2h0KE1hdGguZmxvb3IodG90YWxIZWlnaHQgLyAyKSk7XG4gICAgaWYgKGNhbnZhcykge1xuICAgICAgICBjYW52YXMud2lkdGggPSAkKCcjY2FudmFzJykud2lkdGgoKTtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9ICQoJyNjYW52YXMnKS5oZWlnaHQoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNoYTEoc3RyMSkge1xuICAgIGZvciAoXG4gICAgICAgIHZhciBibG9ja3N0YXJ0ID0gMCxcbiAgICAgICAgICAgIGkgPSAwLFxuICAgICAgICAgICAgVyA9IFtdLFxuICAgICAgICAgICAgQSwgQiwgQywgRCwgRiwgRyxcbiAgICAgICAgICAgIEggPSBbQSA9IDB4Njc0NTIzMDEsIEIgPSAweEVGQ0RBQjg5LCB+QSwgfkIsIDB4QzNEMkUxRjBdLFxuICAgICAgICAgICAgd29yZF9hcnJheSA9IFtdLFxuICAgICAgICAgICAgdGVtcDIsXG4gICAgICAgICAgICBzID0gdW5lc2NhcGUoZW5jb2RlVVJJKHN0cjEpKSxcbiAgICAgICAgICAgIHN0cl9sZW4gPSBzLmxlbmd0aDtcblxuICAgICAgICBpIDw9IHN0cl9sZW47XG4gICAgKSB7XG4gICAgICAgIHdvcmRfYXJyYXlbaSA+PiAyXSB8PSAocy5jaGFyQ29kZUF0KGkpIHx8IDEyOCkgPDwgKDggKiAoMyAtIGkrKyAlIDQpKTtcbiAgICB9XG4gICAgd29yZF9hcnJheVt0ZW1wMiA9ICgoc3RyX2xlbiArIDgpID4+IDYgPDwgNCkgKyAxNV0gPSBzdHJfbGVuIDw8IDM7XG5cbiAgICBmb3IgKDsgYmxvY2tzdGFydCA8PSB0ZW1wMjsgYmxvY2tzdGFydCArPSAxNikge1xuICAgICAgICBBID0gSDtcbiAgICAgICAgaSA9IDA7XG5cbiAgICAgICAgZm9yICg7IGkgPCA4MDtcbiAgICAgICAgICAgICAgIEEgPSBbW1xuICAgICAgICAgICAgICAgICAgIChHID0gKChzID0gQVswXSkgPDwgNSB8IHMgPj4+IDI3KSArIEFbNF0gKyAoV1tpXSA9IChpIDwgMTYpID8gfn53b3JkX2FycmF5W2Jsb2Nrc3RhcnQgKyBpXSA6IEcgPDwgMSB8IEcgPj4+IDMxKSArIDE1MTg1MDAyNDkpICsgKChCID0gQVsxXSkgJiAoQyA9IEFbMl0pIHwgfkIgJiAoRCA9IEFbM10pKSxcbiAgICAgICAgICAgICAgICAgICBGID0gRyArIChCIF4gQyBeIEQpICsgMzQxMjc1MTQ0LFxuICAgICAgICAgICAgICAgICAgIEcgKyAoQiAmIEMgfCBCICYgRCB8IEMgJiBEKSArIDg4MjQ1OTQ1OSxcbiAgICAgICAgICAgICAgICAgICBGICsgMTUzNTY5NDM4OVxuICAgICAgICAgICAgICAgXVswIHwgKChpKyspIC8gMjApXSB8IDAsIHMsIEIgPDwgMzAgfCBCID4+PiAyLCBDLCBEXVxuICAgICAgICApIHtcbiAgICAgICAgICAgIEcgPSBXW2kgLSAzXSBeIFdbaSAtIDhdIF4gV1tpIC0gMTRdIF4gV1tpIC0gMTZdO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChpID0gNTsgaTspIEhbLS1pXSA9IEhbaV0gKyBBW2ldIHwgMDtcbiAgICB9XG5cbiAgICBmb3IgKHN0cjEgPSAnJzsgaSA8IDQwOylzdHIxICs9IChIW2kgPj4gM10gPj4gKDcgLSBpKysgJSA4KSAqIDQgJiAxNSkudG9TdHJpbmcoMTYpO1xuICAgIHJldHVybiBzdHIxO1xufVxuXG5mdW5jdGlvbiBkZWFsKHBsYXllcnMpIHtcbiAgICB2YXIgdGFyZ2V0ID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDUwKSAqIDI7XG4gICAgdmFyIHBsYXllckNvdW50ID0gMDtcbiAgICBmb3IgKHZhciBwIGluIHBsYXllcnMpIHtcbiAgICAgICAgcGxheWVyQ291bnQrKztcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ2RlYWxpbmcnLCBwbGF5ZXJDb3VudCk7XG4gICAgdmFyIGxhc3RQbGF5ZXIgPSBudWxsO1xuICAgIGZvciAodmFyIHAgaW4gcGxheWVycykge1xuICAgICAgICBpZiAobGFzdFBsYXllcikge1xuICAgICAgICAgICAgcGxheWVyc1twXS5udW1iZXIgPSBNYXRoLmFicyh0YXJnZXQgLSBsYXN0UGxheWVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBsYXllcnNbcF0ubnVtYmVyID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDUwKSAqIDI7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdFBsYXllciA9IHBsYXllcnNbcF0ubnVtYmVyO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICB0YXJnZXQ6IHRhcmdldCxcbiAgICAgICAgcGxheWVyczogcGxheWVyc1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHNjcmF0Y2hjcmFmdCgpIHtcbiAgICB2YXIgYmxvY2tseUFyZWEgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxvY2tseUFyZWEnKTtcbiAgICB2YXIgYmxvY2tseURpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibG9ja2x5RGl2Jyk7XG4gICAgdmFyIHdvcmtzcGFjZSA9IEJsb2NrbHkuaW5qZWN0KGJsb2NrbHlEaXYsXG4gICAgICAgIHtcbiAgICAgICAgICAgIG1lZGlhOiAnL2pzL2Jsb2NrbHkvbWVkaWEvJyxcbiAgICAgICAgICAgIHRvb2xib3g6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b29sYm94JylcbiAgICAgICAgfSk7XG4gICAgdmFyIGJsb2NrbHlSZXNpemUgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAvLyBDb21wdXRlIHRoZSBhYnNvbHV0ZSBjb29yZGluYXRlcyBhbmQgZGltZW5zaW9ucyBvZiBibG9ja2x5QXJlYS5cbiAgICAgICAgdmFyIGVsZW1lbnQgPSBibG9ja2x5QXJlYTtcbiAgICAgICAgdmFyIHggPSAwO1xuICAgICAgICB2YXIgeSA9IDA7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIHggKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgeSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfSB3aGlsZSAoZWxlbWVudCk7XG4gICAgICAgIC8vIFBvc2l0aW9uIGJsb2NrbHlEaXYgb3ZlciBibG9ja2x5QXJlYS5cbiAgICAgICAgYmxvY2tseURpdi5zdHlsZS5sZWZ0ID0geCArICdweCc7XG4gICAgICAgIGJsb2NrbHlEaXYuc3R5bGUudG9wID0geSArICdweCc7XG4gICAgICAgIGJsb2NrbHlEaXYuc3R5bGUud2lkdGggPSBibG9ja2x5QXJlYS5vZmZzZXRXaWR0aCArICdweCc7XG4gICAgICAgIGJsb2NrbHlEaXYuc3R5bGUuaGVpZ2h0ID0gYmxvY2tseUFyZWEub2Zmc2V0SGVpZ2h0ICsgJ3B4JztcbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBibG9ja2x5UmVzaXplLCBmYWxzZSk7XG4gICAgYmxvY2tseVJlc2l6ZSgpO1xufVxuXG5cbmZ1bmN0aW9uIGNvbnNvbGVDb21wbGV0ZXMoc25pcHMpIHtcblxuICAgIHNuaXBzLnJlZ2lzdGVyKFt7XG4gICAgICAgIHRhYlRyaWdnZXI6ICdwcicsXG4gICAgICAgIG5hbWU6ICdwcmludCcsXG4gICAgICAgIGNvbnRlbnQ6ICdwcmludChcXCckezE6bWVzc2FnZX1cXCcpOycsXG4gICAgICAgIGRvY0hUTUw6ICc8Yj5QcmludCBhIG1lc3NhZ2UgdG8gdGhlIGJvdHRvbSBzY3JlZW4uPC9iPjxoci8+cHJpbnQoXCJIZWxsbyBXb3JsZFwiKTs8YnIvPnByaW50KFwiVGhlIHZhbHVlIGlzIFwiICsgYVZhcmlhYmxlKTsnXG4gICAgfSwge1xuICAgICAgICB0YWJUcmlnZ2VyOiAncmUnLFxuICAgICAgICBuYW1lOiAncmVhZExpbmUnLFxuICAgICAgICBjb250ZW50OiAndmFyICR7MTphbnN3ZXJ9ID0gYXdhaXQgcmVhZExpbmUoXFwnJHsyOnF1ZXN0aW9ufVxcJyk7JyxcbiAgICAgICAgZG9jSFRNTDogJzxiPlJlYWQgYSBMaW5lIG9mIFRleHQ8L2I+PGJyLz5SZWFkIGEgbGluZSBvZiB0ZXh0IGZyb20gdGhlIHVzZXIgYW5kIHdhaXQgdW50aWwgdGhleSBoaXQgXCJSZXR1cm4uXCIgTGVhdmUgdGhlIHJlc3VsdCBpbiA8aT5hbnN3ZXI8L2k+Ljxoci8+dmFyICR7MTphbnN3ZXJ9ID0gYXdhaXQgcmVhZExpbmUoXFwnJHsyOnF1ZXN0aW9ufVxcJyk7J1xuICAgIH0sIHtcbiAgICAgICAgdGFiVHJpZ2dlcjogJ2NsJyxcbiAgICAgICAgbmFtZTogJ2NsZWFyJyxcbiAgICAgICAgY29udGVudDogJ2NsZWFyKCk7JyxcbiAgICAgICAgZG9jSFRNTDogJzxiPkNsZWFyIHRoZSBzY3JlZW48L2I+PGhyLz5jbGVhcigpOydcbiAgICB9LCB7XG4gICAgICAgIHRhYlRyaWdnZXI6ICdyYScsXG4gICAgICAgIG5hbWU6ICdyYW5kb20nLFxuICAgICAgICBjb250ZW50OiAncmFuZG9tKCR7MTptYXhpbXVtfSk7JyxcbiAgICAgICAgZG9jSFRNTDogJzxiPkNob29zZSBhIHJhbmRvbSBudW1iZXIgYmV0d2VlZW4gMSBhbmQgPGk+bWF4aW11bTwvaT48L2I+PGhyLz5yYW5kb20oMTAwKTsnXG4gICAgfSwge1xuICAgICAgICB0YWJUcmlnZ2VyOiAnYWRkbCcsXG4gICAgICAgIG5hbWU6ICdhZGRMZXR0ZXInLFxuICAgICAgICBjb250ZW50OiAnYWRkTGV0dGVyKCR7MTpiYXNlfSwkezI6YWRkfSknLFxuICAgICAgICBkb2NIVE1MOiAnPGI+QWRkIG9uZSBsZXR0ZXIgdG8gYW5vdGhlcjwvYj48aHIvPmFkZExldHRlcihcXFwiYVxcXCIsXFxcInpcXFwiKTsnXG4gICAgfV0pO1xuXG4gICAgdmFyIGJhc2ljU25pcHBldHMgPSBbJ2ZvcicsICdmdW4nLCAnd2gnLCAnaWYnLCAnc2V0VGltZW91dCddO1xuICAgIHZhciByZWdpc3RlciA9IHNuaXBzLnJlZ2lzdGVyO1xuICAgIHNuaXBzLnJlZ2lzdGVyID0gZnVuY3Rpb24gKHNuaXBwZXRzLCBzY29wZSkge1xuICAgICAgICByZWdpc3Rlci5jYWxsKHNuaXBzLCBzbmlwcGV0cy5maWx0ZXIoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgIGlmIChiYXNpY1NuaXBwZXRzLmluZGV4T2Yocy50YWJUcmlnZ2VyKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnSWdub3Jpbmcgc25pcHBldCcsIHMudGFiVHJpZ2dlciwgc2NvcGUsIHMpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KSwgc2NvcGUpO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBjYW52YXNDb21wbGV0ZXMoc25pcHMpIHtcblxuICAgIHNuaXBzLnJlZ2lzdGVyKFt7XG4gICAgICAgIHRhYlRyaWdnZXI6ICdwcicsXG4gICAgICAgIG5hbWU6ICdwcmludCcsXG4gICAgICAgIGNvbnRlbnQ6ICdwcmludChcXCckezE6Y29sb3J9XFwnLCAkezI6c3RhcnRYfSwgJHszOnN0YXJ0WX0sIFxcJyR7NDptZXNzYWdlfVxcJyk7JyxcbiAgICAgICAgZG9jSFRNTDogJzxiPkRyYXcgVGV4dDwvYj48YnIvPkRyYXcgbWVzc2FnZSBhdCBzdGFydFgsc3RhcnRZLjxoci8+cHJpbnQoXCJyZWRcIiwgMCwgMCwgXFwnSGVsbG8gV29ybGQhXFwnKTsnXG4gICAgfSwge1xuICAgICAgICB0YWJUcmlnZ2VyOiAnY2knLFxuICAgICAgICBuYW1lOiAnY2lyY2xlJyxcbiAgICAgICAgY29udGVudDogJ2NpcmNsZShcXCckezE6Y29sb3J9XFwnLCAkezI6Y2VudGVyWH0sICR7MzpjZW50ZXJZfSwgJHs0OnJhZGl1c30sICR7NTpmaWxsZWR9KTsnLFxuICAgICAgICBkb2NIVE1MOiAnPGI+RHJhdyBhIENpcmNsZTwvYj48YnIvPkRyYXcgYSBjaXJjbGUgY2VudGVyZWQgYXQgY2VudGVyWCxjZW50ZXJZIHdpdGggYSByYWRpdXMuPGJyLz5JZiBmaWxsZWQgaXMgPGk+dHJ1ZTwvaT4gdGhlbiBmaWxsIHRoZSByZWN0YW5nbGUgd2l0aCB0aGUgY29sb3IuPGhyLz5jaXJjbGUoXCJyZWRcIiwgMTAwLCAxMDAsIDUwLCB0cnVlKTsnXG4gICAgfSwge1xuICAgICAgICB0YWJUcmlnZ2VyOiAnZmknLFxuICAgICAgICBuYW1lOiAnZmlsbCcsXG4gICAgICAgIGNvbnRlbnQ6ICdmaWxsKFxcJyR7MTpjb2xvcn1cXCcpOycsXG4gICAgICAgIGRvY0hUTUw6ICc8Yj5GaWxsIHRoZSBTY3JlZW4gV2l0aCBDb2xvcjwvYj48aHIvPmZpbGwoXCJ3aGl0ZVwiKTsnXG4gICAgfSwge1xuICAgICAgICB0YWJUcmlnZ2VyOiAnbGknLFxuICAgICAgICBuYW1lOiAnbGluZScsXG4gICAgICAgIGNvbnRlbnQ6ICdsaW5lKFxcJyR7MTpjb2xvcn1cXCcsICR7MjpzdGFydFh9LCAkezM6c3RhcnRZfSwgJHs0OndpZHRofSwgJHs1OmhlaWdodH0pOycsXG4gICAgICAgIGRvY0hUTUw6ICc8Yj5EcmF3IGEgTGluZTwvYj48YnIvPkRyYXcgYSBsaW5lIHN0YXJ0aW5nIGF0IHN0YXJ0WCxzdGFydFkgYW5kIGVuZGluZyBhdCBzdGFydFgrd2lkdGgsc3RhcnRZK2hlaWdodDxoci8+bGluZShcInJlZFwiLCAwLCAwLCAxMDAsIDEwMCk7J1xuICAgIH0sIHtcbiAgICAgICAgdGFiVHJpZ2dlcjogJ3JlJyxcbiAgICAgICAgbmFtZTogJ3JlY3QnLFxuICAgICAgICBjb250ZW50OiAncmVjdChcXCckezE6Y29sb3J9XFwnLCAkezI6c3RhcnRYfSwgJHszOnN0YXJ0WX0sICR7NDp3aWR0aH0sICR7NTpoZWlnaHR9LCAkezY6ZmlsbGVkfSk7JyxcbiAgICAgICAgZG9jSFRNTDogJzxiPkRyYXcgYSBSZWN0YW5nbGU8L2I+PGJyLz5EcmF3IGEgcmVjdGFuZ2xlIGZyb20gc3RhcnRYLHN0YXJ0WSBhbmQgZW5kaW5nIGF0IHN0YXJ0WCt3aWR0aCxzdGFydFkraGVpZ2h0Ljxici8+SWYgZmlsbGVkIGlzIDxpPnRydWU8L2k+IHRoZW4gZmlsbCB0aGUgcmVjdGFuZ2xlIHdpdGggdGhlIGNvbG9yLjxoci8+cmVjdChcInJlZFwiLCAwLCAwLCAxMDAsIDEwMCwgdHJ1ZSk7J1xuICAgIH0sIHtcbiAgICAgICAgdGFiVHJpZ2dlcjogJ2NsJyxcbiAgICAgICAgbmFtZTogJ2NsZWFyJyxcbiAgICAgICAgY29udGVudDogJ2NsZWFyKCk7JyxcbiAgICAgICAgY2FwdGlvbjogJ0NsZWFyIHRoZSBjYW52YXMnXG4gICAgfV0pO1xuXG4gICAgdmFyIGJhc2ljU25pcHBldHMgPSBbJ2ZvcicsICdmdW4nLCAnd2gnLCAnaWYnLCAnc2V0VGltZW91dCddO1xuICAgIHZhciByZWdpc3RlciA9IHNuaXBzLnJlZ2lzdGVyO1xuICAgIHNuaXBzLnJlZ2lzdGVyID0gZnVuY3Rpb24gKHNuaXBwZXRzLCBzY29wZSkge1xuICAgICAgICByZWdpc3Rlci5jYWxsKHNuaXBzLCBzbmlwcGV0cy5maWx0ZXIoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgIGlmIChiYXNpY1NuaXBwZXRzLmluZGV4T2Yocy50YWJUcmlnZ2VyKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnSWdub3Jpbmcgc25pcHBldCcsIHMudGFiVHJpZ2dlciwgc2NvcGUsIHMpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KSwgc2NvcGUpO1xuICAgIH1cbn1cbiIsIi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSpcbiAqIENvcHlyaWdodCAyMDEzLTIwMTQgQXJuZSBGLiBDbGFhc3NlblxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxudmFyIEpvc2ggPSB3aW5kb3dbXCJKb3NoXCJdIHx8IHt9O1xuKGZ1bmN0aW9uKHJvb3QsICQsIF8pIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEpvc2guU2hlbGwgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuXG4gICAgICAgIC8vIGluc3RhbmNlIGZpZWxkc1xuICAgICAgICB2YXIgX2NvbnNvbGUgPSBjb25maWcuY29uc29sZSB8fCAoSm9zaC5EZWJ1ZyAmJiByb290LmNvbnNvbGUgPyByb290LmNvbnNvbGUgOiB7XG4gICAgICAgICAgICAgICAgbG9nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgdmFyIF9ub0V2ZW50cyA9IGZhbHNlO1xuICAgICAgICB2YXIgX3Byb21wdCA9IGNvbmZpZy5wcm9tcHQgfHwgJ2pzaCQnO1xuICAgICAgICB2YXIgX3NoZWxsX3ZpZXdfaWQgPSBjb25maWcuc2hlbGxfdmlld19pZCB8fCAnc2hlbGwtdmlldyc7XG4gICAgICAgIHZhciBfc2hlbGxfcGFuZWxfaWQgPSBjb25maWcuc2hlbGxfcGFuZWxfaWQgfHwgJ3NoZWxsLXBhbmVsJztcbiAgICAgICAgdmFyIF9pbnB1dF9pZCA9IGNvbmZpZy5pbnB1dF9pZCB8fCAnc2hlbGwtY2xpJztcbiAgICAgICAgdmFyIF9ibGlua3RpbWUgPSBjb25maWcuYmxpbmt0aW1lIHx8IDUwMDtcbiAgICAgICAgdmFyIF9oaXN0b3J5ID0gY29uZmlnLmhpc3RvcnkgfHwgbmV3IEpvc2guSGlzdG9yeSgpO1xuICAgICAgICB2YXIgX3JlYWRsaW5lID0gY29uZmlnLnJlYWRsaW5lIHx8IG5ldyBKb3NoLlJlYWRMaW5lKHtoaXN0b3J5OiBfaGlzdG9yeSwgY29uc29sZTogX2NvbnNvbGV9KTtcbiAgICAgICAgdmFyIF9hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgdmFyIF9jdXJzb3JfdmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICB2YXIgX2FjdGl2YXRpb25IYW5kbGVyO1xuICAgICAgICB2YXIgX2RlYWN0aXZhdGlvbkhhbmRsZXI7XG4gICAgICAgIHZhciBfY21kSGFuZGxlcnMgPSB7XG4gICAgICAgICAgICBfZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIGV4ZWM6IGZ1bmN0aW9uKGNtZCwgYXJncywgY2FsbGJhY2spIHtcblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhzZWxmLnRlbXBsYXRlcy5iYWRfY29tbWFuZCh7Y21kOiBjbWR9KSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjb21wbGV0aW9uOiBmdW5jdGlvbihjbWQsIGFyZywgbGluZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIWFyZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJnID0gY21kO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhzZWxmLmJlc3RNYXRjaChhcmcsIHNlbGYuY29tbWFuZHMoKSkpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlucHV0X3NlYXJjaDoge1xuICAgICAgICAgICAgICAgIGV4ZWM6IGZ1bmN0aW9uIChjbWQsIGFyZ3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5ydW4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2xlYXI6IHtcbiAgICAgICAgICAgICAgICBleGVjOiBmdW5jdGlvbiAoY21kLCBhcmdzLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkpLnBhcmVudCgpLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB2YXIgX2xpbmUgPSB7XG4gICAgICAgICAgICB0ZXh0OiAnJyxcbiAgICAgICAgICAgIGN1cnNvcjogMFxuICAgICAgICB9O1xuICAgICAgICB2YXIgX3NlYXJjaE1hdGNoID0gJyc7XG4gICAgICAgIHZhciBfdmlldywgX3BhbmVsO1xuICAgICAgICB2YXIgX3Byb21wdEhhbmRsZXI7XG4gICAgICAgIHZhciBfaW5pdGlhbGl6YXRpb25IYW5kbGVyO1xuICAgICAgICB2YXIgX2luaXRpYWxpemVkO1xuXG4gICAgICAgIF9yZWFkbGluZS5iaW5kKHsnY2hhcic6ICdMJywgY3RybEtleTogdHJ1ZX0sICdjbGVhcicpO1xuICAgICAgICBfcmVhZGxpbmUuYmluZCh7J2NoYXInOiAnUicsIGN0cmxLZXk6IHRydWV9LCAncnVuJyk7XG5cbiAgICAgICAgLy8gcHVibGljIG1ldGhvZHNcbiAgICAgICAgdmFyIHNlbGYgPSB7XG4gICAgICAgICAgICBjb21tYW5kczogY29tbWFuZHMsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBoaXN0b3J5OiBfLnRlbXBsYXRlKFwiPGRpdj48JSBfLmVhY2goaXRlbXMsIGZ1bmN0aW9uKGNtZCwgaSkgeyAlPjxkaXY+PCUtIGkgJT4mbmJzcDs8JS0gY21kICU+PC9kaXY+PCUgfSk7ICU+PC9kaXY+XCIpLFxuICAgICAgICAgICAgICAgIGhlbHA6IF8udGVtcGxhdGUoXCI8ZGl2PjxkaXY+PHN0cm9uZz5Db21tYW5kczo8L3N0cm9uZz48L2Rpdj48JSBfLmVhY2goY29tbWFuZHMsIGZ1bmN0aW9uKGNtZCkgeyAlPjxkaXY+Jm5ic3A7PCUtIGNtZCAlPjwvZGl2PjwlIH0pOyAlPjwvZGl2PlwiKSxcbiAgICAgICAgICAgICAgICBiYWRfY29tbWFuZDogXy50ZW1wbGF0ZSgnPGRpdj48c3Ryb25nPlVucmVjb2duaXplZCBjb21tYW5kOiZuYnNwOzwvc3Ryb25nPjwlPWNtZCU+PC9kaXY+JyksXG4gICAgICAgICAgICAgICAgaW5wdXRfY21kOiBfLnRlbXBsYXRlKCc8ZGl2IGlkPVwiPCUtIGlkICU+XCIgY2xhc3M9XCJwcm9tcHRMaW5lXCI+PHNwYW4gY2xhc3M9XCJwcm9tcHRcIj48L3NwYW4+PHNwYW4gY2xhc3M9XCJpbnB1dFwiPjxzcGFuIGNsYXNzPVwibGVmdFwiLz48c3BhbiBjbGFzcz1cImN1cnNvclwiLz48c3BhbiBjbGFzcz1cInJpZ2h0XCIvPjwvc3Bhbj48L2Rpdj4nKSxcbiAgICAgICAgICAgICAgICBzdWdnZXN0OiBfLnRlbXBsYXRlKFwiPGRpdj48JSBfLmVhY2goc3VnZ2VzdGlvbnMsIGZ1bmN0aW9uKHN1Z2dlc3Rpb24pIHsgJT48ZGl2PjwlLSBzdWdnZXN0aW9uICU+PC9kaXY+PCUgfSk7ICU+PC9kaXY+XCIpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaXNBY3RpdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfcmVhZGxpbmUuaXNBY3RpdmUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhY3RpdmF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYoJChpZChfc2hlbGxfdmlld19pZCkpLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIF9hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBfbGluZS50ZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgX2xpbmUuY3Vyc29yID0gMDtcbiAgICAgICAgICAgICAgICBfbm9FdmVudHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIF9yZWFkbGluZS5zZXRMaW5lKF9saW5lKTtcbiAgICAgICAgICAgICAgICBfbm9FdmVudHMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBfcmVhZGxpbmUuYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjbGVhclByb21wdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIF9saW5lID0ge3RleHQ6ICcnLCBjdXJzb3I6IDB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkpLnBhcmVudCgpLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgc2VsZi5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVhY3RpdmF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiZGVhY3RpdmF0aW5nXCIpO1xuICAgICAgICAgICAgICAgIF9hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBfcmVhZGxpbmUuZGVhY3RpdmF0ZSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldENvbW1hbmRIYW5kbGVyOiBmdW5jdGlvbihjbWQsIGNtZEhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBfY21kSGFuZGxlcnNbY21kXSA9IGNtZEhhbmRsZXI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q29tbWFuZEhhbmRsZXI6IGZ1bmN0aW9uKGNtZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfY21kSGFuZGxlcnNbY21kXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRQcm9tcHQ6IGZ1bmN0aW9uKHByb21wdCkge1xuICAgICAgICAgICAgICAgIF9wcm9tcHQgPSBwcm9tcHQ7XG4gICAgICAgICAgICAgICAgaWYoIV9hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZWxmLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVPVDogZnVuY3Rpb24oY29tcGxldGlvbkhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBfcmVhZGxpbmUub25FT1QoY29tcGxldGlvbkhhbmRsZXIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQ2FuY2VsOiBmdW5jdGlvbihjb21wbGV0aW9uSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9yZWFkbGluZS5vbkNhbmNlbChjb21wbGV0aW9uSGFuZGxlcik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25Jbml0aWFsaXplOiBmdW5jdGlvbihjb21wbGV0aW9uSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9pbml0aWFsaXphdGlvbkhhbmRsZXIgPSBjb21wbGV0aW9uSGFuZGxlcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkFjdGl2YXRlOiBmdW5jdGlvbihjb21wbGV0aW9uSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9hY3RpdmF0aW9uSGFuZGxlciA9IGNvbXBsZXRpb25IYW5kbGVyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRGVhY3RpdmF0ZTogZnVuY3Rpb24oY29tcGxldGlvbkhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBfZGVhY3RpdmF0aW9uSGFuZGxlciA9IGNvbXBsZXRpb25IYW5kbGVyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uTmV3UHJvbXB0OiBmdW5jdGlvbihjb21wbGV0aW9uSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9wcm9tcHRIYW5kbGVyID0gY29tcGxldGlvbkhhbmRsZXI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVuZGVyT3V0cHV0OiByZW5kZXJPdXRwdXQsXG4gICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gX2xpbmUudGV4dCB8fCAnJztcbiAgICAgICAgICAgICAgICBfY29uc29sZS5sb2coJ1N0YXJ0IHJlbmRlcicsIHRleHQpO1xuICAgICAgICAgICAgICAgIHZhciBjdXJzb3JJZHggPSBfbGluZS5jdXJzb3IgfHwgMDtcbiAgICAgICAgICAgICAgICBpZihfc2VhcmNoTWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29ySWR4ID0gX3NlYXJjaE1hdGNoLmN1cnNvcmlkeCB8fCAwO1xuICAgICAgICAgICAgICAgICAgICB0ZXh0ID0gX3NlYXJjaE1hdGNoLnRleHQgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSArICcgLnNlYXJjaHRlcm0nKS50ZXh0KF9zZWFyY2hNYXRjaC50ZXJtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGxlZnQgPSBfLmVzY2FwZSh0ZXh0LnN1YnN0cigwLCBjdXJzb3JJZHgpKS5yZXBsYWNlKC8gL2csICcmbmJzcDsnKTtcbiAgICAgICAgICAgICAgICB2YXIgY3Vyc29yID0gdGV4dC5zdWJzdHIoY3Vyc29ySWR4LCAxKTtcbiAgICAgICAgICAgICAgICB2YXIgcmlnaHQgPSBfLmVzY2FwZSh0ZXh0LnN1YnN0cihjdXJzb3JJZHggKyAxKSkucmVwbGFjZSgvIC9nLCAnJm5ic3A7Jyk7XG4gICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpICsgJyAucHJvbXB0JykuaHRtbChfcHJvbXB0KTtcbiAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkgKyAnIC5pbnB1dCAubGVmdCcpLmh0bWwobGVmdCk7XG4gICAgICAgICAgICAgICAgaWYoIWN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkgKyAnIC5pbnB1dCAuY3Vyc29yJykuaHRtbCgnJm5ic3A7JykuY3NzKCd0ZXh0RGVjb3JhdGlvbicsICd1bmRlcmxpbmUnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkgKyAnIC5pbnB1dCAuY3Vyc29yJykudGV4dChjdXJzb3IpLmNzcygndGV4dERlY29yYXRpb24nLCAndW5kZXJsaW5lJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSArICcgLmlucHV0IC5yaWdodCcpLmh0bWwocmlnaHQpO1xuICAgICAgICAgICAgICAgIF9jdXJzb3JfdmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgc2VsZi5zY3JvbGxUb0JvdHRvbSgpO1xuICAgICAgICAgICAgICAgIF9jb25zb2xlLmxvZygncmVuZGVyZWQgXCInICsgdGV4dCArICdcIiB3LyBjdXJzb3IgYXQgJyArIGN1cnNvcklkeCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpKS5yZXBsYWNlV2l0aChzZWxmLnRlbXBsYXRlcy5pbnB1dF9jbWQoe2lkOl9pbnB1dF9pZH0pKTtcbiAgICAgICAgICAgICAgICBzZWxmLnJlbmRlcigpO1xuICAgICAgICAgICAgICAgIF9jb25zb2xlLmxvZygncmVmcmVzaGVkICcgKyBfaW5wdXRfaWQpO1xuXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2Nyb2xsVG9Cb3R0b206IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIF9wYW5lbC5hbmltYXRlKHtzY3JvbGxUb3A6IF92aWV3LmhlaWdodCgpfSwgMCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYmVzdE1hdGNoOiBmdW5jdGlvbihwYXJ0aWFsLCBwb3NzaWJsZSkge1xuICAgICAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImJlc3RNYXRjaCBvbiBwYXJ0aWFsICdcIiArIHBhcnRpYWwgKyBcIidcIik7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGlvbjogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdGlvbnM6IFtdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZighcG9zc2libGUgfHwgcG9zc2libGUubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGNvbW1vbiA9ICcnO1xuICAgICAgICAgICAgICAgIGlmKCFwYXJ0aWFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHBvc3NpYmxlLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29tcGxldGlvbiA9IHBvc3NpYmxlWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnN1Z2dlc3Rpb25zID0gcG9zc2libGU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKCFfLmV2ZXJ5KHBvc3NpYmxlLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBvc3NpYmxlWzBdWzBdID09IHhbMF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc3VnZ2VzdGlvbnMgPSBwb3NzaWJsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHBvc3NpYmxlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvcHRpb24gPSBwb3NzaWJsZVtpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYob3B0aW9uLnNsaWNlKDAsIHBhcnRpYWwubGVuZ3RoKSA9PSBwYXJ0aWFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc3VnZ2VzdGlvbnMucHVzaChvcHRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWNvbW1vbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1vbiA9IG9wdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY29uc29sZS5sb2coXCJpbml0aWFsIGNvbW1vbjpcIiArIGNvbW1vbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYob3B0aW9uLnNsaWNlKDAsIGNvbW1vbi5sZW5ndGgpICE9IGNvbW1vbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImZpbmQgY29tbW9uIHN0ZW0gZm9yICdcIiArIGNvbW1vbiArIFwiJyBhbmQgJ1wiICsgb3B0aW9uICsgXCInXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBqID0gcGFydGlhbC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUoaiA8IGNvbW1vbi5sZW5ndGggJiYgaiA8IG9wdGlvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY29tbW9uW2pdICE9IG9wdGlvbltqXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbW9uID0gY29tbW9uLnN1YnN0cigwLCBqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGorKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0LmNvbXBsZXRpb24gPSBjb21tb24uc3Vic3RyKHBhcnRpYWwubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGlkKGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gXCIjXCIraWQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBjb21tYW5kcygpIHtcbiAgICAgICAgICAgIHJldHVybiBfLmNoYWluKF9jbWRIYW5kbGVycykua2V5cygpLmZpbHRlcihmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhbMF0gIT0gXCJfXCJcbiAgICAgICAgICAgIH0pLnZhbHVlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBibGlua0N1cnNvcigpIHtcbiAgICAgICAgICAgIGlmKCFfYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcm9vdC5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmKCFfYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgX2N1cnNvcl92aXNpYmxlID0gIV9jdXJzb3JfdmlzaWJsZTtcbiAgICAgICAgICAgICAgICBpZihfY3Vyc29yX3Zpc2libGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpICsgJyAuaW5wdXQgLmN1cnNvcicpLmNzcygndGV4dERlY29yYXRpb24nLCAndW5kZXJsaW5lJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpICsgJyAuaW5wdXQgLmN1cnNvcicpLmNzcygndGV4dERlY29yYXRpb24nLCAnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJsaW5rQ3Vyc29yKCk7XG4gICAgICAgICAgICB9LCBfYmxpbmt0aW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNwbGl0KHN0cikge1xuICAgICAgICAgICAgcmV0dXJuIF8uZmlsdGVyKHN0ci5zcGxpdCgvXFxzKy8pLCBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEhhbmRsZXIoY21kKSB7XG4gICAgICAgICAgICByZXR1cm4gX2NtZEhhbmRsZXJzW2NtZF0gfHwgX2NtZEhhbmRsZXJzLl9kZWZhdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVuZGVyT3V0cHV0KG91dHB1dCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICQoJy5wcm9tcHRMaW5lOmhhcyhzcGFuLmlucHV0OmVtcHR5KScpLmhlaWdodCgwKTtcbiAgICAgICAgICAgIGlmKG91dHB1dCkge1xuICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSkuYWZ0ZXIob3V0cHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSArICcgLmlucHV0IC5jdXJzb3InKS5jc3MoJ3RleHREZWNvcmF0aW9uJywgJycpO1xuICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpKS5yZW1vdmVBdHRyKCdpZCcpO1xuICAgICAgICAgICAgJChpZChfc2hlbGxfdmlld19pZCkpLmFwcGVuZChzZWxmLnRlbXBsYXRlcy5pbnB1dF9jbWQoe2lkOl9pbnB1dF9pZH0pKTtcbiAgICAgICAgICAgIGlmKF9wcm9tcHRIYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9wcm9tcHRIYW5kbGVyKGZ1bmN0aW9uKHByb21wdCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnNldFByb21wdChwcm9tcHQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gICAgICAgICAgICBfY29uc29sZS5sb2coXCJhY3RpdmF0aW5nIHNoZWxsXCIpO1xuICAgICAgICAgICAgaWYoIV92aWV3KSB7XG4gICAgICAgICAgICAgICAgX3ZpZXcgPSAkKGlkKF9zaGVsbF92aWV3X2lkKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZighX3BhbmVsKSB7XG4gICAgICAgICAgICAgICAgX3BhbmVsID0gJChpZChfc2hlbGxfcGFuZWxfaWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKCQoaWQoX2lucHV0X2lkKSkubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgICBfdmlldy5hcHBlbmQoc2VsZi50ZW1wbGF0ZXMuaW5wdXRfY21kKHtpZDpfaW5wdXRfaWR9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZWxmLnJlZnJlc2goKTtcbiAgICAgICAgICAgIF9hY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgYmxpbmtDdXJzb3IoKTtcbiAgICAgICAgICAgIGlmKF9wcm9tcHRIYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX3Byb21wdEhhbmRsZXIoZnVuY3Rpb24ocHJvbXB0KSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0UHJvbXB0KHByb21wdCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKF9hY3RpdmF0aW9uSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9hY3RpdmF0aW9uSGFuZGxlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaW5pdFxuICAgICAgICBfcmVhZGxpbmUub25BY3RpdmF0ZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmKCFfaW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICBfaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmKF9pbml0aWFsaXphdGlvbkhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9pbml0aWFsaXphdGlvbkhhbmRsZXIoYWN0aXZhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhY3RpdmF0ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgX3JlYWRsaW5lLm9uRGVhY3RpdmF0ZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmKF9kZWFjdGl2YXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX2RlYWN0aXZhdGlvbkhhbmRsZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIF9yZWFkbGluZS5vbkNoYW5nZShmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICBpZiAoIV9ub0V2ZW50cykge1xuICAgICAgICAgICAgICAgIF9saW5lID0gbGluZTtcbiAgICAgICAgICAgICAgICBzZWxmLnJlbmRlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgX3JlYWRsaW5lLm9uQ2xlYXIoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfY21kSGFuZGxlcnMuY2xlYXIuZXhlYyhudWxsLCBudWxsLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZW5kZXJPdXRwdXQobnVsbCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIF9yZWFkbGluZS5vblJ1bihjb25maWcucnVuKTtcbiAgICAgICAgX3JlYWRsaW5lLm9uU2VhcmNoU3RhcnQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkpLnJlcGxhY2VXaXRoKHNlbGYudGVtcGxhdGVzLmlucHV0X3NlYXJjaCh7aWQ6X2lucHV0X2lkfSkpO1xuICAgICAgICAgICAgX2NvbnNvbGUubG9nKCdzdGFydGVkIHNlYXJjaCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgX3JlYWRsaW5lLm9uU2VhcmNoRW5kKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpKS5yZXBsYWNlV2l0aChzZWxmLnRlbXBsYXRlcy5pbnB1dF9jbWQoe2lkOl9pbnB1dF9pZH0pKTtcbiAgICAgICAgICAgIF9zZWFyY2hNYXRjaCA9IG51bGw7XG4gICAgICAgICAgICBzZWxmLnJlbmRlcigpO1xuICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiZW5kZWQgc2VhcmNoXCIpO1xuICAgICAgICB9KTtcbiAgICAgICAgX3JlYWRsaW5lLm9uU2VhcmNoQ2hhbmdlKGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgICAgICBfc2VhcmNoTWF0Y2ggPSBtYXRjaDtcbiAgICAgICAgICAgIHNlbGYucmVuZGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBfcmVhZGxpbmUub25FbnRlcihmdW5jdGlvbihjbWR0ZXh0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiZ290IGNvbW1hbmQ6IFwiICsgY21kdGV4dCk7XG4gICAgICAgICAgICBjbWR0ZXh0ID0gY29uZmlnLm9uQ29tbWFuZChjbWR0ZXh0KSA9PT0gZmFsc2UgPyAnJyA6IGNtZHRleHQ7XG4gICAgICAgICAgICBjYWxsYmFjayhjbWR0ZXh0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIF9yZWFkbGluZS5vbkNvbXBsZXRpb24oZnVuY3Rpb24obGluZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmKCFsaW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdGV4dCA9IGxpbmUudGV4dC5zdWJzdHIoMCwgbGluZS5jdXJzb3IpO1xuICAgICAgICAgICAgdmFyIHBhcnRzID0gc3BsaXQodGV4dCk7XG5cbiAgICAgICAgICAgIHZhciBjbWQgPSBwYXJ0cy5zaGlmdCgpIHx8ICcnO1xuICAgICAgICAgICAgdmFyIGFyZyA9IHBhcnRzLnBvcCgpIHx8ICcnO1xuICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiZ2V0dGluZyBjb21wbGV0aW9uIGhhbmRsZXIgZm9yIFwiICsgY21kKTtcbiAgICAgICAgICAgIHZhciBoYW5kbGVyID0gZ2V0SGFuZGxlcihjbWQpO1xuICAgICAgICAgICAgaWYoaGFuZGxlciAhPSBfY21kSGFuZGxlcnMuX2RlZmF1bHQgJiYgY21kICYmIGNtZCA9PSB0ZXh0KSB7XG5cbiAgICAgICAgICAgICAgICBfY29uc29sZS5sb2coXCJ2YWxpZCBjbWQsIG5vIGFyZ3M6IGFwcGVuZCBzcGFjZVwiKTtcbiAgICAgICAgICAgICAgICAvLyB0aGUgdGV4dCB0byBjb21wbGV0ZSBpcyBqdXN0IGEgdmFsaWQgY29tbWFuZCwgYXBwZW5kIGEgc3BhY2VcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soJyAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKCFoYW5kbGVyLmNvbXBsZXRpb24pIHtcbiAgICAgICAgICAgICAgICAvLyBoYW5kbGVyIGhhcyBubyBjb21wbGV0aW9uIGZ1bmN0aW9uLCBzbyB3ZSBjYW4ndCBjb21wbGV0ZVxuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiY2FsbGluZyBjb21wbGV0aW9uIGhhbmRsZXIgZm9yIFwiICsgY21kKTtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVyLmNvbXBsZXRpb24oY21kLCBhcmcsIGxpbmUsIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiY29tcGxldGlvbjogXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaCkpO1xuICAgICAgICAgICAgICAgIGlmKCFtYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYobWF0Y2guc3VnZ2VzdGlvbnMgJiYgbWF0Y2guc3VnZ2VzdGlvbnMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVuZGVyT3V0cHV0KHNlbGYudGVtcGxhdGVzLnN1Z2dlc3Qoe3N1Z2dlc3Rpb25zOiBtYXRjaC5zdWdnZXN0aW9uc30pLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG1hdGNoLmNvbXBsZXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG1hdGNoLmNvbXBsZXRpb24pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICB9XG59KSh3aW5kb3csICQsIF8pO1xuIl19
