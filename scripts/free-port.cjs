const { execSync } = require("child_process");

try {
  if (process.platform === "win32") {
    // Find PIDs listening on port 5173
    const output = execSync("netstat -ano -p tcp", { encoding: "utf8" });
    const lines = output.split("\n");
    const pids = new Set();
    for (const line of lines) {
      if (line.includes(":5173") && line.includes("LISTENING")) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0" && pid !== String(process.pid)) {
          pids.add(pid);
        }
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log(`[SpoPlayer] Puerto 5173 liberado (PID ${pid})`);
      } catch {}
    }
  }
} catch {}
