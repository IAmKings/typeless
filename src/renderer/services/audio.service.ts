/**
 * Audio Service - Real-time audio capture in renderer process
 *
 * Uses navigator.mediaDevices.getUserMedia for microphone access,
 * AudioContext for real-time processing, and IPC for data forwarding.
 *
 * Output format: PCM 16bit, 16kHz, mono, signed, little-endian
 * Audio chunks are pushed every 100ms via IPC
 * Level (RMS) updates are pushed every 50ms
 *
 * @see audio-capture.ts for the main process bridge
 */

import { pushAudioData, pushAudioLevel, pushAudioError } from "./audio-capture";

// ============= Constants =============

const TARGET_SAMPLE_RATE = 16000;
const AUDIO_CHUNK_INTERVAL_MS = 100;
const LEVEL_UPDATE_INTERVAL_MS = 50;
const BUFFER_SIZE = 4096;

// ============= Types =============

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  isDefault: boolean;
}

interface AudioCaptureState {
  mediaStream: MediaStream | null;
  audioContext: AudioContext | null;
  processor: ScriptProcessorNode | null;
  gainNode: GainNode | null;
  pcmChunks: Int16Array[];
  lastChunkTime: number;
  isRecording: boolean;
  currentDeviceId: string | undefined;
}

// ============= State =============

const state: AudioCaptureState = {
  mediaStream: null,
  audioContext: null,
  processor: null,
  gainNode: null,
  pcmChunks: [],
  lastChunkTime: 0,
  isRecording: false,
  currentDeviceId: undefined,
};

// ============= Audio Processing =============

/**
 * Downsample audio buffer to target sample rate using linear interpolation
 */
function downsampleBuffer(buffer: AudioBuffer, outputSampleRate: number): Int16Array {
  if (buffer.sampleRate === outputSampleRate) {
    return floatTo16BitPCM(buffer.getChannelData(0));
  }

  const ratio = buffer.sampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Int16Array(newLength);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(Math.ceil(srcIndex), channelData.length - 1);

    if (srcIndexFloor === srcIndexCeil) {
      result[i] = Math.max(-1, Math.min(1, channelData[srcIndexFloor])) * 32767;
    } else {
      const fraction = srcIndex - srcIndexFloor;
      const sample =
        channelData[srcIndexFloor] * (1 - fraction) +
        channelData[srcIndexCeil] * fraction;
      result[i] = Math.max(-1, Math.min(1, sample)) * 32767;
    }
  }
  return result;
}

/**
 * Convert float audio buffer (-1 to 1) to 16-bit PCM
 */
function floatTo16BitPCM(float32Buffer: Float32Array): Int16Array {
  const int16Buffer = new Int16Array(float32Buffer.length);
  for (let i = 0; i < float32Buffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32Buffer[i]));
    int16Buffer[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return int16Buffer;
}

/**
 * Calculate RMS level from audio data (0-100)
 */
function calculateRMS(float32Data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < float32Data.length; i++) {
    sum += float32Data[i] * float32Data[i];
  }
  const rms = Math.sqrt(sum / float32Data.length);
  // Convert to 0-100 scale with logarithmic mapping
  // RMS of 1.0 -> 100, RMS of 0.01 -> ~20, RMS of 0 -> 0
  const db = 20 * Math.log10(Math.max(rms, 0.00001));
  const minDb = -60;
  const maxDb = 0;
  const normalized = Math.max(0, Math.min(100, ((db - minDb) / (maxDb - minDb)) * 100));
  return Math.round(normalized);
}

// ============= Periodic Push =============

let levelInterval: ReturnType<typeof setInterval> | null = null;
let chunkInterval: ReturnType<typeof setInterval> | null = null;
let lastLevel = 0;

/**
 * Push accumulated PCM data to main process
 */
function pushAudioChunk(): void {
  if (state.pcmChunks.length === 0) return;

  const totalSamples = state.pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const pcmData = new Int16Array(totalSamples);
  let offset = 0;
  for (const chunk of state.pcmChunks) {
    pcmData.set(chunk, offset);
    offset += chunk.length;
  }

  // Convert to ArrayBuffer
  const arrayBuffer = pcmData.buffer.slice(
    pcmData.byteOffset,
    pcmData.byteOffset + pcmData.byteLength
  );

  pushAudioData(arrayBuffer);
  state.pcmChunks = [];
  state.lastChunkTime = Date.now();
}

function startLevelPush(): void {
  stopLevelPush();
  levelInterval = setInterval(() => {
    if (state.isRecording) {
      pushAudioLevel(lastLevel);
    }
  }, LEVEL_UPDATE_INTERVAL_MS);
}

function stopLevelPush(): void {
  if (levelInterval) {
    clearInterval(levelInterval);
    levelInterval = null;
  }
}

function startChunkPush(): void {
  stopChunkPush();
  chunkInterval = setInterval(() => {
    if (state.isRecording) {
      pushAudioChunk();
    }
  }, AUDIO_CHUNK_INTERVAL_MS);
}

function stopChunkPush(): void {
  if (chunkInterval) {
    clearInterval(chunkInterval);
    chunkInterval = null;
  }
}

// ============= Cleanup =============

function cleanup(): void {
  if (state.processor) {
    try {
      state.processor.disconnect();
    } catch {
      // Already disconnected
    }
    state.processor = null;
  }

  if (state.gainNode) {
    try {
      state.gainNode.disconnect();
    } catch {
      // Already disconnected
    }
    state.gainNode = null;
  }

  if (state.audioContext) {
    try {
      state.audioContext.close();
    } catch {
      // Already closed
    }
    state.audioContext = null;
  }

  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((track) => track.stop());
    state.mediaStream = null;
  }

  state.pcmChunks = [];
  state.isRecording = false;
  state.lastChunkTime = 0;
  lastLevel = 0;
  stopLevelPush();
  stopChunkPush();
}

// ============= Public API =============

/**
 * Get available audio input devices
 */
export async function getAudioDevices(): Promise<AudioDeviceInfo[]> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }

  try {
    // First call to enumerateDevices may trigger permission request
    // Get default device first
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");

    // Determine default device
    const defaultDevice = audioInputs.find((d) => d.deviceId === "default") ||
      audioInputs.find((d) => d.deviceId === "") ||
      audioInputs[0];

    return audioInputs.map((d) => ({
      deviceId: d.deviceId,
      label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
      isDefault: d.deviceId === defaultDevice?.deviceId,
    }));
  } catch {
    return [];
  }
}

/**
 * Start audio recording
 *
 * @param deviceId - Optional specific device ID to use
 */
export async function startRecording(deviceId?: string): Promise<void> {
  if (state.isRecording) {
    throw new Error("Already recording");
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    pushAudioError("NOT_SUPPORTED", "MediaDevices API not available");
    throw new Error("MediaDevices API not available");
  }

  const constraints: MediaStreamConstraints = {
    audio: deviceId
      ? {
          deviceId: { exact: deviceId },
          sampleRate: TARGET_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      : {
          sampleRate: TARGET_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
    video: false,
  };

  let mediaStream: MediaStream;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to access microphone";
    pushAudioError("PERMISSION_DENIED", message);
    if (message.includes("Permission denied") || message.includes("Permission dismissed")) {
      throw new Error("Microphone permission denied");
    }
    throw new Error(`Failed to start recording: ${message}`);
  }

  state.mediaStream = mediaStream;
  state.currentDeviceId = deviceId;

  // Create audio context
  const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  state.audioContext = audioContext;

  // Create source from media stream
  const source = audioContext.createMediaStreamSource(mediaStream);

  // Create gain node for level metering
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 1;
  state.gainNode = gainNode;

  // Create script processor for real-time audio processing
  const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
  state.processor = processor;

  // Process audio data
  processor.onaudioprocess = (event) => {
    if (!state.isRecording) return;

    const inputBuffer = event.inputBuffer;
    const float32Data = inputBuffer.getChannelData(0);

    // Calculate and store level
    lastLevel = calculateRMS(float32Data);

    // Downsample to 16kHz if needed
    const pcmData = downsampleBuffer(inputBuffer, TARGET_SAMPLE_RATE);
    state.pcmChunks.push(pcmData);
  };

  // Connect nodes: source -> gain -> processor -> destination
  source.connect(gainNode);
  gainNode.connect(processor);
  processor.connect(audioContext.destination);

  state.isRecording = true;
  state.lastChunkTime = Date.now();

  // Start periodic push intervals
  startLevelPush();
  startChunkPush();

  console.log(
    `[Audio Service] Recording started, device: ${deviceId ?? "default"}, sample rate: ${audioContext.sampleRate}Hz`
  );
}

/**
 * Stop audio recording
 */
export async function stopRecording(): Promise<void> {
  if (!state.isRecording) {
    return;
  }

  // Push any remaining audio data
  pushAudioChunk();

  cleanup();
  console.log("[Audio Service] Recording stopped");
}

/**
 * Check if currently recording
 */
export function isCurrentlyRecording(): boolean {
  return state.isRecording;
}

/**
 * Get current audio level (0-100)
 */
export function getCurrentLevel(): number {
  return lastLevel;
}

/**
 * Switch to a different audio device while recording
 */
export async function switchDevice(deviceId: string): Promise<void> {
  if (!state.isRecording) {
    throw new Error("Not currently recording");
  }

  if (deviceId === state.currentDeviceId) {
    return;
  }

  console.log(`[Audio Service] Switching device from ${state.currentDeviceId} to ${deviceId}`);

  // Stop current recording
  await stopRecording();

  // Start with new device
  await startRecording(deviceId);
}
