import Helmet from 'react-helmet';
import { Container, Grid, Dimmer, Loader, Menu, Icon } from 'semantic-ui-react';
import React, { Component } from 'react';
import { AceEditor } from '../../components/aceWrap';
import { Terminal } from '../../components/terminal';
import { CodeRunner } from '../../../client/runner';

function defaultCode() {
  if (typeof window !== 'undefined' && window.localStorage['code-default']) {
    return window.localStorage['code-default'];
  } else {
    return `const yourName = await readLine('What is your name?');
print(\`Hello \${yourName}\`);
`;
  }
}

export default class Main extends Component {
  state = {
    mounted: false,
    height: '500px',
    readInput: false,
    code: defaultCode(),
  }

  componentDidMount() {
    this.setState({ mounted: true });
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
    this.setState({ code: v });
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

  getInput(prompt, callback) {
    this.inputCallback = callback;
    const newState = { readInput: true };
    if (prompt) {
      newState.lines = this.append(prompt);
    }
    this.setState(newState);
  }

  run = () => {
    new CodeRunner(this).run(this.state.code);
  }

  render() {
    const { mounted } = this.state;

    if (!mounted) {
      return (
        <Dimmer active>
          <Loader>
            Extracting power from Earth's core...
          </Loader>
        </Dimmer>
      );
    }

    return (
      <div ref={e => this.setEditorHeight(e)}>
        <Menu attached="top" inverted>
          <Menu.Item name="edit">
            <Icon name="code" />Edit Code
          </Menu.Item>
          <Menu.Item name="edit" onClick={this.run}>
            <Icon name="play" />Run Code
          </Menu.Item>
        </Menu>

        <div style={{ float: 'right', width: '50%', height: this.state.height }} id="wargames">
          <Terminal readInput={this.state.readInput} onCommand={this.gotInput} lines={this.state.lines} />
        </div>

        <AceEditor
          mode="javascript"
          theme="monokai"
          name="main_editor"
          onLoad={(editor) => this.editor = editor}
          onChange={this.codeChanged}
          width="50%"
          height={`${this.state.height}`}
          editorProps={{ $blockScrolling: true }}
          value={this.state.code}
        />
      </div>
    );
  }
}
