/**
 * ASR API Handler - IPC handler for ASR REST API calls
 *
 * Provides IPC interface for config validation and health checks.
 */

import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";
import { validateConfig, healthCheck, mapASRError } from "../services/asr/api";
import { asrConfigSchema } from "../services/asr/types";
import type { ASRConfig } from "../services/asr/types";

// ============= Logging =============

const log = {
  info: (message: string) => console.log(`[ASR API Handler] ${message}`),
  error: (message: string, error?: unknown) => console.error(`[ASR API Handler] ${message}`, error),
};

// ============= Validate Config ============

ipcMain.handle(IPC_CHANNELS.ASR.VALIDATE_CONFIG, async (_event, rawConfig: unknown): Promise<{
  valid: boolean;
  error?: { code: string; message: string };
}> => {
  const parseResult = asrConfigSchema.safeParse(rawConfig);
  if (!parseResult.success) {
    return {
      valid: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parseResult.error.issues[0].message,
      },
    };
  }

  const config: ASRConfig = parseResult.data;
  log.info("Validating ASR config...");

  const result = await validateConfig(config);

  if (result.error) {
    const mapped = mapASRError(result.error);
    log.error("Config validation failed", result.error);
    return {
      valid: false,
      error: {
        code: result.error.code,
        message: mapped.message,
      },
    };
  }

  log.info("Config validation passed");
  return { valid: true };
});

// ============= Health Check ============

ipcMain.handle(IPC_CHANNELS.ASR.HEALTH_CHECK, async (_event, rawConfig: unknown): Promise<{
  healthy: boolean;
  latency?: number;
  error?: { code: string; message: string };
}> => {
  const parseResult = asrConfigSchema.safeParse(rawConfig);
  if (!parseResult.success) {
    return {
      healthy: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parseResult.error.issues[0].message,
      },
    };
  }

  const config: ASRConfig = parseResult.data;
  log.info("Running ASR health check...");

  const result = await healthCheck(config);

  if (result.error) {
    const mapped = mapASRError(result.error);
    log.error("Health check failed", result.error);
    return {
      healthy: false,
      latency: result.latency,
      error: {
        code: result.error.code,
        message: mapped.message,
      },
    };
  }

  log.info(`Health check passed, latency: ${result.latency}ms`);
  return {
    healthy: true,
    latency: result.latency,
  };
});
