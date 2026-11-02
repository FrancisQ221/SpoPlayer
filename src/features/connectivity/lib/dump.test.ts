import { describe, expect, it, vi } from "vitest";
import { buildOfflineDump, dumpFilename, formatHumanReport } from "./dump";

describe("buildOfflineDump", () => {
  it("packs checks, failures and machine results without secrets", () => {
    const dump = buildOfflineDump({
      checks: [
        { id: "device", status: "ok", detail: "online" },
        { id: "dns", host: "api.spoplayer.app", status: "ok", detail: "1.2.3.4", latencyMs: 12 },
      ],
      failures: [{ at: 123, method: "GET", path: "/v1/me", status: 0, latencyMs: 5 }],
      main: {
        dns: [],
        tcp: [],
        tls: [],
        controls: [],
        trace: { host: "api.spoplayer.app", ok: true, hops: ["1  1.2.3.4  1ms"], ms: 900 },
        platform: "linux x64",
      },
      endpoints: { api: "https://nmqjoehuyhnwxlcezhuv.supabase.co", covers: "https://nmqjoehuyhnwxlcezhuv.supabase.co", link: "https://link.spoplayer.app" },
    });
    expect(dump.summary).toEqual({ ok: 2, fail: 0, total: 2 });
    expect(dump.app.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(dump.failures).toHaveLength(1);
    expect(dump.machine?.trace?.hops).toHaveLength(1);
    expect(JSON.stringify(dump)).not.toMatch(/bearer|token|authorization|proxy/i);
    expect(dumpFilename(dump)).toMatch(/^spoplayer-diagnostico-red-.*\.txt$/);

    const humanText = formatHumanReport(dump);
    expect(humanText).toContain("SPOPLAYER - INFORME DE CONECTIVIDAD");
    expect(humanText).toContain("1. RESUMEN DEL DIAGNÓSTICO");
    expect(humanText).toContain("2. ESTADO DE LOS SERVICIOS Y PRUEBAS REALIZADAS");
    expect(humanText).toContain("Tu equipo detecta una conexión a Internet activa");
  });

  it("calls electron saveDump when available with human-readable text", async () => {
    const dump = buildOfflineDump({
      checks: [],
      failures: [],
      main: null,
      endpoints: { api: "https://nmqjoehuyhnwxlcezhuv.supabase.co", covers: "https://nmqjoehuyhnwxlcezhuv.supabase.co", link: "https://link.spoplayer.app" },
    });

    const mockSaveDump = vi.fn().mockResolvedValue({
      success: true,
      filePath: "/home/user/Desktop/test-diagnostico.txt",
    });

    (window as any).spoplayerElectron = {
      saveDump: mockSaveDump,
    };

    const { downloadDump } = await import("./dump");
    const result = await downloadDump(dump);

    expect(mockSaveDump).toHaveBeenCalledTimes(1);
    const callArgs = mockSaveDump.mock.calls[0][0];
    expect(callArgs.filename).toMatch(/\.txt$/);
    expect(callArgs.content).toContain("SPOPLAYER - INFORME DE CONECTIVIDAD");
    expect(result.success).toBe(true);
    expect(result.filePath).toBe("/home/user/Desktop/test-diagnostico.txt");

    delete (window as any).spoplayerElectron;
  });
});
