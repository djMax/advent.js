'use strict';

var JsOutput = require('./jsOutput'),
    _jsListeners = {},
    canvas;

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

function game() {
    var players = {}, myName, current, jsOutput, jsConfig, leftValue, rightValue, curOpFn;

    var socket = io();
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

    var socket = io();
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
        _jsListeners[m.type].forEach(function (fn) {
            try {
                fn(m.message, m.type);
            } catch (x) {
                console.log(x);
            }
        });
    });

    $('#copyprog').on('click', function () {
        socket.emit('share', {
            code: editor.getSession().getValue()
        });
    });

    var shareProg;
    socket.on('share', function (m) {
        $('#getprog').fadeIn();
        console.log(m);
        shareProg = m.code;
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

    var socket = io();
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
        _jsListeners[m.type].forEach(function (fn) {
            try {
                fn(m.message, m.type);
            } catch (x) {
                console.log(x);
            }
        });
    });

    $('#copyprog').on('click', function () {
        socket.emit('share', {
            code: editor.getSession().getValue()
        });
    });

    var shareProg;
    socket.on('share', function (m) {
        $('#getprog').fadeIn();
        shareProg = m.code;
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
        line = function (c,x,y,w,h) {
            var canvasContext = canvas.getContext('2d');
            canvasContext.beginPath();
            canvasContext.moveTo(x,y);
            canvasContext.lineTo(x+w,y+h);
            canvasContext.strokeStyle = c;
            canvasContext.stroke();
        }, clear = function () {
            var canvasContext = canvas.getContext('2d');
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        }, circle = function (color, centerX, centerY, radius) {
            var canvasContext = canvas.getContext('2d');
            canvasContext.beginPath();
            canvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
            canvasContext.fillStyle = color;
            canvasContext.fill();
            canvasContext.lineWidth = 5;
            canvasContext.strokeStyle = color;
            canvasContext.stroke();
        }, fill = function (color) {
            var canvasContext = canvas.getContext('2d');
            canvasContext.beginPath();
            canvasContext.rect(0, 0, canvas.width, canvas.height);
            canvasContext.fillStyle = color;
            canvasContext.fill();
        }, rect = function (c,x,y,w,h) {
            var canvasContext = canvas.getContext('2d');
            canvasContext.beginPath();
            canvasContext.rect(x,y,w,h);
            canvasContext.fillStyle = c;
            canvasContext.fill();
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
            socket.emit('chat', {type:type, message:message});
        }, on = function (e, fn) {
            _jsListeners[e] = _jsListeners[e] || [];
            _jsListeners[e].push(fn);
        };

    return (function (code) {
        console.trace('Running code');
        var transformed = babel.transform('var programFunction = async function () { ' + code + '}; programFunction();', {stage: 0});
        var width = canvas.width, height = canvas.height;
        eval(transformed.code);
    });
}

function closure(socket, editor, output) {
    var print = function (text) {
            output.renderOutput(text, function () {
            });
        }, clear = function () {
            output.clear();
            output.renderOutput('>', function () {

            });
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
        }, readline = readLine,
        send = function (type, message) {
            if (type && !message) {
                message = type;
                type = null;
            }
            socket.emit('chat', {type:type, message:message});
        }, on = function (e, fn) {
            _jsListeners[e] = _jsListeners[e] || [];
            _jsListeners[e].push(fn);
        };

    return (function (code) {
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
