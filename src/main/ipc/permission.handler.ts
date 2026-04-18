/**
 * Permission Handler - macOS permission requests (microphone, accessibility)
 */

import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";
import {
  checkMicrophonePermission,
  requestMicrophonePermission,
  checkAccessibilityPermission,
  getPermissionStatus,
  type PermissionStatus,
} from "../services/permission.service";

/**
 * Check if microphone permission is granted
 */
ipcMain.handle(IPC_CHANNELS.PERMISSION.CHECK_MICROPHONE, async (): Promise<boolean> => {
  return checkMicrophonePermission();
});

/**
 * Request microphone permission
 */
ipcMain.handle(IPC_CHANNELS.PERMISSION.REQUEST_MICROPHONE, async (): Promise<boolean> => {
  return requestMicrophonePermission();
});

/**
 * Get full permission status
 */
ipcMain.handle("permission:getStatus", async (): Promise<PermissionStatus> => {
  return getPermissionStatus();
});

/**
 * Check accessibility permission
 */
ipcMain.handle("permission:checkAccessibility", async (): Promise<boolean> => {
  return checkAccessibilityPermission();
});
