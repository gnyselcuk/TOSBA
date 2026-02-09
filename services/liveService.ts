import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { LIVE_MODEL, ai } from './ai';

// Helpers for Audio Encoding/Decoding
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  const len = bytes.byteLength;
  // Use chunks to prevent stack overflow with apply
  const chunk = 0x8000;
  const chars = [];
  for (let i = 0; i < len; i += chunk) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - spread works on TypedArray in modern envs or use Array.from
    chars.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]));
  }
  return btoa(chars.join(''));
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer as ArrayBuffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Session Context Interface
export interface SessionContext {
  currentModule?: string;
  currentActivity?: string;
  score?: number;
  emotion?: 'happy' | 'frustrated' | 'neutral' | 'excited';
  consecutiveErrors?: number;
  isInCriticalMoment?: boolean; // During important gameplay
}

// Polyfill type for Webkit AudioContext
interface WebkitWindow extends Window {
  webkitAudioContext: typeof AudioContext;
}

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;

  // Audio Analysis for Animation
  public outputAnalyser: AnalyserNode | null = null;
  private analysisBuffer: Uint8Array | null = null;
  private volumeDataArray: Uint8Array | null = null;

  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sessionPromise: Promise<any> | null = null;
  private onTranscriptUpdate: (text: string, isUser: boolean, isFinal: boolean) => void;
  private stream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletReady: boolean = false;

  // Transcription State
  private currentInputTranscription = '';
  private currentOutputTranscription = '';

  // Context Management
  private sessionContext: SessionContext = { emotion: 'neutral' };
  private quietMode: boolean = false;
  private lastInteractionTime: number = 0;

  // Connection State
  public isConnected: boolean = false;
  public isTextOnly: boolean = false; // New flag for TTS-only mode
  private lastConfig: { systemInstruction: string, voiceName: string } | null = null;
  private connectionResolver: (() => void) | null = null;

  constructor(onTranscriptUpdate: (text: string, isUser: boolean, isFinal: boolean) => void) {
    this.ai = ai;
    this.onTranscriptUpdate = onTranscriptUpdate;
  }

  public connect(
    systemInstruction?: string,
    voiceName: string = 'Kore',
    textOnly: boolean = false,
    modelName: string = LIVE_MODEL
  ): Promise<void> {
    this.isTextOnly = textOnly;

    // Reuse last config if not provided
    if (systemInstruction) {
      this.lastConfig = { systemInstruction, voiceName };
    } else if (this.lastConfig) {
      systemInstruction = this.lastConfig.systemInstruction;
      voiceName = this.lastConfig.voiceName;
    } else {
      throw new Error("No system instruction provided for Live API");
    }

    // Capture variables for the promise closure
    const currentSystemInstruction = systemInstruction;
    const currentVoiceName = voiceName;

    // Return a promise that resolves when onopen fires
    return new Promise((resolve, reject) => {
      this.connectionResolver = resolve;

      const setupConnection = async () => {
        try {
          // Output audio context is always needed
          const AudioContextClass = window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;
          this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 });

          // Try to resume, but don't block connection if it fails (lazy resume on user interaction)
          if (this.outputAudioContext.state === 'suspended') {
            try {
              await this.outputAudioContext.resume();
            } catch {
              // Ignore resume errors, wait for user gesture
            }
          }

          // Setup Output Analyzer
          this.outputAnalyser = this.outputAudioContext.createAnalyser();
          this.outputAnalyser.fftSize = 256;
          this.outputAnalyser.smoothingTimeConstant = 0.4;
          this.analysisBuffer = new Uint8Array(this.outputAnalyser.frequencyBinCount);

          const outputNode = this.outputAudioContext.createGain();
          outputNode.connect(this.outputAudioContext.destination);
          outputNode.connect(this.outputAnalyser);

          // Only setup microphone for conversation mode
          if (!textOnly) {
            const InputAudioContextClass = window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;
            this.inputAudioContext = new InputAudioContextClass({ sampleRate: 16000 });
            if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }

          this.sessionPromise = this.ai.live.connect({
            model: modelName,
            config: {
              responseModalities: [Modality.AUDIO],
              inputAudioTranscription: textOnly ? undefined : {}, // Only request transcription if using mic
              outputAudioTranscription: {},
              systemInstruction: currentSystemInstruction,
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: currentVoiceName } },
              },
            },
            callbacks: {
              onopen: () => {
                this.isConnected = true;

                // Signal ready
                if (this.connectionResolver) {
                  this.connectionResolver();
                  this.connectionResolver = null;
                }

                // Only setup microphone streaming if not text-only mode
                if (!textOnly && this.inputAudioContext && this.stream) {
                  // Setup AudioWorklet for better performance (runs on separate thread)
                  // eslint-disable-next-line sonarjs/no-nested-functions
                  this.setupAudioWorklet(this.inputAudioContext, this.stream).catch(err => {
                    console.error("AudioWorklet Setup Error", err);
                  });
                }
              },
              onmessage: async (message: LiveServerMessage) => {
                // 1. Handle Audio Output
                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio && this.outputAudioContext) {
                  // Ensure context is running (retry resume if needed)
                  if (this.outputAudioContext.state === 'suspended') {
                    try { await this.outputAudioContext.resume(); } catch { /* Ignore */ }
                  }

                  this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                  const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    this.outputAudioContext,
                    24000,
                    1
                  );

                  const source = this.outputAudioContext.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputNode);
                  // eslint-disable-next-line sonarjs/no-nested-functions
                  source.addEventListener('ended', () => {
                    this.sources.delete(source);
                  });
                  source.start(this.nextStartTime);
                  this.nextStartTime += audioBuffer.duration;
                  this.sources.add(source);
                }

                // 2. Handle Interruption
                if (message.serverContent?.interrupted) {
                  // eslint-disable-next-line sonarjs/no-nested-functions
                  this.sources.forEach(source => source.stop());
                  this.sources.clear();
                  this.nextStartTime = 0;
                  this.currentInputTranscription = '';
                  this.currentOutputTranscription = '';
                }

                // 3. Handle Transcription
                if (message.serverContent?.outputTranscription) {
                  const text = message.serverContent.outputTranscription.text;
                  this.currentOutputTranscription += text;
                  this.onTranscriptUpdate(this.currentOutputTranscription, false, false);
                } else if (message.serverContent?.inputTranscription) {
                  const text = message.serverContent.inputTranscription.text;
                  this.currentInputTranscription += text;
                  this.onTranscriptUpdate(this.currentInputTranscription, true, false);
                }

                if (message.serverContent?.turnComplete) {
                  if (this.currentInputTranscription.trim()) {
                    this.onTranscriptUpdate(this.currentInputTranscription, true, true);
                    this.currentInputTranscription = '';
                  }
                  if (this.currentOutputTranscription.trim()) {
                    this.onTranscriptUpdate(this.currentOutputTranscription, false, true);
                    this.currentOutputTranscription = '';
                  }
                }
              },
              onclose: () => {
                this.isConnected = false;
              },
              onerror: (error: unknown) => {
                console.error('Gemini Live Error:', error);
                this.isConnected = false;
              }
            }
          });
        } catch (error) {
          console.error("Connection Failed:", error);
          reject(error);
        }
      };

      setupConnection();
    });
  }

  /**
   * Setup AudioWorklet for microphone input processing
   * Runs on a separate audio thread for better performance
   */
  private async setupAudioWorklet(audioContext: AudioContext, stream: MediaStream) {
    try {
      // Load the AudioWorklet processor
      await audioContext.audioWorklet.addModule('/audio-worklet-processor.js');
      this.workletReady = true;

      this.sourceNode = audioContext.createMediaStreamSource(stream);
      this.audioWorkletNode = new AudioWorkletNode(audioContext, 'microphone-processor');

      // Handle audio data from the worklet (runs on main thread but with buffered data)
      this.audioWorkletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio' && !this.quietMode) {
          const inputData = event.data.buffer as Float32Array;

          // Downsample if needed (Gemini requires 16000Hz)
          const targetRate = 16000;
          const currentRate = audioContext.sampleRate;
          let finalData = inputData;

          if (currentRate !== targetRate) {
            const ratio = currentRate / targetRate;
            const newLength = Math.ceil(inputData.length / ratio);
            finalData = new Float32Array(newLength);
            for (let i = 0; i < newLength; i++) {
              const originalIndex = Math.floor(i * ratio);
              if (originalIndex < inputData.length) {
                finalData[i] = inputData[originalIndex];
              }
            }
          }

          const pcmBlob = createBlob(finalData);
          this.sessionPromise?.then((session) => {
            session.sendRealtimeInput({ media: pcmBlob });
          });
        }
      };

      // Connect the audio graph
      this.sourceNode.connect(this.audioWorkletNode);
      // Note: AudioWorkletNode doesn't need to connect to destination for input processing
    } catch (error) {
      console.error('❌ [LiveService] AudioWorklet setup failed:', error);
      // Fallback could be implemented here if needed, but better to fail gracefully
      throw error;
    }
  }

  // Helper to get current volume (0.0 to 1.0) for animation
  public getOutputVolume(): number {
    if (!this.outputAnalyser) return 0;

    // Initialize or resize buffer if needed
    if (!this.volumeDataArray || this.volumeDataArray.length !== this.outputAnalyser.frequencyBinCount) {
      this.volumeDataArray = new Uint8Array(this.outputAnalyser.frequencyBinCount);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.outputAnalyser.getByteFrequencyData(this.volumeDataArray as any);

    let sum = 0;
    const binCount = this.volumeDataArray.length;
    for (let i = 0; i < binCount; i++) {
      sum += this.volumeDataArray[i];
    }
    const average = sum / binCount;
    return average / 255;
  }

  // --- CONTEXT MANAGEMENT ---

  /**
   * Update session context (game state, emotion, etc.)
   * This gives the buddy awareness without forcing it to speak
   */
  public updateContext(context: Partial<SessionContext>) {
    this.sessionContext = { ...this.sessionContext, ...context };

    // Send silent context update to model
    const contextMessage = this.formatContextUpdate(context);
    if (contextMessage && this.sessionPromise) {
      this.sendContextUpdate(contextMessage);
    }
  }

  private formatContextUpdate(context: Partial<SessionContext>): string | null {
    const updates: string[] = [];

    if (context.currentModule) {
      updates.push(`Module: ${context.currentModule}`);
    }
    if (context.currentActivity) {
      updates.push(`Activity: ${context.currentActivity}`);
    }
    if (context.score !== undefined) {
      updates.push(`Score: ${context.score}`);
    }
    if (context.emotion) {
      updates.push(`Child emotion: ${context.emotion}`);
    }
    if (context.consecutiveErrors !== undefined) {
      updates.push(`Consecutive errors: ${context.consecutiveErrors}`);
    }

    return updates.length > 0
      ? `[CONTEXT] ${updates.join(' | ')}`
      : null;
  }

  private async sendContextUpdate(message: string) {
    if (!this.sessionPromise) return;

    // CRITICAL: In TTS-only mode (textOnly=true), sending context updates (which are text) 
    // confuses the model because it interprets them as text to read aloud.
    // We strictly block context updates in TTS mode.
    if (this.isTextOnly) {
      return;
    }

    try {
      const session = await this.sessionPromise;
      // Send as a system-level context (model should NOT respond to this)
      session.sendRealtimeInput({
        content: [{ parts: [{ text: `${message} [Do not respond to this context update unless child asks a question]` }] }]
      });
    } catch {
      // Silent fail
    }
  }

  /**
   * Set quiet mode (buddy won't auto-speak)
   */
  public setQuietMode(quiet: boolean) {
    this.quietMode = quiet;
  }

  /**
   * Check if buddy should speak based on timing and context
   * @param priority - Message priority affects timing threshold
   */
  private shouldInterrupt(priority: 'low' | 'medium' | 'high' = 'medium'): boolean {
    // Never interrupt in quiet mode or critical moments
    if (this.quietMode || this.sessionContext.isInCriticalMoment) {
      return false;
    }

    // Priority-based timing thresholds
    const timeSinceLastInteraction = Date.now() - this.lastInteractionTime;

    // Different timing rules based on priority:
    // - low: 5 seconds (avoid spam of minor feedback)
    // - medium: 1.5 seconds (game instructions, moderate feedback)
    // - high: no timing restriction (handled in sendText)
    const threshold = priority === 'low' ? 5000 : 1500;

    if (timeSinceLastInteraction < threshold) {
      return false;
    }

    return true;
  }

  // --- MESSAGING ---

  /**
   * Send text to buddy (from game/UI)
   * Priority determines whether to interrupt
   */
  public async sendText(text: string, priority: 'low' | 'medium' | 'high' = 'medium') {
    if (!this.sessionPromise || !this.isConnected) {
      console.warn('[LiveService] Cannot send text - not connected');
      // We don't throw here to avoid crashing UI components calling this
      return;
    }

    // High priority bypasses all timing rules
    // Medium/Low priority must respect timing
    if (priority !== 'high' && !this.shouldInterrupt(priority)) {
      return;
    }

    try {
      const session = await this.sessionPromise;

      // Use BidiGenerateContentRealtimeInput with text field
      session.sendRealtimeInput({
        text: text
      });
      this.lastInteractionTime = Date.now();
    } catch (e) {
      console.error('[LiveService] Send text failed:', e);
      // Re-throw if critical logic depends on it, but generally safe to swallow in UI
    }
  }

  /**
   * Trigger a buddy encouragement based on context
   * Uses smart timing to avoid interruption
   */
  public async triggerEncouragement(type: 'celebrate' | 'help' | 'motivate') {
    if (!this.shouldInterrupt()) return;

    const triggers = {
      celebrate: "The child just succeeded! Give brief celebration.",
      help: "The child seems stuck. Offer gentle hint.",
      motivate: "The child is frustrated. Give brief encouragement."
    };

    await this.sendText(triggers[type], 'medium');
  }

  public async disconnect() {
    this.sessionPromise?.then(session => session.close());

    this.sources.forEach(s => s.stop());
    this.sources.clear();

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage({ type: 'stop' });
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }

    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
      await this.inputAudioContext.close();
    }
    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      await this.outputAudioContext.close();
    }
  }
}
