const { contextBridge, ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
  console.log("Electron listo");

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
 * API MaestroBot (IPC)
 */
contextBridge.exposeInMainWorld("MaestroBot", {
  responder: async (mensaje) => {
    return await ipcRenderer.invoke("maestrobot-preguntar", mensaje);
  }
});

/* =================================================
   📄 API DOCUMENTOS (AGREGADO)
================================================= */

contextBridge.exposeInMainWorld("Documentos", {
  abrir: (archivo) => ipcRenderer.send("abrir-documento", archivo)
});

/* =================================================
   🔄 API ACTUALIZACIONES (AGREGADO)
================================================= */

contextBridge.exposeInMainWorld("Actualizador", {
  buscar: () => ipcRenderer.send("buscar-actualizacion"),
  disponible: (callback) => ipcRenderer.on("actualizacion-disponible", callback),
  noHay: (callback) => ipcRenderer.on("sin-actualizacion", callback),
  descargada: (callback) => ipcRenderer.on("actualizacion-descargada", callback)
});
