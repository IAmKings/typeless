/**
 * IPC Channel Constants for macOS Voice Input Application
 *
 * All IPC channels must be defined here to ensure consistency
 * between main process handlers and renderer API calls.
 */

export const IPC_CHANNELS = {
  // ASR (Automatic Speech Recognition)
  ASR: {
    CONNECT: "asr:connect",
    DISCONNECT: "asr:disconnect",
    SEND_AUDIO: "asr:sendAudio",
    GET_STATUS: "asr:getStatus",
    ON_TRANSCRIPT: "asr:onTranscript",
    ON_ERROR: "asr:onError",
    ON_CONNECTION_STATUS: "asr:onConnectionStatus",
  },

  // Audio capture
  AUDIO: {
    START_RECORDING: "audio:startRecording",
    STOP_RECORDING: "audio:stopRecording",
    ON_LEVEL: "audio:onLevel",
    ON_AUDIO_DATA: "audio:onAudioData",
    ON_ERROR: "audio:onError",
    GET_DEVICES: "audio:getDevices",
    // Internal: renderer -> main for audio data forwarding
    PUSH_AUDIO_DATA: "audio:pushAudioData",
  },

  // Global hotkey
  HOTKEY: {
    REGISTER: "hotkey:register",
    UNREGISTER: "hotkey:unregister",
    UNREGISTER_ALL: "hotkey:unregisterAll",
    ON_TRIGGERED: "hotkey:onTriggered",
  },

  // Text injection
  TEXT: {
    INJECT: "text:inject",
  },

  // Floating window management
  FLOATING_WINDOW: {
    SHOW: "floatingWindow:show",
    HIDE: "floatingWindow:hide",
    TOGGLE: "floatingWindow:toggle",
    IS_VISIBLE: "floatingWindow:isVisible",
    ON_FOCUSED: "floatingWindow:onFocused",
    ON_HOVER_CHANGED: "floatingWindow:onHoverChanged",
  },

  // Settings
  SETTINGS: {
    GET: "settings:get",
    SET: "settings:set",
  },

  // Permissions
  PERMISSION: {
    CHECK_MICROPHONE: "permission:checkMicrophone",
    REQUEST_MICROPHONE: "permission:requestMicrophone",
  },
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
