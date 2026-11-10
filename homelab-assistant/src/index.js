/**
 * Homelab WhatsApp Assistant & Server Monitor
 * Built with @whiskeysockets/baileys, Express and Ollama.
 */

const express = require('express');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const { buildServerAuditContext, getContainersStatus, getErrorsSummary } = require('./server_monitor');
const { askOllama } = require('./ollama_client');
const { generateDailyReport, initDailyReportScheduler } = require('./daily_reporter');
const { isAllowedSelfChatSender, isBotSelfEchoText, normalizePhoneNumber } = require('./security');

const PORT = parseInt(process.env.PORT || '3005', 10);
const AUTH_DIR = process.env.AUTH_DIR || path.join(__dirname, '../auth_info');

// Ensure auth dir exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

function clearAuthDir() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    return;
  }
  const files = fs.readdirSync(AUTH_DIR);
  for (const file of files) {
    try {
      fs.rmSync(path.join(AUTH_DIR, file), { recursive: true, force: true });
    } catch (e) {
      console.error(`[Auth] Error borrando archivo ${file}:`, e.message);
    }
  }
}

let qrCodeData = null;
let connectionStatus = 'Iniciando...';
let connectedUser = null;
let sock = null;
const sentByBotMsgIds = new Set();

function recordSentMsg(id) {
  if (!id) return;
  sentByBotMsgIds.add(id);
  if (sentByBotMsgIds.size > 1000) {
    const first = sentByBotMsgIds.values().next().value;
    sentByBotMsgIds.delete(first);
  }
}

// ==========================================
// Express Web Dashboard for QR Code & Status
// ==========================================
const app = express();
app.use(express.json());

app.get('/', async (req, res) => {
  let qrImageHtml = '';
  if (qrCodeData && connectionStatus !== 'Conectado') {
    try {
      const qrDataUrl = await QRCode.toDataURL(qrCodeData, { width: 320 });
      qrImageHtml = `
        <div class="qr-box">
          <img src="${qrDataUrl}" alt="Escanea con WhatsApp" />
          <p class="instruction">Abre <strong>WhatsApp</strong> &gt; <strong>Ajustes</strong> &gt; <strong>Dispositivos vinculados</strong> &gt; <strong>Vincular un dispositivo</strong></p>
        </div>
      `;
    } catch (e) {
      qrImageHtml = `<p>Error generando imagen QR: ${e.message}</p>`;
    }
  } else if (connectionStatus === 'Conectado') {
    qrImageHtml = `
      <div class="connected-box">
        <div class="icon">✅</div>
        <h2>¡WhatsApp Vinculado y Activo!</h2>
        <p>Conectado como: <strong>${connectedUser || 'Sesión guardada'}</strong></p>
        <p class="subtext">Ya puedes escribirle directamente por WhatsApp para consultar el estado del servidor, errores y logs.</p>
      </div>
    `;
  } else {
    qrImageHtml = `
      <div class="waiting-box">
        <p>Generando código de vinculación... Recarga la página en unos segundos.</p>
      </div>
    `;
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Homelab Assistant - WhatsApp QR</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 24px;
          padding: 32px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }
        h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #38bdf8; }
        .status {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 24px;
          background: #0284c7;
          color: white;
        }
        .status.connected { background: #16a34a; }
        .qr-box img { border-radius: 16px; border: 4px solid white; margin-bottom: 16px; }
        .instruction { font-size: 13px; color: #94a3b8; line-height: 1.5; }
        .instruction strong { color: #f1f5f9; }
        .connected-box .icon { font-size: 48px; margin-bottom: 12px; }
        .connected-box h2 { font-size: 18px; margin: 0 0 8px 0; color: #4ade80; }
        .connected-box p { font-size: 13px; color: #cbd5e1; }
        .connected-box .subtext { font-size: 12px; color: #64748b; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🍓 Homelab AI WhatsApp Assistant</h1>
        <div class="status ${connectionStatus === 'Conectado' ? 'connected' : ''}">${connectionStatus}</div>
        ${qrImageHtml}
      </div>
    </body>
    </html>
  `);
});

// API endpoint to check health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connection: connectionStatus,
    user: connectedUser,
    hasQr: Boolean(qrCodeData)
  });
});

// Helper handler for resetting session cleanly
function handleReset(req, res) {
  try {
    if (sock) {
      try { sock.end(new Error('Reset requested')); } catch (e) {}
      sock = null;
    }
    clearAuthDir();
    qrCodeData = null;
    connectedUser = null;
    connectionStatus = 'Sesión reseteada. Generando nuevo QR...';
    setTimeout(startWhatsApp, 1500);
    if (req.method === 'GET') {
      res.redirect('/');
    } else {
      res.json({ status: 'ok', message: 'Sesión reiniciada limpiamente. Recarga para escanear.' });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

// Reset endpoints (both GET for browser click and POST for API)
app.get('/reset', handleReset);
app.post('/api/reset', handleReset);

// Direct test endpoint
app.post('/api/ask', async (req, res) => {
  const query = req.body.query || '¿Cómo va todo en el servidor?';
  const { summary } = await buildServerAuditContext();
  const answer = await askOllama(query, summary);
  res.json({ query, answer });
});

// ==========================================
// Baileys WhatsApp Connection Manager
// ==========================================
async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Homelab-Pi5', 'Chrome', '120.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeData = qr;
      connectionStatus = 'Esperando escaneo de código QR';
      console.log('[WhatsApp] Nuevo código QR generado. Abre http://192.168.1.45:' + PORT);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const shouldReconnect = !isLoggedOut;
      connectionStatus = `Desconectado (${statusCode || 'reintentando'})`;
      connectedUser = null;
      qrCodeData = null;
      console.log(`[WhatsApp] Conexión cerrada (status ${statusCode}). ¿Reconectar?: ${shouldReconnect}`);

      if (isLoggedOut) {
        console.log('[WhatsApp] Sesión cerrada remotamente (logged out). Limpiando credenciales antiguas...');
        clearAuthDir();
        // Reiniciar para generar un nuevo código QR limpio
        setTimeout(startWhatsApp, 2000);
      } else if (shouldReconnect) {
        setTimeout(startWhatsApp, 3000);
      }
    } else if (connection === 'open') {
      connectionStatus = 'Conectado';
      qrCodeData = null;
      connectedUser = sock.user?.id || 'Usuario vinculado';
      console.log('[WhatsApp] ¡Conexión establecida con éxito como:', connectedUser);

      // Enviar automáticamente mensaje de prueba y bienvenida al vincular
      setTimeout(async () => {
        try {
          const myPhone = (sock.user?.id || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
          if (myPhone) {
            const welcomeJid = `${myPhone}@s.whatsapp.net`;
            const welcomeMsg = `🍓 *¡Homelab Assistant Conectado!*\n\n` +
              `Estoy activo y monitorizando tu Raspberry Pi 5 con IA local (Ollama).\n\n` +
              `Pruébame respondiendo a este mensaje con:\n` +
              `• *!status* (ver contenedores)\n` +
              `• *!logs* (ver errores recientes)\n` +
              `• O pregúntame: *¿cómo va el servidor?*`;
            const sent = await sock.sendMessage(welcomeJid, { text: welcomeMsg });
            if (sent?.key?.id) recordSentMsg(sent.key.id);
            console.log(`[WhatsApp] Mensaje de bienvenida enviado con éxito a ${welcomeJid}`);
          }
        } catch (err) {
          console.error('[WhatsApp] Error enviando bienvenida inicial:', err);
        }
      }, 2000);
    }
  });

  // Listener de mensajes entrantes
  sock.ev.on('messages.upsert', async (m) => {
    if (!m.messages || m.messages.length === 0) return;

    for (const msg of m.messages) {
      if (!msg || !msg.message) continue;

      // Si el mensaje fue enviado por el bot, ignorar para evitar bucles
      if (sentByBotMsgIds.has(msg.key.id)) {
        sentByBotMsgIds.delete(msg.key.id);
        continue;
      }

      const sender = msg.key.remoteJid;
      if (!sender) continue;

      // =========================================================================
      // REGLA CRÍTICA DE SEGURIDAD (Zero-Leakage):
      // El asistente SOLO y EXCLUSIVAMENTE responderá en el chat personal del
      // propio usuario consigo mismo (self-chat / "Mensajes guardados" / "Tú").
      //
      // NUNCA responder a ningún grupo (@g.us).
      // NUNCA responder a ningún contacto externo.
      // NUNCA responder a canales (@newsletter) o listas de difusión (@broadcast).
      // =========================================================================
      const myJid = sock.user?.id || sock.authState?.creds?.me?.id || '';
      const myLid = sock.user?.lid || sock.authState?.creds?.me?.lid || '';
      if (!isAllowedSelfChatSender(sender, myJid, myLid)) {
        continue;
      }

      const cleanText = extractMessageText(msg).trim();
      if (!cleanText) continue;

      // Salvaguarda adicional anti-bucle: ignorar mensajes generados por el bot
      if (isBotSelfEchoText(cleanText)) {
        continue;
      }

      console.log(`[WhatsApp Seguro] Mensaje en chat personal recibido: "${cleanText}"`);

      // Destinatario: responder exactamente en la misma conversación activa (JID o LID)
      const targetJid = sender;

      // Mostrar estado "escribiendo..." en WhatsApp
      await sock.sendPresenceUpdate('composing', targetJid);

      try {
        let reply = '';

        if (cleanText.toLowerCase() === '!status') {
          const { running, exited } = await getContainersStatus();
          reply = `📊 *ESTADO HOMELAB RASPBERRY PI 5*\n\n` +
            `🟢 *Contenedores Activos (${running.length}):*\n` +
            running.map((r) => `• ${r.name}`).join('\n') +
            (exited.length > 0 ? `\n\n🔴 *Detenidos (${exited.length}):*\n` + exited.map((e) => `• ${e.name}`).join('\n') : '');
        } else if (cleanText.toLowerCase() === '!logs') {
          const errors = await getErrorsSummary();
          if (errors.length === 0) {
            reply = `✅ *AUDITORÍA DE LOGS*\n\nNo se han detectado errores en las aplicaciones en ejecución.`;
          } else {
            reply = `⚠️ *ERRORES RECIENTES EN LOGS*\n\n` +
              errors.map((e) => `*${e.app}* (${e.errorCount} incidencias):\n${e.recentSamples.map((s) => `• \`${s.slice(0, 100)}\``).join('\n')}`).join('\n\n');
          }
        } else if (cleanText.toLowerCase() === '!informe' || cleanText.toLowerCase() === '!report') {
          reply = await generateDailyReport();
        } else if (cleanText.toLowerCase() === '!ayuda' || cleanText.toLowerCase() === '!help') {
          reply = `🤖 *ASISTENTE INTELIGENTE HOMELAB*\n\n` +
            `Puedes preguntarme lo que quieras en lenguaje natural o usar estos comandos rápidos:\n` +
            `• *!status*: Lista contenedores activos y parados.\n` +
            `• *!logs*: Resumen de errores recientes en RFFM y CAVA.\n` +
            `• *!informe*: Genera el análisis e informe diario con IA ahora mismo.\n` +
            `• *Preguntas libres*: Escríbeme "¿cómo va el servidor?", "¿hay algún problema con la base de datos?", etc.`;
        } else {
          // Consulta inteligente a Ollama con contexto de logs y contenedores
          const { summary } = await buildServerAuditContext();
          const ollamaAnswer = await askOllama(cleanText, summary);
          reply = `🍓 *[Homelab AI]*\n\n${ollamaAnswer}`;
        }

        const sent = await sock.sendMessage(targetJid, { text: reply });
        if (sent?.key?.id) {
          recordSentMsg(sent.key.id);
        }
      } catch (err) {
        console.error('[WhatsApp] Error al procesar mensaje:', err);
        const sentErr = await sock.sendMessage(targetJid, {
          text: `⚠️ Ocurrió un error al procesar tu solicitud: ${err.message}`
        });
        if (sentErr?.key?.id) {
          recordSentMsg(sentErr.key.id);
        }
      } finally {
        await sock.sendPresenceUpdate('paused', targetJid);
      }
    }
  });
}

function extractMessageText(msg) {
  if (!msg || !msg.message) return '';
  let m = msg.message;
  if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
  if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
  if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
  if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  );
}

// Iniciar servidor web y conexión de WhatsApp
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP] Panel de vinculación QR corriendo en http://0.0.0.0:${PORT}`);
  startWhatsApp().catch((err) => console.error('[WhatsApp Init Error]', err));

  // Iniciar programador de informe diario
  initDailyReportScheduler(
    () => sock,
    () => {
      const myPhone = normalizePhoneNumber(sock?.user?.id || sock?.authState?.creds?.me?.id);
      return myPhone ? `${myPhone}@s.whatsapp.net` : null;
    },
    recordSentMsg
  );
});

