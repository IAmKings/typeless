/**
 * ASR API Integration
 *
 * REST API calls for ASR service validation and health checks.
 * Uses Electron's net.fetch for main process HTTP requests.
 */

import { net } from "electron";
import { asrConfigSchema } from "./types";
import type { ASRConfig } from "./types";

// ============= Constants =============

// Note: These endpoints are placeholders - verify with actual Volcano Engine API docs
const ASR_API_BASE = "https://openspeech.bytedance.com/api/v3";

// ============= Error Types =============

export interface ASRAPIError {
  code: string;
  message: string;
  recoverable: boolean;
}

// ============= Error Mapping =============

/**
 * Map ASR API error codes to user-friendly messages
 */
export function mapASRError(error: ASRAPIError): ASRAPIError {
  const errorMap: Record<string, { message: string; recoverable: boolean }> = {
    "10001": { message: "AppKey 无效，请检查配置", recoverable: false },
    "10002": { message: "AccessKey 无效，请检查配置", recoverable: false },
    "10003": { message: "ResourceId 无效，请检查配置", recoverable: false },
    "10004": { message: "签名验证失败，请检查密钥配置", recoverable: false },
    "20001": { message: "配额不足，请联系服务商", recoverable: false },
    "20002": { message: "请求频率超限，请稍后重试", recoverable: true },
    "20003": { message: "音频格式不支持", recoverable: false },
    "20004": { message: "采样率不匹配", recoverable: false },
    "30001": { message: "服务内部错误，请稍后重试", recoverable: true },
    "30002": { message: "服务维护中，请稍后重试", recoverable: true },
    "network_error": { message: "网络连接失败，请检查网络", recoverable: true },
    "timeout": { message: "请求超时，请稍后重试", recoverable: true },
  };

  const mapped = errorMap[error.code];
  if (mapped) {
    return {
      code: error.code,
      message: mapped.message,
      recoverable: mapped.recoverable,
    };
  }
  return error;
}

// ============= Config Validation =============

/**
 * Validate ASR configuration by making a test request
 *
 * Note: This is a basic connectivity test. Actual validation
 * may require specific API calls based on Volcano Engine docs.
 */
export async function validateConfig(config: ASRConfig): Promise<{
  valid: boolean;
  error?: ASRAPIError;
}> {
  // Validate schema first
  const parseResult = asrConfigSchema.safeParse(config);
  if (!parseResult.success) {
    return {
      valid: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parseResult.error.issues[0].message,
        recoverable: false,
      },
    };
  }

  try {
    // Try to make a health check request
    // Note: The actual health check endpoint depends on Volcano Engine API
    const healthUrl = `${ASR_API_BASE}/health`;

    const response = await net.fetch(healthUrl, {
      method: "GET",
      headers: {
        "X-Api-App-Key": config.appKey,
        "X-Api-Access-Key": config.accessKey,
        "X-Api-Resource-Id": config.resourceId,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    // Parse error response
    const errorBody = await response.text();
    return {
      valid: false,
      error: {
        code: `HTTP_${response.status}`,
        message: `配置验证失败: ${errorBody}`,
        recoverable: response.status >= 500,
      },
    };
  } catch (error) {
    // Network error - likely connectivity issue
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      valid: false,
      error: {
        code: "network_error",
        message: `网络连接失败: ${message}`,
        recoverable: true,
      },
    };
  }
}

// ============= Health Check =============

/**
 * Check ASR service health status
 */
export async function healthCheck(config: ASRConfig): Promise<{
  healthy: boolean;
  latency?: number;
  error?: ASRAPIError;
}> {
  const startTime = Date.now();

  try {
    // Simple connectivity check
    const testUrl = `${ASR_API_BASE}/health`;

    const response = await net.fetch(testUrl, {
      method: "GET",
      headers: {
        "X-Api-App-Key": config.appKey,
        "X-Api-Access-Key": config.accessKey,
        "X-Api-Resource-Id": config.resourceId,
      },
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return { healthy: true, latency };
    }

    return {
      healthy: false,
      latency,
      error: {
        code: `HTTP_${response.status}`,
        message: `健康检查失败: ${response.status}`,
        recoverable: response.status >= 500,
      },
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      healthy: false,
      latency,
      error: {
        code: "network_error",
        message: `无法连接到 ASR 服务: ${message}`,
        recoverable: true,
      },
    };
  }
}

// ============= Re-export Types ============

export type { ASRConfig } from "./types";
