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

  youTubeReady = (e) => {
    const player = e.target;
    if (this.activeYoutube) {
      if (player === this.activeYoutube) {
        return;
      }
      try {
        this.activeYoutube.pauseVideo();
      } catch (e) {

      }
    }
    this.activeYoutube = player;
    player.playVideo();
  }

  render() {
    const { lines, readInput, theme } = this.props;
    const yts = lines.filter(l => !!l.youtube);
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
          {lines.map(({ text, image, key, onClick, youtube, ...rest }) => {
            if (image) {
              const images = typeof image === 'string' ? [image] : image;
              const { style, ...restAttrs } = rest || {};
              return (<div key={key} onClick={onClick}>
                {images.map(i => (
                  <Image key={i} src={i} {...restAttrs} style={{ margin: 'auto', ...style }} />
                ))}
                </div>);
            }
            if (youtube) {
              if (yts[yts.length - 1].key === key) {
                return (<div key={key}><YouTube videoId={youtube} onReady={this.youTubeReady} /></div>)
              }
              return (<div key={key}>[removed youtube video]</div>);
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
