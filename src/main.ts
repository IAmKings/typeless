/**
 * Main Process Entry Point
 */

import { app, BrowserWindow, globalShortcut } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import "./main/ipc"; // Import to register all IPC handlers
import { registerFloatingWindowHandlers, createFloatingWindow } from "./main/ipc/floating-window.handler";
import { createTray, registerTrayHandlers } from "./main/ipc/tray.handler";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = (): BrowserWindow => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Register floating window handlers
  registerFloatingWindowHandlers();

  // Create floating window (hidden initially)
  const floatingWindow = createFloatingWindow(path.join(__dirname, "preload.js"));
  // Load floating window content
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    floatingWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/floating.html`);
  } else {
    floatingWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/floating.html`)
    );
  }

  // Register tray handlers
  registerTrayHandlers();

  // Create system tray
  createTray();

  return mainWindow;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Quit when all windows are closed
app.on("before-quit", () => {
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
});
