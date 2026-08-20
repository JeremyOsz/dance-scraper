import { performance } from "node:perf_hooks";

process.env.NODE_ENV = "production";

function measure<T>(name: string, operation: () => T) {
  const cpuStart = process.cpuUsage();
  const wallStart = performance.now();
  const value = operation();
  const cpu = process.cpuUsage(cpuStart);
  return {
    name,
    value,
    wallMs: Number((performance.now() - wallStart).toFixed(2)),
    cpuMs: Number(((cpu.user + cpu.system) / 1_000).toFixed(2))
  };
}

async function main() {
  const { readScrapeOutput } = await import("../lib/data-store");
  const { getLocationProfiles } = await import("../lib/locations");
  const firstRead = measure("dataset first read", readScrapeOutput);
  const cachedRead = measure("dataset cached read", readScrapeOutput);
  const firstProfiles = measure("location profiles first derivation", () => getLocationProfiles(firstRead.value));
  const cachedProfiles = measure("location profiles cached derivation", () => getLocationProfiles(firstRead.value));

  if (firstRead.value !== cachedRead.value || firstProfiles.value !== cachedProfiles.value) {
    throw new Error("Runtime data caches did not reuse their results");
  }

  console.table([firstRead, cachedRead, firstProfiles, cachedProfiles].map(({ name, wallMs, cpuMs }) => ({ name, wallMs, cpuMs })));
  console.log(`sessions=${firstRead.value.sessions.length} locations=${firstProfiles.value.length}`);
}

void main();
