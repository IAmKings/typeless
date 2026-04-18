/**
 * Settings Handler - App settings storage
 *
 * Uses electron-store for persistent settings.
 * Note: electron-store needs to be installed as a dependency.
 */

import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";
import { z } from "zod";

// ============= Settings Schema =============

const settingsSchema = z.object({
  apiKey: z.string().default(""),
  appKey: z.string().default(""),
  accessKey: z.string().default(""),
  resourceId: z.string().default(""),
  hotkey: z.string().default("Command+Shift+V"),
  language: z.string().default("zh-CN"),
  audioDevice: z.string().default("default"),
  autoStart: z.boolean().default(false),
});

export type AppSettings = z.infer<typeof settingsSchema>;

// ============= Settings Store =============

// Note: In production, use electron-store
// import Store from "electron-store";
// const store = new Store<AppSettings>({ defaults: settingsSchema.parse({}) });

// Placeholder in-memory store for now
let settingsStore: AppSettings = settingsSchema.parse({});

/**
 * Get a setting value by key
 */
ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, async <T>(_: unknown, key: string): Promise<T | null> => {
  // Validate key exists in schema
  if (!(key in settingsSchema.shape)) {
    return null;
  }
  const value = settingsStore[key as keyof AppSettings];
  return value as T ?? null;
});

/**
 * Set a setting value
 */
ipcMain.handle(IPC_CHANNELS.SETTINGS.SET, async <T>(_: unknown, key: string, value: T): Promise<void> => {
  // Validate key exists in schema
  if (!(key in settingsSchema.shape)) {
    throw new Error(`Unknown setting key: ${key}`);
  }

  // Validate value type
  const result = settingsSchema.shape[key as keyof typeof settingsSchema.shape].safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid value for ${key}: ${result.error.issues[0].message}`);
  }

  (settingsStore as Record<string, unknown>)[key] = result.data;

  // TODO: Persist to electron-store
  // store.set(key, value);
});

/**
 * Get all settings
 */
ipcMain.handle("settings:getAll", async (): Promise<AppSettings> => {
  return settingsStore;
});

/**
 * Reset settings to defaults
 */
ipcMain.handle("settings:reset", async (): Promise<void> => {
  settingsStore = settingsSchema.parse({});
  // TODO: Clear electron-store
  // store.clear();
});
