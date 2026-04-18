/**
 * Preload Script - Expose IPC APIs to renderer
 *
 * Uses contextBridge to securely expose APIs to the renderer process.
 * All communication with main process goes through here.
 */

import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "./shared/constants/channels";
import type { ASRConfig, TranscriptResult, ASRError, ConnectionStatus, AudioDevice } from "./main/services/asr/types";

/**
 * Create unsubscribe functions for IPC listeners
 */
function createListener<T>(channel: string): (callback: (data: T) => void) => () => void {
  return (callback: (data: T) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, data: T) => callback(data);
    ipcRenderer.on(channel, wrapped);
    return () => {
      ipcRenderer.removeListener(channel, wrapped);
    };
  };
}

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld("api", {
  // ============== ASR ==============
  asr: {
    connect: (config: ASRConfig): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.ASR.CONNECT, config),

    disconnect: (): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.ASR.DISCONNECT),

    sendAudio: (audioData: ArrayBuffer): void => {
      ipcRenderer.send(IPC_CHANNELS.ASR.SEND_AUDIO, audioData);
    },

    onTranscript: (callback: (result: TranscriptResult) => void): (() => void) =>
      createListener<TranscriptResult>(IPC_CHANNELS.ASR.ON_TRANSCRIPT)(callback),

    onError: (callback: (error: ASRError) => void): (() => void) =>
      createListener<ASRError>(IPC_CHANNELS.ASR.ON_ERROR)(callback),

    onConnectionStatus: (
      callback: (status: ConnectionStatus) => void
    ): (() => void) =>
      createListener<ConnectionStatus>(IPC_CHANNELS.ASR.ON_CONNECTION_STATUS)(callback),
  },

  // ============== Audio ==============
  audio: {
    startRecording: (options?: { deviceId?: string }): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUDIO.START_RECORDING, options),

    stopRecording: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUDIO.STOP_RECORDING),

    getDevices: (): Promise<AudioDevice[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUDIO.GET_DEVICES),

    onLevel: (callback: (level: number) => void): (() => void) =>
      createListener<number>(IPC_CHANNELS.AUDIO.ON_LEVEL)(callback),

    onAudioData: (callback: (data: ArrayBuffer) => void): (() => void) =>
      createListener<ArrayBuffer>(IPC_CHANNELS.AUDIO.ON_AUDIO_DATA)(callback),

    onError: (callback: (error: { code: string; message: string }) => void): (() => void) =>
      createListener<{ code: string; message: string }>(IPC_CHANNELS.AUDIO.ON_ERROR)(callback),

    // Internal: renderer -> main for audio data streaming
    pushAudioData: (data: ArrayBuffer): void => {
      ipcRenderer.send(IPC_CHANNELS.AUDIO.PUSH_AUDIO_DATA, data);
    },

    pushAudioLevel: (level: number): void => {
      ipcRenderer.send(IPC_CHANNELS.AUDIO.ON_LEVEL, level);
    },

    pushAudioError: (code: string, message: string): void => {
      ipcRenderer.send(IPC_CHANNELS.AUDIO.ON_ERROR, { code, message });
    },
  },

  // ============== Hotkey ==============
  hotkey: {
    register: (shortcut: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.HOTKEY.REGISTER, shortcut),

    unregister: (shortcut: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.HOTKEY.UNREGISTER, shortcut),

    unregisterAll: (): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.HOTKEY.UNREGISTER_ALL),

    onTriggered: (callback: (shortcut: string) => void): (() => void) =>
      createListener<string>(IPC_CHANNELS.HOTKEY.ON_TRIGGERED)(callback),
  },

  // ============== Text ==============
  text: {
    inject: (text: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.TEXT.INJECT, text),
  },

  // ============== Floating Window ==============
  floatingWindow: {
    show: (): void => {
      ipcRenderer.send(IPC_CHANNELS.FLOATING_WINDOW.SHOW);
    },

    hide: (): void => {
      ipcRenderer.send(IPC_CHANNELS.FLOATING_WINDOW.HIDE);
    },

    toggle: (): void => {
      ipcRenderer.send(IPC_CHANNELS.FLOATING_WINDOW.TOGGLE);
    },

    isVisible: (): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.FLOATING_WINDOW.IS_VISIBLE),

    onFocused: (callback: () => void): (() => void) =>
      createListener<void>(IPC_CHANNELS.FLOATING_WINDOW.ON_FOCUSED)(callback),

    onHoverChanged: (callback: (isHovered: boolean) => void): (() => void) =>
      createListener<boolean>(IPC_CHANNELS.FLOATING_WINDOW.ON_HOVER_CHANGED)(callback),
  },

  // ============== Settings ==============
  settings: {
    get: <T>(key: string): Promise<T | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET, key),

    set: <T>(key: string, value: T): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.SET, key, value),
  },

  // ============== Permission ==============
  permission: {
    checkMicrophone: (): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.PERMISSION.CHECK_MICROPHONE),

    requestMicrophone: (): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.PERMISSION.REQUEST_MICROPHONE),
  },
});

// Type declaration for window.api
declare global {
  interface Window {
    api: {
      asr: {
        connect: (config: ASRConfig) => Promise<void>;
        disconnect: () => Promise<void>;
        sendAudio: (audioData: ArrayBuffer) => void;
        onTranscript: (callback: (result: TranscriptResult) => void) => () => void;
        onError: (callback: (error: ASRError) => void) => () => void;
        onConnectionStatus: (callback: (status: ConnectionStatus) => void) => () => void;
      };
      audio: {
        startRecording: (options?: { deviceId?: string }) => Promise<{ success: boolean; error?: string }>;
        stopRecording: () => Promise<{ success: boolean }>;
        getDevices: () => Promise<AudioDevice[]>;
        onLevel: (callback: (level: number) => void) => () => void;
        onAudioData: (callback: (data: ArrayBuffer) => void) => () => void;
        onError: (callback: (error: { code: string; message: string }) => void) => () => void;
        pushAudioData: (data: ArrayBuffer) => void;
        pushAudioLevel: (level: number) => void;
        pushAudioError: (code: string, message: string) => void;
      };
      hotkey: {
        register: (shortcut: string) => Promise<boolean>;
        unregister: (shortcut: string) => Promise<void>;
        unregisterAll: () => Promise<void>;
        onTriggered: (callback: (shortcut: string) => void) => () => void;
      };
      text: {
        inject: (text: string) => Promise<{ success: boolean }>;
      };
      floatingWindow: {
        show: () => void;
        hide: () => void;
        toggle: () => void;
        isVisible: () => Promise<boolean>;
        onFocused: (callback: () => void) => () => void;
        onHoverChanged: (callback: (isHovered: boolean) => void) => () => void;
      };
      settings: {
        get: <T>(key: string) => Promise<T | null>;
        set: <T>(key: string, value: T) => Promise<void>;
      };
      permission: {
        checkMicrophone: () => Promise<boolean>;
        requestMicrophone: () => Promise<boolean>;
      };
    };
  }
}
