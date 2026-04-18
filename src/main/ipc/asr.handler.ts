/**
 * ASR Handler - WebSocket connection to Volcano Engine ASR BigModel API
 *
 * Protocol: WebSocket (wss://openspeech.bytedance.com/api/v3/sauc/bigmodel)
 * Features:
 *   - Bidirectional streaming mode
 *   - Real-time transcription
 *   - 100-200ms audio分包
 *
 * Uses 'ws' package for Node.js WebSocket support.
 */

import { ipcMain, BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";
import { asrConfigSchema } from "../types/asr";
import type { ASRConfig, TranscriptResult, ConnectionStatus } from "../types/asr";

// Note: 'ws' package will be installed as a dependency
// import WebSocket from "ws";

let ws: import("ws").WebSocket | null = null;

/**
 * Notify renderer process of ASR events
 */
function notifyRenderer(
  type: "transcript" | "error" | "connected" | "disconnected",
  data?: TranscriptResult | { code: string; message: string }
): void {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    switch (type) {
      case "transcript":
        win.webContents.send(IPC_CHANNELS.ASR.ON_TRANSCRIPT, data as TranscriptResult);
        break;
      case "error":
        win.webContents.send(IPC_CHANNELS.ASR.ON_ERROR, data);
        break;
      case "connected":
        win.webContents.send(IPC_CHANNELS.ASR.ON_CONNECTION_STATUS, "connected" as ConnectionStatus);
        break;
      case "disconnected":
        win.webContents.send(IPC_CHANNELS.ASR.ON_CONNECTION_STATUS, "disconnected" as ConnectionStatus);
        break;
    }
  });
}

/**
 * Connect to ASR WebSocket server
 */
ipcMain.handle(IPC_CHANNELS.ASR.CONNECT, async (_event, rawConfig: unknown): Promise<void> => {
  // Validate input with Zod
  const parseResult = asrConfigSchema.safeParse(rawConfig);
  if (!parseResult.success) {
    const error = {
      code: "VALIDATION_ERROR",
      message: parseResult.error.issues[0].message,
    };
    notifyRenderer("error", error);
    throw new Error(error.message);
  }

  const config: ASRConfig = parseResult.data;
  const { appKey, accessKey, resourceId } = config;

  // Generate connection ID (UUID)
  const connectId = crypto.randomUUID();

  // Build WebSocket URL with query params
  const params = new URLSearchParams({
    appKey,
    accessKey,
    resourceId,
    connectId,
  });
  const wsUrl = `wss://openspeech.bytedance.com/api/v3/sauc/bigmodel?${params}`;

  // TODO: Replace with actual ws package usage
  // const WebSocket = require("ws");
  // ws = new WebSocket(wsUrl, {
  //   headers: {
  //     "X-Api-App-Key": appKey,
  //     "X-Api-Access-Key": accessKey,
  //     "X-Api-Resource-Id": resourceId,
  //     "X-Api-Connect-Id": connectId,
  //   },
  // });

  // Placeholder - log that WebSocket would connect
  console.log("[ASR Handler] Would connect to:", wsUrl);

  // Simulate successful connection for now
  notifyRenderer("connected");

  // ws.onopen = () => {
  //   notifyRenderer("connected");
  // };
  //
  // ws.onerror = (error) => {
  //   const err = {
  //     code: "WS_ERROR",
  //     message: "WebSocket connection failed",
  //     details: error,
  //   };
  //   notifyRenderer("error", err);
  // };
  //
  // ws.onclose = () => {
  //   notifyRenderer("disconnected");
  //   ws = null;
  // };
  //
  // ws.onmessage = (event) => {
  //   try {
  //     const result = parseTranscriptResponse(event.data);
  //     notifyRenderer("transcript", result);
  //   } catch (err) {
  //     console.error("Failed to parse transcript:", err);
  //   }
  // };
});

/**
 * Disconnect from ASR WebSocket server
 */
ipcMain.handle(IPC_CHANNELS.ASR.DISCONNECT, async (): Promise<void> => {
  if (ws) {
    ws.close();
    ws = null;
  }
  notifyRenderer("disconnected");
});

/**
 * Send audio data to ASR server
 * Audio should be sent in 100-200ms chunks
 */
ipcMain.on(IPC_CHANNELS.ASR.SEND_AUDIO, (_event, audioData: ArrayBuffer): void => {
  if (ws && ws.readyState === 1 /* WebSocket.OPEN */) {
    const frame = buildBinaryFrame(audioData);
    ws.send(frame);
  }
});

/**
 * Build binary frame for WebSocket transmission
 * Protocol: [version(1)][type(1)][reserved(2)][data_size(4)][data]
 */
function buildBinaryFrame(data: ArrayBuffer): Buffer {
  const HEADER_SIZE = 8;
  const dataSize = data.byteLength;
  const frame = Buffer.alloc(HEADER_SIZE + dataSize);

  // Version (1 byte) + Type (1 byte) + Reserved (2 bytes)
  frame.writeUInt8(1, 0); // version
  frame.writeUInt8(0x01, 1); // type = audio data
  frame.writeUInt16BE(0, 2); // reserved

  // Data size (4 bytes, big-endian)
  frame.writeUInt32BE(dataSize, 4);

  // Data
  Buffer.from(data).copy(frame, HEADER_SIZE);

  return frame;
}
