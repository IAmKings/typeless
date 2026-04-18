/**
 * Permission Handler - macOS permission requests (microphone, accessibility)
 */

import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";
import {
  checkMicrophonePermission,
  requestMicrophonePermission,
  checkAccessibilityPermission,
  promptAccessibilityPermission,
  getPermissionStatus,
  openPermissionSettings,
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
ipcMain.handle(IPC_CHANNELS.PERMISSION.GET_STATUS, async (): Promise<PermissionStatus> => {
  return getPermissionStatus();
});

/**
 * Check accessibility permission
 */
ipcMain.handle(IPC_CHANNELS.PERMISSION.CHECK_ACCESSIBILITY, async (): Promise<boolean> => {
  return checkAccessibilityPermission();
});

/**
 * Prompt accessibility permission
 */
ipcMain.handle(IPC_CHANNELS.PERMISSION.PROMPT_ACCESSIBILITY, async (): Promise<boolean> => {
  const granted = promptAccessibilityPermission();
  if (!granted) {
    openPermissionSettings("accessibility");
  }
  return granted;
});
