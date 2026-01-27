const { app, BrowserWindow, ipcMain, shell } = require("electron"); 
const path = require("path");
const fs = require("fs");
const { spawn, execFile } = require("child_process");
const os = require("os");
const https = require("https");
const ia = require("./data/js/ia");

/* 🔹 electron-updater */
const { autoUpdater } = require("electron-updater");

let mainWindow;
let maestroBotWindow;

/* ==============================
   RUTAS COMPATIBLES DEV / BUILD
============================== */

const BASE_PATH = app.getAppPath();

const DATA_PATH = path.join(BASE_PATH, "data");
const ICON_PATH = path.join(DATA_PATH, "icon", "icon.ico");
const INDEX_PATH = path.join(BASE_PATH, "index.html");
const MENU_PATH = path.join(DATA_PATH, "htmls", "menu.html");
const BOT_PATH = path.join(DATA_PATH, "htmls", "maestrobot.html");

/* 🔹 Preload */
const preloadPath = path.join(BASE_PATH, "preload.js");
const hasPreload = fs.existsSync(preloadPath);

/* ==============================
   CONFIG IA
============================== */

const OLLAMA_URL = "https://ollama.com/download/OllamaSetup.exe";
const TEMP_DIR = app.getPath("temp");
const OLLAMA_INSTALLER = path.join(TEMP_DIR, "OllamaSetup.exe");

/* ==============================
   FUNCIONES OLLAMA
============================== */

function getEnginePath() {
  return path.join(
    "C:\\Users",
    os.userInfo().username,
    "AppData",
    "Local",
    "Programs",
    "Ollama",
    "ollama.exe"
  );
}

function isEngineInstalled() {
  return fs.existsSync(getEnginePath());
}

function getRamGB() {
  return Math.round(os.totalmem() / 1024 / 1024 / 1024);
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      const total = parseInt(res.headers["content-length"] || "0");
      let downloaded = 0;

      res.on("data", chunk => {
        downloaded += chunk.length;
        if (total && onProgress) {
          const percent = Math.round((downloaded / total) * 100);
          onProgress(percent);
        }
      });

      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

function installOllamaSilently() {
  return new Promise((resolve, reject) => {
    execFile(OLLAMA_INSTALLER, ["/S"], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function checkOllamaWorks() {
  return new Promise((resolve) => {
    execFile("ollama", ["--version"], (err) => {
      resolve(!err);
    });
  });
}

function pullModel(model, sender) {
  return new Promise((resolve, reject) => {
    const p = spawn("ollama", ["pull", model]);

    p.stdout.on("data", d => {
      sender.send("ia-progress", d.toString());
    });

    p.stderr.on("data", d => {
      sender.send("ia-progress", d.toString());
    });

    p.on("close", () => resolve());
  });
}

/* ==============================
   Ventana principal
============================== */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: ICON_PATH,
    title: "Maestro Bot – Primero",
    autoHideMenuBar: true,
    menuBarVisible: false,
    webPreferences: {
      preload: hasPreload ? preloadPath : undefined,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: true,
      webSecurity: false
    }
  });

  mainWindow.setMenu(null);

  mainWindow.loadFile(INDEX_PATH);

  if (!app.isPackaged) {
    mainWindow.webContents.once("did-finish-load", () => {
      mainWindow.webContents.openDevTools();
    });
  }
}

/* ==============================
   Ventana MaestroBot
============================== */
function createMaestroBotWindow() {
  if (maestroBotWindow) {
    maestroBotWindow.focus();
    return;
  }

  maestroBotWindow = new BrowserWindow({
    width: 420,
    height: 600,
    resizable: false,
    alwaysOnTop: true,
    title: "MaestroBot",
    icon: ICON_PATH,
    autoHideMenuBar: true,
    webPreferences: {
      preload: hasPreload ? preloadPath : undefined,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  maestroBotWindow.setMenu(null);
  maestroBotWindow.loadFile(BOT_PATH);

  maestroBotWindow.on("closed", () => {
    maestroBotWindow = null;
  });
}

/* ==============================
   IPC
============================== */

ipcMain.on("abrir-maestrobot", () => {
  createMaestroBotWindow();
});

/* ✅ ESTE ES EL BLOQUE NUEVO QUE HACE FUNCIONAR EL BOTÓN INICIAR */
ipcMain.on("abrir-menu", () => {
  mainWindow.loadFile(MENU_PATH);
});

ipcMain.handle("maestrobot-preguntar", async (event, mensaje) => {
  return await ia.responder(mensaje);
});

// Estado del entorno
ipcMain.handle("check-ia-status", async () => {
  if (!isEngineInstalled()) return { status: "no_engine" };
  return { status: "ready" };
});

// Obtener RAM y recomendación
ipcMain.handle("get-ram-info", () => {
  const ram = getRamGB();
  let recommended = ram >= 8 ? "8gb" : "4gb";
  return { ram, recommended };
});

// Preparar entorno completo
ipcMain.handle("prepare-entorno", async (event, version) => {
  const sender = event.sender;

  // 1. Instalar Ollama si no existe
  if (!isEngineInstalled()) {
    sender.send("ia-step", "Descargando motor de IA...");
    await downloadFile(OLLAMA_URL, OLLAMA_INSTALLER, (p) => {
      sender.send("ia-progress-percent", p);
    });

    sender.send("ia-step", "Instalando motor de IA...");
    await installOllamaSilently();

    // Esperar a que responda
    let ok = false;
    for (let i = 0; i < 10; i++) {
      ok = await checkOllamaWorks();
      if (ok) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!ok) throw new Error("Ollama no se pudo instalar");
  }

  // 2. Descargar modelo
  let model = version === "8gb" ? "gemma3:4b" : "gemma3:1b";
  sender.send("ia-step", "Descargando modelo de IA...");
  await pullModel(model, sender);

  return { ok: true, model };
});

/* ==============================
   ARRANQUE
============================== */
app.whenReady().then(() => {
  createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
