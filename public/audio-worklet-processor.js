/**
 * AudioWorklet Processor for capturing microphone input.
 * Runs on a separate audio thread, avoiding main thread blocking.
 */
class MicrophoneProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        this.isRunning = true;

        // Listen for control messages from main thread
        this.port.onmessage = (event) => {
            if (event.data.type === 'stop') {
                this.isRunning = false;
            } else if (event.data.type === 'start') {
                this.isRunning = true;
            }
        };
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];

        if (!this.isRunning || !input || !input[0]) {
            return true; // Keep processor alive but do nothing
        }

        const inputData = input[0]; // Mono channel

        // Accumulate samples until buffer is full
        for (let i = 0; i < inputData.length; i++) {
            this.buffer[this.bufferIndex++] = inputData[i];

            if (this.bufferIndex >= this.bufferSize) {
                // Send full buffer to main thread
                this.port.postMessage({
                    type: 'audio',
                    buffer: this.buffer.slice() // Copy the buffer
                });
                this.bufferIndex = 0;
            }
        }

        return true; // Keep processor alive
    }
}

registerProcessor('microphone-processor', MicrophoneProcessor);
