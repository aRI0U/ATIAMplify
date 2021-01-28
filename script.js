const frequenciesCMajor = [
     32.70,  36.71,  41.20,  43.65,  49.00,  55.00,  61.74,
     65.41,  73.42,  82.41,  87.31,  98.00, 110.00, 123.47,
    130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94,
    261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88,
    523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77
]

const volume = document.getElementById('volume')
const bass = document.getElementById('bass')
const mid = document.getElementById('mid')
const treble = document.getElementById('treble')
const overlap = document.getElementById('overlap')
const distorsion = document.getElementById('distorsion')
const delayLength = document.getElementById('delayLength')
const delayAmp1 = document.getElementById('delayAmp1')

const visualizer = document.getElementById('visualizer')

const context = new AudioContext()
let vocoderNode = null
const analyserNode = new AnalyserNode(context, { fftSize: 256 })
const numDecimations = 4

// EQUALIZERS
const gainNode = new GainNode(context, { gain: volume.value })
const bassEQ = new BiquadFilterNode(context, {
    type: 'lowshelf',
    frequency: 500,
    gain: bass.value
})
const midEQ = new BiquadFilterNode(context, {
    type: 'peaking',
    Q: Math.SQRT1_2,
    frequency: 1500,
    gain: mid.value
})
const trebleEQ = new BiquadFilterNode(context, {
    type: 'highshelf',
    frequency: 3000,
    gain: treble.value
})

const waveShaperNode = context.createWaveShaper()
waveShaperNode.oversample = '4x'
waveShaperNode.curve = makeDistorsionCurve(distorsion.value)

const delayNode = context.createDelay()
delayNode.delayTime.value = 1
const delayInputNode = new GainNode(context, { gain: 1 })
const delayGainNode = new GainNode(context, { gain: 0.5 })
const delayGainNodeTwo = new GainNode(context, { gain: 1 })
const delayGainNodeThree = new GainNode(context, { gain: 1 })

const oscillatorNode = context.createOscillator()
oscillatorNode.type = 'sine'
oscillatorNode.frequency.value = 0.25
const oscGain = new GainNode(context, { gain: 0.002 })
const flangerGainOne = new GainNode(context, { gain: 1 })
const flangerGainTwo = new GainNode(context, { gain: 0.5 })
const flangerGainThree = new GainNode(context, { gain: 1 })

// PITCH DETECTION WITH SPECTRAL PRODUCT
const pitchDetector = new AnalyserNode(context, { fftSize: 256 })


// MAIN
setupEventListeners()
setupContext()
bindAudioWorkletParams()
resize()
drawVisualizer()

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
}

async function setupContext() {
    const voice = await getVoice()
    if (context.state === 'suspended') {
        await context.resume()
    }
    await context.audioWorklet.addModule("vocoder.js")
    vocoderNode = new AudioWorkletNode(context, "vocoder-processor")


    const source = context.createMediaStreamSource(voice)
    source
    .connect(pitchDetector)
    .connect(vocoderNode)
    .connect(bassEQ)
    .connect(midEQ)
    .connect(trebleEQ)
    .connect(gainNode)
    .connect(analyserNode)
    .connect(context.destination)
}

function getVoice() {
    return navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: true,
          latency: 0
        }
    })
}

function bindAudioWorkletParams() {
    overlap.addEventListener('input', e => {
        let overlapRatioParam = vocoderNode.parameters.get("overlapRatio")
        const value = parseFloat(e.target.value)
        overlapRatioParam.setTargetAtTime(value, context.currentTime, .01)
    })
}


// <--- VOCODER-RELATED FUNCTIONS (UNUSED)
function estimateFundamental() {
    const bufferLength = pitchDetector.frequencyBinCount
    const spectralData = new Float32Array(bufferLength)
    pitchDetector.getFloatFrequencyData(spectralData)

    // maximal length such that all frequencies are below the Nyquist frequency
    const spectralLength = Math.ceil(pitchDetector.fftSize / (2 * numDecimations))
    const spectralProduct = new Float32Array(spectralLength)

    // empty spectral product
    for (let i = 0; i < spectralLength; ++i) {
        spectralProduct[i] = 1.0
    }

    // fill spectral product
    for (let h = 1; h <= numDecimations; ++h) {
        const numValidSamples = Math.min(Math.floor(bufferLength / h), spectralLength)
        for (let i = 0; i < numValidSamples; ++i) {
            // console.log(spectralData[i])
            spectralProduct[i] *= spectralData[h*i]
        }
    }

    // get index of maximal amplitude  (built-in function for this?)
    let max = 0
    let imax = 0
    for (let i = 0; i < spectralLength; ++i) {
        if (spectralProduct[i] > max) {
            imax = i
            max = spectralProduct[i]
        }
    }

    // compute frequency out of index
    return imax * context.sampleRate / pitchDetector.fftSize
}

function computePitchRatio(frequency) {
    // find the closest note in the C major key from frequency and compute pitch ratio
    if (frequency === 0) {  // avoid crashes when volume is null
        return 1.0
    }
    let distance
    let previousDistance = Math.abs(frequenciesCMajor[0] - frequency)
    for (let i = 1; i < 35; ++i) {
        distance = Math.abs(frequenciesCMajor[i] - frequency)
        if (distance > previousDistance) {
            return frequenciesCMajor[i-1] / frequency
        } else {
            previousDistance = distance
        }
    }
    return frequenciesCMajor[-1] / frequency
}

function refreshPitchRatio() {
    const fundamental = estimateFundamental()

    let pitchRatioParam = vocoderNode.parameters.get("pitchRatio")
    const newPitchRatio = computePitchRatio(fundamental)
    pitchRatioParam.setValueAtTime(
        newPitchRatio,
        context.currentTime
    )
}
// --->


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
