import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import { exec } from 'child_process';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let gameCheckInterval: NodeJS.Timeout | null = null;
let currentGame: string | null = null;

const isDev = process.env.NODE_ENV === 'development';
const WEB_URL = isDev ? 'http://localhost:5173' : 'https://app.asforces.com';

// Popüler oyunlar listesi (process isimleri)
const KNOWN_GAMES = [
  // FPS
  'csgo.exe', 'cs2.exe', 'valorant.exe', 'valorant-win64-shipping.exe',
  'r5apex.exe', 'overwatch.exe', 'cod.exe', 'modernwarfare.exe',
  'rainbowsix.exe', 'pubg.exe', 'tslgame.exe', 'fortnite.exe',
  'fortniteclient-win64-shipping.exe',
  // MOBA
  'league of legends.exe', 'dota2.exe',
  // Türk Oyunları
  'zula.exe', 'wolfteam.exe', 'pointblank.exe', 'metin2.exe',
  'knightonline.exe', 'silkroad.exe',
  // Diğer
  'minecraft.exe', 'javaw.exe', 'gta5.exe', 'warzone.exe'
];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hidden',
    frame: false,
    backgroundColor: '#1a1a1a',
  });

  mainWindow.loadURL(WEB_URL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Hide to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('AsforceS Voice');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow?.show();
  });
}

function registerGlobalShortcuts() {
  // Push-to-Talk - kullanıcının seçtiği tuşu kullan
  const pttKey = 'CommandOrControl+Space'; // Varsayılan
  
  globalShortcut.register(pttKey, () => {
    mainWindow?.webContents.send('ptt-key-press', { pressed: true });
  });

  // Mute toggle
  globalShortcut.register('CommandOrControl+M', () => {
    mainWindow?.webContents.send('toggle-mute');
  });
  
  // Deafen toggle
  globalShortcut.register('CommandOrControl+D', () => {
    mainWindow?.webContents.send('toggle-deafen');
  });
}

// Geliştirilmiş oyun algılama (Windows)
function checkForGames() {
  if (process.platform !== 'win32') {
    console.log('[GameDetect] Sadece Windows destekleniyor');
    return;
  }
  
  // PowerShell ile daha detaylı bilgi al
  const command = 'powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -ne \\"\\"} | Select-Object ProcessName | ConvertTo-Json"';
  
  exec(command, { timeout: 3000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('[GameDetect] Hata:', error.message);
      return;
    }
    
    try {
      const processesOutput = stdout.toLowerCase();
      
      // JSON parse et
      let processes: any[] = [];
      if (processesOutput.trim()) {
        try {
          const parsed = JSON.parse(stdout);
          processes = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // JSON parse başarısız, direkt string ara
          processes = [{ ProcessName: processesOutput }];
        }
      }
      
      // Oyun ara
      let detectedGame: string | null = null;
      for (const game of KNOWN_GAMES) {
        const gameName = game.toLowerCase().replace('.exe', '');
        
        // Process isimlerinde ara
        const found = processes.some(p => {
          const pName = (p.ProcessName || '').toLowerCase();
          return pName.includes(gameName) || processesOutput.includes(gameName);
        });
        
        if (found) {
          detectedGame = game;
          break;
        }
      }
      
      // Durum değişikliği kontrolü
      if (detectedGame && detectedGame !== currentGame) {
        currentGame = detectedGame;
        const displayName = getGameDisplayName(detectedGame);
        mainWindow?.webContents.send('game-detected', { 
          name: detectedGame,
          displayName: displayName
        });
        console.log('[GameDetect] ✅ Oyun algılandı:', displayName);
      } else if (!detectedGame && currentGame) {
        const displayName = getGameDisplayName(currentGame);
        mainWindow?.webContents.send('game-closed', { 
          name: currentGame,
          displayName: displayName
        });
        console.log('[GameDetect] ❌ Oyun kapandı:', displayName);
        currentGame = null;
      }
    } catch (err) {
      console.error('[GameDetect] Parse hatası:', err);
    }
  });
}

// Oyun görünen adını al
function getGameDisplayName(processName: string): string {
  const gameNames: { [key: string]: string } = {
    'csgo.exe': 'Counter-Strike: GO',
    'cs2.exe': 'Counter-Strike 2',
    'valorant.exe': 'VALORANT',
    'r5apex.exe': 'Apex Legends',
    'overwatch.exe': 'Overwatch',
    'league of legends.exe': 'League of Legends',
    'dota2.exe': 'Dota 2',
    'pubg.exe': 'PUBG',
    'fortnite.exe': 'Fortnite',
    'zula.exe': 'Zula',
    'wolfteam.exe': 'Wolfteam',
    'pointblank.exe': 'Point Blank',
    'metin2.exe': 'Metin2',
    'minecraft.exe': 'Minecraft',
  };
  
  return gameNames[processName.toLowerCase()] || processName.replace('.exe', '');
}

function startGameDetection() {
  // İlk kontrol
  checkForGames();
  
  // 5 saniyede bir kontrol et
  gameCheckInterval = setInterval(checkForGames, 5000);
}

function stopGameDetection() {
  if (gameCheckInterval) {
    clearInterval(gameCheckInterval);
    gameCheckInterval = null;
  }
}

// Auto-updater
function setupAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update-available');
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-downloaded');
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();
  startGameDetection(); // Oyun algılamayı başlat
  
  if (!isDev) {
    setupAutoUpdater();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopGameDetection();
});

// IPC handlers
ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow?.hide();
});

ipcMain.handle('quit-app', () => {
  app.isQuitting = true;
  app.quit();
});

// PTT tuş değiştirme
ipcMain.handle('set-ptt-key', (_, key: string) => {
  try {
    globalShortcut.unregisterAll();
    
    // Yeni tuşu kaydet
    globalShortcut.register(key, () => {
      mainWindow?.webContents.send('ptt-key-press', { pressed: true });
    });
    
    // Diğer tuşları tekrar kaydet
    globalShortcut.register('CommandOrControl+M', () => {
      mainWindow?.webContents.send('toggle-mute');
    });
    globalShortcut.register('CommandOrControl+D', () => {
      mainWindow?.webContents.send('toggle-deafen');
    });
    
    return { success: true };
  } catch (error) {
    console.error('PTT key registration failed:', error);
    return { success: false, error: String(error) };
  }
});

// Mevcut oyunu al
ipcMain.handle('get-current-game', () => {
  return currentGame;
});


