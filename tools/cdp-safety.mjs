import { readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { tmpdir } from "node:os";
export function installCdpSafetyGuard() {
  const originalFetch = globalThis.fetch, checked = new Set();
  async function verify(origin) {
    const profile = process.env.TABULOUS_TEST_PROFILE, build = process.env.TABULOUS_TEST_EXTENSION;
    if (!profile || !build) throw new Error("Native tests require npm run test:native:background; refusing an unverified/personal browser.");
    const path = await realpath(profile), temporary = await realpath(tmpdir());
    if (!path.startsWith(temporary + sep) || !path.includes("tabulous-native-")) throw new Error("Disposable profile must be inside the launcher-created temporary directory");
    const marker = JSON.parse(await readFile(resolve(path, ".tabulous-disposable-profile.json"), "utf8"));
    if (marker.mode !== "headless" || await realpath(marker.extension) !== await realpath(build)) throw new Error("Invalid disposable test profile marker");
    const response = await originalFetch(origin + "/json/version", { signal: AbortSignal.timeout(5000) });
    const version = await response.json(), socket = new WebSocket(version.webSocketDebuggerUrl);
    try {
      const args = await new Promise((accept, reject) => {
        const timer = setTimeout(() => reject(new Error("Cannot verify browser command line")), 5000);
        socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Cannot connect to disposable browser")); }, { once: true });
        socket.addEventListener("open", () => socket.send(JSON.stringify({ id: 1, method: "Browser.getBrowserCommandLine" })), { once: true });
        socket.addEventListener("message", ({ data }) => { const result = JSON.parse(String(data)); if (result.id !== 1) return; clearTimeout(timer); result.error ? reject(new Error("Browser command line unavailable")) : accept(result.result.arguments); });
      });
      if (!args.some(a => /^--headless(?:=|$)/.test(a)) || await realpath((args.find(a => a.startsWith("--user-data-dir=")) || "").slice(16)) !== path) throw new Error("Refusing non-headless or mismatched Chrome profile");
      if (!args.includes("--enable-automation")) throw new Error("Automation browser required");
    } finally { socket.close(); }
  }
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === "string" ? input : input.url || String(input));
    if (["127.0.0.1", "localhost"].includes(url.hostname) && /^\/json(?:\/|$)/.test(url.pathname) && !checked.has(url.origin)) {
      await verify(url.origin); checked.add(url.origin);
    }
    return originalFetch(input, options);
  };
}
