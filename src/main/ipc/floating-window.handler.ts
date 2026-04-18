/**
 * Floating Window Handler - Floating window management
 *
 * For voice input app, we need a small floating window that:
 * - Shows recording status
 * - Displays real-time transcription
 * - Can be toggled with global hotkey
 */

import { ipcMain, BrowserWindow, screen } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";

let floatingWindow: BrowserWindow | null = null;

// Track hover state for window
let hoverInterval: NodeJS.Timeout | null = null;

/**
 * Register floating window handlers
 */
export function registerFloatingWindowHandlers(): void {
  ipcMain.on(IPC_CHANNELS.FLOATING_WINDOW.SHOW, () => {
    if (floatingWindow) {
      floatingWindow.show();
      floatingWindow.focus();
      startHoverTracking();
    }
  });

  ipcMain.on(IPC_CHANNELS.FLOATING_WINDOW.HIDE, () => {
    if (floatingWindow) {
      floatingWindow.hide();
      stopHoverTracking();
    }
  });

  ipcMain.on(IPC_CHANNELS.FLOATING_WINDOW.TOGGLE, () => {
    if (floatingWindow) {
      if (floatingWindow.isVisible()) {
        floatingWindow.hide();
        stopHoverTracking();
      } else {
        floatingWindow.show();
        floatingWindow.focus();
        startHoverTracking();
      }
    }
  });

  ipcMain.handle(IPC_CHANNELS.FLOATING_WINDOW.IS_VISIBLE, () => {
    return floatingWindow?.isVisible() ?? false;
  });
}

/**
 * Create the floating window (called from main process initialization)
 */
export function createFloatingWindow(preloadPath: string): BrowserWindow {
  floatingWindow = new BrowserWindow({
    width: 300,
    height: 150,
    frame: false, // No title bar
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
    },
  });

  // Load floating window page
  // floatingWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/floating`);

  // Hide instead of close
  floatingWindow.on("close", (event) => {
    event.preventDefault();
    floatingWindow?.hide();
  });

  return floatingWindow;
}

/**
 * Track cursor hover state
 */
function startHoverTracking(): void {
  if (hoverInterval) return;

  hoverInterval = setInterval(() => {
    if (!floatingWindow || !floatingWindow.isVisible()) return;

    const cursor = screen.getCursorScreenPoint();
    const bounds = floatingWindow.getBounds();

    const isInside =
      cursor.x >= bounds.x &&
      cursor.x <= bounds.x + bounds.width &&
      cursor.y >= bounds.y &&
      cursor.y <= bounds.y + bounds.height;

    // Send hover state to renderer
    floatingWindow?.webContents.send(
      IPC_CHANNELS.FLOATING_WINDOW.ON_HOVER_CHANGED,
      isInside
    );
  }, 50);
}

/**
 * Stop tracking hover state
 */
function stopHoverTracking(): void {
  if (hoverInterval) {
    clearInterval(hoverInterval);
    hoverInterval = null;
  }
}
