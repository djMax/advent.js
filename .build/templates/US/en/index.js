(function(dust){dust.register("index",body_0);var blocks={"title":body_1,"body":body_2,"style":body_3,"script":body_4};function body_0(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.p("layouts/master",ctx,{});}body_0.__dustBody=!0;function body_1(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.w("Advent.js Javascript Playground");}body_1.__dustBody=!0;function body_2(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.w("<div class=\"github-fork-ribbon-wrapper right-bottom\"><div class=\"github-fork-ribbon\"><a target=\"_blank\" href=\"https://github.com/djMax/advent.js\">Fork me on GitHub</a></div></div><div class=\"container-fluid\"><div class=\"row\" id=\"editorRow\"><div class=\"col-sm-10\" style=\"height:100%; padding-left: 0px;\"><div id=\"editor\">// Your code goes here.\nasync function helloWorld() {\n  print('What is your name?');\n  var player = await readLine();\n  print(`Hello ${player}`);\n}\nhelloWorld();</div></div><div class=\"col-sm-2\" style=\"height:100%; padding-left: 0px; padding-top: 10px\"><button id=\"run\" class=\"btn btn-primary btn-block\">Run (Control-R)</button><button id=\"clear\" class=\"btn btn-primary btn-block\">Clear Bottom Screen (Control-L)</button><button id=\"share\" class=\"btn btn-primary btn-block\">Share this Program</button><button id=\"copyprog\" class=\"btn btn-secondary btn-block\">Copy to Others</button><button id=\"getprog\" class=\"btn btn-secondary btn-block\" style=\"display:none;\">Receive</button><center><div id=\"microphone\"></div></center></div></div><div class=\"row\" id=\"consoleRow\"><div id=\"shell-panel\"><div id=\"shell-view\"></div></div></div></div><div id=\"urlModal\" class=\"modal fade\"><div class=\"modal-dialog\"><div class=\"modal-content\"><div class=\"modal-header\"><button type=\"button\" class=\"close\" data-dismiss=\"modal\"><span aria-hidden=\"true\">&times;</span><span class=\"sr-only\">Close</span></button><h4 class=\"modal-title\">Use this link to share this program</h4></div><div class=\"modal-body\"><div style=\"width:645px;\"><textarea style=\"width:570px;height:300px;\"></textarea></div></div><div class=\"modal-footer\"><button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button></div></div><!-- /.modal-content --></div><!-- /.modal-dialog --></div><!-- /.modal -->");}body_2.__dustBody=!0;function body_3(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.w("<link href=\"/components/github-fork-ribbon-css/gh-fork-ribbon.css\" rel=\"stylesheet\" type=\"text/css\"><link href='http://fonts.googleapis.com/css?family=Source+Code+Pro' rel='stylesheet' type='text/css'>");}body_3.__dustBody=!0;function body_4(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.w("<script src=\"/components/bootbox/bootbox.js\"></script><script src=\"/components/lz-string/libs/lz-string.min.js\"></script><script src=\"/js/browser-polyfill.js\" type=\"text/javascript\"></script><script src=\"/js/browser.js\" type=\"text/javascript\"></script><script src=\"/components/josh.js/js/readline.js\" type=\"text/javascript\"></script><script src=\"/components/josh.js/js/history.js\" type=\"text/javascript\"></script><script src=\"/components/josh.js/js/killring.js\" type=\"text/javascript\"></script><script src=\"/components/ace-builds/src-noconflict/ace.js\" charset=\"utf-8\"></script><script src=\"/components/ace-builds/src-noconflict/ext-language_tools.js\" charset=\"utf-8\"></script><script src=\"/socket.io/socket.io.js\"></script><script src=\"/wit/microphone/microphone.min.js\"></script><script type=\"text/javascript\">var page = 'consoleGame';</script>");}body_4.__dustBody=!0;return body_0;})(dust);