/**
 * Hotkey Handler - Global keyboard shortcuts using globalShortcut
 */

import { ipcMain, globalShortcut, BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";

/**
 * Register a global hotkey
 */
ipcMain.handle(IPC_CHANNELS.HOTKEY.REGISTER, async (_event, shortcut: string) => {
  try {
    const success = globalShortcut.register(shortcut, () => {
      // Notify all windows when hotkey is triggered
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        win.webContents.send(IPC_CHANNELS.HOTKEY.ON_TRIGGERED, shortcut);
      });
    });
    return success;
  } catch (error) {
    console.error("Failed to register hotkey:", error);
    return false;
  }
});

/**
 * Unregister a specific hotkey
 */
ipcMain.handle(IPC_CHANNELS.HOTKEY.UNREGISTER, async (_event, shortcut: string) => {
  try {
    globalShortcut.unregister(shortcut);
  } catch (error) {
    console.error("Failed to unregister hotkey:", error);
  }
});

/**
 * Unregister all hotkeys
 */
ipcMain.handle(IPC_CHANNELS.HOTKEY.UNREGISTER_ALL, async () => {
  globalShortcut.unregisterAll();
});
