const BIG_STUDIO_VENUE_NAMES = new Set([
  "Danceworks",
  "Pineapple Dance Studios",
  "BASE Dance Studios"
]);

const TOP_PRIORITY_VENUE_NAMES = new Set([
  "Marina Sfyridi",
  "Daniel Rodriguez",
  "Look At Movement (Tanztheatre)",
  "The Place",
  "Siobhan Davies Studios",
  "1Syllable"
]);

const SALSA_BACHATA_FOCUSED_VENUE_NAMES = new Set([
  "Bachata Community",
  "SuperMario Salsa",
  "Salsa Rueda (Rueda Libre)",
  "Cubaneando",
  "Salsa! Soho",
  "Bar Salsa Temple",
  "MamboCity",
  "Con Tumbao Salsa"
]);

export function isBigStudioVenueName(name: string): boolean {
  return BIG_STUDIO_VENUE_NAMES.has(name);
}

export function isUserPreferredVenueName(name: string): boolean {
  return TOP_PRIORITY_VENUE_NAMES.has(name);
}

export function isSalsaBachataFocusedVenueName(name: string): boolean {
  return SALSA_BACHATA_FOCUSED_VENUE_NAMES.has(name);
}

export function getVenuePriorityBucket(name: string): number {
  if (isUserPreferredVenueName(name)) {
    return 0;
  }
  if (isBigStudioVenueName(name)) {
    return 3;
  }
  if (isSalsaBachataFocusedVenueName(name)) {
    return 2;
  }
  return 1;
}

function compareVenueUiOrder(aName: string, aCount: number, bName: string, bCount: number): number {
  const aPriorityBucket = getVenuePriorityBucket(aName);
  const bPriorityBucket = getVenuePriorityBucket(bName);
  if (aPriorityBucket !== bPriorityBucket) {
    return aPriorityBucket - bPriorityBucket;
  }

  if (aCount !== bCount) {
    return aCount - bCount;
  }

  return aName.localeCompare(bName);
}

export function sortVenueNamesForUi(names: string[]): string[] {
  return [...names].sort((a, b) => {
    return compareVenueUiOrder(a, Number.POSITIVE_INFINITY, b, Number.POSITIVE_INFINITY);
  });
}

export function sortVenueRecordsForUi<T extends { name: string; count: number }>(venues: T[]): T[] {
  return [...venues].sort((a, b) => compareVenueUiOrder(a.name, a.count, b.name, b.count));
}
