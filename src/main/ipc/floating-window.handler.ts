/**
 * Floating Window Handler - Floating window management
 *
 * For voice input app, we need a small floating window that:
 * - Shows recording status
 * - Displays real-time transcription
 * - Can be toggled with global hotkey
 * - Transparent background with glass effect
 * - Free positioning (not fixed)
 */

import { ipcMain, BrowserWindow, screen } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";

let floatingWindow: BrowserWindow | null = null;

// Track hover state for window
let hoverInterval: NodeJS.Timeout | null = null;

// Track if cursor is outside window (for click-outside-to-hide)
let cursorWasInside = false;

/**
 * Register floating window handlers
 */
export function registerFloatingWindowHandlers(): void {
  ipcMain.on(IPC_CHANNELS.FLOATING_WINDOW.SHOW, () => {
    if (floatingWindow) {
      floatingWindow.show();
      floatingWindow.focus();
      startHoverTracking();
      cursorWasInside = false;
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
        cursorWasInside = false;
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
    width: 320,
    height: 180,
    frame: false, // No title bar
    transparent: true, // Transparent background
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
    },
  });

  // Hide instead of close
  floatingWindow.on("close", (event) => {
    event.preventDefault();
    floatingWindow?.hide();
  });

  return floatingWindow;
}

/**
 * Track cursor hover state - hide when cursor leaves window
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

    // Hide window when cursor leaves (click-outside behavior)
    if (cursorWasInside && !isInside) {
      floatingWindow.hide();
      stopHoverTracking();
      return;
    }

    cursorWasInside = isInside;
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
