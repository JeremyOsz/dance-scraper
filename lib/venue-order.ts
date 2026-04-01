const BIG_STUDIO_VENUE_NAMES = new Set([
  "Danceworks",
  "Pineapple Dance Studios",
  "BASE Dance Studios"
]);

export function isBigStudioVenueName(name: string): boolean {
  return BIG_STUDIO_VENUE_NAMES.has(name);
}

function compareVenueUiOrder(aName: string, aCount: number, bName: string, bCount: number): number {
  const aBigStudio = isBigStudioVenueName(aName);
  const bBigStudio = isBigStudioVenueName(bName);
  if (aBigStudio !== bBigStudio) {
    return Number(aBigStudio) - Number(bBigStudio);
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
