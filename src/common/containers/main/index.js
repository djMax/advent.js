import Helmet from 'react-helmet';
import { Container, Grid, Dimmer, Loader, Menu, Icon } from 'semantic-ui-react';
import React, { Component } from 'react';
import { AceEditor } from '../../components/aceWrap';
import { Terminal } from '../../components/terminal';
import { CodeRunner, LocalStorage } from '../../../client';

const defaultCode = `const yourName = readLine('What is your name?');
delay(1);
print(\`Hello \${yourName}\`);
`;

export default class Main extends Component {
  state = {
    mounted: false,
    height: '500px',
    readInput: false,
    showCode: true,
    code: LocalStorage.getItem('code:default') || defaultCode,
  }

  componentDidMount() {
    this.codeRunner = new CodeRunner(this);
    this.setState({ mounted: true });
    // This has to be persisted to state carefully because otherwise
    // ACE loses its insert point
    this.code = this.state.code;
  }

  componentDidUpdate() {
    if (this.editor) {
      this.editor.resize();
    }
  }

  append(text = '') {
    this.outputCtr = (this.outputCtr || 0) + 1;
    return (this.state.lines || []).concat([{
      text,
      key: `${this.outputCtr}`,
    }]);
  }

  setEditorHeight(mainDiv) {
    if (mainDiv && this.editor) {
      const menuHeight = mainDiv.querySelector('.top.attached.menu').clientHeight;
      const height = `${window.innerHeight - menuHeight}px`;
      if (this.state.height !== height) {
        this.setState({ height });
      }
    }
  }

  codeChanged = (v) => {
    LocalStorage.setItem('code:default', v);
    this.code = v;
  }

  /**
   * We got input from the terminal window
   */
  gotInput = (input) => {
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
  print(value) {
    this.setState({
      lines: this.append(value),
    });
  }

  clear() {
    this.setState({
      lines: [],
    });
  }

  getInput(prompt, callback) {
    this.inputCallback = callback;
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

  runComplete(error) {
    const msg = error ?
      `\nOops... An error occurred:\n\n${error.stack}` :
      '\n\n-- PROGRAM FINISHED --';
    this.setState({
      showCode: true,
      fetching: false,
      lines: this.append(msg),
    });
  }

  render() {
    const { mounted, showCode, fetching, fetchMessage } = this.state;

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
        <Menu attached="top" inverted>
          <Menu.Item name="edit" active={showCode} onClick={this.toggleCode}>
            <Icon name="code" />Show Code
          </Menu.Item>

          <Menu.Menu position="right">
            <Menu.Item name="edit" onClick={this.run}>
              <Icon name="play" />Run Code
          </Menu.Item>
          </Menu.Menu>
        </Menu>

        <Dimmer.Dimmable dimmed={fetching}>
          <Dimmer active={fetching}>
            <Loader>{fetchMessage}</Loader>
          </Dimmer>
          <div style={{ float: 'right', width: termWidth, height: this.state.height }} id="wargames">
            <Terminal readInput={this.state.readInput} onCommand={this.gotInput} lines={this.state.lines} />
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
