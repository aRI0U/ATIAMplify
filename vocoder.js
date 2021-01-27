class VocoderProcessor extends AudioWorkletProcessor {
    process (inputs, outputs, parameters) {
        const input = inputs[0]
        const output = outputs[0]

        const numChannels = Math.min(input.length, output.length)

        for (let channel = 0; channel < numChannels; ++channel) {
            const inputChannel = input[channel]
            const outputChannel = output[channel]
            const bufferLength = Math.min(inputChannel.length, outputChannel.length)
            const window = hannWindow(bufferLength)

            for (let i = 0; i < bufferLength; ++i) {
                outputChannel[i] = inputChannel[i] * window[i]
            }
        }
        return true
    }
}

registerProcessor('vocoder-processor', VocoderProcessor)

function hannWindow(length) {
    let window = new Float32Array(length)
    for (let i = 0; i < length; ++i) {
        window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (length - 1)))
    }
    return window
}
