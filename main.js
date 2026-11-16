const { app, BrowserWindow, dialog, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// MAYAACC Desktop — data lives on THIS PC only, no server, no browser.
// Data folder (Windows):  Documents\MAYAACC-Data
//   mayaacc-data.json   <- full copy of all MAYAACC data, auto-saved
//   profile\            <- Electron's own storage (Local Storage lives here)
//   backups\            <- default backup folder (user can change it in-app)
// Copy the whole MAYAACC-Data folder to a pen drive / Google Drive /
// OneDrive folder any time — that IS the backup. Paste it back to restore.
// ---------------------------------------------------------------------------
const dataDir = path.join(app.getPath('documents'), 'MAYAACC-Data');
const snapshotFile = path.join(dataDir, 'mayaacc-data.json');
const defaultBackupDir = path.join(dataDir, 'backups');

app.setPath('userData', path.join(dataDir, 'profile'));

function ensureDirs() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(defaultBackupDir, { recursive: true });
}
ensureDirs();

function safeName(name) {
  // Never allow ".." / folders in a file name coming from the web page.
  return path.basename(String(name || '')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 120) || 'file.json';
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    title: 'MAYAACC — Desktop',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Dev self-test only: MAYAACC_SELFTEST=1 node_modules/.bin/electron --no-sandbox .
  // Sets one test company, waits for the auto-save, then quits.
  // MAYAACC_SELFTEST=restore checks the PC-file restore on a fresh profile.
  if (process.env.MAYAACC_SELFTEST === 'restore') {
    mainWindow.webContents.on('did-finish-load', async () => {
      try {
        const r = await mainWindow.webContents.executeJavaScript(`
          ({ hasDesktop: !!window.mayaDesktop,
             companies: localStorage.getItem('mayaacc_companies'),
             active: localStorage.getItem('mayaacc_active_company') })
        `);
        console.log('MAYAACC-RESTORE-TEST', JSON.stringify(r));
      } catch (e) { console.log('MAYAACC-RESTORE-TEST-ERROR', String(e && e.message || e)); }
      setTimeout(() => app.quit(), 2000);
    });
  } else if (process.env.MAYAACC_SELFTEST === '1') {
    mainWindow.webContents.on('did-finish-load', async () => {
      try {
        const r = await mainWindow.webContents.executeJavaScript(`
          (async () => {
            const hasDesktop = !!window.mayaDesktop;
            localStorage.setItem('mayaacc_companies', JSON.stringify([{id:'test1', companyName:'Test Company'}]));
            localStorage.setItem('mayaacc_active_company', 'test1');
            return { hasDesktop, ls: localStorage.getItem('mayaacc_companies') };
          })()
        `);
        console.log('MAYAACC-SELFTEST', JSON.stringify(r));
      } catch (e) { console.log('MAYAACC-SELFTEST-ERROR', String(e && e.message || e)); }
      setTimeout(() => app.quit(), 5000);
    });
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  // Keep the app usable offline: external links (GST portal, WhatsApp,
  // e-Way Bill) open in the real browser, everything else stays in-app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url) && !url.startsWith('file:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Data Folder (Documents\\MAYAACC-Data)',
          click: () => shell.openPath(dataDir),
        },
        {
          label: 'Open Backup Folder',
          click: () => shell.openPath(defaultBackupDir),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'quit', label: 'Exit MAYAACC' },
      ],
    },
    {
      label: 'Backup',
      submenu: [
        {
          label: 'Choose Backup Folder… (pen drive / Google Drive)',
          click: async () => {
            const r = await dialog.showOpenDialog(mainWindow, {
              title: 'Choose MAYAACC backup folder',
              properties: ['openDirectory', 'createDirectory'],
            });
            if (!r.canceled && r.filePaths[0] && mainWindow) {
              mainWindow.webContents.send('mayaacc:backup-folder-chosen', r.filePaths[0]);
            }
          },
        },
        {
          label: 'Open Data Folder',
          click: () => shell.openPath(dataDir),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'How backup works',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'MAYAACC Backup',
              message: 'Your data is on this PC only.',
              detail:
                'All data is saved automatically in:\nDocuments\\MAYAACC-Data\\mayaacc-data.json\n\n' +
                '1) Copy the whole MAYAACC-Data folder to a pen drive or a Google Drive / OneDrive folder — that is your backup.\n' +
                '2) To restore on this or another PC, paste that folder back into Documents and start MAYAACC.\n' +
                '3) Inside MAYAACC you can also use Data → Backup & Restore, and Data → Schedule Backup → Backup folder to save a backup file to a pen drive / Google Drive folder automatically.',
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// --- IPC: the exact 4 methods MAYAACC's own backup-folder code expects ---
// window.mayaDesktop.chooseFolder / writeFile / list / remove
ipcMain.handle('maya:choose-folder', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose MAYAACC backup folder',
    defaultPath: defaultBackupDir,
    properties: ['openDirectory', 'createDirectory'],
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('maya:write-file', async (_e, dir, name, text) => {
  const folder = String(dir || defaultBackupDir);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, safeName(name)), String(text ?? ''), 'utf8');
  return true;
});

ipcMain.handle('maya:list', async (_e, dir) => {
  const folder = String(dir || defaultBackupDir);
  try {
    return fs.readdirSync(folder).filter((n) => {
      try { return fs.statSync(path.join(folder, n)).isFile(); } catch { return false; }
    });
  } catch { return []; }
});

ipcMain.handle('maya:remove', async (_e, dir, name) => {
  try { fs.unlinkSync(path.join(String(dir || defaultBackupDir), safeName(name))); } catch {}
  return true;
});

// --- IPC: full local snapshot (mayaacc-data.json) ---
ipcMain.handle('maya:save-snapshot', async (_e, data) => {
  try {
    ensureDirs();
    const tmp = snapshotFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data || {}), 'utf8');
    fs.renameSync(tmp, snapshotFile);
    return true;
  } catch (err) { return false; }
});

ipcMain.handle('maya:load-snapshot', async () => {
  try {
    if (!fs.existsSync(snapshotFile)) return null;
    return JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
  } catch { return null; }
});

ipcMain.handle('maya:get-data-folder', async () => dataDir);
ipcMain.handle('maya:open-data-folder', async () => { shell.openPath(dataDir); return true; });

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
