import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electron', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  restartApp: () => ipcRenderer.invoke('restart-app'),
  
  // Auto update
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'game-detected',
      'game-closed',
      'update-available',
      'update-downloaded',
      'download-progress',
      'open-settings',
    ];
    
    if (validChannels.includes(channel)) {
      const subscription = (_event: any, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  },
  
  // Remove listener
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
  
  // Send to main
  send: (channel: string, ...args: any[]) => {
    const validChannels = ['presence-update', 'voice-state-change'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
});

// TypeScript definitions for window.electron
declare global {
  interface Window {
    electron: {
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      getAppPath: () => Promise<string>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      restartApp: () => Promise<void>;
      installUpdate: () => Promise<void>;
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
      removeListener: (channel: string, callback: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
    };
  }
}

