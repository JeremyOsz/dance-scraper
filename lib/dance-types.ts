import type { DanceSession } from "@/lib/types";

export const DANCE_STYLE_GROUPS = [
  { label: "Technique & Stage", styles: ["Ballet", "Contemporary", "Jazz", "Tap", "Musical Theatre"] },
  {
    label: "Improvisation & Somatics",
    styles: ["Improv", "Contact Improv", "Somatic", "Butoh", "Ecstatic Dance", "5Rhythms", "Yoga/Pilates"]
  },
  {
    label: "Street, Club & Commercial",
    styles: ["Hip Hop", "House", "Commercial", "Heels", "Waacking", "Vogue", "Popping/Locking", "Krump", "Dancehall", "K-pop"]
  },
  {
    label: "Partner & Social",
    styles: [
      "Salsa",
      "Bachata",
      "Ballroom & Latin",
      "Argentine Tango",
      "Lindy Hop/Swing",
      "Kizomba/Semba",
      "Brazilian Zouk",
      "Forró",
      "Modern Jive/Ceroc"
    ]
  },
  { label: "African & Caribbean", styles: ["African Contemporary", "Afro Fusion/Afrobeats", "Caribbean"] },
  { label: "South Asian", styles: ["Bollywood", "Bhangra", "Kathak", "Bharatanatyam", "Other South Asian"] },
  {
    label: "World, Folk & Traditional",
    styles: [
      "Flamenco",
      "Samba",
      "Capoeira",
      "Belly Dance",
      "Dabke",
      "Ceilidh/Scottish Country Dance",
      "English Country Dance",
      "Irish Céilí/Set Dance",
      "Contra Dance",
      "Line Dance",
      "Folk/Traditional"
    ]
  },
  { label: "Movement & Performance", styles: ["Physical Theatre", "Dance Theatre", "Mime/Clown/Mask", "Pole/Aerial"] }
] as const;

export type DanceStyleGroup = (typeof DANCE_STYLE_GROUPS)[number]["label"];
export type DanceStyle = (typeof DANCE_STYLE_GROUPS)[number]["styles"][number] | "Other";

export const DANCE_STYLES: readonly DanceStyle[] = [
  ...DANCE_STYLE_GROUPS.flatMap((group) => group.styles),
  "Other"
];

/** Legacy public filter labels retained for saved URLs and older clients. */
export const DANCE_TYPES = [
  "Contemporary",
  "Ballet",
  "Improv",
  "Contact Improv",
  "Ecstatic Dance/ 5Rhythms",
  "Salsa",
  "Bachata",
  "Butoh",
  "Somatic",
  "Hip Hop",
  "Yoga/Pilates",
  "Jazz",
  "House",
  "Commercial/Heels",
  "Ballroom/Tango",
  "Other"
] as const;

export type DanceType = (typeof DANCE_TYPES)[number];

type StyleInput = Pick<DanceSession, "title" | "details" | "tags"> & {
  venue?: string | null;
  organizer?: string | null;
  styles?: readonly string[];
};

const STYLE_PATTERNS: Record<Exclude<DanceStyle, "Other">, RegExp[]> = {
  Ballet: [/\bballet\b/i, /\bpointe\b/i],
  Contemporary: [/\bcontemporary\b/i, /\bchoreograph(?:ic|y)\b/i, /\bflying\s+low\b/i, /\bpro\s*dance\b/i],
  Jazz: [/\bjazz\b/i],
  Tap: [/\btap(?:\s+dance|\s+technique|\s+class)?\b/i],
  "Musical Theatre": [/\bmusical\s+theatre\b/i, /\btheatre\s+jazz\b/i, /\bmt\s+tap\b/i],
  Improv: [/\bimprov\b/i, /\bimprovis(?:ation|ational)\b/i],
  "Contact Improv": [
    /\bcontact\s+improv\b/i,
    /\bcontact\s+improvis(?:ation|ational)\b/i,
    /\bci\s*(?:calendar|jam|class|intensive|practice|peers?)\b/i,
    /\bcontact\s+jam\b/i
  ],
  Somatic: [/\bsomatic\b/i, /\bgaga\b/i, /\bklein\s+technique\b/i, /\bmyofascial\b/i, /\bfeldenkrais\b/i],
  Butoh: [/\bbutoh\b/i],
  "Ecstatic Dance": [/\becstatic\s+dance\b/i, /\bluminous\b/i],
  "5Rhythms": [/\b5\s*rhythms?\b/i, /\bfive\s+rhythms?\b/i, /\b5rythms?\b/i],
  "Yoga/Pilates": [/\byoga\b/i, /\bpilates\b/i, /\bvinyasa\b/i, /\bashtanga\b/i, /\byin\b/i],
  "Hip Hop": [/\bhip[\s-]?hop\b/i, /\bstreet\s+dance\b/i, /\bfreestylers?\b/i, /\bshuffle\b/i],
  House: [/\bhouse\b/i],
  Commercial: [/\bcommercial\b/i],
  Heels: [/\bheels\b/i],
  Waacking: [/\bwaacking\b/i],
  Vogue: [/\bvog(?:ue|uing)\b/i],
  "Popping/Locking": [/\bpopping\b/i, /\blocking\b/i],
  Krump: [/\bkrump\b/i],
  Dancehall: [/\bdancehall\b/i],
  "K-pop": [/\bk[\s-]?pop\b/i],
  Salsa: [/\bsalsa\b/i],
  Bachata: [/\bbachata\b/i],
  "Ballroom & Latin": [/\bballroom\b/i, /\blatin(?:\s+american)?\b/i, /\bfoxtrot\b/i, /\bwaltz\b/i, /\bcha[\s-]?cha\b/i, /\brumba\b/i],
  "Argentine Tango": [/\bargentine\s+tango\b/i, /\btango\b/i, /\bmilonga\b/i],
  "Lindy Hop/Swing": [/\blindy\s*hop\b/i, /\blindyhopeastldn\b/i, /\bswing\s+danc/i, /\bbalboa\b/i, /\bsolo\s+charleston\b/i],
  "Kizomba/Semba": [/\bkizomba\b/i, /\bsemba\b/i, /\burban\s+kiz\b/i],
  "Brazilian Zouk": [/\bbrazilian\s+zouk\b/i, /\bzouk\b/i],
  Forró: [/\bforr[oó](?![\p{L}\p{N}_])/iu],
  "Modern Jive/Ceroc": [/\bmodern\s+jive\b/i, /\bceroc\b/i, /\bleroc\b/i],
  "African Contemporary": [/\bafrican\s+contemporary\b/i, /\bcontemporary\s+african\b/i],
  "Afro Fusion/Afrobeats": [/\bafro(?:\s*fusion|beats?)?\b/i, /\bafricanistic\b/i],
  Caribbean: [/\bcaribbean\b/i, /\bsoca\b/i],
  Bollywood: [/\bbollywood\b/i, /\bbolly\s*street\b/i],
  Bhangra: [/\bbhangra\b/i],
  Kathak: [/\bkathak\b/i],
  Bharatanatyam: [/\bbharatanatyam\b/i],
  "Other South Asian": [/\bodissi\b/i, /\bkuchipudi\b/i, /\bsouth\s+asian\s+dance\b/i],
  Flamenco: [/\bflamenco\b/i],
  Samba: [/\bsamba\b/i],
  Capoeira: [/\bcapoeira\b/i, /\broda\b/i],
  "Belly Dance": [/\bbelly\s*dance\b/i],
  Dabke: [/\bdabke\b/i],
  "Ceilidh/Scottish Country Dance": [/\bc[èe]ilidh\b/i, /\bscottish\s+country\s+danc/i],
  "English Country Dance": [/\benglish\s+country\s+danc/i],
  "Irish Céilí/Set Dance": [/\birish\s+(?:c[ée]il[ií]|set\s+danc)/i],
  "Contra Dance": [/\bcontra\s+danc/i],
  "Line Dance": [/\bline\s+danc/i],
  "Folk/Traditional": [/\bfolk\s+danc/i, /\btraditional\s+danc/i],
  "Physical Theatre": [/\bphysical\s+theat(?:re|er)\b/i, /\blecoq\b/i],
  "Dance Theatre": [/\bdance\s+theat(?:re|er)\b/i, /\btanztheat(?:er|re)\b/i],
  "Mime/Clown/Mask": [/\bmime\b/i, /\bclown(?:ing)?\b/i, /\bmask\s+(?:work|theat(?:re|er))\b/i],
  "Pole/Aerial": [/\bpole\b/i, /\baerial\b/i, /\bhoop\s+(?:flow|class|tricks|beginner|intermediate|advanced)\b/i]
};

const LEGACY_TYPE_STYLES: Record<DanceType, readonly DanceStyle[]> = {
  Contemporary: ["Contemporary"],
  Ballet: ["Ballet"],
  Improv: ["Improv"],
  "Contact Improv": ["Contact Improv"],
  "Ecstatic Dance/ 5Rhythms": ["Ecstatic Dance", "5Rhythms"],
  Salsa: ["Salsa"],
  Bachata: ["Bachata"],
  Butoh: ["Butoh"],
  Somatic: ["Somatic"],
  "Hip Hop": ["Hip Hop"],
  "Yoga/Pilates": ["Yoga/Pilates"],
  Jazz: ["Jazz"],
  House: ["House"],
  "Commercial/Heels": ["Commercial", "Heels", "K-pop", "Dancehall", "Vogue", "African Contemporary", "Afro Fusion/Afrobeats", "Caribbean"],
  "Ballroom/Tango": ["Ballroom & Latin", "Argentine Tango", "Lindy Hop/Swing", "Modern Jive/Ceroc"],
  Other: ["Other"]
};

export function expandLegacyDanceTypes(types: readonly string[]): DanceStyle[] {
  return [...new Set(types.flatMap((type) => {
    const canonicalType = type === "Ecstatic Dance/ 5Rythms" ? "Ecstatic Dance/ 5Rhythms" : type;
    return LEGACY_TYPE_STYLES[canonicalType as DanceType] ?? [];
  }))];
}

export function inferDanceStyles(session: StyleInput): DanceStyle[] {
  const stored = session.styles?.filter((style): style is DanceStyle => DANCE_STYLES.includes(style as DanceStyle));
  if (stored?.length) return [...new Set(stored)];

  const coreText = `${session.title} ${session.details ?? ""}`;
  const venueText = `${session.organizer ?? ""} ${session.venue ?? ""}`;
  const tagText = session.tags.join(" ");
  const detected = (Object.entries(STYLE_PATTERNS) as [Exclude<DanceStyle, "Other">, RegExp[]][])
    .filter(([style, patterns]) => {
      if (style === "Improv" || style === "Contact Improv" || style === "Physical Theatre" || style === "Dance Theatre" || style === "Mime/Clown/Mask") {
        return patterns.some((pattern) => pattern.test(coreText) || pattern.test(venueText));
      }
      return patterns.some((pattern) => pattern.test(coreText) || pattern.test(tagText) || pattern.test(venueText));
    })
    .map(([style]) => style);

  if (detected.length === 0) {
    const venue = session.organizer ?? session.venue ?? "";
    if (/\b(?:rambert|the\s+place)\b/i.test(venue) && /\bprofessional\s+class(?:es)?\b/i.test(session.title)) {
      return ["Contemporary"];
    }
    if (/\bsiobhan\s+davies\b/i.test(venue) && /\bmorning\s+class\b/i.test(session.title)) {
      return ["Contemporary"];
    }
  }

  return detected.length ? detected : ["Other"];
}

export function matchesDanceStyle(session: StyleInput, selectedStyle: string): boolean {
  return inferDanceStyles(session).includes(selectedStyle as DanceStyle);
}

/** Returns legacy type labels for existing UI and API consumers. */
export function inferDanceTypes(session: StyleInput): DanceType[] {
  const styles = inferDanceStyles(session);
  return DANCE_TYPES.filter((type) => LEGACY_TYPE_STYLES[type].some((style) => styles.includes(style)));
}

export function matchesDanceType(session: StyleInput, selectedType: string): boolean {
  if (DANCE_STYLES.includes(selectedType as DanceStyle)) {
    return matchesDanceStyle(session, selectedType);
  }
  const canonicalType = selectedType === "Ecstatic Dance/ 5Rythms" ? "Ecstatic Dance/ 5Rhythms" : selectedType;
  const aliases = LEGACY_TYPE_STYLES[canonicalType as DanceType];
  return aliases ? aliases.some((style) => inferDanceStyles(session).includes(style)) : false;
}
