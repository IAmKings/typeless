/**
 * ASR Service - WebSocket client for Volcano Engine ASR
 *
 * Manages WebSocket connection to ASR server, handles audio streaming
 * and transcript reception with comprehensive error handling and retry mechanism.
 *
 * Protocol: WebSocket (wss://openspeech.bytedance.com/api/v3/sauc/bigmodel)
 */

import WebSocket from "ws";
import { encodeAudioFrame, decodeFrame, parseTranscriptResponse, FRAME_TYPE } from "./lib/codec";
import {
  asrConfigSchema,
  type ASRConfig,
  type ConnectionStatus,
  type ConnectionStatusDetail,
  type ReconnectOptions,
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

// Default reconnect configuration
const DEFAULT_RECONNECT_OPTIONS: Required<ReconnectOptions> = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// WebSocket close codes
const CLOSE_CODE = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  ABnormal_CLOSURE: 1006,
} as const;

// Heartbeat configuration
const HEARTBEAT_INTERVAL_MS = 30000;
const HEARTBEAT_TIMEOUT_MS = 35000;

// Error codes for categorization
const ERROR_CATEGORY = {
  NETWORK: "NETWORK",
  AUTH: "AUTH",
  SERVER: "SERVER",
  TIMEOUT: "TIMEOUT",
  VALIDATION: "VALIDATION",
  UNKNOWN: "UNKNOWN",
} as const;

type ErrorCategory = (typeof ERROR_CATEGORY)[keyof typeof ERROR_CATEGORY];

// ============= Types =============

export interface ASREventCallbacks {
  onTranscript: (result: TranscriptResult) => void;
  onError: (error: { code: string; message: string }) => void;
  onStatusChange: (detail: ConnectionStatusDetail) => void;
}

// ============= Service State =============

let ws: WebSocket | null = null;
let connectionStatus: ConnectionStatus = "disconnected";
let currentConfig: ASRConfig | null = null;
let callbacks: ASREventCallbacks | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let reconnectOptions: Required<ReconnectOptions> = DEFAULT_RECONNECT_OPTIONS;
let lastHeartbeatTime = 0;
let intentionalClose = false;

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
  debug: (message: string, data?: unknown) => {
    console.debug(`[ASR Service] ${message}`, data ?? "");
  },
};

// ============= Status Management =============

/**
 * Notify status change to renderer with detailed information
 */
function notifyStatus(detail: ConnectionStatusDetail): void {
  if (connectionStatus === detail.status && !detail.error) return;

  connectionStatus = detail.status;
  log.info(`Status changed: ${detail.status}`, {
    attempt: detail.attempt,
    maxAttempts: detail.maxAttempts,
    nextDelayMs: detail.nextDelayMs,
  });

  if (callbacks) {
    callbacks.onStatusChange(detail);
  }
}

/**
 * Set simple status without details
 */
function setStatus(status: ConnectionStatus): void {
  notifyStatus({ status });
}

// ============= Heartbeat Management =============

/**
 * Start heartbeat monitoring - sends ping and expects pong
 */
function startHeartbeat(): void {
  stopHeartbeat();

  lastHeartbeatTime = Date.now();

  // Send periodic heartbeat to detect stale connections
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WS_READY_STATE.OPEN) {
      try {
        ws.ping();
        log.debug("Heartbeat ping sent");
      } catch (error) {
        log.warn("Failed to send heartbeat ping", error);
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Monitor for pong responses
  heartbeatTimeoutTimer = setTimeout(() => {
    // Guard against stale timeout after intentional disconnect
    if (intentionalClose) return;

    const timeSinceLastHeartbeat = Date.now() - lastHeartbeatTime;
    if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
      log.warn(`Heartbeat timeout: no response for ${timeSinceLastHeartbeat}ms`);
      handleConnectionError(ERROR_CATEGORY.TIMEOUT, "Heartbeat timeout - connection may be stale");
    }
  }, HEARTBEAT_TIMEOUT_MS);
}

/**
 * Stop heartbeat monitoring
 */
function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (heartbeatTimeoutTimer) {
    clearTimeout(heartbeatTimeoutTimer);
    heartbeatTimeoutTimer = null;
  }
}

/**
 * Record pong response received
 */
function recordPong(): void {
  lastHeartbeatTime = Date.now();
}

// ============= Error Categorization =============

/**
 * Categorize error by type for appropriate handling
 */
function categorizeError(error: unknown): ErrorCategory {
  const message = error instanceof Error ? error.message : String(error);

  // Auth errors
  if (
    message.includes("401") ||
    message.includes("403") ||
    message.includes("authentication") ||
    message.includes("unauthorized") ||
    message.includes("appKey") ||
    message.includes("accessKey")
  ) {
    return ERROR_CATEGORY.AUTH;
  }

  // Network errors
  if (
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT") ||
    message.includes("network") ||
    message.includes("socket")
  ) {
    return ERROR_CATEGORY.NETWORK;
  }

  // Timeout errors
  if (message.includes("timeout") || message.includes("Timeout")) {
    return ERROR_CATEGORY.TIMEOUT;
  }

  // Server errors
  if (message.includes("500") || message.includes("502") || message.includes("503") || message.includes("server")) {
    return ERROR_CATEGORY.SERVER;
  }

  return ERROR_CATEGORY.UNKNOWN;
}

/**
 * Check if error is retryable
 */
function isRetryableError(category: ErrorCategory): boolean {
  return category !== ERROR_CATEGORY.AUTH && category !== ERROR_CATEGORY.VALIDATION;
}

// ============= Exponential Backoff =============

/**
 * Calculate reconnect delay with exponential backoff
 * delay = min(INITIAL_DELAY * (MULTIPLIER ^ attempt), MAX_DELAY)
 */
function calculateReconnectDelay(attempt: number): number {
  const { initialDelayMs, maxDelayMs, backoffMultiplier } = reconnectOptions;
  const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelayMs);
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnect(): void {
  const { maxAttempts } = reconnectOptions;

  // Check if we should attempt reconnection
  if (!currentConfig || reconnectAttempts >= maxAttempts) {
    if (reconnectAttempts >= maxAttempts) {
      log.warn(`Max reconnect attempts (${maxAttempts}) reached`);
      notifyStatus({
        status: "error",
        attempt: reconnectAttempts,
        maxAttempts,
        error: {
          code: "MAX_RECONNECT_EXCEEDED",
          message: `Failed to reconnect after ${maxAttempts} attempts`,
        },
      });
    }
    return;
  }

  reconnectAttempts++;
  const delay = calculateReconnectDelay(reconnectAttempts);

  log.info(`Scheduling reconnect attempt ${reconnectAttempts}/${maxAttempts} in ${delay}ms`);

  notifyStatus({
    status: "reconnecting",
    attempt: reconnectAttempts,
    maxAttempts,
    nextDelayMs: delay,
  });

  reconnectTimer = setTimeout(() => {
    if (currentConfig && callbacks && !intentionalClose) {
      doConnect(currentConfig);
    }
  }, delay);
}

/**
 * Handle connection error with appropriate retry strategy
 */
function handleConnectionError(category: ErrorCategory, message: string): void {
  log.error(`Connection error: ${category} - ${message}`);

  if (!isRetryableError(category)) {
    notifyStatus({
      status: "error",
      error: {
        code: category,
        message,
      },
    });
    return;
  }

  // Trigger reconnection for retryable errors
  if (ws) {
    ws.close(1006, "Connection error - will reconnect");
  }
}

// ============= Connection =============

/**
 * Internal connect implementation
 */
function doConnect(config: ASRConfig): void {
  // Close existing connection if any
  if (ws) {
    ws.close();
    ws = null;
  }

  stopHeartbeat();

  notifyStatus({ status: "connecting" });

  const { appKey, accessKey, resourceId } = config;
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

  // Handle WebSocket open
  ws.on("open", () => {
    log.info("WebSocket connected");
    reconnectAttempts = 0;
    startHeartbeat();
    notifyStatus({ status: "connected" });
  });

  // Handle WebSocket errors
  ws.on("error", (error) => {
    const errorMessage = error instanceof Error ? error.message : "WebSocket error";
    log.error("WebSocket error", errorMessage);

    const category = categorizeError(error);

    if (callbacks) {
      callbacks.onError({
        code: category,
        message: errorMessage,
      });
    }

    handleConnectionError(category, errorMessage);
  });

  // Handle WebSocket close
  ws.on("close", (code, reason) => {
    log.info(`WebSocket closed: code=${code}, reason=${reason}`);
    stopHeartbeat();

    // Determine if this was an intentional close
    if (intentionalClose || code === CLOSE_CODE.NORMAL || code === CLOSE_CODE.GOING_AWAY) {
      log.info("Intentional close, no reconnection needed");
      intentionalClose = false;
      notifyStatus({ status: "disconnected" });
      return;
    }

    // Abnormal closure - attempt reconnection
    if (code === CLOSE_CODE.ABnormal_CLOSURE || !code) {
      log.warn("Abnormal closure detected, will attempt reconnection");
    }

    notifyStatus({ status: "disconnected" });
    scheduleReconnect();
  });

  // Handle pong responses for heartbeat
  ws.on("pong", () => {
    recordPong();
    log.debug("Heartbeat pong received");
  });

  // Handle incoming messages
  ws.on("message", (data) => {
    handleMessage(data);
  });
}

/**
 * Connect to ASR WebSocket server
 */
export function connect(config: ASRConfig, events: ASREventCallbacks, options?: ReconnectOptions): void {
  // Validate config
  const parseResult = asrConfigSchema.safeParse(config);
  if (!parseResult.success) {
    events.onError({
      code: ERROR_CATEGORY.VALIDATION,
      message: parseResult.error.issues[0].message,
    });
    return;
  }

  // Apply reconnect options
  reconnectOptions = {
    maxAttempts: options?.maxAttempts ?? DEFAULT_RECONNECT_OPTIONS.maxAttempts,
    initialDelayMs: options?.initialDelayMs ?? DEFAULT_RECONNECT_OPTIONS.initialDelayMs,
    maxDelayMs: options?.maxDelayMs ?? DEFAULT_RECONNECT_OPTIONS.maxDelayMs,
    backoffMultiplier: options?.backoffMultiplier ?? DEFAULT_RECONNECT_OPTIONS.backoffMultiplier,
  };

  currentConfig = parseResult.data;
  callbacks = events;
  reconnectAttempts = 0;
  intentionalClose = false;

  // Clear any existing reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  doConnect(currentConfig);
}

// ============= Message Handling =============

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
      log.debug("Heartbeat received from server");
      recordPong();
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
  intentionalClose = true;

  // Clear reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Stop heartbeat monitoring
  stopHeartbeat();

  // Clear config and callbacks to prevent reconnection
  currentConfig = null;
  callbacks = null;
  reconnectAttempts = reconnectOptions.maxAttempts; // Prevent reconnection

  // Close WebSocket with normal closure code
  if (ws) {
    ws.close(CLOSE_CODE.NORMAL, "Client disconnect");
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
 * Get detailed connection status
 */
export function getConnectionStatusDetail(): ConnectionStatusDetail {
  return { status: connectionStatus };
}

/**
 * Check if currently connected
 */
export function isConnected(): boolean {
  return connectionStatus === "connected" && ws !== null && ws.readyState === WS_READY_STATE.OPEN;
}
