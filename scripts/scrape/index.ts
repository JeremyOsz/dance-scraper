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
import { scrapeMarinaSfyridi } from "./adapters/marina-sfyridi";
import { scrapeLookAtMovement } from "./adapters/look-at-movement";
import { scrapeTheManorMvmt } from "./adapters/the-manor-mvmt";
import { scrapeEastLondonDance } from "./adapters/east-london-dance";
import { scrapeConTumbaoSalsa } from "./adapters/con-tumbao-salsa";
import { scrapeUnderTheSunDance } from "./adapters/under-the-sun-dance";
import { scrapeBalletForYou } from "./adapters/ballet-for-you";
import { scrapeFieldworksDance } from "./adapters/fieldworks-dance";
import type { VenueKey } from "../../lib/types";
import { VENUES } from "../../lib/venues";
import { buildOutput, writeOutput } from "./normalize";
import {
  formatCliHelp,
  mergeOutputWithPrevious,
  parseScrapeCliArgs,
  readPreviousOutput,
  resolveForcedVenueKeys,
  selectVenueKeys,
  type ScraperDefinition
} from "./cli";

const SCRAPERS: ScraperDefinition[] = [
  { key: "thePlace", scrape: scrapeThePlace },
  { key: "rambert", scrape: scrapeRambert },
  { key: "siobhanDavies", scrape: scrapeSiobhanDavies },
  { key: "tripSpace", scrape: scrapeTripSpace },
  { key: "chisenhaleDanceSpace", scrape: scrapeChisenhale },
  { key: "ciCalendarLondon", scrape: scrapeCiCalendarLondon },
  { key: "bachataCommunity", scrape: scrapeBachataCommunity },
  { key: "ecstaticDanceLondon", scrape: scrapeEcstaticDanceLondon },
  { key: "luminousDance", scrape: scrapeLuminousDance },
  { key: "fiveRhythmsLondon", scrape: scrapeFiveRhythmsLondon },
  { key: "superMarioSalsa", scrape: scrapeSuperMarioSalsa },
  { key: "salsaRuedaRuedaLibre", scrape: scrapeSalsaRuedaRuedaLibre },
  { key: "cubaneando", scrape: scrapeCubaneando },
  { key: "butohMutation", scrape: scrapeButohMutation },
  { key: "posthumanTheatreButoh", scrape: scrapePosthumanTheatreButoh },
  { key: "hackneyBaths", scrape: scrapeHackneyBaths },
  { key: "wednesdayMoving", scrape: scrapeWednesdayMoving },
  { key: "danceworks", scrape: scrapeDanceworks },
  { key: "pineappleDanceStudios", scrape: scrapePineappleDanceStudios },
  { key: "baseDanceStudios", scrape: scrapeBaseDanceStudios },
  { key: "salsaSoho", scrape: scrapeSalsaSoho },
  { key: "barSalsaTemple", scrape: scrapeBarSalsaTemple },
  { key: "mamboCity", scrape: scrapeMamboCity },
  { key: "cityAcademy", scrape: scrapeCityAcademy },
  { key: "adrianOutsavvy", scrape: scrapeAdrianOutsavvy },
  { key: "marinaSfyridi", scrape: scrapeMarinaSfyridi },
  { key: "lookAtMovement", scrape: scrapeLookAtMovement },
  { key: "theManorMvmt", scrape: scrapeTheManorMvmt },
  { key: "eastLondonDance", scrape: scrapeEastLondonDance },
  { key: "conTumbaoSalsa", scrape: scrapeConTumbaoSalsa },
  { key: "underTheSunDance", scrape: scrapeUnderTheSunDance },
  { key: "balletForYou", scrape: scrapeBalletForYou },
  { key: "fieldworksDance", scrape: scrapeFieldworksDance }
];

async function main() {
  const started = Date.now();
  const options = parseScrapeCliArgs(process.argv.slice(2));
  const allVenueKeys = SCRAPERS.map(({ key }) => key);

  if (options.showHelp) {
    console.log(formatCliHelp(allVenueKeys));
    return;
  }

  const previousOutput = readPreviousOutput();
  const venueNameByKey = Object.fromEntries(allVenueKeys.map((key) => [key, VENUES[key].label])) as Record<
    VenueKey,
    string
  >;
  const { keys: forcedVenueKeys, unknownTokens } = resolveForcedVenueKeys(options.forceVenueTokens, venueNameByKey);
  if (unknownTokens.length > 0) {
    throw new Error(`Unknown forced venue(s): ${unknownTokens.join(", ")}\n\n${formatCliHelp(allVenueKeys)}`);
  }

  const selectedVenueKeys = selectVenueKeys(allVenueKeys, previousOutput, options, forcedVenueKeys);
  const selectedScrapers = SCRAPERS.filter(({ key }) => selectedVenueKeys.has(key));

  if (selectedScrapers.length === 0) {
    console.log("No venues matched the selected filters. Nothing to scrape.");
    return;
  }

  console.log(`Scraping ${selectedScrapers.length}/${SCRAPERS.length} venues...`);
  const results = await Promise.all(selectedScrapers.map(({ scrape }) => scrape()));

  const freshOutput = buildOutput(results);
  const output = mergeOutputWithPrevious(previousOutput, freshOutput, allVenueKeys);
  writeOutput(output);

  console.log(
    `Generated ${output.sessions.length} sessions after scraping ${results.length} venues in ${Date.now() - started}ms`
  );
  for (const venue of freshOutput.venues) {
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
