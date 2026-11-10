/**
 * Daily Audit Reporter: Analyzes server logs and container status once a day
 * and sends an executive report directly to WhatsApp.
 */

const { buildServerAuditContext } = require('./server_monitor');
const { askOllama } = require('./ollama_client');

const REPORT_HOUR = parseInt(process.env.DAILY_REPORT_HOUR || '9', 10);
const REPORT_MINUTE = parseInt(process.env.DAILY_REPORT_MINUTE || '0', 10);

/**
 * Generates an executive daily report using Ollama and current server context.
 * @returns {Promise<string>}
 */
async function generateDailyReport() {
  const { summary } = await buildServerAuditContext();
  const prompt = `Por favor, genera un informe diario conciso del estado del homelab Raspberry Pi 5.
Estructura la respuesta de forma clara y atractiva para WhatsApp:
1. Resumen de salud del servidor (contenedores activos y parados).
2. Evaluación de incidencias: si hay errores en RFFM o CAVA, explícalos de forma entendible y no alarmista. Si no hay errores, resalta la estabilidad de los servicios.
3. Recomendación breve de mantenimiento si procede.`;

  const analysis = await askOllama(prompt, summary);
  return `📋 *INFORME DIARIO DEL HOMELAB* 🍓\n\n${analysis}`;
}

/**
 * Starts a background scheduler checking every 30 seconds if it is time to send the daily report.
 * @param {Function} getSocket
 * @param {Function} getTargetJid
 * @param {Function} recordSentMsg
 */
function initDailyReportScheduler(getSocket, getTargetJid, recordSentMsg) {
  let lastSentDate = null;

  setInterval(async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayStr = now.toISOString().slice(0, 10);

    if (
      currentHour === REPORT_HOUR &&
      currentMinute === REPORT_MINUTE &&
      lastSentDate !== todayStr
    ) {
      const sock = getSocket();
      const targetJid = getTargetJid();
      if (!sock || !targetJid) return;

      lastSentDate = todayStr;
      console.log(`[DailyReport] Generando informe diario programado para ${targetJid}...`);
      try {
        const report = await generateDailyReport();
        const sent = await sock.sendMessage(targetJid, { text: report });
        if (sent?.key?.id && recordSentMsg) {
          recordSentMsg(sent.key.id);
        }
        console.log(`[DailyReport] Informe diario enviado con éxito.`);
      } catch (err) {
        console.error(`[DailyReport] Error enviando informe diario:`, err);
      }
    }
  }, 30000);
}

module.exports = {
  generateDailyReport,
  initDailyReportScheduler
};
