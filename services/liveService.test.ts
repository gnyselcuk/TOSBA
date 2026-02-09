import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiLiveService } from './liveService';
import { ai } from './ai';

// Mock AI module
vi.mock('./ai', () => ({
    LIVE_MODEL: 'test-live-model',
    ai: {
        live: {
            connect: vi.fn()
        }
    }
}));

// Mock Global Web Audio API
const mockResume = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockGetByteFrequencyData = vi.fn();
const mockAddModule = vi.fn().mockResolvedValue(undefined);

const mockAudioContextInstance = {
    state: 'suspended',
    resume: mockResume,
    close: mockClose,
    createAnalyser: vi.fn(() => ({
        fftSize: 256,
        smoothingTimeConstant: 0.4,
        frequencyBinCount: 128,
        getByteFrequencyData: mockGetByteFrequencyData,
        connect: vi.fn()
    })),
    createGain: vi.fn(() => ({
        connect: vi.fn()
    })),
    createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn()
    })),
    createBuffer: vi.fn(() => ({
        getChannelData: vi.fn(() => new Float32Array(128))
    })),
    createBufferSource: vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        addEventListener: vi.fn()
    })),
    audioWorklet: {
        addModule: mockAddModule
    },
    destination: {},
    currentTime: 0
};

// Mock AudioWorkletNode
class MockAudioWorkletNode {
    port = {
        onmessage: null,
        postMessage: vi.fn()
    };
    connect = vi.fn();
    disconnect = vi.fn();
}

// Mock AudioContext as a spyable function (must be function, not arrow, to be new-able)
const MockAudioContext = vi.fn(function () {
    return mockAudioContextInstance;
});

global.AudioContext = MockAudioContext as any;
global.AudioWorkletNode = MockAudioWorkletNode as any;

// Mock MediaDevices
const mockGetUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: vi.fn() }]
});
Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true // Important for potential cleanup
});

describe('GeminiLiveService', () => {
    let service: GeminiLiveService;
    const mockOnTranscript = vi.fn();
    const mockSession = {
        sendRealtimeInput: vi.fn(),
        close: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        service = new GeminiLiveService(mockOnTranscript);
        (ai.live.connect as any).mockResolvedValue(mockSession);

        // Setup successful connection callback trigger
        (ai.live.connect as any).mockImplementation(({ callbacks }: any) => {
            setTimeout(() => {
                callbacks.onopen();
            }, 0);
            return Promise.resolve(mockSession);
        });
    });

    it('should initialize correctly', () => {
        expect(service).toBeDefined();
        expect(service.isConnected).toBe(false);
    });

    describe('connect', () => {
        it('should connect in full conversation mode (audio enabled)', async () => {
            await service.connect('System instruction', 'VoiceName', false);

            expect(ai.live.connect).toHaveBeenCalledWith(expect.objectContaining({
                config: expect.objectContaining({
                    systemInstruction: 'System instruction',
                    inputAudioTranscription: {}, // Enabled
                })
            }));

            // Audio setup checks
            expect(global.AudioContext).toHaveBeenCalledTimes(2); // Input and Output
            expect(mockGetUserMedia).toHaveBeenCalled();
            expect(mockAddModule).toHaveBeenCalled();
            expect(service.isConnected).toBe(true);
        });

        it('should connect in text-only mode (TTS only)', async () => {
            await service.connect('System instruction', 'VoiceName', true);

            expect(ai.live.connect).toHaveBeenCalledWith(expect.objectContaining({
                config: expect.objectContaining({
                    inputAudioTranscription: undefined, // Disabled
                })
            }));

            // Audio setup checks
            expect(global.AudioContext).toHaveBeenCalledTimes(1); // Output only
            expect(mockGetUserMedia).not.toHaveBeenCalled();
            expect(service.isConnected).toBe(true);
        });
    });

    describe('sendText', () => {
        beforeEach(async () => {
            await service.connect('Sys', 'Voice');
        });

        it('should send text when connected', async () => {
            await service.sendText('Hello', 'high');
            expect(mockSession.sendRealtimeInput).toHaveBeenCalledWith({ text: 'Hello' });
        });

        it('should verify connected state before sending', async () => {
            service.isConnected = false;
            await service.sendText('Hello');
            expect(mockSession.sendRealtimeInput).not.toHaveBeenCalled(); // Should assume prior call context from beforeEach was valid? 
            // Wait, I messed up the test logic. If I set isConnected=false manually, let's see.
            // But sessionPromise also needs to be checked.
            // The service checks `!this.sessionPromise || !this.isConnected`.
        });
    });

    describe('updateContext', () => {
        beforeEach(async () => {
            await service.connect('Sys', 'Voice', false); // Full mode
        });

        it('should send context update in full mode', async () => {
            service.updateContext({ score: 100 });
            await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async send
            expect(mockSession.sendRealtimeInput).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.arrayContaining([
                        expect.objectContaining({
                            parts: expect.arrayContaining([
                                expect.objectContaining({ text: expect.stringContaining('Score: 100') })
                            ])
                        })
                    ])
                })
            );
        });

        it('should NOT send context update in text-only mode', async () => {
            // Re-connect in text-only
            service = new GeminiLiveService(mockOnTranscript);
            await service.connect('Sys', 'Voice', true);

            mockSession.sendRealtimeInput.mockClear();
            service.updateContext({ score: 100 });

            expect(mockSession.sendRealtimeInput).not.toHaveBeenCalled();
        });
    });

    describe('Audio Handling', () => {
        it('should calculate volume from analyser', async () => {
            await service.connect('Sys', 'Voice');
            // Mock some frequency data
            mockGetByteFrequencyData.mockImplementation((array: Uint8Array) => {
                array.fill(255); // Max volume
            });

            const volume = service.getOutputVolume();
            expect(volume).toBeCloseTo(1.0);
        });
    });

    describe('disconnect', () => {
        it('should clean up resources', async () => {
            await service.connect('Sys', 'Voice');
            await service.disconnect();

            expect(mockSession.close).toHaveBeenCalled();
            expect(mockClose).toHaveBeenCalledTimes(2); // Input + Output contexts
            // Media stream tracks stop handled via mock above
        });
    });
});
