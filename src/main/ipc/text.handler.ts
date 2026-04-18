/**
 * Text Handler - Inject text into target application
 *
 * Uses @xitanggg/node-insert-text for direct keyboard simulation.
 * This approach doesn't pollute clipboard.
 *
 * @see text-input.md for detailed patterns
 */

import { ipcMain, systemPreferences } from "electron";
import { IPC_CHANNELS } from "../../shared/constants/channels";

// ============= Text Injection Result =============

export interface TextInjectionResult {
  success: boolean;
  error?: string;
}

/**
 * Check if text injection is possible (accessibility permission granted)
 */
function checkAccessibility(): TextInjectionResult {
  if (process.platform !== "darwin") {
    return { success: true };
  }

  if (!systemPreferences.isTrustedAccessibilityClient(false)) {
    return {
      success: false,
      error: "Accessibility permission required. Please enable in System Settings > Privacy & Security > Accessibility.",
    };
  }

  return { success: true };
}

/**
 * Inject text into the currently focused application
 */
ipcMain.handle(IPC_CHANNELS.TEXT.INJECT, async (_event, text: string): Promise<TextInjectionResult> => {
  // Check accessibility permission first
  const check = checkAccessibility();
  if (!check.success) {
    return check;
  }

  try {
    // TODO: Use @xitanggg/node-insert-text for actual text injection
    // import { insertText } from "@xitanggg/node-insert-text";
    // insertText(text);

    // Placeholder - log the text that would be injected
    console.log("[Text Injection] Would inject:", text);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Text injection failed: ${message}`,
    };
  }
});
