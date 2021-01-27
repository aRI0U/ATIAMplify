const volume = document.getElementById('volume')
const bass = document.getElementById('bass')
const mid = document.getElementById('mid')
const treble = document.getElementById('treble')
const visualizer = document.getElementById('visualizer')
const distortion = document.getElementById('distortion')
const delayLength = document.getElementById('delayLength')
const delayAmpl = document.getElementById('delayAmpl')


let context = new (window.AudioContext || window.webkitAudioContext)();


//const context = new AudioContext()
const analyserNode = new AnalyserNode(context, { fftSize: 256 })
const gainNode = new GainNode(context, { gain: volume.value})
const bassEQ = new BiquadFilterNode(context, {
  type: 'lowshelf', //Has an effect on everything under the frequency input
  frequency: 500,
  gain: bass.value
})
const midEQ = new BiquadFilterNode(context, {
  type: 'peaking', //Peak Filter
  Q: Math.SQRT1_2, //Quality Factor
  frequency: 1500,
  gain: mid.value
})
const trebleEQ = new BiquadFilterNode(context, {
  type: 'highshelf',
  frequency: 3000,
  gain: treble.value
})
const waveShaperNode = context.createWaveShaper();
waveShaperNode.oversample = '4x';
waveShaperNode.curve = makeDistortionCurve(distortion.value);

const delayNode = context.createDelay();
delayNode.delayTime.value = 1; // 1 second delay
const delayInputNode =  new GainNode(context, {gain: 1})
const delayGainNode = new GainNode(context, { gain: 0.5}); // intensité de l'écho
const delayGainNodeTwo = new GainNode(context, { gain: 1});
const delayGainNodeThree = new GainNode(context, { gain: 1});


const oscillatorNode = context.createOscillator();
oscillatorNode.type = 'sine';
oscillatorNode.frequency.value = 0.25;
const oscGain = new GainNode(context, {gain: 0.002});
const flangerGainOne = new GainNode(context, {gain: 1});
const flangerGainTwo = new GainNode(context, {gain: 0.5});
const flangerGainThree = new GainNode(context, {gain: 1});
const flangerDelayNode = context.createDelay();
flangerDelayNode.delayTime.value = 0.005;




setupEventListeners()
setupContext()
resize()
drawVisualizer()

// C'est une fonction pour créer la distortion récupérée sur une des ressources en ligne
function makeDistortionCurve( amount ) {
    var k = typeof amount === 'number' ? amount : 50,
      n_samples = 44100,
      curve = new Float32Array(n_samples),
      deg = Math.PI / 180,
      i = 0,
      x;
    for ( ; i < n_samples; ++i ) {
      x = i * 2 / n_samples - 1;
      curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
  };

function setupEventListeners() {
  window.addEventListener('resize', resize)

  volume.addEventListener('input', e => {
    const value = parseFloat(e.target.value)
    gainNode.gain.setTargetAtTime(value, context.currentTime, .01)
  })

  bass.addEventListener('input', e => {
    const value = parseInt(e.target.value)
    bassEQ.gain.setTargetAtTime(value, context.currentTime, .01)
  })

  mid.addEventListener('input', e => {
    const value = parseInt(e.target.value)
    midEQ.gain.setTargetAtTime(value, context.currentTime, .01)
  })

  treble.addEventListener('input', e => {
    const value = parseInt(e.target.value)
    trebleEQ.gain.setTargetAtTime(value, context.currentTime, .01)
  })

  distortion.addEventListener('input', e => {
    const value = parseInt(e.target.value)
    waveShaperNode.curve = makeDistortionCurve(value)
  })

/*
  delayLength.addEventListener('input', e => {
    const value = parseInt(e.target.value)
    delayNode.delayTime.value = value
  })

  delayAmpl.addEventListener('input', e => {
    const value = parseInt(e.target.value)
    delayGainNode.gain.value = value
  })

*/
}

async function setupContext() {
  const guitar = await getGuitar()
  if (context.state === 'suspended') {
    await context.resume()
  }
  const source = context.createMediaStreamSource(guitar)

/*
Ici on connecte tous les effets au son d'entrée venant du stream. Ici il s'appelle Guitar parce qu'on peut s'en servir avec une guitare branchée
sur une carte son mais en l'occurence tous les effets ont été essayés sur la voix
*/

  source
    .connect(bassEQ)
    .connect(midEQ)
    .connect(trebleEQ)
    .connect(flangerGainOne)
    .connect(waveShaperNode)
    .connect(delayInputNode)
    .connect(filter.input)
    .connect(gainNode)
    .connect(analyserNode)
  delayInputNode
    .connect(delayNode)
    .connect(delayGainNodeTwo)
    //  .connect(context.destination)
  delayNode
    .connect(delayGainNode)
    .connect(delayGainNodeThree)
  delayGainNode.connect(delayNode)
  delayGainNodeThree.connect(context.destination)
  flangerGainOne
    .connect(flangerDelayNode)
    .connect(flangerGainThree)
  flangerDelayNode
    .connect(flangerGainThree)
    .connect(flangerGainTwo)
  flangerGainTwo
    .connect(flangerGainOne)
  flangerGainThree.connect(context.destination)
  oscillatorNode.connect(oscGain)
  oscGain.connect(flangerDelayNode.delayTime)


  waveShaperNode.connect(context.destination)
}

function getGuitar() {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      autoGainControl: false,
      noiseSuppression: false,
      latency: 0
    }
  })
}

function drawVisualizer() {
  requestAnimationFrame(drawVisualizer)

  const bufferLength = analyserNode.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyserNode.getByteFrequencyData(dataArray)
  const width = visualizer.width
  const height = visualizer.height
  const barWidth = width / bufferLength

  const canvasContext = visualizer.getContext('2d')
  canvasContext.clearRect(0, 0, width, height)

  dataArray.forEach((item, index) => {
    const y = item / 255 * height / 2
    const x = barWidth * index

    canvasContext.fillStyle = `hsl(${y / height * 400}, 100%, 50%)`
    canvasContext.fillRect(x, height - y, barWidth, y)
  })
}

function resize() {
  visualizer.width = visualizer.clientWidth * window.devicePixelRatio
  visualizer.height = visualizer.clientHeight * window.devicePixelRatio
}



//////////////////////////////////////////
//////////////////////////////////////////

/*

A partir de là on définit toutes les classes et fonctions dont on a besoin pour la reverb récupérée en ligne, il n'y a rien de spécial
à lire ici, c'est du code emprunté en ligne et adapté pour notre application

*/
// SAFARI Polyfills
if(!window.AudioBuffer.prototype.copyToChannel) {
	window.AudioBuffer.prototype.copyToChannel = function copyToChannel (buffer,channel) {
		this.getChannelData(channel).set(buffer);
	}
}
if(!window.AudioBuffer.prototype.copyFromChannel) {
	window.AudioBuffer.prototype.copyFromChannel = function copyFromChannel (buffer,channel) {
		buffer.set(this.getChannelData(channel));
	}
}



class Effect {

	constructor (context) {
		this.name = "effect";
		this.context = context;
		this.input = this.context.createGain();
		this.effect = null;
		this.bypassed = false;
		this.output = this.context.createGain();
		this.setup();
		this.wireUp();
	}

	setup() {
		this.effect = this.context.createGain();
	}

	wireUp() {
		this.input.connect(this.effect);
		this.effect.connect(this.output);
	}

	connect(destination) {
		this.output.connect(destination);
	}

}

class Sample {
	constructor (context) {
		this.context = context;
		this.buffer = this.context.createBufferSource();
		this.buffer.start();
		this.sampleBuffer = null
		this.rawBuffer = null;
		this.loaded = false;
		this.output = this.context.createGain();
		this.output.gain.value = 0.1;
	}

	play () {
		if(this.loaded) {
			this.buffer = this.context.createBufferSource();
			this.buffer.buffer = this.sampleBuffer;
			this.buffer.connect(this.output);
			this.buffer.start(this.context.currentTime);
		}
	}

	connect(input) {
		this.output.connect(input);
	}

	load (path) {
		this.loaded = false;
	return fetch(path)
		.then((response) => response.arrayBuffer())
		.then((myBlob) => {
			return new Promise((resolve, reject)=>{
				this.context.decodeAudioData(myBlob, resolve, reject);
			})
		})
		.then((buffer) => {
			this.sampleBuffer = buffer;
			this.loaded = true;
			return this;
		})
	}
}


class AmpEnvelope {
	constructor (context, gain = 1) {
		this.context = context;
		this.output = this.context.createGain();
		this.output.gain.value = gain;
		this.partials = [];
		this.velocity = 0;
		this.gain = gain;
		this._attack = 0;
		this._decay = 0.001;
		this._sustain = this.output.gain.value;
		this._release = 0.001;
	}

	on (velocity) {
		this.velocity = velocity / 127;
		this.start(this.context.currentTime);
	}

	off (MidiEvent) {
		return this.stop(this.context.currentTime);
	}

	start (time) {
		this.output.gain.value = 0;
		this.output.gain.setValueAtTime(0, time);
		this.output.gain.setTargetAtTime(1, time, this.attack+0.00001);
		this.output.gain.setTargetAtTime(this.sustain * this.velocity, time + this.attack, this.decay);
	}

	stop (time) {
		this.sustain = this.output.gain.value;
		this.output.gain.cancelScheduledValues(time);
		this.output.gain.setValueAtTime(this.sustain, time);
		this.output.gain.setTargetAtTime(0, time, this.release+0.00001);
	}

	set attack (value) {
		this._attack = value;
	}

	get attack () {
		return this._attack
	}

	set decay (value) {
		this._decay = value;
	}

	get decay () {
		return this._decay;
	}

	set sustain (value) {
		this.gain = value;
		this._sustain;
	}

	get sustain () {
		return this.gain;
	}

	set release (value) {
		this._release = value;
	}

	get release () {
		return this._release;
	}

	connect (destination) {
		this.output.connect(destination);
	}
}

class Voice {
	constructor(context, type ="sawtooth", gain = 0.1) {
		this.context = context;
		this.type = type;
		this.value = -1;
		this.gain = gain;
		this.output = this.context.createGain();
		this.partials = [];
		this.output.gain.value = this.gain;
		this.ampEnvelope = new AmpEnvelope(this.context);
		this.ampEnvelope.connect(this.output);
	}

	init() {
		let osc = this.context.createOscillator();
			osc.type = this.type;
			osc.connect(this.ampEnvelope.output);
			osc.start(this.context.currentTime);
		this.partials.push(osc);
	}

	on(MidiEvent) {
		this.value = MidiEvent.value;
		this.partials.forEach((osc) => {
			osc.frequency.value = MidiEvent.frequency;
		});
		this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
	}

	off(MidiEvent) {
		this.ampEnvelope.off(MidiEvent);
		this.partials.forEach((osc) => {
			osc.stop(this.context.currentTime + this.ampEnvelope.release * 4);
		});
	}

	connect(destination) {
		this.output.connect(destination);
	}

  set detune (value) {
    this.partials.forEach(p=>p.detune.value=value);
  }

	set attack (value) {
		this.ampEnvelope.attack  = value;
	}

	get attack () {
		return this.ampEnvelope.attack;
	}

	set decay (value) {
		this.ampEnvelope.decay  = value;
	}

	get decay () {
		return this.ampEnvelope.decay;
	}

	set sustain (value) {
		this.ampEnvelope.sustain = value;
	}

	get sustain () {
		return this.ampEnvelope.sustain;
	}

	set release (value) {
		this.ampEnvelope.release = value;
	}

	get release () {
		return this.ampEnvelope.release;
	}

}
class Noise extends Voice {
	constructor(context, gain) {
		super(context, gain);
		this._length = 2;
	}

	get length () {
		return this._length || 2;
	}
	set length (value) {
		this._length = value;
	}

	init() {
		var lBuffer = new Float32Array(this.length * this.context.sampleRate);
		var rBuffer = new Float32Array(this.length * this.context.sampleRate);
		for(let i = 0; i < this.length * this.context.sampleRate; i++) {
			lBuffer[i] = 1-(2*Math.random());
			rBuffer[i] = 1-(2*Math.random());
		}
		let buffer = this.context.createBuffer(2, this.length * this.context.sampleRate, this.context.sampleRate);
		buffer.copyToChannel(lBuffer,0);
		buffer.copyToChannel(rBuffer,1);

		let osc = this.context.createBufferSource();
			osc.buffer = buffer;
			osc.loop = true;
			osc.loopStart = 0;
			osc.loopEnd = 2;
			osc.start(this.context.currentTime);
			osc.connect(this.ampEnvelope.output);
		this.partials.push(osc);
	}

	on(MidiEvent) {
		this.value = MidiEvent.value;
		this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
	}

}

class Filter extends Effect {
	constructor (context, type = "lowpass", cutoff = 1000, resonance = 0.9) {
		super(context);
		this.name = "filter";
		this.effect.frequency.value = cutoff;
		this.effect.Q.value = resonance;
		this.effect.type = type;
	}

	setup() {
		this.effect = this.context.createBiquadFilter();
		this.effect.connect(this.output);
    this.wireUp();
	}

}

/////////////////////////////////////////////
/////////////////////////////////////////////

var OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
class SimpleReverb extends Effect {
  constructor (context) {
    super(context);
    this.name = "SimpleReverb";
  }

  setup (reverbTime=1) {
    this.effect = this.context.createConvolver();

    this.reverbTime = reverbTime;

    this.attack = 0.0001;
    this.decay = 0.1;
    this.release = reverbTime;

    this.wet = this.context.createGain();
    this.input.connect(this.wet);
    this.wet.connect(this.effect);
    this.effect.connect(this.output);
  }

  renderTail () {

    const tailContext = new OfflineAudioContext( 2, this.context.sampleRate * this.reverbTime, this.context.sampleRate );
          tailContext.oncomplete = (buffer) => {
            this.effect.buffer = buffer.renderedBuffer;
          }

    const tailOsc = new Noise(tailContext, 1);
          tailOsc.init();
          tailOsc.connect(tailContext.destination);
          tailOsc.attack = this.attack;
          tailOsc.decay = this.decay;
          tailOsc.release = this.release;


      tailOsc.on({frequency: 500, velocity: 1});
      tailContext.startRendering();
    setTimeout(()=>{
      tailOsc.off();
    },20)


  }

  set decayTime(value) {
    let dc = value/3;
    this.reverbTime = value;
    this.attack = 0;
    this.decay = 0;
    this.release = dc;
    return this.renderTail();
  }

}

class AdvancedReverb extends SimpleReverb {
  constructor (context) {
    super(context);
    this.name = "AdvancedReverb";
  }

  setup (reverbTime=1, preDelay = 0.03) {
    this.effect = this.context.createConvolver();

    this.reverbTime = reverbTime;

    this.attack = 0.001;
    this.decay = 0.1;
    this.release = reverbTime;

    this.preDelay = this.context.createDelay(reverbTime);
    this.preDelay.delayTime.setValueAtTime(preDelay, this.context.currentTime);

    this.multitap = [];

    for(let i = 2; i > 0; i--) {
      this.multitap.push(this.context.createDelay(reverbTime));
    }
    this.multitap.map((t,i)=>{
      if(this.multitap[i+1]) {
        t.connect(this.multitap[i+1])
      }
      t.delayTime.setValueAtTime(0.001+(i*(preDelay/2)), this.context.currentTime);
    })

    this.multitapGain = this.context.createGain();
    this.multitap[this.multitap.length-1].connect(this.multitapGain);

    this.multitapGain.gain.value = 0.2;

    this.multitapGain.connect(this.output);

    this.wet = this.context.createGain();

    this.input.connect(this.wet);
    this.wet.connect(this.preDelay);
    this.wet.connect(this.multitap[0]);
    this.preDelay.connect(this.effect);
    this.effect.connect(this.output);

  }
  renderTail () {

    const tailContext = new OfflineAudioContext( 2, this.context.sampleRate * this.reverbTime, this.context.sampleRate );
          tailContext.oncomplete = (buffer) => {
            this.effect.buffer = buffer.renderedBuffer;
          }
    const tailOsc = new Noise(tailContext, 1);
    const tailLPFilter = new Filter(tailContext, "lowpass", 2000, 0.2);
    const tailHPFilter = new Filter(tailContext, "highpass", 500, 0.1);

    tailOsc.init();
    tailOsc.connect(tailHPFilter.input);
    tailHPFilter.connect(tailLPFilter.input);
    tailLPFilter.connect(tailContext.destination);
    tailOsc.attack = this.attack;
    tailOsc.decay = this.decay;
    tailOsc.release = this.release;

    tailContext.startRendering()

    tailOsc.on({frequency: 500, velocity: 1});
    setTimeout(()=>{
          tailOsc.off();
    },20)
  }

  set decayTime(value) {
    let dc = value/3;
    this.reverbTime = value;
    this.attack = 0;
    this.decay = 0;
    this.release = dc;
    return this.renderTail();
  }
}


//let Audio = new (window.AudioContext || window.webkitAudioContext)();

let filter = new Filter(context, "lowpass", 50000, 0.8);
    filter.setup();
let verb = new AdvancedReverb(context);
      verb.setup(2,0.01);
      verb.renderTail();
      verb.wet.gain.value = 1;


let compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, context.currentTime);
    compressor.knee.setValueAtTime(40, context.currentTime);
    compressor.ratio.setValueAtTime(12, context.currentTime);
    compressor.attack.setValueAtTime(0, context.currentTime);
    compressor.release.setValueAtTime(0.25, context.currentTime);
    compressor.connect(context.destination);

filter.connect(verb.input);
verb.connect(compressor);
