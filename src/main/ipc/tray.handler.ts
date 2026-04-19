/**
 * Tray Handler - System tray (menu bar) management
 *
 * Features:
 * - Show/hide floating window
 * - Display current status icon
 * - Quick access to settings (AppKey, AccessKey, ResourceId)
 * - Quit application
 */

import { app, Tray, Menu, nativeImage, BrowserWindow, dialog, ipcMain, type NativeImage } from 'electron';
import path from 'node:path';
import { IPC_CHANNELS } from '../../shared/constants/channels';

let tray: Tray | null = null;

// Current status for icon
type TrayStatus = 'idle' | 'recording' | 'error';

// Default env values for reference
const envConfig = {
  appKey: '',
  accessKey: '',
  resourceId: '',
};

/**
 * Get the correct path to tray assets
 * Works in both development and production
 */
function getAssetPath(filename: string): string {
  // In production, assets are in the app bundle's Resources folder
  // In development, assets are in src/assets
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', filename);
  }
  return path.join(__dirname, '..', '..', 'assets', filename);
}

/**
 * Create tray icon based on status
 * Returns a 18x18 PNG icon from assets
 */
function createTrayIcon(status: TrayStatus): NativeImage {
  const iconMap: Record<TrayStatus, string> = {
    idle: 'tray-idle.png',
    recording: 'tray-recording.png',
    error: 'tray-error.png',
  };

  const iconPath = getAssetPath(iconMap[status]);
  return nativeImage.createFromPath(iconPath);
}

/**
 * Build context menu
 */
function buildContextMenu(): Menu {
  const isVisible = BrowserWindow.getAllWindows().some(w => w.isVisible());

  return Menu.buildFromTemplate([
    {
      label: isVisible ? 'Hide Floating Window' : 'Show Floating Window',
      click: () => {
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(win => {
          if (win.getTitle().includes('Floating')) {
            if (win.isVisible()) {
              win.hide();
            } else {
              win.show();
            }
          }
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      submenu: [
        {
          label: `AppKey: ${envConfig.appKey ? '******' + envConfig.appKey.slice(-4) : 'Not set'}`,
          enabled: false,
        },
        {
          label: `AccessKey: ${envConfig.accessKey ? '******' + envConfig.accessKey.slice(-4) : 'Not set'}`,
          enabled: false,
        },
        {
          label: `ResourceId: ${envConfig.resourceId ? '******' + envConfig.resourceId.slice(-4) : 'Not set'}`,
          enabled: false,
        },
        { type: 'separator' },
        {
          label: 'Configure via .env file',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'Configuration',
              message: 'Please edit the .env file to configure AppKey, AccessKey, and ResourceId.',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
}

/**
 * Update tray status
 */
export function updateTrayStatus(status: TrayStatus): void {
  if (tray) {
    tray.setImage(createTrayIcon(status));
    tray.setContextMenu(buildContextMenu());
  }
}

/**
 * Register tray handlers
 */
export function registerTrayHandlers(): void {
  ipcMain.on(IPC_CHANNELS.TRAY.UPDATE_STATUS, (_event, status: TrayStatus) => {
    updateTrayStatus(status);
  });
}

/**
 * Create system tray
 */
export function createTray(): Tray {
  // Create tray with idle icon initially
  tray = new Tray(createTrayIcon('idle'));
  tray.setToolTip('Voice Input');
  tray.setContextMenu(buildContextMenu());

  // Click on tray icon - toggle floating window
  tray.on('click', () => {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      if (win.getTitle().includes('Floating')) {
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
        }
      }
    });
  });

  return tray;
}

/**
 * Get current tray instance
 */
export function getTray(): Tray | null {
  return tray;
}
