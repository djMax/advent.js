import React from 'react';
import PT from 'prop-types';
import YouTube from 'react-youtube';
import { Image } from 'semantic-ui-react';
import Style from './terminal.css';

export class Terminal extends React.Component {
  state = {
    input: '',
  }

  control = (e) => {
    e.preventDefault();
    const key = e.keyCode;
    switch (key) {
      case 8:
        if (this.state.input.length > 0) {
          const input = this.state.input.substring(0, this.state.input.length - 1);
          this.setState({ input });
        }
        break;
      case 13:
        this.props.onCommand(this.state.input);
        this.setState({ input: '' });
        break;
      default:
        break;
    }
  }

  key = (e) => {
    e.preventDefault();
    if (e.key.length === 1) {
      this.setState({
        input: `${this.state.input}${e.key}`,
      });
    }
  }

  componentDidUpdate() {
    if (this.props.readInput) {
      this.textInput.focus();
    }
  }

  click = (e) => {
    this.textInput.focus();
  }

  render() {
    const { lines, readInput, theme } = this.props;
    return (
      <div className={Style[theme]} onClick={this.click}>
        <input
          type="text"
          className={Style.charInput}
          ref={e => this.textInput = e}
          onKeyPress={this.key}
          onKeyUp={this.control}
        />
        <pre>
          {lines.map(({ text, image, key, onClick, youtube }) => {
            if (image) {
              return (<div key={key} onClick={onClick}><Image src={image} style={{margin:'auto'}} /></div>);
            }
            if (youtube) {
              return (<div key={key}><YouTube id={youtube} /></div>)
            }
            return (<div key={key} onClick={onClick}><code>{text}</code></div>);
          })}
          {readInput &&
            <code className={Style.input}>{this.state.input}</code>
          }
        </pre>
      </div>
    );
  }
}

Terminal.propTypes = {
  lines: PT.arrayOf(PT.shape({
    text: PT.string,
    key: PT.string,
    className: PT.string,
  })),
};

Terminal.defaultProps = {
  lines: [
    { text: 'HELLO HUMAN.', key: '1' },
    { text: 'The output of your program will appear here.', key: '2' },
  ],
}
