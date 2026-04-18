/**
 * ASR Service - WebSocket client for Volcano Engine ASR
 *
 * Manages WebSocket connection to ASR server, handles audio streaming
 * and transcript reception.
 *
 * Protocol: WebSocket (wss://openspeech.bytedance.com/api/v3/sauc/bigmodel)
 */

import WebSocket from "ws";
import { encodeAudioFrame, decodeFrame, parseTranscriptResponse, FRAME_TYPE } from "./lib/codec";
import {
  asrConfigSchema,
  type ASRConfig,
  type ConnectionStatus,
  type TranscriptResult,
} from "./types";

// ============= Constants =============

const ASR_WS_URL = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel";

const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

// ============= Types =============

export interface ASREventCallbacks {
  onTranscript: (result: TranscriptResult) => void;
  onError: (error: { code: string; message: string }) => void;
  onStatusChange: (status: ConnectionStatus) => void;
}

// ============= Service State =============

let ws: WebSocket | null = null;
let connectionStatus: ConnectionStatus = "disconnected";
let currentConfig: ASRConfig | null = null;
let callbacks: ASREventCallbacks | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1000;

// ============= Logging =============

const log = {
  info: (message: string, data?: unknown) => {
    console.log(`[ASR Service] ${message}`, data ?? "");
  },
  error: (message: string, error?: unknown) => {
    console.error(`[ASR Service] ${message}`, error ?? "");
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[ASR Service] ${message}`, data ?? "");
  },
};

// ============= Status Management =============

function setStatus(status: ConnectionStatus): void {
  if (connectionStatus === status) return;

  connectionStatus = status;
  log.info(`Status changed: ${status}`);

  if (callbacks) {
    callbacks.onStatusChange(status);
  }
}

// ============= Connection =============

/**
 * Connect to ASR WebSocket server
 */
export function connect(config: ASRConfig, events: ASREventCallbacks): void {
  // Validate config
  const parseResult = asrConfigSchema.safeParse(config);
  if (!parseResult.success) {
    events.onError({
      code: "VALIDATION_ERROR",
      message: parseResult.error.issues[0].message,
    });
    return;
  }

  currentConfig = parseResult.data;
  callbacks = events;

  // Close existing connection if any
  if (ws) {
    ws.close();
    ws = null;
  }

  setStatus("connecting");

  const { appKey, accessKey, resourceId } = currentConfig;
  const connectId = crypto.randomUUID();

  // Build WebSocket URL with query params
  const params = new URLSearchParams({
    appKey,
    accessKey,
    resourceId,
    connectId,
  });
  const wsUrl = `${ASR_WS_URL}?${params}`;

  // Create WebSocket connection with headers
  ws = new WebSocket(wsUrl, {
    headers: {
      "X-Api-App-Key": appKey,
      "X-Api-Access-Key": accessKey,
      "X-Api-Resource-Id": resourceId,
      "X-Api-Connect-Id": connectId,
    },
  });

  // Set up event handlers
  ws.on("open", () => {
    log.info("WebSocket connected");
    setStatus("connected");
    reconnectAttempts = 0;
  });

  ws.on("error", (error) => {
    log.error("WebSocket error", error);
    events.onError({
      code: "WS_ERROR",
      message: error instanceof Error ? error.message : "WebSocket error",
    });
  });

  ws.on("close", (code, reason) => {
    log.info(`WebSocket closed: ${code} ${reason}`);
    setStatus("disconnected");
    ws = null;

    // Attempt reconnection if not intentional
    if (currentConfig && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      log.warn(`Reconnecting in ${RECONNECT_DELAY_MS}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      reconnectTimer = setTimeout(() => {
        if (currentConfig && callbacks) {
          connect(currentConfig, callbacks);
        }
      }, RECONNECT_DELAY_MS);
    }
  });

  ws.on("message", (data) => {
    handleMessage(data);
  });
}

/**
 * Handle incoming WebSocket message
 */
function handleMessage(data: WebSocket.Data): void {
  if (!data || !(data instanceof Buffer)) {
    return;
  }

  const frame = decodeFrame(data);
  if (!frame) {
    log.warn("Failed to decode frame");
    return;
  }

  switch (frame.type) {
    case FRAME_TYPE.TEXT_DATA: {
      // Parse transcript response
      const text = frame.data.toString("utf8");
      const result = parseTranscriptResponse(text);
      if (result && callbacks) {
        callbacks.onTranscript(result);
      }
      break;
    }
    case FRAME_TYPE.HEARTBEAT: {
      // Handle heartbeat - server is alive
      log.info("Heartbeat received");
      break;
    }
    default:
      log.warn(`Unknown frame type: ${frame.type}`);
  }
}

// ============= Disconnect =============

/**
 * Disconnect from ASR WebSocket server
 */
export function disconnect(): void {
  // Clear reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Clear config and callbacks to prevent reconnection
  currentConfig = null;
  callbacks = null;
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent reconnection

  // Close WebSocket
  if (ws) {
    ws.close(1000, "Client disconnect");
    ws = null;
  }

  setStatus("disconnected");
  log.info("Disconnected");
}

// ============= Audio Sending =============

/**
 * Send audio data to ASR server
 */
export function sendAudio(audioData: ArrayBuffer): void {
  if (!ws || ws.readyState !== WS_READY_STATE.OPEN) {
    log.warn("Cannot send audio: WebSocket not connected");
    return;
  }

  try {
    const frame = encodeAudioFrame(audioData);
    ws.send(frame);
  } catch (error) {
    log.error("Failed to send audio", error);
  }
}

// ============= Status Query =============

/**
 * Get current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

/**
 * Check if currently connected
 */
export function isConnected(): boolean {
  return connectionStatus === "connected" && ws?.readyState === WS_READY_STATE.OPEN;
}
