/**
 * IPC Handlers Index
 *
 * Register all IPC handlers here
 */

import "./asr.handler";
import "./asr-api.handler";
import "./audio.handler";
import "./hotkey.handler";
import "./text.handler";
import "./settings.handler";
import "./permission.handler";
import { registerSettingsHandlers } from "./settings-dialog.handler";
import { registerFloatingWindowHandlers } from "./floating-window.handler";
import { registerTrayHandlers } from "./tray.handler";

export { registerFloatingWindowHandlers, registerTrayHandlers, registerSettingsHandlers };
