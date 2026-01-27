const { contextBridge, ipcRenderer } = require("electron"); 

window.addEventListener("DOMContentLoaded", () => {
  console.log("Electron listo");

  // ❗ No inyectar el botón dentro de la ventana del bot
  if (window.location.href.includes("maestrobot.html")) {
    return;
  }

  // ===== BOTÓN FLOTANTE MAESTROBOT =====
  const boton = document.createElement("div");
  boton.innerHTML = "🤖";
  boton.title = "MaestroBot";

  Object.assign(boton.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "60px",
    height: "60px",
    background: "#1e293b",
    color: "white",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "28px",
    cursor: "pointer",
    zIndex: "999999",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
  });

  boton.addEventListener("click", () => {
    ipcRenderer.send("abrir-maestrobot");
  });

  const esperarBody = setInterval(() => {
    if (document.body) {
      document.body.appendChild(boton);
      clearInterval(esperarBody);
    }
  }, 50);
});

/**
 * ==============================
 * API MAESTROBOT
 * ==============================
 */
contextBridge.exposeInMainWorld("MaestroBot", {
  responder: async (mensaje) => {
    try {
      return await ipcRenderer.invoke("maestrobot-preguntar", mensaje);
    } catch (err) {
      console.error("❌ Error IPC MaestroBot:", err);
      return "⚠️ Error interno al ejecutar MaestroBot.";
    }
  }
});

/**
 * ==============================
 * API DOCUMENTOS
 * ==============================
 */
contextBridge.exposeInMainWorld("Documentos", {
  abrir: (archivo) => ipcRenderer.send("abrir-documento", archivo)
});

/**
 * ==============================
 * API ACTUALIZADOR
 * ==============================
 */
contextBridge.exposeInMainWorld("Actualizador", {
  buscar: () => ipcRenderer.send("buscar-actualizacion"),
  disponible: (callback) => ipcRenderer.on("actualizacion-disponible", callback),
  noHay: (callback) => ipcRenderer.on("sin-actualizacion", callback),
  descargada: (callback) => ipcRenderer.on("actualizacion-descargada", callback)
});

/**
 * ==============================
 * API GENERAL (HTMLs)
 * ==============================
 */
contextBridge.exposeInMainWorld("api", {
  // 🔹 IR AL MENÚ
  abrirMenu: () => ipcRenderer.send("abrir-menu"),

  // 🔹 ACTUALIZACIONES
  buscarActualizacion: () => ipcRenderer.send("buscar-actualizacion"),

  onMensajeActualizacion: (callback) =>
    ipcRenderer.on("mensaje-actualizacion", (_, mensaje) => callback(mensaje)),

  onProgresoActualizacion: (callback) =>
    ipcRenderer.on("progreso-actualizacion", (_, data) => callback(data))
});

/**
 * ==============================
 * 🎬 API MEDIATECA
 * ==============================
 */
contextBridge.exposeInMainWorld("electronAPI", {
  leerVideos: (carpeta) => ipcRenderer.invoke("leer-videos-recursivo", carpeta),

  // =============================
  // 🤖 IA / ENTORNO MAESTROBOT
  // =============================
  checkIAStatus: () => ipcRenderer.invoke("check-ia-status"),
  getRamInfo: () => ipcRenderer.invoke("get-ram-info"),
  prepareEntorno: (v) => ipcRenderer.invoke("prepare-entorno", v),

  onIAProgress: (callback) =>
    ipcRenderer.on("ia-progress", (_, data) => callback(data)),

  onIAProgressPercent: (callback) =>
    ipcRenderer.on("ia-progress-percent", (_, p) => callback(p)),

  onIAStep: (callback) =>
    ipcRenderer.on("ia-step", (_, step) => callback(step))
});
