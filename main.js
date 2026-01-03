const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const ia = require("./data/js/ia");

/* 🔹 AGREGADO: electron-updater */
const { autoUpdater } = require("electron-updater");

let mainWindow;
let maestroBotWindow;

/**
 * Ventana principal del organizador
 * index.html está en la RAÍZ del proyecto
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, "data", "icon", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

/**
 * Ventana flotante MaestroBot
 * maestrobot.html está en data/htmls
 */
function createMaestroBotWindow() {
  if (maestroBotWindow) {
    maestroBotWindow.focus();
    return;
  }

  maestroBotWindow = new BrowserWindow({
    width: 420,
    height: 600,
    resizable: false,
    maximizable: false,
    alwaysOnTop: true,
    title: "MaestroBot",
    icon: path.join(__dirname, "data", "icon", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  maestroBotWindow.loadFile(
    path.join(__dirname, "data", "htmls", "maestrobot.html")
  );

  maestroBotWindow.on("closed", () => {
    maestroBotWindow = null;
  });
}

/**
 * IPC: abrir ventana MaestroBot
 */
ipcMain.on("abrir-maestrobot", () => {
  createMaestroBotWindow();
});

/**
 * IPC: responder preguntas de MaestroBot
 */
ipcMain.handle("maestrobot-preguntar", async (event, mensaje) => {
  return await ia.responder(mensaje);
});

/**
 * IPC: abrir documentos del sistema (Word / PDF)
 */
ipcMain.on("abrir-documento", (event, archivo) => {
  const rutaDocumento = path.join(
    __dirname,
    "data",
    "documentos",
    archivo
  );

  shell.openPath(rutaDocumento);
});

/* =================================================
   🔄 AUTO ACTUALIZACIÓN (AGREGADO)
================================================= */

autoUpdater.autoDownload = false;

/* desde el botón ACTUALIZAR */
ipcMain.on("buscar-actualizacion", () => {
  autoUpdater.checkForUpdates();
});

autoUpdater.on("update-available", () => {
  if (mainWindow) {
    mainWindow.webContents.send("actualizacion-disponible");
  }
  autoUpdater.downloadUpdate();
});

autoUpdater.on("update-not-available", () => {
  if (mainWindow) {
    mainWindow.webContents.send("sin-actualizacion");
  }
});

autoUpdater.on("update-downloaded", () => {
  if (mainWindow) {
    mainWindow.webContents.send("actualizacion-descargada");
  }
  autoUpdater.quitAndInstall();
});

/* ================================================= */

app.whenReady().then(createMainWindow);
