import type { VenueKey } from "@/lib/types";

export const VENUES: Record<VenueKey, { label: string; sourceUrl: string; mapQuery: string }> = {
  thePlace: {
    label: "The Place",
    sourceUrl: "https://theplace.org.uk/dance/classes-and-courses",
    mapQuery: "17 Duke's Road, London WC1H 9PY"
  },
  rambert: {
    label: "Rambert",
    sourceUrl: "https://rambert.org.uk/classes/",
    mapQuery: "Rambert, 99 Upper Ground, London SE1 9PP"
  },
  siobhanDavies: {
    label: "Siobhan Davies Studios",
    sourceUrl: "https://www.siobhandavies.com/events/",
    mapQuery: "Siobhan Davies Studios, 85 St George's Road, London SE1 6ER"
  },
  tripSpace: {
    label: "TripSpace",
    sourceUrl: "https://momence.com/u/tripspace-bKDjuG",
    mapQuery: "339-340 Acton Mews, London E8 4EA"
  },
  chisenhaleDanceSpace: {
    label: "Chisenhale Dance Space",
    sourceUrl: "https://www.chisenhaledancespace.co.uk/independent-events/",
    mapQuery: "Chisenhale Dance Space, 64-84 Chisenhale Road, London E3 5QZ"
  },
  ciCalendarLondon: {
    label: "CI Calendar London",
    sourceUrl: "https://cicalendar.uk/london",
    mapQuery: "London contact improvisation classes"
  },
  bachataCommunity: {
    label: "Bachata Community",
    sourceUrl: "https://bachatacommunity.space/",
    mapQuery: "Bachata Community London classes"
  },
  ecstaticDanceLondon: {
    label: "Ecstatic Dance London",
    sourceUrl: "https://www.eventbrite.com/o/73047023743",
    mapQuery: "Ecstatic Dance London"
  },
  luminousDance: {
    label: "Luminous Dance",
    sourceUrl: "https://dandelion.events/o/luminous/events",
    mapQuery: "Luminous Dance London"
  },
  fiveRhythmsLondon: {
    label: "Five Rhythms London",
    sourceUrl: "https://www.5rhythms.com/classes/London",
    mapQuery: "5Rhythms London classes"
  },
  superMarioSalsa: {
    label: "SuperMario Salsa",
    sourceUrl: "https://www.salsa4fun.co.uk/class-schedule",
    mapQuery: "Salsa4Fun by SuperMario London"
  },
  salsaRuedaRuedaLibre: {
    label: "Salsa Rueda (Rueda Libre)",
    sourceUrl: "https://ruedalibre.co.uk/events/?ical=1",
    mapQuery: "Rueda Libre London"
  },
  cubaneando: {
    label: "Cubaneando",
    sourceUrl: "https://ruedalibre.co.uk/events/?ical=1",
    mapQuery: "Cubaneando London"
  },
  butohMutations: {
    label: "Butoh Mutations",
    sourceUrl: "https://www.butohuk.com/",
    mapQuery: "Butoh Mutations London"
  },
  posthumanTheatreButoh: {
    label: "Posthuman Theatre Butoh",
    sourceUrl: "https://posthuman.works/butoh-classes-workshops",
    mapQuery: "Posthuman Theatre Butoh London"
  },
  hackneyBaths: {
    label: "Hackney Baths",
    sourceUrl: "https://www.the-baths.co.uk/",
    mapQuery: "Hackney Baths London"
  },
  wednesdayMoving: {
    label: "Wednesday Moving",
    sourceUrl: "https://www.wednesdaymoving.co.uk/",
    mapQuery: "Round Chapel Old School Rooms Hackney E5 0PU"
  },
  danceworks: {
    label: "Danceworks",
    sourceUrl: "https://www.danceworks.com/london/classes/timetable/",
    mapQuery: "Danceworks London classes"
  },
  pineappleDanceStudios: {
    label: "Pineapple Dance Studios",
    sourceUrl: "https://www.pineapple.uk.com/pages/studio-classes-timetable",
    mapQuery: "Pineapple Dance Studios London"
  },
  baseDanceStudios: {
    label: "BASE Dance Studios",
    sourceUrl: "https://www.basedancestudios.com/weekly-timetable-2",
    mapQuery: "BASE Dance Studios London"
  },
  salsaSoho: {
    label: "Salsa! Soho",
    sourceUrl: "https://www.salsa-soho.com/",
    mapQuery: "Salsa Soho London"
  },
  barSalsaTemple: {
    label: "Bar Salsa Temple",
    sourceUrl: "https://www.barsalsa.com/temple/",
    mapQuery: "Bar Salsa Temple London"
  },
  mamboCity: {
    label: "MamboCity",
    sourceUrl: "https://www.mambocity.co.uk/",
    mapQuery: "MamboCity London"
  },
  cityAcademy: {
    label: "City Academy",
    sourceUrl: "https://www.city-academy.com/Dance-Classes",
    mapQuery: "City Academy Dance London"
  },
  adrianOutsavvy: {
    label: "StreamMovement",
    sourceUrl:
      "https://www.outsavvy.com/event/32134/dance-movement-flow-workshop-experience?utm_source=ig&utm_medium=social&utm_content=link_in_bio",
    mapQuery: "Outsavvy dance movement flow workshop London"
  },
  marinaSfyridi: {
    label: "Marina Sfyridi",
    sourceUrl: "https://www.eventbrite.co.uk/e/circadian-bodies-march-dance-classes-tickets-1984132482667",
    mapQuery: "Marina Sfyridi dance classes London"
  },
  lookAtMovement: {
    label: "Look At Movement (Tanztheatre)",
    sourceUrl: "https://www.lookatmovement.co.uk/",
    mapQuery: "Look At Movement Tanztheatre London"
  },
  theManorMvmt: {
    label: "The Manor / MVMT",
    sourceUrl: "https://www.themanorldn.com/mvmt",
    mapQuery: "The Manor LDN MVMT London"
  },
  eastLondonDance: {
    label: "East London Dance",
    sourceUrl: "https://eastlondondance.org/",
    mapQuery: "East London Dance"
  },
  conTumbaoSalsa: {
    label: "Con Tumbao Salsa",
    sourceUrl: "https://www.contumbaosalsa.com/",
    mapQuery: "Happy Feet Studios London"
  },
  underTheSunDance: {
    label: "Under the Sun Dance",
    sourceUrl: "https://www.underthesundance.com/",
    mapQuery: "Under the Sun Dance London"
  },
  balletForYou: {
    label: "Ballet for You",
    sourceUrl: "https://www.balletforyou.co.uk/timetable",
    mapQuery: "Ballet for You London"
  },
  fieldworksDance: {
    label: "Fieldworks Dance",
    sourceUrl: "https://www.fieldworksdance.co.uk/book-online",
    mapQuery: "FieldWorks Dance London"
  },
  cplayCy: {
    label: "cplay.cy",
    sourceUrl: "https://linktr.ee/cplay.cy",
    mapQuery: "cplay.cy London dance"
  },
  danielRodriguezEventbrite: {
    label: "Daniel Rodriguez",
    sourceUrl: "https://www.eventbrite.com/o/88584641013",
    mapQuery: "Daniel Rodriguez dance workshop London"
  },
  rachelMannMarlonWhoHenry: {
    label: "Rachel Mann & Marlon Who Henry",
    sourceUrl: "https://www.eventbrite.com/o/79771578413",
    mapQuery: "Rachel Mann Marlon Who Henry London"
  },
  gelNow: {
    label: "Gel",
    sourceUrl: "https://gel.now/?search=dance&category=workshop",
    mapQuery: "Gel grassroots events London"
  },
  oneSyllable: {
    label: "1Syllable",
    sourceUrl: "https://1syllable.org/events/category/classes-and-training/",
    mapQuery: "1Syllable London"
  },
  customEvents: {
    label: "Custom listings",
    sourceUrl: "https://www.jw3.org.uk/whats-on",
    mapQuery: "JW3, 341-351 Finchley Road, London NW3 6ET"
  }
};

const VENUE_MAP_QUERY_BY_LABEL = new Map(Object.values(VENUES).map((venue) => [venue.label, venue.mapQuery]));

export function getVenueMapQuery(venueName: string) {
  return VENUE_MAP_QUERY_BY_LABEL.get(venueName) ?? `${venueName} London`;
}
