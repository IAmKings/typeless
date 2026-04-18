/**
 * ASR Handler - IPC handler for ASR WebSocket client
 *
 * Provides IPC interface for renderer to control ASR connection.
 */

import { ipcMain, BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";
import {
  connect,
  disconnect,
  sendAudio,
  getConnectionStatus,
} from "../services/asr/asr.service";
import { asrConfigSchema } from "../services/asr/types";
import type { ASRConfig, TranscriptResult, ConnectionStatus } from "../services/asr/types";

// ============= Logging =============

const log = {
  info: (message: string) => console.log(`[ASR Handler] ${message}`),
  error: (message: string, error?: unknown) => console.error(`[ASR Handler] ${message}`, error),
};

// ============= Renderer Notification =============

/**
 * Send notification to all renderer windows
 */
function notifyRenderer(
  channel: string,
  data: unknown
): void {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    win.webContents.send(channel, data);
  });
}

// ============= Event Handlers =============

/**
 * Connect to ASR WebSocket server
 */
ipcMain.handle(IPC_CHANNELS.ASR.CONNECT, async (_event, rawConfig: unknown): Promise<{ success: boolean; error?: string }> => {
  // Validate input with Zod
  const parseResult = asrConfigSchema.safeParse(rawConfig);
  if (!parseResult.success) {
    const errorMessage = parseResult.error.issues[0].message;
    log.error("Validation failed", errorMessage);
    return { success: false, error: errorMessage };
  }

  const config: ASRConfig = parseResult.data;

  try {
    // Set up event callbacks
    const events = {
      onTranscript: (result: TranscriptResult) => {
        notifyRenderer(IPC_CHANNELS.ASR.ON_TRANSCRIPT, result);
      },
      onError: (error: { code: string; message: string }) => {
        notifyRenderer(IPC_CHANNELS.ASR.ON_ERROR, error);
      },
      onStatusChange: (status: ConnectionStatus) => {
        notifyRenderer(IPC_CHANNELS.ASR.ON_CONNECTION_STATUS, status);
      },
    };

    // Connect to ASR service
    connect(config, events);
    log.info("Connect requested");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("Connect failed", error);
    return { success: false, error: message };
  }
});

/**
 * Disconnect from ASR WebSocket server
 */
ipcMain.handle(IPC_CHANNELS.ASR.DISCONNECT, async (): Promise<{ success: boolean }> => {
  try {
    disconnect();
    log.info("Disconnected");
    return { success: true };
  } catch (error) {
    log.error("Disconnect failed", error);
    return { success: false };
  }
});

/**
 * Send audio data to ASR server
 */
ipcMain.on(IPC_CHANNELS.ASR.SEND_AUDIO, (_event, audioData: ArrayBuffer): void => {
  try {
    sendAudio(audioData);
  } catch (error) {
    log.error("Send audio failed", error);
  }
});

/**
 * Get current connection status
 */
ipcMain.handle(IPC_CHANNELS.ASR.GET_STATUS, async (): Promise<{ status: ConnectionStatus }> => {
  return { status: getConnectionStatus() };
});
