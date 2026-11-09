/**
 * Client for Ollama local inference running on Raspberry Pi 5.
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://192.168.1.45:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';

async function askOllama(userPrompt, serverContext = '') {
  const systemInstruction = `Eres Jarvis Homelab, un asistente de IA inteligente, conciso y técnico que corre localmente en una Raspberry Pi 5.
Tu trabajo es responder a Carlos por WhatsApp sobre el estado de sus aplicaciones (RFFM Tracker, CAVA Macro System, Postgres, Dokploy) y sus logs.
Responde SIEMPRE en español de forma directa, útil, cercana y bien formateada (con viñetas o emojis cuando proceda).
No inventes datos: usa únicamente la información real del servidor que se te proporciona a continuación.

DATOS EN TIEMPO REAL DEL SERVIDOR:
${serverContext}
`;

  const url = `${OLLAMA_HOST.replace(/\/$/, '')}/api/generate`;
  const body = {
    model: DEFAULT_MODEL,
    system: systemInstruction,
    prompt: userPrompt,
    stream: false,
    options: {
      temperature: 0.3,
      num_predict: 250
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Ollama returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.response ? data.response.trim() : 'No pude generar una respuesta en este momento.';
  } catch (err) {
    console.error('[OllamaClient] Error:', err.message);
    return `⚠️ Error al conectar con Ollama (${err.message}). Estado directo del servidor:\n${serverContext}`;
  }
}

module.exports = {
  askOllama
};

