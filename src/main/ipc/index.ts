/**
 * IPC Handlers Index
 *
 * Register all IPC handlers here
 */

import "./asr.handler";
import "./audio.handler";
import "./hotkey.handler";
import "./text.handler";
import "./settings.handler";
import "./permission.handler";
import { registerFloatingWindowHandlers } from "./floating-window.handler";

export { registerFloatingWindowHandlers };
