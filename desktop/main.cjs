const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.setName('Pelican Pedal Run');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

function createWindow() {
  const window = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 800,
    minHeight: 540,
    show: false,
    backgroundColor: '#8ed8f8',
    title: '鹈鹕骑车 · Pelican Pedal Run',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
