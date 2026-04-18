/**
 * Audio Handler - macOS audio capture coordination
 *
 * Audio capture is performed in the renderer process using getUserMedia.
 * This handler coordinates the main process side:
 *   1. Triggers renderer to start/stop capture via executeJavaScript
 *   2. Manages audio level interval (50ms)
 *   3. Routes audio data from renderer to all windows and ASR
 *
 * Data flow:
 *   UI -> IPC START_RECORDING -> Handler -> executeJavaScript -> Renderer
 *   Renderer (getUserMedia) -> IPC PUSH_AUDIO_DATA -> Handler -> Windows/ASR
 *
 * @see ../../renderer/services/audio.service.ts for renderer audio capture
 */

import { ipcMain, BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";
import { audioDeviceSchema } from "../../main/services/audio.service";
import type { AudioDevice } from "../../main/types/asr";

// ============= State =============

let levelInterval: ReturnType<typeof setInterval> | null = null;
let recordingActive = false;

// ============= Helpers =============

/**
 * Send message to all renderer windows
 */
function sendToRenderer(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.webContents.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }
}

/**
 * Get the focused or first available window
 */
function getActiveWindow(): BrowserWindow | null {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.webContents.isDestroyed()) return focused;
  const all = BrowserWindow.getAllWindows();
  return all.find((w) => !w.webContents.isDestroyed()) ?? null;
}

/**
 * Execute code in the renderer process and return the result
 */
async function executeInRenderer(code: string): Promise<unknown> {
  const win = getActiveWindow();
  if (!win) {
    throw new Error("No active window available");
  }

  // Wait for renderer to be ready if still loading
  if (win.webContents.isLoading()) {
    await new Promise<void>((resolve) => {
      win.webContents.once("did-finish-load", () => resolve());
    });
  }

  if (win.webContents.isDestroyed()) {
    throw new Error("Window was destroyed");
  }

  return win.webContents.executeJavaScript(code);
}

// ============= IPC Handlers =============

/**
 * Start audio recording
 *
 * Triggers the renderer to start audio capture via __audioCapture bridge.
 */
ipcMain.handle(
  IPC_CHANNELS.AUDIO.START_RECORDING,
  async (_event, options?: { deviceId?: string }): Promise<{ success: boolean; error?: string }> => {
    if (recordingActive) {
      return { success: false, error: "Already recording" };
    }

    try {
      const deviceId = options?.deviceId;
      const code = `window.__audioCapture.startCapture(${deviceId ? JSON.stringify(deviceId) : "undefined"})`;
      const result = await executeInRenderer(code) as { success: boolean; error?: string };

      if (!result.success) {
        return result;
      }

      recordingActive = true;

      // Start level push interval (50ms) as a fallback/additional mechanism
      if (levelInterval) clearInterval(levelInterval);
      levelInterval = setInterval(async () => {
        if (!recordingActive) return;
        try {
          const level = await executeInRenderer("window.__audioCapture.getLevel()") as number;
          sendToRenderer(IPC_CHANNELS.AUDIO.ON_LEVEL, level);
        } catch {
          // Renderer might not be ready
        }
      }, 50);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start recording";
      return { success: false, error: message };
    }
  }
);

/**
 * Stop audio recording
 */
ipcMain.handle(IPC_CHANNELS.AUDIO.STOP_RECORDING, async (): Promise<{ success: boolean }> => {
  if (levelInterval) {
    clearInterval(levelInterval);
    levelInterval = null;
  }

  recordingActive = false;

  try {
    await executeInRenderer("window.__audioCapture.stopCapture()");
  } catch {
    // Ignore errors during stop
  }

  return { success: true };
});

/**
 * Get available audio input devices
 */
ipcMain.handle(IPC_CHANNELS.AUDIO.GET_DEVICES, async (): Promise<AudioDevice[]> => {
  try {
    const devices = await executeInRenderer(
      "window.__audioCapture.getDevices()"
    ) as AudioDevice[];

    if (!Array.isArray(devices) || devices.length === 0) {
      return [
        {
          deviceId: "default",
          label: "Default Microphone",
          isDefault: true,
        },
      ];
    }

    return devices.map((device) => {
      const parseResult = audioDeviceSchema.safeParse(device);
      if (!parseResult.success) {
        return {
          deviceId: "default",
          label: "Default Microphone",
          isDefault: true,
        } as AudioDevice;
      }
      return parseResult.data;
    });
  } catch {
    return [
      {
        deviceId: "default",
        label: "Default Microphone",
        isDefault: true,
      },
    ];
  }
});

/**
 * Check if currently recording
 */
ipcMain.handle("audio:isRecording", async (): Promise<boolean> => {
  try {
    return await executeInRenderer("window.__audioCapture.isRecording()") as boolean;
  } catch {
    return recordingActive;
  }
});

// ============= Audio Data Pipeline =============

/**
 * Handle audio data pushed from renderer process.
 *
 * Pipeline:
 *   Renderer (getUserMedia + AudioWorklet)
 *     -> PUSH_AUDIO_DATA IPC
 *     -> This handler
 *     -> All windows (ON_AUDIO_DATA for visualization)
 *     -> ASR handler (SEND_AUDIO for speech recognition)
 */
ipcMain.on(IPC_CHANNELS.AUDIO.PUSH_AUDIO_DATA, (_event, arrayBuffer: ArrayBuffer) => {
  // Forward to all windows for audio visualization
  sendToRenderer(IPC_CHANNELS.AUDIO.ON_AUDIO_DATA, arrayBuffer);

  // Forward to ASR handler
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.webContents.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.ASR.SEND_AUDIO, arrayBuffer);
    }
  }
});

/**
 * Handle audio errors from renderer
 */
ipcMain.on(
  IPC_CHANNELS.AUDIO.ON_ERROR,
  (_event, error: { code: string; message: string }) => {
    sendToRenderer(IPC_CHANNELS.AUDIO.ON_ERROR, error);
  }
);
