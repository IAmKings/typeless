/**
 * Audio Capture Bridge - Bridge between main process and renderer audio service
 *
 * This module provides a bridge that the main process can call via
 * webContents.executeJavaScript to control audio capture in the renderer.
 *
 * The actual audio capture is performed by audio.service.ts using
 * navigator.mediaDevices.getUserMedia and AudioContext.
 *
 * @see audio.service.ts for the actual capture implementation
 */

import type { AudioDeviceInfo } from "./audio.service";
import {
  startRecording,
  stopRecording,
  getAudioDevices,
  getCurrentLevel,
  isCurrentlyRecording,
} from "./audio.service";

/**
 * Audio capture bridge exposed on window.__audioCapture
 */
export const audioCapture = {
  /**
   * Start audio recording
   */
  async startCapture(deviceId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      await startRecording(deviceId);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start recording";
      return { success: false, error: message };
    }
  },

  /**
   * Stop audio recording
   */
  async stopCapture(): Promise<{ success: boolean }> {
    try {
      await stopRecording();
      return { success: true };
    } catch {
      return { success: false };
    }
  },

  /**
   * Get available audio devices
   */
  async getDevices(): Promise<AudioDeviceInfo[]> {
    try {
      return await getAudioDevices();
    } catch {
      return [];
    }
  },

  /**
   * Get current audio level
   */
  getLevel(): number {
    return getCurrentLevel();
  },

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return isCurrentlyRecording();
  },
};

// Automatically push audio data and errors to main process
// These functions are called by audio.service.ts internally

/**
 * Push audio data to main process via IPC bridge
 * Called by audio.service.ts when PCM chunks are ready
 */
export function pushAudioData(data: ArrayBuffer): void {
  window.api.audio.pushAudioData(data);
}

/**
 * Push audio level to main process via IPC bridge
 * Called by audio.service.ts periodically
 */
export function pushAudioLevel(level: number): void {
  window.api.audio.pushAudioLevel(level);
}

/**
 * Push audio error to main process via IPC bridge
 */
export function pushAudioError(code: string, message: string): void {
  window.api.audio.pushAudioError(code, message);
}
