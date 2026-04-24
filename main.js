const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const { startServer } = require('./server');

let mainWindow;
let tray;

function createWindow(ip, port) {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        title: 'RCM File Sender',
        icon: path.join(__dirname, 'assets', 'logo.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'views', 'desktop.html'));

    // Send IP and Port to renderer
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('server-info', { ip, port });
    });

    // Remove menu
    mainWindow.setMenu(null);
}

app.whenReady().then(() => {
    const desktopPath = app.getPath('desktop');
    const uploadDir = path.join(desktopPath, 'RCM_Uploads');

    startServer(uploadDir, (ip, port) => {
        createWindow(ip, port);
    });

    // Tray Icon
    // tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
    // const contextMenu = Menu.buildFromTemplate([
    //     { label: 'Show App', click: () => mainWindow.show() },
    //     { label: 'Quit', click: () => app.quit() }
    // ]);
    // tray.setToolTip('RCM File Sender');
    // tray.setContextMenu(contextMenu);

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            // Re-start server? No, server is usually global.
            // For now, assume it's running.
        }
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
