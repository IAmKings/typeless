/**
 * Audio Service (Main Process) - State management
 *
 * The actual audio capture is performed in the renderer process using
 * navigator.mediaDevices.getUserMedia. This main process service
 * provides shared state that both the handler and other services can use.
 *
 * @see ../renderer/services/audio.service.ts for the renderer implementation
 */

import { z } from "zod";

// ============= Schema =============

export const audioDeviceSchema = z.object({
  deviceId: z.string(),
  label: z.string(),
  isDefault: z.boolean(),
});

// ============= Shared State =============

let isRecording = false;
let currentAudioLevel = 0;
let currentDeviceId: string | undefined = undefined;

// ============= State Management =============

/**
 * Update the current audio level (0-100)
 */
export function updateAudioLevel(level: number): void {
  currentAudioLevel = level;
}

/**
 * Update recording state
 */
export function setRecordingState(recording: boolean, deviceId?: string): void {
  isRecording = recording;
  currentDeviceId = deviceId;
  if (!recording) {
    currentAudioLevel = 0;
  }
}

/**
 * Get current audio input level (0-100)
 */
export function getCurrentLevel(): number {
  return currentAudioLevel;
}

/**
 * Check if currently recording
 */
export function isCurrentlyRecording(): boolean {
  return isRecording;
}

/**
 * Get current device ID
 */
export function getCurrentDeviceId(): string | undefined {
  return currentDeviceId;
}

/**
 * Reset recording state
 */
export function resetRecordingState(): void {
  isRecording = false;
  currentDeviceId = undefined;
  currentAudioLevel = 0;
}
