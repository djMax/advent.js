(function(dust){dust.register("login",body_0);var blocks={"title":body_1,"body":body_2,"script":body_3,"style":body_4};function body_0(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.p("layouts/master",ctx,ctx,{});}body_0.__dustBody=!0;function body_1(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.w("Login to Advent.js Playground");}body_1.__dustBody=!0;function body_2(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.w("<div class='form animated flipInX'><h2>Your MineCraft Account</h2><form id=\"login\"><input placeholder='Username' name='username' type='text'><input placeholder='Password' name='password' type='password'><button class='animated infinite pulse'>Login</button></form></div>");}body_2.__dustBody=!0;function body_3(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.w("<script type=\"text/javascript\">var page = 'loginPage';</script>");}body_3.__dustBody=!0;function body_4(chk,ctx){ctx=ctx.shiftBlocks(blocks);return chk.w("<link rel=\"stylesheet\" href=\"http://daneden.github.io/animate.css/animate.min.css\"><link rel=\"stylesheet\" href=\"http://fonts.googleapis.com/css?family=Roboto:400,100,400italic,700italic,700\"><style type=\"text/css\">body {background: #2ecc71 url(\"http://38.media.tumblr.com/d23deac40b06633b79520a8552f40b94/tumblr_nb1uhrRrge1st5lhmo1_1280.jpg\") no-repeat center center fixed;-webkit-background-size: cover;-moz-background-size: cover;-o-background-size: cover;background-size: cover;font-family: \"Roboto\";-webkit-font-smoothing: antialiased;-moz-osx-font-smoothing: grayscale;}body::before {z-index: -1;content: '';position: fixed;top: 0;left: 0;background: #2ecc71;/* IE Fallback */background: rgba(46, 204, 113, 0.8);width: 100%;height: 100%;}.form {position: absolute;top: 50%;left: 50%;background: #fff;width: 285px;margin: -140px 0 0 -182px;padding: 40px;box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);}.form h2 {margin: 0 0 20px;line-height: 1;color: #2ecc71;font-size: 18px;font-weight: 400;}.form input {outline: none;display: block;width: 100%;margin: 0 0 20px;padding: 10px 15px;border: 1px solid #ccc;color: #ccc;font-family: \"Roboto\";-webkit-box-sizing: border-box;-moz-box-sizing: border-box;box-sizing: border-box;font-size: 14px;font-wieght: 400;-webkit-font-smoothing: antialiased;-moz-osx-font-smoothing: grayscale;-webkit-transition: 0.2s linear;-moz-transition: 0.2s linear;-ms-transition: 0.2s linear;-o-transition: 0.2s linear;transition: 0.2s linear;}.form input:focus {color: #333;border: 1px solid #2ecc71;}.form button {cursor: pointer;background: #2ecc71;width: 100%;padding: 10px 15px;border: 0;color: #fff;font-family: \"Roboto\";font-size: 14px;font-weight: 400;-webkit-font-smoothing: antialiased;-moz-osx-font-smoothing: grayscale;-webkit-transition: 0.2s linear;-moz-transition: 0.2s linear;-ms-transition: 0.2s linear;-o-transition: 0.2s linear;transition: 0.2s linear;}.form button:hover {background: #27ae60;}</style>");}body_4.__dustBody=!0;return body_0}(dust));