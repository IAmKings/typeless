/**
 * Settings Dialog Handler - Settings input dialog
 *
 * Creates a floating window for user to input configuration.
 */

import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

// These constants are injected by Vite at build time
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let settingsWindow: BrowserWindow | null = null;

// .env file path
export function getEnvPath(): string {
  return path.join(app.getAppPath(), '.env');
}

// Read current env values
export function readEnvConfig(): { appKey: string; accessKey: string; resourceId: string } {
  const envPath = getEnvPath();
  const config = { appKey: '', accessKey: '', resourceId: '' };

  if (!envPath || !fs.existsSync(envPath)) {
    return config;
  }

  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      if (key === 'VOLCENGINE_APP_KEY') config.appKey = value;
      if (key === 'VOLCENGINE_ACCESS_KEY') config.accessKey = value;
      if (key === 'VOLCENGINE_RESOURCE_ID') config.resourceId = value;
    }
  } catch {
    // ignore
  }

  return config;
}

// Save config to .env
export function saveEnvConfig(config: { appKey: string; accessKey: string; resourceId: string }): boolean {
  const envPath = getEnvPath();
  const lines = [
    `# Voice Input Configuration`,
    `VOLCENGINE_APP_KEY=${config.appKey}`,
    `VOLCENGINE_ACCESS_KEY=${config.accessKey}`,
    `VOLCENGINE_RESOURCE_ID=${config.resourceId}`,
  ];

  try {
    fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

// Open settings window
export function showSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 380,
    height: 300,
    resizable: false,
    title: 'Settings - Voice Input',
    parent: undefined,
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  // Load the settings.html page
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/settings.html`);
  } else {
    settingsWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/settings.html`)
    );
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

export function registerSettingsHandlers(): void {
  // Handlers are registered in settings.handler.ts
  // This function is kept for consistency but does nothing
}
