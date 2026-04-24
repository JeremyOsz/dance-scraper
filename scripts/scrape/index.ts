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
import { scrapeCplayCyLinktree } from "./adapters/cplay-cy-linktree";
import { scrapeCustomEvents } from "./adapters/custom-events";
import { scrapeDanielRodriguezEventbrite } from "./adapters/daniel-rodriguez-eventbrite";
import { scrapeRachelMannMarlonWhoHenry } from "./adapters/rachel-mann-marlon-who-henry";
import { scrapeGelNow } from "./adapters/gel-now";
import { scrapeOneSyllable } from "./adapters/one-syllable";
import { scrapeColetHouse } from "./adapters/colet-house";
import { scrapeStudio66 } from "./adapters/studio66";
import type { ScrapeOutput, VenueKey } from "../../lib/types";
import { VENUES } from "../../lib/venues";
import { buildOutput, writeOutput } from "./normalize";
import path from "node:path";
import {
  formatCliHelp,
  mergeOutputWithPrevious,
  parseScrapeCliArgs,
  readPreviousOutput,
  resolveForcedVenueKeys,
  selectVenueKeys,
  type ScraperDefinition
} from "./cli";
import { appendPastArchive } from "./past-archive";
import {
  appendScrapeStatsRun,
  buildVenueChangeStats,
  computeIntervalHoursByVenueKey,
  readScrapeStatsFile
} from "./scrape-stats";

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
  { key: "butohMutations", scrape: scrapeButohMutation },
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
  { key: "fieldworksDance", scrape: scrapeFieldworksDance },
  { key: "cplayCy", scrape: scrapeCplayCyLinktree },
  { key: "danielRodriguezEventbrite", scrape: scrapeDanielRodriguezEventbrite },
  { key: "rachelMannMarlonWhoHenry", scrape: scrapeRachelMannMarlonWhoHenry },
  { key: "gelNow", scrape: scrapeGelNow },
  { key: "oneSyllable", scrape: scrapeOneSyllable },
  { key: "coletHouse", scrape: scrapeColetHouse },
  { key: "studio66", scrape: scrapeStudio66 },
  { key: "customEvents", scrape: scrapeCustomEvents }
];

const HIDDEN_VENUE_KEYS = new Set<VenueKey>(["ecstaticDanceLondon"]);
const HIDDEN_SESSION_TITLE_PATTERNS = [/\bvinyasa\s*flow\b/i];

function applyOutputCuration(output: ScrapeOutput): ScrapeOutput {
  const hiddenVenueLabels = new Set(
    output.venues.filter((venue) => HIDDEN_VENUE_KEYS.has(venue.key)).map((venue) => venue.venue)
  );
  hiddenVenueLabels.add("Ecstatic Dance London");

  const curatedSessions = output.sessions.filter((session) => {
    if (hiddenVenueLabels.has(session.venue)) {
      return false;
    }
    if (HIDDEN_SESSION_TITLE_PATTERNS.some((pattern) => pattern.test(session.title))) {
      return false;
    }
    return true;
  });

  const sessionCountByVenue = new Map<string, number>();
  for (const session of curatedSessions) {
    sessionCountByVenue.set(session.venue, (sessionCountByVenue.get(session.venue) ?? 0) + 1);
  }

  const curatedVenues = output.venues
    .filter((venue) => !HIDDEN_VENUE_KEYS.has(venue.key) && !hiddenVenueLabels.has(venue.venue))
    .map((venue) => ({
      ...venue,
      count: sessionCountByVenue.get(venue.venue) ?? 0
    }));

  return {
    ...output,
    sessions: curatedSessions,
    venues: curatedVenues
  };
}

async function main() {
  const started = Date.now();
  const options = parseScrapeCliArgs(process.argv.slice(2));
  const allVenueKeys = SCRAPERS.map(({ key }) => key);

  if (options.showHelp) {
    console.log(formatCliHelp(allVenueKeys));
    return;
  }

  const previousOutput = readPreviousOutput();
  const dataDir = path.join(process.cwd(), "data");
  const statsPath = path.join(dataDir, "scrape-change-stats.json");
  const venueNameByKey = Object.fromEntries(allVenueKeys.map((key) => [key, VENUES[key].label])) as Record<
    VenueKey,
    string
  >;
  const { keys: forcedVenueKeys, unknownTokens } = resolveForcedVenueKeys(options.forceVenueTokens, venueNameByKey);
  if (unknownTokens.length > 0) {
    throw new Error(`Unknown forced venue(s): ${unknownTokens.join(", ")}\n\n${formatCliHelp(allVenueKeys)}`);
  }

  const statsFile = readScrapeStatsFile(statsPath);
  const intervalHoursByKey = computeIntervalHoursByVenueKey(statsFile, allVenueKeys);
  const intervalMsByVenueKey = new Map<VenueKey, number>(
    [...intervalHoursByKey.entries()].map(([key, hours]) => [key, hours * 60 * 60 * 1000])
  );

  const selectedVenueKeys = selectVenueKeys(allVenueKeys, previousOutput, options, forcedVenueKeys, Date.now(), {
    intervalMsByVenueKey: options.onlyOutdatedVenues ? intervalMsByVenueKey : undefined
  });

  if (options.onlyOutdatedVenues) {
    const sample = [...intervalHoursByKey.entries()]
      .slice(0, 3)
      .map(([k, h]) => `${k}:${h}h`)
      .join(", ");
    console.log(`Outdated mode: per-venue intervals from stats (e.g. ${sample}…)`);
  }
  const selectedScrapers = SCRAPERS.filter(({ key }) => selectedVenueKeys.has(key));

  if (selectedScrapers.length === 0) {
    console.log("No venues matched the selected filters. Nothing to scrape.");
    return;
  }

  console.log(`Scraping ${selectedScrapers.length}/${SCRAPERS.length} venues...`);
  const results = await Promise.all(selectedScrapers.map(({ scrape }) => scrape()));

  const freshOutput = buildOutput(results);
  const venueStats = buildVenueChangeStats(
    results.map((r) => ({ venueKey: r.venueKey, venue: r.venue, ok: r.ok })),
    previousOutput?.sessions,
    freshOutput.sessions
  );
  const { merged, evictedSessions } = mergeOutputWithPrevious(previousOutput, freshOutput, allVenueKeys);
  const output = applyOutputCuration(merged);

  appendScrapeStatsRun(path.join(dataDir, "scrape-change-stats.json"), freshOutput.generatedAt, venueStats);
  appendPastArchive(evictedSessions, path.join(dataDir, "classes.past.json"), Date.now(), freshOutput.generatedAt);

  writeOutput(output);

  const changedOk = venueStats.filter((v) => v.scrapeOk && v.changed).length;
  const okCount = venueStats.filter((v) => v.scrapeOk).length;
  console.log(
    `Generated ${output.sessions.length} sessions after scraping ${results.length} venues in ${Date.now() - started}ms (changed data: ${changedOk}/${okCount} successful venues)`
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
