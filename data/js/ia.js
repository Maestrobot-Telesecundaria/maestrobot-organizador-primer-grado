const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

/* ================================
   📁 RUTAS OLLAMA EMPAQUETADO
================================ */
const BASE = path.join(__dirname, "..", "..");
const OLLAMA_BASE = path.join(BASE, "engine", "ollama");
const OLLAMA_EXE = path.join(OLLAMA_BASE, "ollama.exe");
const OLLAMA_HOME = path.join(OLLAMA_BASE, ".ollama");
const OLLAMA_MODELS = path.join(OLLAMA_HOME, "models");

/* ================================
   ⚙️ MODELO
================================ */
const MODELO = "gemma3:1b";

/* ================================
   🧠 PROMPT DEL SISTEMA
================================ */
const SYSTEM_PROMPT = `
Eres MaestroBot, un asistente pedagógico para docentes de primer grado de secundaria en México.

Fuiste creado por el profesor Gerardo Paul Herrera.

Tu función es:
- Apoyar en planeación didáctica
- Sugerir actividades
- Ayudar en evaluación
- Explicar conceptos de forma clara

Responde siempre en español.
De forma directa, sin relleno.
`;

/* ================================
   🧠 MEMORIA
================================ */
let memoria = [];
const LIMITE_MEMORIA = 4;

/* ================================
   🧹 LIMPIEZA
================================ */
function limpiar(texto) {
  if (!texto) return "";
  return texto
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ================================
   🚀 FUNCIÓN PRINCIPAL
================================ */
function responder(mensaje) {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(OLLAMA_EXE)) {
        console.error("❌ No existe ollama.exe en:", OLLAMA_EXE);
        return resolve("❌ No se encontró el motor de IA.");
      }

      // Guardar memoria
      memoria.push(`Docente: ${mensaje}`);
      if (memoria.length > LIMITE_MEMORIA * 2) {
        memoria = memoria.slice(-LIMITE_MEMORIA * 2);
      }

      // Construir prompt
      let prompt = SYSTEM_PROMPT + "\n\n";
      for (let m of memoria) {
        prompt += m + "\n";
      }
      prompt += "MaestroBot:";

      console.log("🧠 Enviando a Ollama...");

      const proceso = spawn(
        OLLAMA_EXE,
        ["run", MODELO],
        {
          cwd: OLLAMA_BASE,
          windowsHide: true,
          env: {
            ...process.env,
            OLLAMA_HOME: OLLAMA_HOME,
            OLLAMA_MODELS: OLLAMA_MODELS,
            OLLAMA_OFFLINE: "1"
          }
        }
      );

      let salida = "";
      let error = "";

      proceso.stdout.on("data", (d) => {
        salida += d.toString("utf8");
      });

      proceso.stderr.on("data", (d) => {
        error += d.toString("utf8");
      });

      proceso.on("error", (err) => {
        console.error("❌ Error ejecutando Ollama:", err);
        return resolve("❌ Error ejecutando el motor de IA.");
      });

      // Enviar prompt
      proceso.stdin.write(prompt + "\n");
      proceso.stdin.end();

      proceso.on("close", () => {
        if (error && error.trim()) {
          console.log("🦙 Ollama STDERR:", error);
        }

        let respuesta = limpiar(salida);

        // Ollama a veces devuelve el prompt incluido → limpiamos
        respuesta = respuesta.replace(prompt, "").trim();

        if (!respuesta) {
          return resolve("⚠️ El modelo no devolvió respuesta.");
        }

        memoria.push(`MaestroBot: ${respuesta}`);
        resolve(respuesta);
      });

    } catch (err) {
      console.error("❌ ERROR GENERAL IA:", err);
      resolve("❌ Error interno del sistema de IA.");
    }
  });
}

module.exports = { responder };
