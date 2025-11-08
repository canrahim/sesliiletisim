import { app, BrowserWindow, ipcMain, Tray, Menu, shell, screen } from 'electron';
import * as path from 'path';
import * as log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import Store from 'electron-store';

// Logging setup
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Store for user preferences
const store = new Store();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Development mode detection
const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged;

// API URL
const API_URL = process.env.ASFORCES_API_URL || 'https://app.asforces.com';

function createWindow() {
  // Get saved window bounds or use defaults
  const savedBounds = store.get('windowBounds') as { width: number; height: number; x?: number; y?: number } | undefined;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: savedBounds?.width || 1400,
    height: savedBounds?.height || 900,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 1000,
    minHeight: 700,
    frame: true,
    backgroundColor: '#1e40af',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    show: false, // Don't show until ready
  });

  // Save window bounds on resize/move
  const saveBounds = () => {
    if (mainWindow && !mainWindow.isMaximized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  };
  
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  // Load app
  if (isDevelopment) {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:3002');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load from built files or remote
    const useLocal = store.get('useLocalRenderer', false);
    
    if (useLocal) {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    } else {
      mainWindow.loadURL(API_URL);
    }
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Check for updates (only in production)
    if (!isDevelopment) {
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify();
      }, 3000);
    }
  });

  // Window events
  mainWindow.on('close', (event) => {
    // Minimize to tray instead of closing
    if (store.get('minimizeToTray', true)) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create system tray
  createTray();

  log.info('✅ Main window created');
}

function createTray() {
  tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'AsforceS Voice',
      enabled: false,
      icon: path.join(__dirname, '../assets/tray-icon-small.png'),
    },
    { type: 'separator' },
    {
      label: 'Aç',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'Yenile',
      click: () => {
        mainWindow?.reload();
      },
    },
    { type: 'separator' },
    {
      label: 'Ayarlar',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('open-settings');
      },
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        store.set('minimizeToTray', false);
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('AsforceS Voice');

  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  log.info('✅ System tray created');
}

// Game detection (Windows only for now)
let gameDetectionInterval: NodeJS.Timeout | null = null;

function startGameDetection() {
  if (process.platform !== 'win32') return;

  const { exec } = require('child_process');
  let lastGame: string | null = null;

  gameDetectionInterval = setInterval(() => {
    exec('tasklist /FO CSV /NH', (error: any, stdout: string) => {
      if (error) return;

      const games = [
        { process: 'League of Legends.exe', name: 'League of Legends', displayName: 'League of Legends' },
        { process: 'VALORANT.exe', name: 'VALORANT', displayName: 'VALORANT' },
        { process: 'GTA5.exe', name: 'GTA V', displayName: 'Grand Theft Auto V' },
        { process: 'csgo.exe', name: 'CS:GO', displayName: 'Counter-Strike: Global Offensive' },
        { process: 'RocketLeague.exe', name: 'Rocket League', displayName: 'Rocket League' },
        { process: 'Minecraft.exe', name: 'Minecraft', displayName: 'Minecraft' },
        { process: 'FortniteClient-Win64-Shipping.exe', name: 'Fortnite', displayName: 'Fortnite' },
      ];

      let currentGame = games.find(g => stdout.includes(g.process));

      if (currentGame && currentGame.name !== lastGame) {
        lastGame = currentGame.name;
        mainWindow?.webContents.send('game-detected', currentGame);
        log.info('🎮 Game detected:', currentGame.displayName);
      } else if (!currentGame && lastGame) {
        lastGame = null;
        mainWindow?.webContents.send('game-closed');
        log.info('🎮 Game closed');
      }
    });
  }, 5000); // Check every 5 seconds

  log.info('✅ Game detection started');
}

function stopGameDetection() {
  if (gameDetectionInterval) {
    clearInterval(gameDetectionInterval);
    gameDetectionInterval = null;
    log.info('🛑 Game detection stopped');
  }
}

// Auto updater events
autoUpdater.on('checking-for-update', () => {
  log.info('🔍 Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  log.info('✅ Update available:', info.version);
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', () => {
  log.info('ℹ️ No updates available');
});

autoUpdater.on('error', (err) => {
  log.error('❌ Auto updater error:', err);
});

autoUpdater.on('download-progress', (progress) => {
  log.info(`📥 Download progress: ${progress.percent.toFixed(2)}%`);
  mainWindow?.webContents.send('download-progress', progress);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('✅ Update downloaded:', info.version);
  mainWindow?.webContents.send('update-downloaded', info);
});

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('close-window', () => mainWindow?.close());
ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.quit();
});
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  startGameDetection();
  
  log.info('✅ App ready');
  log.info('📱 Version:', app.getVersion());
  log.info('🖥️ Platform:', process.platform);
  log.info('🏠 App path:', app.getAppPath());
  log.info('📂 User data:', app.getPath('userData'));
});

app.on('window-all-closed', () => {
  stopGameDetection();
  
  // On macOS, keep app running
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});

app.on('before-quit', () => {
  stopGameDetection();
  store.set('minimizeToTray', false);
});

// Disable GPU acceleration if needed (for compatibility)
if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

log.info('🚀 AsforceS Voice Desktop starting...');
