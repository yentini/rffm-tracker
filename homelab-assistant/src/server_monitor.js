/**
 * Server Monitor: Queries Dokploy API to audit running containers and evaluate application logs.
 */

const DOKPLOY_URL = process.env.DOKPLOY_URL || 'http://192.168.1.45:3000';
const DOKPLOY_API_KEY = process.env.DOKPLOY_API_KEY || 'cavapqVLLUEWXHVwtkEtpSFvmueqfDOsWOHRrTfOWGpSMropkgtxwXIxydeQFhDaSCAK';

// Known applications to monitor
const MONITORED_APPS = [
  { name: 'RFFM Backend', id: 'vfTXCfEZZihDnAT0KxoUe' },
  { name: 'RFFM Frontend', id: 'PIVnWoTNdyR5DV1QHEW_h' },
  { name: 'CAVA Backend', id: 'ufgDk1PgIMXOSC-4WL-4O' },
  { name: 'CAVA Frontend', id: 'byaCBRg0DfPS6HnQnpaQx' }
];

async function fetchDokployTrpc(procedure, inputObj = {}) {
  const encodedInput = encodeURIComponent(JSON.stringify({ json: inputObj }));
  const url = `${DOKPLOY_URL.replace(/\/$/, '')}/api/trpc/${procedure}?input=${encodedInput}`;
  const options = {
    method: 'GET',
    headers: {
      'x-api-key': DOKPLOY_API_KEY,
      'Accept': 'application/json'
    }
  };

  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Dokploy tRPC ${procedure} failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.result?.data?.json;
}

/**
 * Get running/exited state of all containers
 */
async function getContainersStatus() {
  try {
    const containers = (await fetchDokployTrpc('docker.getContainers', {})) || [];
    const running = [];
    const exited = [];

    for (const c of containers) {
      const name = c.name || (c.Names && c.Names[0]) || 'unknown';
      const state = c.state || c.State || 'unknown';
      const status = c.status || c.Status || '';

      if (state === 'running') {
        running.push({ name, status });
      } else {
        exited.push({ name, status });
      }
    }

    return { running, exited, total: containers.length };
  } catch (err) {
    console.error('[Monitor] Error fetching containers:', err.message);
    return { running: [], exited: [], error: err.message };
  }
}

/**
 * Scan logs of monitored applications for errors, tracebacks, and 5xx responses.
 */
async function getErrorsSummary() {
  const issues = [];

  for (const app of MONITORED_APPS) {
    try {
      const logsRaw = await fetchDokployTrpc('application.readLogs', { applicationId: app.id });
      const logsText = typeof logsRaw === 'string' ? logsRaw : JSON.stringify(logsRaw || '');

      // Search for error patterns
      const lines = logsText.split('\n');
      const errorLines = lines.filter((line) => {
        const lower = line.toLowerCase();
        return (
          lower.includes('traceback') ||
          lower.includes('critical') ||
          lower.includes('exception') ||
          lower.includes('502 bad gateway') ||
          lower.includes('500 internal')
        );
      });

      if (errorLines.length > 0) {
        // Deduplicate and get recent distinct issues
        const uniqueErrors = Array.from(new Set(errorLines.map((l) => l.trim().slice(0, 150))));
        issues.push({
          app: app.name,
          errorCount: errorLines.length,
          recentSamples: uniqueErrors.slice(-3)
        });
      }
    } catch (err) {
      // Ignorar apps que no tengan logs aún
    }
  }

  return issues;
}

/**
 * Build a concise context summary for Ollama
 */
async function buildServerAuditContext() {
  const [containers, errors] = await Promise.all([
    getContainersStatus(),
    getErrorsSummary()
  ]);

  let summary = `ESTADO DEL SERVIDOR (Raspberry Pi 5 Homelab):\n`;
  summary += `- Contenedores activos: ${containers.running.length}\n`;
  for (const r of containers.running.slice(0, 8)) {
    summary += `  • ${r.name}: ${r.status}\n`;
  }

  if (containers.exited.length > 0) {
    summary += `- Contenedores detenidos/salidos: ${containers.exited.length}\n`;
    for (const e of containers.exited.slice(0, 5)) {
      summary += `  • ${e.name} (${e.status})\n`;
    }
  }

  summary += `\nAUDITORÍA DE LOGS DE APLICACIONES:\n`;
  if (errors.length === 0) {
    summary += `No se detectaron errores graves en las aplicaciones activas (RFFM y CAVA operando con normalidad).\n`;
  } else {
    for (const iss of errors) {
      summary += `App: ${iss.app} (${iss.errorCount} líneas de error detectadas)\n`;
      for (const sample of iss.recentSamples) {
        summary += `  - ${sample}\n`;
      }
    }
  }

  return { summary, containers, errors };
}

module.exports = {
  getContainersStatus,
  getErrorsSummary,
  buildServerAuditContext
};

