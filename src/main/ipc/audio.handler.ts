/**
 * Audio Handler - macOS audio capture using AVFoundation
 *
 * Controls audio recording and provides audio level monitoring.
 */

import { ipcMain, BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";
import {
  startRecording,
  stopRecording,
  getAudioDevices,
  getCurrentLevel,
  isCurrentlyRecording,
  audioDeviceSchema,
} from "../services/audio.service";
import type { AudioDevice } from "../types/asr";

let levelInterval: NodeJS.Timeout | null = null;

/**
 * Send message to renderer
 */
function sendToRenderer(channel: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    win.webContents.send(channel, data);
  });
}

/**
 * Start audio recording
 */
ipcMain.handle(IPC_CHANNELS.AUDIO.START_RECORDING, async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await startRecording();

    // Start reporting audio levels every 50ms
    levelInterval = setInterval(() => {
      if (isCurrentlyRecording()) {
        const level = getCurrentLevel();
        sendToRenderer(IPC_CHANNELS.AUDIO.ON_LEVEL, level);
      }
    }, 50);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
});

/**
 * Stop audio recording
 */
ipcMain.handle(IPC_CHANNELS.AUDIO.STOP_RECORDING, async (): Promise<{ success: boolean }> => {
  if (levelInterval) {
    clearInterval(levelInterval);
    levelInterval = null;
  }

  await stopRecording();
  return { success: true };
});

/**
 * Get available audio input devices
 */
ipcMain.handle(IPC_CHANNELS.AUDIO.GET_DEVICES, async (): Promise<AudioDevice[]> => {
  const devices = await getAudioDevices();

  // Validate all devices with Zod
  return devices.map((device) => {
    const parseResult = audioDeviceSchema.safeParse(device);
    if (!parseResult.success) {
      // Return default device if validation fails
      return {
        deviceId: "default",
        label: "Default Microphone",
        isDefault: true,
      } as AudioDevice;
    }
    return parseResult.data;
  });
});

/**
 * Check if currently recording
 */
ipcMain.handle("audio:isRecording", async (): Promise<boolean> => {
  return isCurrentlyRecording();
});
