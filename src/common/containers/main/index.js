import qs from 'query-string';
import fetch from 'isomorphic-fetch';
import React, { Component } from 'react';
import { withRouter } from 'react-router';
import { Container, Grid, Dimmer, Loader, Menu, Icon, Dropdown, Input } from 'semantic-ui-react';
import { AceEditor } from '../../components/aceWrap';
import { Terminal } from '../../components/terminal';
import { CodeRunner, LocalStorage, SocketIO, Speech } from '../../../client';

const defaultCode = `const yourName = readLine('What is your name?');
delay(1);
print(\`Hello \${yourName}\`);
`;

function roomKey() {
  if (typeof window !== 'undefined') {
    let room = 'default';
    if (window.location.pathname !== '/') {
      room = window.location.pathname;
    }
    return `code:${room}`;
  }
}

class Main extends Component {
  state = {
    theme: 'wg',
    mounted: false,
    height: '500px',
    readInput: false,
    moderator: false,
    showCode: true,
    code: LocalStorage.getItem(roomKey()) || defaultCode,
  }

  componentDidMount() {
    this.codeRunner = new CodeRunner(this);
    const query = qs.parse(this.props.location.search);
    const state = Object.assign({ mounted: true }, {
      moderator: query.moderator === 'true' ? true : false,
      showCode: query.showCode === 'false' ? false : true,
      showMenu: query.showMenu === 'false' ? false : true,
    });
    if (window.location.pathname !== '/') {
      const code = LocalStorage.getItem(`code:${window.location.pathname}`);
      if (code) {
        state.code = code;
      }
    }
    this.setState(state, () => {
      if (!this.state.showMenu && !this.state.showCode) {
        this.run();
      }
    });
    // This has to be persisted to state carefully because otherwise
    // ACE loses its insert point
    this.code = this.state.code;
    SocketIO.initialize();
    SocketIO.on('share', code => this.setState({ received: code }));
    this.speech = new Speech(this);
  }

  componentDidUpdate() {
    if (this.editor) {
      this.editor.resize();
    }
  }

  appendFormatted(args) {
    this.outputCtr = (this.outputCtr || 0) + 1;
    this.lines = (this.lines || []).concat([{
      ...args,
      key: `${this.outputCtr}`,
    }]);
    return this.lines;
  }

  append(text = '', extraArgs = {}) {
    this.outputCtr = (this.outputCtr || 0) + 1;
    this.lines = (this.lines || []).concat([{
      ...extraArgs,
      text,
      key: `${this.outputCtr}`,
    }]);
    return this.lines;
  }

  setEditorHeight(mainDiv) {
    if (mainDiv && this.editor) {
      const menuElt = mainDiv.querySelector('.top.attached.menu');
      const menuHeight = menuElt ? menuElt.clientHeight : 0;
      const height = `${window.innerHeight - menuHeight}px`;
      if (this.state.height !== height) {
        this.setState({ height });
      }
    }
  }

  codeChanged = (v) => {
    LocalStorage.setItem(roomKey(), v);
    this.code = v;
  }

  /**
   * We got input from the terminal window
   */
  gotInput = (input) => {
    this.speech.stop();
    this.setState({
      readInput: false,
      key: `${this.outputCtr}`,
      lines: this.append(input),
    }, () => {
      if (this.inputCallback) {
        const cb = this.inputCallback;
        this.inputCallback = null;
        cb(input);
      }
    });
  }

  /**
   * Called by the CodeRunner to print stuff to terminal
   */
  print(value, args) {
    this.setState({
      lines: this.append(value, args),
    });
  }

  show(image, args) {
    this.setState({
      lines: this.appendFormatted({
        ...args,
        image,
      }),
    });
  }

  youtube(id, args) {
    this.setState({
      lines: this.appendFormatted({
        ...args,
        youtube: id,
      }),
    });
  }

  clear() {
    this.lines = [];
    this.setState({
      lines: this.lines,
    });
  }

  getInput(prompt, callback) {
    this.inputCallback = callback;
    this.speech.start();
    const newState = { readInput: true };
    if (prompt) {
      newState.lines = this.append(prompt);
    }
    this.setState(newState);
  }

  toggleCode = () => {
    this.setState({ showCode: !this.state.showCode });
  }

  showLoader(on, fetchMessage) {
    this.setState({ fetching: on, fetchMessage });
  }

  run = () => {
    this.setState({
      code: this.code,
      autoHideCode: this.state.autoHideCode || (!this.state.showCode),
      showCode: this.state.autoHideCode ? false : this.state.showCode,
      lines: [],
    }, () => {
      this.codeRunner.run(this.code);
    });
  }

  clearSettings = () => {
    LocalStorage.clearUserSettings();
  }

  copy = () => {
    SocketIO.send('share', {
      code: this.code,
    });
  }

  receive = () => {
    this.code = this.state.received;
    this.setState({ code: this.state.received });
  }

  save = () => {
    this.codeRunner.fetch('/library/save', {
      code: this.code,
      room: window.location.pathname,
    }, 'POST', 'Saving your code to the mothership');
  }

  runComplete(error) {
    const msg = error ?
      `\nOops... An error occurred:\n\n${error.stack}` :
      '\n\n-- PROGRAM FINISHED --';
    this.setState({
      showCode: this.state.showMenu ? true : this.state.showCode,
      fetching: false,
      lines: this.append(msg),
    });
  }

  room(e) {
    console.log(e, this.roomInput);
  }

  render() {
    const { mounted, showCode, fetching, fetchMessage, showMenu, theme } = this.state;

    if (!mounted) {
      return (
        <Dimmer active>
          <Loader>
            Extracting power from Earth's core...
          </Loader>
        </Dimmer>
      );
    }

    const codeWidth = showCode ? '50%' : '0';
    const termWidth = showCode ? '50%' : '100%';

    return (
      <div ref={e => this.setEditorHeight(e)}>
        {showMenu &&
          <Menu attached="top" inverted>
            <Dropdown item icon="wrench" simple>
              <Dropdown.Menu>
                <Dropdown.Item>
                  <Icon name='dropdown' />
                  <span className='text'>Terminal Style</span>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => this.setState({ theme: 'wg' })}>WarGames</Dropdown.Item>
                    <Dropdown.Item onClick={() => this.setState({ theme: 'md' })}>Modern</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Item>
                <Dropdown.Item>
                  <Icon name='dropdown' />
                  <span className='text'>Rooms</span>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => this.props.history.push('/')}>Main</Dropdown.Item>
                    <Dropdown.Item onClick={() => this.props.history.push('/rooms/adventure')}>Adventure</Dropdown.Item>
                    <Dropdown.Item onClick={() => this.props.history.push('/rooms/tko')}>TKO</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Item>
                <Dropdown.Item onClick={this.save}>
                  <Icon name='save' />
                  <span className='text'>Save to Server</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Menu.Item name="edit" active={showCode} onClick={this.toggleCode}>
              <Icon name="code" />Show Code
            </Menu.Item>
            <Menu.Item name="clear" onClick={this.clearSettings}>
              <Icon name="user x" />Clear Settings
            </Menu.Item>

            <Menu.Menu position="right">
              <Menu.Item name="clearOutput" onClick={() => this.clear()}>
                <Icon name="delete" />Clear Output
              </Menu.Item>
              <Menu.Item name="copy" onClick={this.copy}>
                <Icon name="slideshare" />Copy
              </Menu.Item>
              {this.state.received && this.state.received !== this.code &&
                <Menu.Item name="receive" onClick={this.receive}>
                  <Icon name="cloud download" />Receive
            </Menu.Item>
              }
              <Menu.Item name="run" onClick={this.run}>
                <Icon name="play" />Run Code
            </Menu.Item>
            </Menu.Menu>
          </Menu>
        }

        <Dimmer.Dimmable dimmed={fetching}>
          <Dimmer active={fetching}>
            <Loader>{fetchMessage}</Loader>
          </Dimmer>
          <div style={{ float: 'right', width: termWidth, height: this.state.height }} id="wargames">
            <Terminal readInput={this.state.readInput} onCommand={this.gotInput} lines={this.state.lines} theme={theme} />
          </div>
        </Dimmer.Dimmable>

        <AceEditor
          mode="javascript"
          theme="monokai"
          name="main_editor"
          onLoad={(editor) => this.editor = editor}
          onChange={this.codeChanged}
          width={codeWidth}
          height={`${this.state.height}`}
          editorProps={{ $blockScrolling: true }}
          value={this.state.code}
        />
      </div>
    );
  }
}

export default withRouter(Main);