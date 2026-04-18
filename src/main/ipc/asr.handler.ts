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
  getConnectionStatusDetail,
} from "../services/asr/asr.service";
import { getASRConfig, hasASRConfig } from "../services/asr/config";
import { asrConfigSchema } from "../services/asr/types";
import type { ASRConfig, TranscriptResult, ConnectionStatusDetail } from "../services/asr/types";
import { injectText } from "./text.handler";

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
      onTranscript: async (result: TranscriptResult) => {
        notifyRenderer(IPC_CHANNELS.ASR.ON_TRANSCRIPT, result);

        // Pipeline: Auto-inject text when final transcript arrives
        if (result.isFinal && result.text.trim()) {
          log.info(`Pipeline: Injecting final transcript (${result.text.length} chars)`);
          await injectText(result.text);
        }
      },
      onError: (error: { code: string; message: string }) => {
        notifyRenderer(IPC_CHANNELS.ASR.ON_ERROR, error);
      },
      onStatusChange: (detail: ConnectionStatusDetail) => {
        notifyRenderer(IPC_CHANNELS.ASR.ON_CONNECTION_STATUS, detail);
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
ipcMain.handle(IPC_CHANNELS.ASR.GET_STATUS, async (): Promise<ConnectionStatusDetail> => {
  return getConnectionStatusDetail();
});

/**
 * Get ASR configuration from environment
 */
ipcMain.handle(IPC_CHANNELS.ASR.GET_CONFIG, async (): Promise<{
  configured: boolean;
  config?: { appKey: string; accessKey: string; resourceId: string };
}> => {
  if (!hasASRConfig()) {
    return { configured: false };
  }

  try {
    const config = getASRConfig();
    return {
      configured: true,
      config: {
        appKey: config.appKey,
        accessKey: config.accessKey,
        resourceId: config.resourceId,
      },
    };
  } catch {
    return { configured: false };
  }
});
