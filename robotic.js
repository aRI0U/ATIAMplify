class RoboticProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            {
                name: "pitchRatio",
                defaultValue: 1.0
            },
            {
                name: "overlapRatio",
                defaultValue: 0.3,
                minValue: 0.0,
                maxValue: 1.0
            }
        ]
    }

    process (inputs, outputs, parameters) {
        const pitchRatio = parameters.pitchRatio
        const overlapRatio = parameters.overlapRatio

        const input = inputs[0]
        const output = outputs[0]

        const numChannels = Math.min(input.length, output.length)

        for (let channel = 0; channel < numChannels; ++channel) {
            const inputChannel = input[channel]
            const outputChannel = output[channel]
            const length = Math.min(inputChannel.length, outputChannel.length)
            const window = hannWindow(length)
            const buffer = new Float32Array(2 * length)

            for (let i = 0; i < length; ++i) {
                buffer[i] = inputChannel[i] * window[i]
                buffer[i + length] = 0.0
            }

            let grainData = new Float32Array(2 * length)
            let j = 0.0
            for (let i = 0; i < length; ++i) {
                const idx = Math.floor(j)
                const a = inputChannel[idx % length]
                const b = inputChannel[(idx + 1) % length]
                grainData[i] += linearInterpolation(a, b, j % 1.0) * window[i]
                j += pitchRatio
            }

            for (let i = 0; i < length; i += Math.round(length * (1 - overlapRatio))) {
                for (let j = 0; j <= length; ++j) {
                    buffer[i + j] += grainData[j]
                }
            }

            for (let i = 0; i < length; ++i) {
                outputChannel[i] = buffer[i]
            }
        }
        return true
    }
}

registerProcessor('robotic-processor', RoboticProcessor)

function hannWindow(length) {
    let window = new Float32Array(length)
    for (let i = 0; i < length; ++i) {
        window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (length - 1)))
    }
    return window
}

function linearInterpolation(a, b, t) {
    return a + (b - a) * t
}
