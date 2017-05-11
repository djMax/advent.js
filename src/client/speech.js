export class Speech {
  constructor(delegate) {
    this.delegate = delegate;
    this.started = false;
  }

  start() {
    const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
    const SpeechGrammarList = window.SpeechGrammarList || webkitSpeechGrammarList;
    const SpeechRecognitionEvent = window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

    if (!this.recognizer) {
      this.recognizer = new SpeechRecognition();
      this.recognizer.onresult = e => this.onResult(e);
      this.recognizer.onnomatch = e => console.log('no speech match');
      this.recognizer.onerror = e => console.error(e.error);
    }
    if (!this.started) {
      this.started = true;
      try { this.recognizer.start(); } catch (error) { console.error(error); }
    }
  }

  stop() {
    if (this.started) {
      try { this.recognizer.stop(); } catch (error) { console.error(error); }
      this.started = false;
    }
  }

  onResult(event) {
    console.log('Speech result', event);
    const last = event.results.length - 1;
    const response = event.results[last][0].transcript;
    this.delegate.gotInput(response);
  }
}
