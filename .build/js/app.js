(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

        // public methods
        var self = {
            commands: commands,
            templates: {
                history: _.template("<div><% _.each(items, function(cmd, i) { %><div><%- i %>&nbsp;<%- cmd %></div><% }); %></div>"),
                help: _.template("<div><div><strong>Commands:</strong></div><% _.each(commands, function(cmd) { %><div>&nbsp;<%- cmd %></div><% }); %></div>"),
                bad_command: _.template('<div><strong>Unrecognized command:&nbsp;</strong><%=cmd%></div>'),
                input_cmd: _.template('<div id="<%- id %>" class="promptLine"><span class="prompt"></span><span class="input"><span class="left"/><span class="cursor"/><span class="right"/></span></div>'),
                input_search: _.template('<div id="<%- id %>">(reverse-i-search)`<span class="searchterm"></span>\':&nbsp;<span class="input"><span class="left"/><span class="cursor"/><span class="right"/></span></div>'),
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
            config.onCommand(cmdtext);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9rcmFrZW4tZGV2dG9vbHMtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21tZXRyYWwvZGV2L2FkdmVudC5qcy9wdWJsaWMvanMvYXBwLmpzIiwiL1VzZXJzL21tZXRyYWwvZGV2L2FkdmVudC5qcy9wdWJsaWMvanMvanNPdXRwdXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG52YXIgSnNPdXRwdXQgPSByZXF1aXJlKCcuL2pzT3V0cHV0Jyk7XG4kKGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBhcHBOYW1lID0gZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWUuc3Vic3RyaW5nKDEpO1xuXG4gICAgdmFyIGpzQ29uZmlnID0ge1xuICAgICAgICBvbkNvbW1hbmQ6IGxvZ2dlcklucHV0LFxuICAgICAgICBjb25zb2xlOmNvbnNvbGVcbiAgICB9O1xuICAgIHZhciBqc091dHB1dCA9IG5ldyBKc091dHB1dChqc0NvbmZpZyk7XG4gICAganNPdXRwdXQuX2NvbmZpZyA9IGpzQ29uZmlnO1xuXG4gICAgZnVuY3Rpb24gc2l6ZXIoKSB7XG4gICAgICAgIHZhciB0b3RhbEhlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKTtcbiAgICAgICAgJCgnI2VkaXRvclJvdycpLmhlaWdodChNYXRoLmZsb29yKHRvdGFsSGVpZ2h0IC8gMikpO1xuICAgICAgICAkKCcjY29uc29sZVJvdycpLmhlaWdodChNYXRoLmZsb29yKHRvdGFsSGVpZ2h0IC8gMikpO1xuICAgIH1cblxuICAgIHNpemVyKCk7XG4gICAgJCh3aW5kb3cpLnJlc2l6ZShzaXplcik7XG5cbiAgICBqc091dHB1dC5vbk5ld1Byb21wdChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soJycpO1xuICAgIH0pO1xuXG4gICAgaWYgKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY29kZScgKyBhcHBOYW1lKSkge1xuICAgICAgICAkKCcjZWRpdG9yJykudGV4dCh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NvZGUnICsgYXBwTmFtZSkpO1xuICAgIH1cblxuICAgIHZhciBlZGl0b3IgPSBhY2UuZWRpdCgnZWRpdG9yJyk7XG4gICAgZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgIGVkaXRvci5nZXRTZXNzaW9uKCkuc2V0TW9kZSgnYWNlL21vZGUvamF2YXNjcmlwdCcpO1xuXG4gICAgZWRpdG9yLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY29kZScgKyBhcHBOYW1lLCBlZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCkpO1xuICAgICAgICBpZiAoJCgnI2F1dG9SdW4nKS5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcnVuKCk7XG4gICAgICAgICAgICB9IGNhdGNoICh4KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGVkaXRvci5vbignZm9jdXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAganNPdXRwdXQuZGVhY3RpdmF0ZSgpO1xuICAgIH0pO1xuXG4gICAgZWRpdG9yLmNvbW1hbmRzLmFkZENvbW1hbmQoe1xuICAgICAgICBuYW1lOiAnUnVuJyxcbiAgICAgICAgYmluZEtleTogJ0N0cmwtUicsXG4gICAgICAgIGV4ZWM6IGZ1bmN0aW9uIChlZGl0b3IpIHtcbiAgICAgICAgICAgIHJ1bigpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZWRpdG9yLmNvbW1hbmRzLmFkZENvbW1hbmQoe1xuICAgICAgICBuYW1lOiAnQ2xlYXInLFxuICAgICAgICBiaW5kS2V5OiAnQ3RybC1MJyxcbiAgICAgICAgZXhlYzogZnVuY3Rpb24gKGVkaXRvcikge1xuICAgICAgICAgICAganNPdXRwdXQuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgICQoJyNydW4nKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJ1bigpO1xuICAgIH0pO1xuXG4gICAgdmFyIGNvbnRleHQgPSBjbG9zdXJlKGVkaXRvciwganNPdXRwdXQpO1xuXG4gICAgZnVuY3Rpb24gcnVuKGNvZGUpIHtcbiAgICAgICAgY29udGV4dChjb2RlIHx8IGVkaXRvci5nZXRTZXNzaW9uKCkuZ2V0VmFsdWUoKSk7XG4gICAgfVxuXG4gICAganNPdXRwdXQuYWN0aXZhdGUoKTtcbiAgICBlZGl0b3IuZm9jdXMoKTtcbn0pO1xuXG5mdW5jdGlvbiBsb2dnZXJJbnB1dCh0ZXh0KSB7XG4gICAgY29uc29sZS5sb2coJ1VuZXhwZWN0ZWQgaW5wdXQnLCB0ZXh0KTtcbn1cblxuZnVuY3Rpb24gY2xvc3VyZShlZGl0b3IsIG91dHB1dCkge1xuICAgIHZhciBwcmludCA9IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgICAgIG91dHB1dC5yZW5kZXJPdXRwdXQodGV4dCwgZnVuY3Rpb24gKCkge30pO1xuICAgIH0sIHJlYWRMaW5lID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXNvbHZlcjtcbiAgICAgICAgb3V0cHV0Ll9jb25maWcub25Db21tYW5kID0gZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmVyKGxpbmUpO1xuICAgICAgICAgICAgfSwwKTtcbiAgICAgICAgICAgIG91dHB1dC5fY29uZmlnLm9uQ29tbWFuZCA9IGxvZ2dlcklucHV0O1xuICAgICAgICAgICAgb3V0cHV0LmRlYWN0aXZhdGUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgZWRpdG9yLmJsdXIoKTtcbiAgICAgICAgb3V0cHV0LmFjdGl2YXRlKCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkgIHtcbiAgICAgICAgICAgIHJlc29sdmVyID0gcmVzb2x2ZTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoY29kZSkge1xuICAgICAgICB2YXIgdHJhbnNmb3JtZWQgPSBiYWJlbC50cmFuc2Zvcm0oY29kZSx7c3RhZ2U6MH0pO1xuICAgICAgICBldmFsKHRyYW5zZm9ybWVkLmNvZGUpO1xuICAgIH1cbn1cbiIsIi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSpcbiAqIENvcHlyaWdodCAyMDEzLTIwMTQgQXJuZSBGLiBDbGFhc3NlblxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxudmFyIEpvc2ggPSB3aW5kb3dbXCJKb3NoXCJdIHx8IHt9O1xuKGZ1bmN0aW9uKHJvb3QsICQsIF8pIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEpvc2guU2hlbGwgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuXG4gICAgICAgIC8vIGluc3RhbmNlIGZpZWxkc1xuICAgICAgICB2YXIgX2NvbnNvbGUgPSBjb25maWcuY29uc29sZSB8fCAoSm9zaC5EZWJ1ZyAmJiByb290LmNvbnNvbGUgPyByb290LmNvbnNvbGUgOiB7XG4gICAgICAgICAgICAgICAgbG9nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgdmFyIF9ub0V2ZW50cyA9IGZhbHNlO1xuICAgICAgICB2YXIgX3Byb21wdCA9IGNvbmZpZy5wcm9tcHQgfHwgJ2pzaCQnO1xuICAgICAgICB2YXIgX3NoZWxsX3ZpZXdfaWQgPSBjb25maWcuc2hlbGxfdmlld19pZCB8fCAnc2hlbGwtdmlldyc7XG4gICAgICAgIHZhciBfc2hlbGxfcGFuZWxfaWQgPSBjb25maWcuc2hlbGxfcGFuZWxfaWQgfHwgJ3NoZWxsLXBhbmVsJztcbiAgICAgICAgdmFyIF9pbnB1dF9pZCA9IGNvbmZpZy5pbnB1dF9pZCB8fCAnc2hlbGwtY2xpJztcbiAgICAgICAgdmFyIF9ibGlua3RpbWUgPSBjb25maWcuYmxpbmt0aW1lIHx8IDUwMDtcbiAgICAgICAgdmFyIF9oaXN0b3J5ID0gY29uZmlnLmhpc3RvcnkgfHwgbmV3IEpvc2guSGlzdG9yeSgpO1xuICAgICAgICB2YXIgX3JlYWRsaW5lID0gY29uZmlnLnJlYWRsaW5lIHx8IG5ldyBKb3NoLlJlYWRMaW5lKHtoaXN0b3J5OiBfaGlzdG9yeSwgY29uc29sZTogX2NvbnNvbGV9KTtcbiAgICAgICAgdmFyIF9hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgdmFyIF9jdXJzb3JfdmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICB2YXIgX2FjdGl2YXRpb25IYW5kbGVyO1xuICAgICAgICB2YXIgX2RlYWN0aXZhdGlvbkhhbmRsZXI7XG4gICAgICAgIHZhciBfY21kSGFuZGxlcnMgPSB7XG4gICAgICAgICAgICBfZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIGV4ZWM6IGZ1bmN0aW9uKGNtZCwgYXJncywgY2FsbGJhY2spIHtcblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhzZWxmLnRlbXBsYXRlcy5iYWRfY29tbWFuZCh7Y21kOiBjbWR9KSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjb21wbGV0aW9uOiBmdW5jdGlvbihjbWQsIGFyZywgbGluZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIWFyZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJnID0gY21kO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhzZWxmLmJlc3RNYXRjaChhcmcsIHNlbGYuY29tbWFuZHMoKSkpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB2YXIgX2xpbmUgPSB7XG4gICAgICAgICAgICB0ZXh0OiAnJyxcbiAgICAgICAgICAgIGN1cnNvcjogMFxuICAgICAgICB9O1xuICAgICAgICB2YXIgX3NlYXJjaE1hdGNoID0gJyc7XG4gICAgICAgIHZhciBfdmlldywgX3BhbmVsO1xuICAgICAgICB2YXIgX3Byb21wdEhhbmRsZXI7XG4gICAgICAgIHZhciBfaW5pdGlhbGl6YXRpb25IYW5kbGVyO1xuICAgICAgICB2YXIgX2luaXRpYWxpemVkO1xuXG4gICAgICAgIC8vIHB1YmxpYyBtZXRob2RzXG4gICAgICAgIHZhciBzZWxmID0ge1xuICAgICAgICAgICAgY29tbWFuZHM6IGNvbW1hbmRzLFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgaGlzdG9yeTogXy50ZW1wbGF0ZShcIjxkaXY+PCUgXy5lYWNoKGl0ZW1zLCBmdW5jdGlvbihjbWQsIGkpIHsgJT48ZGl2PjwlLSBpICU+Jm5ic3A7PCUtIGNtZCAlPjwvZGl2PjwlIH0pOyAlPjwvZGl2PlwiKSxcbiAgICAgICAgICAgICAgICBoZWxwOiBfLnRlbXBsYXRlKFwiPGRpdj48ZGl2PjxzdHJvbmc+Q29tbWFuZHM6PC9zdHJvbmc+PC9kaXY+PCUgXy5lYWNoKGNvbW1hbmRzLCBmdW5jdGlvbihjbWQpIHsgJT48ZGl2PiZuYnNwOzwlLSBjbWQgJT48L2Rpdj48JSB9KTsgJT48L2Rpdj5cIiksXG4gICAgICAgICAgICAgICAgYmFkX2NvbW1hbmQ6IF8udGVtcGxhdGUoJzxkaXY+PHN0cm9uZz5VbnJlY29nbml6ZWQgY29tbWFuZDombmJzcDs8L3N0cm9uZz48JT1jbWQlPjwvZGl2PicpLFxuICAgICAgICAgICAgICAgIGlucHV0X2NtZDogXy50ZW1wbGF0ZSgnPGRpdiBpZD1cIjwlLSBpZCAlPlwiIGNsYXNzPVwicHJvbXB0TGluZVwiPjxzcGFuIGNsYXNzPVwicHJvbXB0XCI+PC9zcGFuPjxzcGFuIGNsYXNzPVwiaW5wdXRcIj48c3BhbiBjbGFzcz1cImxlZnRcIi8+PHNwYW4gY2xhc3M9XCJjdXJzb3JcIi8+PHNwYW4gY2xhc3M9XCJyaWdodFwiLz48L3NwYW4+PC9kaXY+JyksXG4gICAgICAgICAgICAgICAgaW5wdXRfc2VhcmNoOiBfLnRlbXBsYXRlKCc8ZGl2IGlkPVwiPCUtIGlkICU+XCI+KHJldmVyc2UtaS1zZWFyY2gpYDxzcGFuIGNsYXNzPVwic2VhcmNodGVybVwiPjwvc3Bhbj5cXCc6Jm5ic3A7PHNwYW4gY2xhc3M9XCJpbnB1dFwiPjxzcGFuIGNsYXNzPVwibGVmdFwiLz48c3BhbiBjbGFzcz1cImN1cnNvclwiLz48c3BhbiBjbGFzcz1cInJpZ2h0XCIvPjwvc3Bhbj48L2Rpdj4nKSxcbiAgICAgICAgICAgICAgICBzdWdnZXN0OiBfLnRlbXBsYXRlKFwiPGRpdj48JSBfLmVhY2goc3VnZ2VzdGlvbnMsIGZ1bmN0aW9uKHN1Z2dlc3Rpb24pIHsgJT48ZGl2PjwlLSBzdWdnZXN0aW9uICU+PC9kaXY+PCUgfSk7ICU+PC9kaXY+XCIpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaXNBY3RpdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfcmVhZGxpbmUuaXNBY3RpdmUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhY3RpdmF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYoJChpZChfc2hlbGxfdmlld19pZCkpLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIF9hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBfbGluZS50ZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgX2xpbmUuY3Vyc29yID0gMDtcbiAgICAgICAgICAgICAgICBfbm9FdmVudHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIF9yZWFkbGluZS5zZXRMaW5lKF9saW5lKTtcbiAgICAgICAgICAgICAgICBfbm9FdmVudHMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBfcmVhZGxpbmUuYWN0aXZhdGUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSkucGFyZW50KCkuZW1wdHkoKTtcbiAgICAgICAgICAgICAgICBzZWxmLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWFjdGl2YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBfY29uc29sZS5sb2coXCJkZWFjdGl2YXRpbmdcIik7XG4gICAgICAgICAgICAgICAgX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIF9yZWFkbGluZS5kZWFjdGl2YXRlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0Q29tbWFuZEhhbmRsZXI6IGZ1bmN0aW9uKGNtZCwgY21kSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9jbWRIYW5kbGVyc1tjbWRdID0gY21kSGFuZGxlcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRDb21tYW5kSGFuZGxlcjogZnVuY3Rpb24oY21kKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9jbWRIYW5kbGVyc1tjbWRdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldFByb21wdDogZnVuY3Rpb24ocHJvbXB0KSB7XG4gICAgICAgICAgICAgICAgX3Byb21wdCA9IHByb21wdDtcbiAgICAgICAgICAgICAgICBpZighX2FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbGYucmVmcmVzaCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRU9UOiBmdW5jdGlvbihjb21wbGV0aW9uSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9yZWFkbGluZS5vbkVPVChjb21wbGV0aW9uSGFuZGxlcik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DYW5jZWw6IGZ1bmN0aW9uKGNvbXBsZXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX3JlYWRsaW5lLm9uQ2FuY2VsKGNvbXBsZXRpb25IYW5kbGVyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkluaXRpYWxpemU6IGZ1bmN0aW9uKGNvbXBsZXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX2luaXRpYWxpemF0aW9uSGFuZGxlciA9IGNvbXBsZXRpb25IYW5kbGVyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQWN0aXZhdGU6IGZ1bmN0aW9uKGNvbXBsZXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX2FjdGl2YXRpb25IYW5kbGVyID0gY29tcGxldGlvbkhhbmRsZXI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25EZWFjdGl2YXRlOiBmdW5jdGlvbihjb21wbGV0aW9uSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIF9kZWFjdGl2YXRpb25IYW5kbGVyID0gY29tcGxldGlvbkhhbmRsZXI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25OZXdQcm9tcHQ6IGZ1bmN0aW9uKGNvbXBsZXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX3Byb21wdEhhbmRsZXIgPSBjb21wbGV0aW9uSGFuZGxlcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZW5kZXJPdXRwdXQ6IHJlbmRlck91dHB1dCxcbiAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRleHQgPSBfbGluZS50ZXh0IHx8ICcnO1xuICAgICAgICAgICAgICAgIF9jb25zb2xlLmxvZygnU3RhcnQgcmVuZGVyJywgdGV4dCk7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnNvcklkeCA9IF9saW5lLmN1cnNvciB8fCAwO1xuICAgICAgICAgICAgICAgIGlmKF9zZWFyY2hNYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3JJZHggPSBfc2VhcmNoTWF0Y2guY3Vyc29yaWR4IHx8IDA7XG4gICAgICAgICAgICAgICAgICAgIHRleHQgPSBfc2VhcmNoTWF0Y2gudGV4dCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpICsgJyAuc2VhcmNodGVybScpLnRleHQoX3NlYXJjaE1hdGNoLnRlcm0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgbGVmdCA9IF8uZXNjYXBlKHRleHQuc3Vic3RyKDAsIGN1cnNvcklkeCkpLnJlcGxhY2UoLyAvZywgJyZuYnNwOycpO1xuICAgICAgICAgICAgICAgIHZhciBjdXJzb3IgPSB0ZXh0LnN1YnN0cihjdXJzb3JJZHgsIDEpO1xuICAgICAgICAgICAgICAgIHZhciByaWdodCA9IF8uZXNjYXBlKHRleHQuc3Vic3RyKGN1cnNvcklkeCArIDEpKS5yZXBsYWNlKC8gL2csICcmbmJzcDsnKTtcbiAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkgKyAnIC5wcm9tcHQnKS5odG1sKF9wcm9tcHQpO1xuICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSArICcgLmlucHV0IC5sZWZ0JykuaHRtbChsZWZ0KTtcbiAgICAgICAgICAgICAgICBpZighY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSArICcgLmlucHV0IC5jdXJzb3InKS5odG1sKCcmbmJzcDsnKS5jc3MoJ3RleHREZWNvcmF0aW9uJywgJ3VuZGVybGluZScpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoaWQoX2lucHV0X2lkKSArICcgLmlucHV0IC5jdXJzb3InKS50ZXh0KGN1cnNvcikuY3NzKCd0ZXh0RGVjb3JhdGlvbicsICd1bmRlcmxpbmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpICsgJyAuaW5wdXQgLnJpZ2h0JykuaHRtbChyaWdodCk7XG4gICAgICAgICAgICAgICAgX2N1cnNvcl92aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzZWxmLnNjcm9sbFRvQm90dG9tKCk7XG4gICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKCdyZW5kZXJlZCBcIicgKyB0ZXh0ICsgJ1wiIHcvIGN1cnNvciBhdCAnICsgY3Vyc29ySWR4KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWZyZXNoOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkpLnJlcGxhY2VXaXRoKHNlbGYudGVtcGxhdGVzLmlucHV0X2NtZCh7aWQ6X2lucHV0X2lkfSkpO1xuICAgICAgICAgICAgICAgIHNlbGYucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKCdyZWZyZXNoZWQgJyArIF9pbnB1dF9pZCk7XG5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzY3JvbGxUb0JvdHRvbTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgX3BhbmVsLmFuaW1hdGUoe3Njcm9sbFRvcDogX3ZpZXcuaGVpZ2h0KCl9LCAwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBiZXN0TWF0Y2g6IGZ1bmN0aW9uKHBhcnRpYWwsIHBvc3NpYmxlKSB7XG4gICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiYmVzdE1hdGNoIG9uIHBhcnRpYWwgJ1wiICsgcGFydGlhbCArIFwiJ1wiKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgICAgICBjb21wbGV0aW9uOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBzdWdnZXN0aW9uczogW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmKCFwb3NzaWJsZSB8fCBwb3NzaWJsZS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY29tbW9uID0gJyc7XG4gICAgICAgICAgICAgICAgaWYoIXBhcnRpYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYocG9zc2libGUubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb21wbGV0aW9uID0gcG9zc2libGVbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc3VnZ2VzdGlvbnMgPSBwb3NzaWJsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYoIV8uZXZlcnkocG9zc2libGUsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcG9zc2libGVbMF1bMF0gPT0geFswXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zdWdnZXN0aW9ucyA9IHBvc3NpYmxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcG9zc2libGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9wdGlvbiA9IHBvc3NpYmxlW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZihvcHRpb24uc2xpY2UoMCwgcGFydGlhbC5sZW5ndGgpID09IHBhcnRpYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zdWdnZXN0aW9ucy5wdXNoKG9wdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZighY29tbW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbW9uID0gb3B0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImluaXRpYWwgY29tbW9uOlwiICsgY29tbW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZihvcHRpb24uc2xpY2UoMCwgY29tbW9uLmxlbmd0aCkgIT0gY29tbW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiZmluZCBjb21tb24gc3RlbSBmb3IgJ1wiICsgY29tbW9uICsgXCInIGFuZCAnXCIgKyBvcHRpb24gKyBcIidcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGogPSBwYXJ0aWFsLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZShqIDwgY29tbW9uLmxlbmd0aCAmJiBqIDwgb3B0aW9uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjb21tb25bal0gIT0gb3B0aW9uW2pdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tb24gPSBjb21tb24uc3Vic3RyKDAsIGopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQuY29tcGxldGlvbiA9IGNvbW1vbi5zdWJzdHIocGFydGlhbC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gaWQoaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBcIiNcIitpZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNvbW1hbmRzKCkge1xuICAgICAgICAgICAgcmV0dXJuIF8uY2hhaW4oX2NtZEhhbmRsZXJzKS5rZXlzKCkuZmlsdGVyKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geFswXSAhPSBcIl9cIlxuICAgICAgICAgICAgfSkudmFsdWUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGJsaW5rQ3Vyc29yKCkge1xuICAgICAgICAgICAgaWYoIV9hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByb290LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYoIV9hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBfY3Vyc29yX3Zpc2libGUgPSAhX2N1cnNvcl92aXNpYmxlO1xuICAgICAgICAgICAgICAgIGlmKF9jdXJzb3JfdmlzaWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkgKyAnIC5pbnB1dCAuY3Vyc29yJykuY3NzKCd0ZXh0RGVjb3JhdGlvbicsICd1bmRlcmxpbmUnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkgKyAnIC5pbnB1dCAuY3Vyc29yJykuY3NzKCd0ZXh0RGVjb3JhdGlvbicsICcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYmxpbmtDdXJzb3IoKTtcbiAgICAgICAgICAgIH0sIF9ibGlua3RpbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3BsaXQoc3RyKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5maWx0ZXIoc3RyLnNwbGl0KC9cXHMrLyksIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0SGFuZGxlcihjbWQpIHtcbiAgICAgICAgICAgIHJldHVybiBfY21kSGFuZGxlcnNbY21kXSB8fCBfY21kSGFuZGxlcnMuX2RlZmF1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW5kZXJPdXRwdXQob3V0cHV0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgJCgnLnByb21wdExpbmU6aGFzKHNwYW4uaW5wdXQ6ZW1wdHkpJykuaGVpZ2h0KDApO1xuICAgICAgICAgICAgaWYob3V0cHV0KSB7XG4gICAgICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpKS5hZnRlcihvdXRwdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpICsgJyAuaW5wdXQgLmN1cnNvcicpLmNzcygndGV4dERlY29yYXRpb24nLCAnJyk7XG4gICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkpLnJlbW92ZUF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAkKGlkKF9zaGVsbF92aWV3X2lkKSkuYXBwZW5kKHNlbGYudGVtcGxhdGVzLmlucHV0X2NtZCh7aWQ6X2lucHV0X2lkfSkpO1xuICAgICAgICAgICAgaWYoX3Byb21wdEhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX3Byb21wdEhhbmRsZXIoZnVuY3Rpb24ocHJvbXB0KSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0UHJvbXB0KHByb21wdCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbiAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImFjdGl2YXRpbmcgc2hlbGxcIik7XG4gICAgICAgICAgICBpZighX3ZpZXcpIHtcbiAgICAgICAgICAgICAgICBfdmlldyA9ICQoaWQoX3NoZWxsX3ZpZXdfaWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKCFfcGFuZWwpIHtcbiAgICAgICAgICAgICAgICBfcGFuZWwgPSAkKGlkKF9zaGVsbF9wYW5lbF9pZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoJChpZChfaW5wdXRfaWQpKS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgIF92aWV3LmFwcGVuZChzZWxmLnRlbXBsYXRlcy5pbnB1dF9jbWQoe2lkOl9pbnB1dF9pZH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlbGYucmVmcmVzaCgpO1xuICAgICAgICAgICAgX2FjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICBibGlua0N1cnNvcigpO1xuICAgICAgICAgICAgaWYoX3Byb21wdEhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBfcHJvbXB0SGFuZGxlcihmdW5jdGlvbihwcm9tcHQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXRQcm9tcHQocHJvbXB0KTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoX2FjdGl2YXRpb25IYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgX2FjdGl2YXRpb25IYW5kbGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpbml0XG4gICAgICAgIF9yZWFkbGluZS5vbkFjdGl2YXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYoIV9pbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgIF9pbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYoX2luaXRpYWxpemF0aW9uSGFuZGxlcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX2luaXRpYWxpemF0aW9uSGFuZGxlcihhY3RpdmF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFjdGl2YXRlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBfcmVhZGxpbmUub25EZWFjdGl2YXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYoX2RlYWN0aXZhdGlvbkhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBfZGVhY3RpdmF0aW9uSGFuZGxlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgX3JlYWRsaW5lLm9uQ2hhbmdlKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIGlmICghX25vRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgX2xpbmUgPSBsaW5lO1xuICAgICAgICAgICAgICAgIHNlbGYucmVuZGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBfcmVhZGxpbmUub25DbGVhcihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF9jbWRIYW5kbGVycy5jbGVhci5leGVjKG51bGwsIG51bGwsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJlbmRlck91dHB1dChudWxsLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgX3JlYWRsaW5lLm9uU2VhcmNoU3RhcnQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKGlkKF9pbnB1dF9pZCkpLnJlcGxhY2VXaXRoKHNlbGYudGVtcGxhdGVzLmlucHV0X3NlYXJjaCh7aWQ6X2lucHV0X2lkfSkpO1xuICAgICAgICAgICAgX2NvbnNvbGUubG9nKCdzdGFydGVkIHNlYXJjaCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgX3JlYWRsaW5lLm9uU2VhcmNoRW5kKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJChpZChfaW5wdXRfaWQpKS5yZXBsYWNlV2l0aChzZWxmLnRlbXBsYXRlcy5pbnB1dF9jbWQoe2lkOl9pbnB1dF9pZH0pKTtcbiAgICAgICAgICAgIF9zZWFyY2hNYXRjaCA9IG51bGw7XG4gICAgICAgICAgICBzZWxmLnJlbmRlcigpO1xuICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiZW5kZWQgc2VhcmNoXCIpO1xuICAgICAgICB9KTtcbiAgICAgICAgX3JlYWRsaW5lLm9uU2VhcmNoQ2hhbmdlKGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgICAgICBfc2VhcmNoTWF0Y2ggPSBtYXRjaDtcbiAgICAgICAgICAgIHNlbGYucmVuZGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBfcmVhZGxpbmUub25FbnRlcihmdW5jdGlvbihjbWR0ZXh0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwiZ290IGNvbW1hbmQ6IFwiICsgY21kdGV4dCk7XG4gICAgICAgICAgICBjb25maWcub25Db21tYW5kKGNtZHRleHQpO1xuICAgICAgICAgICAgY2FsbGJhY2soY21kdGV4dCk7XG4gICAgICAgIH0pO1xuICAgICAgICBfcmVhZGxpbmUub25Db21wbGV0aW9uKGZ1bmN0aW9uKGxpbmUsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpZighbGluZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHRleHQgPSBsaW5lLnRleHQuc3Vic3RyKDAsIGxpbmUuY3Vyc29yKTtcbiAgICAgICAgICAgIHZhciBwYXJ0cyA9IHNwbGl0KHRleHQpO1xuXG4gICAgICAgICAgICB2YXIgY21kID0gcGFydHMuc2hpZnQoKSB8fCAnJztcbiAgICAgICAgICAgIHZhciBhcmcgPSBwYXJ0cy5wb3AoKSB8fCAnJztcbiAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImdldHRpbmcgY29tcGxldGlvbiBoYW5kbGVyIGZvciBcIiArIGNtZCk7XG4gICAgICAgICAgICB2YXIgaGFuZGxlciA9IGdldEhhbmRsZXIoY21kKTtcbiAgICAgICAgICAgIGlmKGhhbmRsZXIgIT0gX2NtZEhhbmRsZXJzLl9kZWZhdWx0ICYmIGNtZCAmJiBjbWQgPT0gdGV4dCkge1xuXG4gICAgICAgICAgICAgICAgX2NvbnNvbGUubG9nKFwidmFsaWQgY21kLCBubyBhcmdzOiBhcHBlbmQgc3BhY2VcIik7XG4gICAgICAgICAgICAgICAgLy8gdGhlIHRleHQgdG8gY29tcGxldGUgaXMganVzdCBhIHZhbGlkIGNvbW1hbmQsIGFwcGVuZCBhIHNwYWNlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCcgJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZighaGFuZGxlci5jb21wbGV0aW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gaGFuZGxlciBoYXMgbm8gY29tcGxldGlvbiBmdW5jdGlvbiwgc28gd2UgY2FuJ3QgY29tcGxldGVcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImNhbGxpbmcgY29tcGxldGlvbiBoYW5kbGVyIGZvciBcIiArIGNtZCk7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlci5jb21wbGV0aW9uKGNtZCwgYXJnLCBsaW5lLCBmdW5jdGlvbihtYXRjaCkge1xuICAgICAgICAgICAgICAgIF9jb25zb2xlLmxvZyhcImNvbXBsZXRpb246IFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2gpKTtcbiAgICAgICAgICAgICAgICBpZighbWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKG1hdGNoLnN1Z2dlc3Rpb25zICYmIG1hdGNoLnN1Z2dlc3Rpb25zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlbmRlck91dHB1dChzZWxmLnRlbXBsYXRlcy5zdWdnZXN0KHtzdWdnZXN0aW9uczogbWF0Y2guc3VnZ2VzdGlvbnN9KSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhtYXRjaC5jb21wbGV0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhtYXRjaC5jb21wbGV0aW9uKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfVxufSkod2luZG93LCAkLCBfKTtcbiJdfQ==
