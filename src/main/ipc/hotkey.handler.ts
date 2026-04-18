/**
 * Hotkey Handler - Global keyboard shortcuts using globalShortcut
 *
 * Global shortcuts require Accessibility permission on macOS.
 * Uses systemPreferences.isTrustedAccessibilityClient() to check.
 */

import { ipcMain, globalShortcut, BrowserWindow, systemPreferences } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";

// ============= Logging =============

const log = {
  info: (message: string) => console.log(`[Hotkey Handler] ${message}`),
  warn: (message: string) => console.warn(`[Hotkey Handler] ${message}`),
  error: (message: string, error?: unknown) => console.error(`[Hotkey Handler] ${message}`, error),
};

// ============= Permission Check =============

/**
 * Check if global shortcuts can be registered (requires Accessibility permission)
 */
function isShortcutAllowed(): boolean {
  if (process.platform !== "darwin") {
    return true;
  }
  return systemPreferences.isTrustedAccessibilityClient(false);
}

/**
 * Register a global hotkey
 */
ipcMain.handle(IPC_CHANNELS.HOTKEY.REGISTER, async (_event, shortcut: string): Promise<{ success: boolean; error?: string }> => {
  // Check accessibility permission on macOS
  if (!isShortcutAllowed()) {
    log.error("Accessibility permission required for global shortcuts");
    return {
      success: false,
      error: "Accessibility permission required. Please enable in System Settings > Privacy & Security > Accessibility.",
    };
  }

  // Check if already registered
  if (globalShortcut.isRegistered(shortcut)) {
    log.warn(`Shortcut already registered: ${shortcut}`);
    return { success: false, error: `Shortcut "${shortcut}" is already registered` };
  }

  try {
    const success = globalShortcut.register(shortcut, () => {
      log.info(`Hotkey triggered: ${shortcut}`);
      // Notify all windows when hotkey is triggered
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.webContents.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.HOTKEY.ON_TRIGGERED, shortcut);
        }
      });
    });

    if (success) {
      log.info(`Registered: ${shortcut}`);
    } else {
      log.error(`Failed to register: ${shortcut}`);
    }
    return { success };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error(`Register error: ${message}`);
    return { success: false, error: message };
  }
});

/**
 * Unregister a specific hotkey
 */
ipcMain.handle(IPC_CHANNELS.HOTKEY.UNREGISTER, async (_event, shortcut: string): Promise<void> => {
  try {
    globalShortcut.unregister(shortcut);
    log.info(`Unregistered: ${shortcut}`);
  } catch (error) {
    log.error(`Unregister error: ${error}`);
  }
});

/**
 * Unregister all hotkeys
 */
ipcMain.handle(IPC_CHANNELS.HOTKEY.UNREGISTER_ALL, async (): Promise<void> => {
  globalShortcut.unregisterAll();
  log.info("All shortcuts unregistered");
});
