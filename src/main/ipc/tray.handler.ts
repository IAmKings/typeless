/**
 * Tray Handler - System tray (menu bar) management
 *
 * Features:
 * - Show/hide floating window
 * - Display current status icon
 * - Quick access to settings (AppKey, AccessKey, ResourceId)
 * - Quit application
 */

import { app, Tray, Menu, nativeImage, BrowserWindow, ipcMain, type NativeImage } from 'electron';
import path from 'node:path';
import { IPC_CHANNELS } from '../../shared/constants/channels';
import { showSettingsWindow } from './settings-dialog.handler';
import { t } from '../../i18n/index';

let tray: Tray | null = null;

// Current status for icon
type TrayStatus = 'idle' | 'recording' | 'error';

// Default env values for reference (loaded from .env)
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
  // In development (Vite), __dirname is .vite/build/, so we need to go up to project root then into src/assets
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', filename);
  }
  return path.join(__dirname, '..', '..', 'src', 'assets', filename);
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
 * Build context menu with i18n
 */
function buildContextMenu(): Menu {
  const isVisible = BrowserWindow.getAllWindows().some(w => w.isVisible());

  return Menu.buildFromTemplate([
    {
      label: isVisible ? t('tray.menu.hideWindow') : t('tray.menu.showWindow'),
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
      label: t('tray.menu.settings'),
      submenu: [
        {
          label: `${t('tray.menu.appKey')}: ${envConfig.appKey ? '******' + envConfig.appKey.slice(-4) : t('tray.menu.notSet')}`,
          enabled: false,
        },
        {
          label: `${t('tray.menu.accessKey')}: ${envConfig.accessKey ? '******' + envConfig.accessKey.slice(-4) : t('tray.menu.notSet')}`,
          enabled: false,
        },
        {
          label: `${t('tray.menu.resourceId')}: ${envConfig.resourceId ? '******' + envConfig.resourceId.slice(-4) : t('tray.menu.notSet')}`,
          enabled: false,
        },
        { type: 'separator' },
        {
          label: t('tray.menu.configure'),
          click: () => {
            showSettingsWindow();
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: t('tray.menu.quit'),
      click: () => {
        app.exit(0);
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
  tray.setToolTip(t('tray.tooltip'));
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
