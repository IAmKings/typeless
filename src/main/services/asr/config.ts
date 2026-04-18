/**
 * ASR Configuration
 *
 * Loads ASR credentials from environment variables.
 * The actual .env file should be created from .env.example
 * and NOT committed to version control.
 */

import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

// ============= Environment Loading =============

interface ASRConfig {
  appKey: string;
  accessKey: string;
  resourceId: string;
}

let cachedConfig: ASRConfig | null = null;

/**
 * Load ASR config from environment variables
 *
 * In development, loads from .env file in project root
 * In production, expects env vars to be set externally
 */
function loadConfig(): ASRConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Helper to get environment variable
  const getEnv = (key: string, fallback: string): string => {
    // Check process.env first
    const envValue = process.env[key];
    if (envValue) {
      return envValue;
    }

    // In development, also check .env file
    if (!app.isPackaged) {
      const envFile = path.join(process.cwd(), ".env");
      if (fs.existsSync(envFile)) {
        const envContent = fs.readFileSync(envFile, "utf8");
        const lines = envContent.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith(`${key}=`)) {
            const value = trimmed.substring(key.length + 1).trim();
            // Remove quotes if present
            return value.replace(/^["']|["']$/g, "");
          }
        }
      }
    }

    return fallback;
  };

  const appKey = getEnv("VOLCENGINE_APP_ID", "");
  const accessKey = getEnv("VOLCENGINE_ACCESS_TOKEN", "");
  const resourceId = getEnv("VOLCENGINE_RESOURCE_ID", "");

  cachedConfig = { appKey, accessKey, resourceId };
  return cachedConfig;
}

/**
 * Get ASR configuration
 *
 * @returns Configuration object with appKey, accessKey, resourceId
 * @throws Error if any required config is missing
 */
export function getASRConfig(): ASRConfig {
  const config = loadConfig();

  if (!config.appKey || !config.accessKey || !config.resourceId) {
    const missing: string[] = [];
    if (!config.appKey) missing.push("VOLCENGINE_APP_ID");
    if (!config.accessKey) missing.push("VOLCENGINE_ACCESS_TOKEN");
    if (!config.resourceId) missing.push("VOLCENGINE_RESOURCE_ID");

    throw new Error(`Missing ASR configuration: ${missing.join(", ")}. Please set these in your .env file.`);
  }

  return config;
}

/**
 * Check if ASR configuration is available
 */
export function hasASRConfig(): boolean {
  try {
    const config = loadConfig();
    return !!(config.appKey && config.accessKey && config.resourceId);
  } catch {
    return false;
  }
}

/**
 * Clear cached config (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}
