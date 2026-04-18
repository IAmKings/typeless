/**
 * Permission Service - macOS permission handling
 *
 * Handles:
 *   - Microphone permission (using systemPreferences)
 *   - Accessibility permission (for text injection)
 *
 * @see macos-permissions.md for detailed patterns
 */

import { systemPreferences, shell } from "electron";

/**
 * Check if microphone permission is granted
 */
export function checkMicrophonePermission(): boolean {
  if (process.platform !== "darwin") {
    return true;
  }

  const status = systemPreferences.getMediaAccessStatus("microphone");
  return status === "granted";
}

/**
 * Request microphone permission (signed apps only)
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (process.platform !== "darwin") {
    return true;
  }

  const status = systemPreferences.getMediaAccessStatus("microphone");

  if (status === "not-determined") {
    // Will show system dialog (signed apps only)
    const granted = await systemPreferences.askForMediaAccess("microphone");
    return granted;
  }

  if (status !== "granted") {
    // Guide user to settings for unsigned apps
    openPermissionSettings("microphone");
    return false;
  }

  return true;
}

/**
 * Check if accessibility permission is granted
 */
export function checkAccessibilityPermission(): boolean {
  if (process.platform !== "darwin") {
    return true;
  }

  // false = don't prompt, just check
  return systemPreferences.isTrustedAccessibilityClient(false);
}

/**
 * Prompt for accessibility permission
 */
export function promptAccessibilityPermission(): boolean {
  if (process.platform !== "darwin") {
    return true;
  }

  // true = prompt user if not already granted
  return systemPreferences.isTrustedAccessibilityClient(true);
}

/**
 * Permission status types
 */
export type MicrophoneStatus = "granted" | "denied" | "not-determined" | "restricted";

export interface PermissionStatus {
  microphone: MicrophoneStatus;
  accessibility: boolean;
}

/**
 * Get current permission status
 */
export function getPermissionStatus(): PermissionStatus {
  return {
    microphone: systemPreferences.getMediaAccessStatus("microphone") as MicrophoneStatus,
    accessibility: systemPreferences.isTrustedAccessibilityClient(false),
  };
}

/**
 * Permission settings URLs for System Preferences
 */
const SETTINGS_URLS = {
  microphone: "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
  accessibility: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  screenRecording: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
  camera: "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera",
} as const;

export type PermissionType = keyof typeof SETTINGS_URLS;

/**
 * Open System Preferences to the specified permission settings
 */
export function openPermissionSettings(type: PermissionType): void {
  shell.openExternal(SETTINGS_URLS[type]);
}

/**
 * Ensure all required permissions are granted.
 * Checks status, requests if needed, and guides to settings if denied.
 *
 * @see macos-permissions.md for the pattern specification
 */
export async function ensurePermissions(): Promise<boolean> {
  const status = getPermissionStatus();

  // Check microphone
  if (status.microphone === "not-determined") {
    const granted = await systemPreferences.askForMediaAccess("microphone");
    if (!granted) {
      return false;
    }
  } else if (status.microphone !== "granted") {
    // Guide user to settings for denied/restricted
    openPermissionSettings("microphone");
    return false;
  }

  // Check accessibility
  if (!status.accessibility) {
    // This will prompt if needed
    systemPreferences.isTrustedAccessibilityClient(true);
    openPermissionSettings("accessibility");
    return false;
  }

  return true;
}
