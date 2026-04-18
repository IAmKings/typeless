/**
 * Audio Service - macOS audio capture
 *
 * TODO: Implement with AVAudioEngine for real-time capture
 *
 * @see macos-permissions.md for permission handling
 */

import { z } from "zod";
import type { AudioDevice } from "../types/asr";

// ============= Audio Device Schema =============

export const audioDeviceSchema = z.object({
  deviceId: z.string(),
  label: z.string(),
  isDefault: z.boolean(),
});

// ============= Service State =============

let isRecording = false;
let currentAudioLevel = 0;

/**
 * Start recording audio
 *
 * TODO: Implement using AVAudioEngine
 * - Create AVAudioEngine
 * - Attach input node
 * - Install tap on input node for real-time audio
 * - Return audio buffers via callback to ASR handler
 */
export async function startRecording(): Promise<void> {
  if (isRecording) {
    throw new Error("Already recording");
  }

  isRecording = true;
  console.log("[Audio Service] Starting recording...");
}

/**
 * Stop recording audio
 */
export async function stopRecording(): Promise<void> {
  if (!isRecording) {
    return;
  }

  isRecording = false;
  currentAudioLevel = 0;
  console.log("[Audio Service] Stopping recording...");
}

/**
 * Get available audio input devices
 *
 * TODO: Implement using Core Audio to enumerate devices
 */
export async function getAudioDevices(): Promise<AudioDevice[]> {
  // Placeholder implementation
  return [
    {
      deviceId: "default",
      label: "Default Microphone",
      isDefault: true,
    },
  ];
}

/**
 * Get current audio input level (0-100)
 *
 * TODO: Return actual RMS level from AVAudioEngine
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
