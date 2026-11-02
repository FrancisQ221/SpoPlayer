import type { MainNetResult } from "../../../../electron/netdiag";
import type { DiagCheck } from "./diagnostics";
import type { FailureEntry } from "../store/connectivityStore";
import { APP_VERSION } from "@/shared/config/version";

export interface OfflineDump {
  generatedAt: string;
  app: {
    version: string;
    platform: string;
    userAgent: string;
    language: string;
    onLine: boolean;
  };
  endpoints: { api: string; covers: string; link: string };
  summary: { ok: number; fail: number; total: number };
  checks: DiagCheck[];
  failures: FailureEntry[];
  machine: MainNetResult | null;
}

// everything support needs and nothing they don't: routes and timings,
// never tokens, headers, bodies or proxy credentials.
export function buildOfflineDump(input: {
  checks: DiagCheck[];
  failures: FailureEntry[];
  main: MainNetResult | null;
  endpoints: { api: string; covers: string; link: string };
}): OfflineDump {
  const ok = input.checks.filter((c) => c.status === "ok").length;
  const fail = input.checks.filter((c) => c.status === "fail").length;
  return {
    generatedAt: new Date().toISOString(),
    app: {
      // VITE_CLIENT_VERSION is never set by the release build, so every dump said "dev"
      version: APP_VERSION,
      platform: typeof navigator !== "undefined" ? navigator.platform : "unknown",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      language: typeof navigator !== "undefined" ? navigator.language : "unknown",
      onLine: typeof navigator !== "undefined" ? navigator.onLine : true,
    },
    endpoints: input.endpoints,
    summary: { ok, fail, total: input.checks.length },
    checks: input.checks,
    failures: input.failures,
    machine: input.main,
  };
}

function humanExplainStatus(status: number | undefined): string {
  if (status === undefined) return "Sin respuesta del servidor.";
  if (status === 0) return "No se recibió respuesta (tiempo de espera agotado o conexión cancelada).";
  if (status === 400) return "Petición incorrecta o parámetros no válidos (Error 400).";
  if (status === 401 || status === 403) return "Permiso denegado o sesión expirada (Error 401/403).";
  if (status === 404) return "El recurso solicitado no fue encontrado en el servidor (Error 404).";
  if (status === 408) return "Tiempo de espera agotado al conectar con el servidor (Error 408).";
  if (status === 429) return "Demasiadas peticiones consecutivas (Error 429).";
  if (status >= 500 && status < 600) {
    return `Error en el servidor remoto (${status}). El servicio está experimentando problemas o mantenimiento; no es un problema de tu dispositivo.`;
  }
  return `Código de respuesta HTTP ${status}.`;
}

function humanCheckTitle(id: DiagCheck["id"]): string {
  switch (id) {
    case "device":
      return "Conexión a la red local / Wi-Fi";
    case "api":
      return "Servidor principal de música y API";
    case "covers":
      return "Servidor de imágenes y portadas de álbumes";
    case "link":
      return "Servicio de enlaces compartidos";
    case "dns":
      return "Resolución de nombres (DNS)";
    case "tcp":
      return "Conexión directa por puerto (TCP)";
    case "tls":
      return "Cifrado y certificados de seguridad (SSL/TLS)";
    case "control":
      return "Prueba de comprobación de control";
    case "trace":
      return "Ruta de red hacia el servidor (Traceroute)";
    case "platform":
      return "Información de la plataforma";
    default:
      return "Prueba de diagnóstico general";
  }
}

function humanCheckExplanation(check: DiagCheck): string {
  const isOk = check.status === "ok";
  const latency = check.latencyMs ? ` (Tiempo de respuesta: ${check.latencyMs} ms)` : "";
  const detail = check.detail ? ` [Detalle técnico: ${check.detail}]` : "";

  switch (check.id) {
    case "device":
      return isOk
        ? "✓ Tu equipo detecta una conexión a Internet activa."
        : "✗ El sistema operativo reporta que NO hay conexión a Internet. Verifica el cable de red o la señal Wi-Fi.";
    case "api":
      return isOk
        ? `✓ El servidor de SpoPlayer responde con normalidad.${latency}`
        : `✗ No se pudo conectar con el servidor principal. Podría estar temporalmente caído o bloqueado.${detail}`;
    case "covers":
      return isOk
        ? `✓ El servicio de portadas responde correctamente.${latency}`
        : `✗ Las portadas de los álbumes no se pueden descargar en este momento.${detail}`;
    case "link":
      return isOk
        ? `✓ El servicio de compartir música funciona correctamente.${latency}`
        : `✗ El servicio de enlaces compartidos no respondió.${detail}`;
    case "dns":
      return isOk
        ? `✓ La dirección de ${check.host ?? "los servidores"} se resolvió sin problemas.${latency}`
        : `✗ Tu proveedor de Internet o router no pudo encontrar la dirección de ${check.host ?? "los servidores"}. Suele solucionarse configurando DNS públicos (como 1.1.1.1 o 8.8.8.8).`;
    case "tcp":
      return isOk
        ? `✓ Conexión establecida correctamente con ${check.host ?? "el servidor"}.${latency}`
        : `✗ No se pudo abrir la conexión con ${check.host ?? "el servidor"}. Es posible que un firewall, antivirus o VPN esté interfiriendo.`;
    case "tls":
      return isOk
        ? `✓ Conexión segura y cifrada verificada con ${check.host ?? "el servidor"}.${latency}`
        : `✗ El certificado de seguridad de ${check.host ?? "el servidor"} fue rechazado o está siendo interceptado.`;
    case "control":
      return isOk
        ? `✓ Comprobación de control superada.${latency}`
        : `✗ Comprobación de control no superada.${detail}`;
    case "trace":
      return isOk
        ? `✓ Ruta de red completa hasta el servidor.${detail}`
        : `✗ La ruta hacia el servidor tuvo interrupciones.${detail}`;
    case "platform":
      return `Información del entorno: ${check.detail ?? "Estándar"}`;
    default:
      return isOk
        ? `✓ Comprobación superada.${latency}${detail}`
        : `✗ Comprobación no superada.${detail}`;
  }
}

export function formatHumanReport(dump: OfflineDump): string {
  const line = "================================================================================";
  const subline = "--------------------------------------------------------------------------------";
  const now = new Date(dump.generatedAt);
  const formattedDate = `${now.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })} a las ${now.toLocaleTimeString("es-ES")}`;

  const allOk = dump.summary.fail === 0;
  const generalStatus = allOk
    ? "ESTADO GENERAL: EXCELENTE (Todos los servicios funcionan correctamente)"
    : `ESTADO GENERAL: ATENCIÓN (Se detectaron ${dump.summary.fail} fallos de conexión)`;

  let report = "";
  report += `${line}\n`;
  report += `                  SPOPLAYER - INFORME DE CONECTIVIDAD\n`;
  report += `${line}\n\n`;

  report += `Fecha y hora    : ${formattedDate}\n`;
  report += `Versión de App  : SpoPlayer v${dump.app.version}\n`;
  report += `Plataforma      : ${dump.app.platform}\n`;
  report += `Conexión local  : ${dump.app.onLine ? "Activa (En línea)" : "Desconectada (Sin red)"}\n\n`;

  report += `${subline}\n`;
  report += `1. RESUMEN DEL DIAGNÓSTICO\n`;
  report += `${subline}\n`;
  report += `${generalStatus}\n`;
  report += `• Pruebas exitosas  : ${dump.summary.ok} de ${dump.summary.total}\n`;
  report += `• Pruebas con fallo : ${dump.summary.fail}\n\n`;

  report += `${subline}\n`;
  report += `2. ESTADO DE LOS SERVICIOS Y PRUEBAS REALIZADAS\n`;
  report += `${subline}\n`;

  for (const check of dump.checks) {
    const title = humanCheckTitle(check.id);
    const explanation = humanCheckExplanation(check);
    const badge = check.status === "ok" ? "[CORRECTO]" : check.status === "fail" ? "[FALLO]" : "[OMITIDO]";
    report += `${badge} ${title}\n`;
    report += `   ${explanation}\n\n`;
  }

  report += `${subline}\n`;
  report += `3. ERRORES RECIENTES REGISTRADOS EN LA APLICACIÓN\n`;
  report += `${subline}\n`;

  if (!dump.failures || dump.failures.length === 0) {
    report += `No se han registrado errores recientes de red en la app.\n\n`;
  } else {
    report += `Se han registrado los siguientes ${dump.failures.length} eventos:\n\n`;
    dump.failures.forEach((f, idx) => {
      const timeStr = f.at ? new Date(f.at).toLocaleTimeString("es-ES") : "Reciente";
      const latencyStr = f.latencyMs ? ` (tras ${f.latencyMs} ms)` : "";
      report += `[${idx + 1}] A las ${timeStr} - ${f.method} ${f.path}${latencyStr}\n`;
      report += `    Motivo: ${humanExplainStatus(f.status)}\n\n`;
    });
  }

  report += `${subline}\n`;
  report += `4. ¿CÓMO SOLUCIONARLO? (RECOMENDACIONES PRÁCTICAS)\n`;
  report += `${subline}\n`;

  if (allOk) {
    report += `• Tu conexión y los servidores de SpoPlayer están funcionando al 100%.\n`;
    report += `• Si una canción específica no reproduce, puede que el archivo original no esté disponible temporalmente.\n`;
    report += `• Recuerda que puedes guardar canciones para escucharlas sin conexión en la pestaña "Descargas".\n`;
  } else {
    report += `Te sugerimos seguir estos pasos según el tipo de fallo:\n\n`;
    if (!dump.app.onLine) {
      report += `1. Sin conexión local:\n`;
      report += `   Verifica que tu cable de red esté conectado o que tu conexión Wi-Fi tenga acceso a internet.\n\n`;
    }
    const hasDnsFail = dump.checks.some((c) => c.id === "dns" && c.status === "fail");
    if (hasDnsFail) {
      report += `2. Fallo de DNS:\n`;
      report += `   Tu red no puede resolver las direcciones de los servidores. Cambia los servidores DNS de tu adaptador de red a Cloudflare (1.1.1.1) o Google (8.8.8.8).\n\n`;
    }
    const hasTcpOrTlsFail = dump.checks.some((c) => (c.id === "tcp" || c.id === "tls") && c.status === "fail");
    if (hasTcpOrTlsFail) {
      report += `3. Bloqueo de red, VPN o Firewall:\n`;
      report += `   Si tienes una VPN activa, prueba desconectarla temporalmente. Asegúrate de que el firewall o antivirus no esté bloqueando SpoPlayer.\n\n`;
    }
    const hasApiFail = dump.checks.some((c) => c.id === "api" && c.status === "fail");
    if (hasApiFail) {
      report += `4. Servidor en mantenimiento:\n`;
      report += `   Si el servidor principal está caído, suele ser un mantenimiento momentáneo. Intenta nuevamente en unos minutos.\n\n`;
    }
    report += `5. Modo Música Offline:\n`;
    report += `   Recuerda que todas las canciones y playlists que hayas descargado se pueden reproducir sin conexión a datos móviles o Wi-Fi desde la sección "Descargas" de tu biblioteca.\n`;
  }

  report += `\n${line}\n`;
  report += `                 SpoPlayer - Música sin límites ni interrupciones\n`;
  report += `${line}\n`;

  return report;
}

export function dumpFilename(dump: OfflineDump): string {
  return `spoplayer-diagnostico-red-${dump.generatedAt.replace(/[:.]/g, "-")}.txt`;
}

export interface SaveDumpResult {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
}

export async function downloadDump(dump: OfflineDump): Promise<SaveDumpResult> {
  const content = formatHumanReport(dump);
  const filename = dumpFilename(dump);

  // use native save dialog in electron to track exact save destination
  if (typeof window !== "undefined" && window.spoplayerElectron?.saveDump) {
    try {
      const res = await window.spoplayerElectron.saveDump({ filename, content });
      return { success: res.success, filePath: res.filePath, canceled: res.canceled, error: res.error };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  // web fallback with synthetic anchor download
  try {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function copyDump(dump: OfflineDump): Promise<boolean> {
  try {
    const content = formatHumanReport(dump);
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    return false;
  }
}
