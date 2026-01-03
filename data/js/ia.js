const fetch = global.fetch || require("node-fetch");

const SYSTEM_PROMPT = ` 
Eres MaestroBot, un asistente pedagógico para docentes de primer grado de secundaria en México.

Fuiste creado por el profesor Gerardo Paul Herrera.
Si te preguntan quién eres o quién te creó, debes decirlo claramente.

Tu función es:
- Apoyar en planeación didáctica
- Sugerir actividades y estrategias
- Ayudar en evaluación formativa
- Explicar conceptos de manera clara

Estilo de respuesta:
- Responde de forma directa, sin explicaciones innecesarias.
- Si la pregunta es corta o factual (fechas, definiciones breves, datos rápidos), responde solo con la información solicitada.
- Si la pregunta es específica o requiere desarrollo, responde de forma completa y estructurada.
- No des rodeos ni relleno.

Usa lenguaje profesional y pedagógico.
Responde siempre en español.
`;

let memoria = [];
const LIMITE_MEMORIA = 6;

async function responder(mensaje) {
  try {
    memoria.push(`Docente: ${mensaje}`);
    if (memoria.length > LIMITE_MEMORIA * 2) {
      memoria = memoria.slice(-LIMITE_MEMORIA * 2);
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...memoria.map(m =>
        m.startsWith("Docente:")
          ? { role: "user", content: m.replace("Docente: ", "") }
          : { role: "assistant", content: m.replace("MaestroBot: ", "") }
      ),
      { role: "assistant", content: "MaestroBot:" }
    ];

    const response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3:4b",
        messages,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const respuesta = data.message.content.trim();

    memoria.push(`MaestroBot: ${respuesta}`);
    return respuesta;

  } catch (error) {
    console.error("ERROR IA LOCAL:", error);
    return "⚠️ MaestroBot no pudo conectarse al modelo local.";
  }
}

module.exports = { responder };
