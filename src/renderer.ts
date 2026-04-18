/**
 * Renderer Process Entry Point
 *
 * Initializes renderer-side services and sets up the application.
 * Uses contextBridge (via preload) for IPC communication with main process.
 */

import "./index.css";
import { audioCapture } from "./renderer/services/audio-capture";

console.log("[Renderer] Application starting...");

// Expose audio capture API on window for main process coordination
// The main process uses webContents.executeJavaScript to call these functions
declare global {
  interface Window {
    __audioCapture: {
      startCapture: (deviceId?: string) => Promise<{ success: boolean; error?: string }>;
      stopCapture: () => Promise<{ success: boolean }>;
      getDevices: () => Promise<import("./renderer/services/audio.service").AudioDeviceInfo[]>;
      getLevel: () => number;
      isRecording: () => boolean;
    };
  }
}

window.__audioCapture = audioCapture;

// Log startup
console.log("[Renderer] Audio capture bridge initialized");
