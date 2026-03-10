import { scrapeChisenhale } from "./adapters/chisenhale";
import { scrapeBachataCommunity } from "./adapters/bachata-community";
import { scrapeCiCalendarLondon } from "./adapters/ci-calendar";
import { scrapeRambert } from "./adapters/rambert";
import { scrapeEcstaticDanceLondon } from "./adapters/ecstatic-dance-london";
import { scrapeFiveRhythmsLondon } from "./adapters/five-rhythms-london";
import { scrapeSiobhanDavies } from "./adapters/siobhan-davies";
import { scrapeThePlace } from "./adapters/the-place";
import { scrapeTripSpace } from "./adapters/trip-space";
import { scrapeSuperMarioSalsa } from "./adapters/supermario-salsa";
import { scrapeSalsaRuedaRuedaLibre } from "./adapters/salsa-rueda-rueda-libre";
import { scrapeCubaneando } from "./adapters/cubaneando";
import { scrapeButohMutation } from "./adapters/butoh-mutation";
import { scrapePosthumanTheatreButoh } from "./adapters/posthuman-theatre-butoh";
import { scrapeHackneyBaths } from "./adapters/hackney-baths";
import { scrapeWednesdayMoving } from "./adapters/wednesday-moving";
import { scrapeLuminousDance } from "./adapters/luminous-dance";
import { scrapeDanceworks } from "./adapters/danceworks";
import { scrapePineappleDanceStudios } from "./adapters/pineapple-dance-studios";
import { scrapeBaseDanceStudios } from "./adapters/base-dance-studios";
import { scrapeSalsaSoho } from "./adapters/salsa-soho";
import { scrapeBarSalsaTemple } from "./adapters/bar-salsa-temple";
import { scrapeMamboCity } from "./adapters/mambo-city";
import { scrapeCityAcademy } from "./adapters/city-academy";
import { scrapeAdrianOutsavvy } from "./adapters/adrian-outsavvy";
import { scrapeLookAtMovement } from "./adapters/look-at-movement";
import { scrapeTheManorMvmt } from "./adapters/the-manor-mvmt";
import { scrapeEastLondonDance } from "./adapters/east-london-dance";
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
    scrapeLuminousDance(),
    scrapeFiveRhythmsLondon(),
    scrapeSuperMarioSalsa(),
    scrapeSalsaRuedaRuedaLibre(),
    scrapeCubaneando(),
    scrapeButohMutation(),
    scrapePosthumanTheatreButoh(),
    scrapeHackneyBaths(),
    scrapeWednesdayMoving(),
    scrapeDanceworks(),
    scrapePineappleDanceStudios(),
    scrapeBaseDanceStudios(),
    scrapeSalsaSoho(),
    scrapeBarSalsaTemple(),
    scrapeMamboCity(),
    scrapeCityAcademy(),
    scrapeAdrianOutsavvy(),
    scrapeLookAtMovement(),
    scrapeTheManorMvmt(),
    scrapeEastLondonDance()
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
