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
 * Create tray icon based on status using data URL
 * Returns a 18x18 PNG icon as base64 data URL
 */
function createTrayIcon(status: TrayStatus): NativeImage {
  // 18x18 PNG icons as base64 data URLs
  // Green circle (idle), Red circle (recording), Red X (error)
  const icons: Record<TrayStatus, string> = {
    idle:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEbSURBVDiNpZM9SwNBEIafvVxiYyG4EHkQL+JFfARBL+LNP4A38OidxI/6E/wB8eLFg4WNFgQLwYVYWKyF2GVhYXe73V2MeMEu6C6z8zwzO7MriP8VVFVnZmZoNBq0223S6TSFQoFsNksmk0FE3LqIiODz+SiVStRqNfL5PKurq2QyGbLZLJqm3VpEVREEgclkolarUavVqFarNBoNut0u3W6XXq9Hv9/HMAzC4TDJZJJcLkc6nSaVSpFMJgmHw4TDYUKhEMFgkEAgQCAQwO/34/P58Pl8eL1ePB4PHo8Ht9uN2+3G5XLhcrlwuVw4HA4cDgcOhwOHw4HD4cDhcLgdLBYLZvP1Nsz/BRHBbreTzWYZDAZks1my2SyZTIZUKkUymSSZTJJKpUin06TTadLpNOl0mnQ6TTqdJp1Ok0qlSKVSpFIpUqkUyWSSRCJBIpEgkUiQSCSIx+PE43Fi8fv9+P1+/H4/fl+A9w0fP8D1Fz7xA5y4n2kAAAAASUVORK5CYII=",
    recording:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADGSURBVDiN3ZKxDcIwEEXfJoU0lJY6SkoKSR1NJRWkdJTSUEFJQ4lOLbgALbgA3ICb0FRCEokIIokkXmxZ8Z0/G0hR8G5mNOONwPd9vLiD4/G4XK/Xi8fjked5ybKseDwex3H8EJF7Z2dne7/fP3AcJ7nv++m6rhtF0aXv+36apmkURedBECwNw3BJkqRNFEWXTdMsTdN0SZJkYxTl97quW9u2bVVVrapqVVWtqqpVVbWqqlZV1aqqWlVVq6pqVVWtqqpVVbWqqlZV1aqqVlW1qqpWVbWqqg3D8K21dhzHE9M0d4ZhODNNU9u27d9ba2f8l/4A3z9fJ2QAAAAASUVORK5CYII=",
    error:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACxSURBVDiNtZKxDcAwDEO/LoWUlJY6SkpKSR1NJRWkdJTSUEFJQ4lOLbgA3ICb0FRCEokIIoksZmdWxh4/2Y4TAefZ2Y59QeD7Pl7cwfn5+bper5dnZ2cUi0WKxSKFQoF8Pk8ul8Pv9+9dR0QUi8VyuVwu1+v1cr1eL9fr9XK9Xi/X6/Vyu90u1+v1cr1eL9fr9XK9Xi/X6/Vyu90u1+v1cr1eL9fr9XK9Xi+Xy+VyuVwul8vlcqlUKpVKpVKpVCqVSqVSqVQqlUqlUqlUKpVKpVKpVCqVSqVSqVQqlf4d3wBvQb8mKf5PqwAAAABJRU5ErkJggg==",
  };

  return nativeImage.createFromDataURL(icons[status]);
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
