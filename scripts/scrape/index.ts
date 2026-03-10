import { scrapeChisenhale } from "./adapters/chisenhale";
import { scrapeBachataCommunity } from "./adapters/bachata-community";
import { scrapeCiCalendarLondon } from "./adapters/ci-calendar";
import { scrapeRambert } from "./adapters/rambert";
import { scrapeEcstaticDanceLondon } from "./adapters/ecstatic-dance-london";
import { scrapeFiveRhythmsLondon } from "./adapters/five-rhythms-london";
import { scrapeSiobhanDavies } from "./adapters/siobhan-davies";
import { scrapeThePlace } from "./adapters/the-place";
import { scrapeTripSpace } from "./adapters/trip-space";
import { buildOutput, writeOutput } from "./normalize";

async function main() {
  const started = Date.now();

  const results = await Promise.all([
    scrapeThePlace(),
    scrapeRambert(),
    scrapeSiobhanDavies(),
    scrapeTripSpace(),
    scrapeChisenhale(),
    scrapeCiCalendarLondon(),
    scrapeBachataCommunity(),
    scrapeEcstaticDanceLondon(),
    scrapeFiveRhythmsLondon()
  ]);

  const output = buildOutput(results);
  writeOutput(output);

  console.log(`Generated ${output.sessions.length} sessions from ${results.length} venues in ${Date.now() - started}ms`);
  for (const venue of output.venues) {
    console.log(`[${venue.ok ? "ok" : "fail"}] ${venue.venue}: ${venue.count}`);
    if (venue.lastError) {
      console.error(`  error: ${venue.lastError}`);
    }
  }

  if (output.sessions.length === 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
