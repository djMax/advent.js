if (typeof window != 'undefined') {
  console.log('Loading ACE');
  module.exports.brace = require('brace');
  module.exports.AceEditor = require('react-ace').default;
  require('brace/mode/javascript');
  require('brace/theme/monokai');
}