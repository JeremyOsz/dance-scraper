import { DANCE_STYLE_GROUPS, DANCE_STYLES, type DanceStyle, type DanceStyleGroup } from "@/lib/dance-types";

export type StyleRating = "low" | "medium" | "high";
export type GuideableDanceStyle = Exclude<DanceStyle, "Other">;

export type DanceStyleGuideSource = {
  label: string;
  url: string;
};

export type DanceStyleGuide = {
  style: GuideableDanceStyle;
  slug: string;
  group: DanceStyleGroup;
  overview: string;
  history: string;
  whatToExpect: string;
  accessGuidance: string;
  ratings: {
    technique: StyleRating;
    partnering: StyleRating;
    intensity: StyleRating;
    beginnerFriendliness: StyleRating;
    mobilityAdaptability: StyleRating;
    rhythmEmphasis: StyleRating;
  };
  sources: DanceStyleGuideSource[];
};

const SOURCES = {
  danceResearch: { label: "Library of Congress: Dance research collections", url: "https://guides.loc.gov/dance/digital-collections" },
  ballet: { label: "Library of Congress: Ballets Russes collection", url: "https://www.loc.gov/collections/ballets-russes-de-serge-diaghilev/about-this-collection/" },
  contemporary: { label: "Dance Consortium: Contemporary dance", url: "https://danceconsortium.com/features/article/contemporary-dance-always-changing/" },
  tap: { label: "Library of Congress: A short history of tap", url: "https://www.loc.gov/collections/songs-of-america/articles-and-essays/musical-styles/parlor-and-concert-stage/tap-dance/" },
  istdTap: { label: "Imperial Society of Teachers of Dancing: Tap", url: "https://www.istd.org/dance/dance-genres/tap/" },
  hipHop: { label: "Smithsonian: African American social dance and hip-hop", url: "https://folklife.si.edu/magazine/freedom-sounds-generations-of-african-american-social-dance-in-dc-hand-dancing-hip-hop-and-go-go" },
  breaking: { label: "Smithsonian: Breaking and hip-hop history", url: "https://www.smithsonianmag.com/smart-news/breaking-will-debut-at-the-summer-olympics-180984199/" },
  waacking: { label: "New York Public Library: Waacking oral history", url: "https://www.nypl.org/blog/2023/02/27/waacking-moulin-rouge-billy-goodson-records-his-dance-oral-history" },
  vogue: { label: "National Museum of African American History: Voguing", url: "https://nmaahc.si.edu/explore/stories/brief-history-voguing" },
  socialDance: { label: "Library of Congress: Western social dance", url: "https://www.loc.gov/collections/dance-instruction-manuals-from-1490-to-1920/articles-and-essays/western-social-dance-an-overview-of-the-collection/" },
  lindy: { label: "Library of Congress: Frankie Manning and Lindy Hop", url: "https://www.loc.gov/loc/lcib/9513/afc.html" },
  tango: { label: "UNESCO: The Tango", url: "https://www.unesco.org/archives/multimedia/document-319" },
  tangoAfro: { label: "UNESCO: Tango is also Afro", url: "https://www.unesco.org/en/articles/tango-also-afro" },
  flamenco: { label: "UNESCO Intangible Heritage: Flamenco", url: "https://ich.unesco.org/en/RL/flamenco-00363" },
  samba: { label: "UNESCO Intangible Heritage: Samba de Roda", url: "https://ich.unesco.org/en/RL/samba-de-roda-of-the-recncavo-of-bahia-00101" },
  capoeira: { label: "UNESCO Intangible Heritage: Capoeira circle", url: "https://ich.unesco.org/en/RL/capoeira-circle-00892" },
  kathak: { label: "Sadler's Wells: Introduction to Kathak", url: "https://www.sadlerswells.com/take-part/online-workshops/workshops-kathak/" },
  indianDance: { label: "India Ministry of Culture: Indian classical dance traditions", url: "https://www.indiaculture.gov.in/sites/default/files/festivals_vietnam/pre_events/Festival%20of%20India%20Brochure-VIETNAM%20-REVISED.pdf" },
  folkDance: { label: "Library of Congress: Folk dance collections", url: "https://guides.loc.gov/dance/digital-collections" },
  unescoHeritage: { label: "UNESCO: Intangible cultural heritage lists", url: "https://ich.unesco.org/en/lists" },
  theatreDance: { label: "Victoria and Albert Museum: Theatre and performance collections", url: "https://www.vam.ac.uk/collections/theatre-performance" },
  nationalTheatre: { label: "National Theatre: Movement and performance", url: "https://www.nationaltheatre.org.uk/learn-explore/" }
} satisfies Record<string, DanceStyleGuideSource>;

const TECHNIQUE_SOURCES = [SOURCES.danceResearch, SOURCES.contemporary];
const STREET_SOURCES = [SOURCES.hipHop, SOURCES.breaking];
const SOCIAL_SOURCES = [SOURCES.socialDance, SOURCES.danceResearch];
const SOUTH_ASIAN_SOURCES = [SOURCES.indianDance, SOURCES.kathak];
const FOLK_SOURCES = [SOURCES.unescoHeritage, SOURCES.folkDance];
const THEATRE_SOURCES = [SOURCES.theatreDance, SOURCES.nationalTheatre];

function ratings(
  technique: StyleRating,
  partnering: StyleRating,
  intensity: StyleRating,
  beginnerFriendliness: StyleRating,
  mobilityAdaptability: StyleRating,
  rhythmEmphasis: StyleRating
) {
  return { technique, partnering, intensity, beginnerFriendliness, mobilityAdaptability, rhythmEmphasis };
}

function groupForStyle(style: GuideableDanceStyle): DanceStyleGroup {
  const group = DANCE_STYLE_GROUPS.find((candidate) => (candidate.styles as readonly string[]).includes(style));
  if (!group) throw new Error(`No dance-style group found for ${style}`);
  return group.label;
}

function guide(
  style: GuideableDanceStyle,
  slug: string,
  overview: string,
  history: string,
  whatToExpect: string,
  accessGuidance: string,
  guideRatings: DanceStyleGuide["ratings"],
  sources: DanceStyleGuideSource[]
): DanceStyleGuide {
  return { style, slug, group: groupForStyle(style), overview, history, whatToExpect, accessGuidance, ratings: guideRatings, sources };
}

export const DANCE_STYLE_GUIDES = {
  Ballet: guide(
    "Ballet", "ballet",
    "A codified theatrical form that develops alignment, control, line and musical phrasing through a shared movement vocabulary.",
    "Ballet grew from court entertainments in Renaissance Italy and France, then developed through professional theatres and schools across Europe. Romantic and classical traditions shaped its familiar vocabulary, while twentieth- and twenty-first-century choreographers have continually revised who performs it and how it looks.",
    "Classes usually progress from barre exercises to centre practice, travelling steps and combinations. Teachers commonly build coordination, turnout, balance and placement in a precise sequence set to music.",
    "Beginner classes can introduce the vocabulary gradually, but standing balance and repeated leg work are common. Seated or adapted ballet exists; ask whether the teacher can offer barre, chair or range-of-motion alternatives.",
    ratings("high", "low", "medium", "medium", "medium", "medium"), [SOURCES.ballet, SOURCES.danceResearch]
  ),
  Contemporary: guide(
    "Contemporary", "contemporary",
    "A broad, evolving field combining technical training, expressive movement, floorwork, improvisation and choreographic exploration.",
    "Contemporary dance draws on early modern dance challenges to ballet, later postmodern experimentation, and many global movement practices. It is not one fixed technique: artists and teachers continue to combine lineages, somatic ideas, popular forms and personal movement languages.",
    "A class may include alignment and release work, travelling phrases, floorwork, jumps, improvisation or set choreography. Pace and physical demand vary considerably between teachers and levels.",
    "Open and beginner classes can be welcoming, although floor transfers and weight-bearing through the hands are frequent in some approaches. Ask about standing-only, seated or reduced-impact alternatives before booking.",
    ratings("high", "low", "high", "medium", "medium", "medium"), [SOURCES.contemporary, SOURCES.danceResearch]
  ),
  Jazz: guide(
    "Jazz", "jazz",
    "An energetic family of stage and social techniques shaped by African American movement, jazz music and theatrical performance.",
    "Jazz dance developed through African American social and theatrical practices alongside jazz music, then expanded through Broadway, film and concert dance. Its history includes continual exchange with tap, vernacular dance, ballet and popular entertainment, so no single technique represents the whole field.",
    "Expect isolations, grounded rhythm, kicks, turns, travelling steps and choreographed combinations. Theatre-jazz classes may emphasise projection and clean lines, while lyrical or commercial variants use different dynamics.",
    "Beginner classes can be accessible, but faster combinations, turns and impact may be demanding. Teachers may be able to reduce jumps, simplify directional changes or adapt material to a chair.",
    ratings("high", "low", "high", "medium", "medium", "high"), [SOURCES.danceResearch, SOURCES.tap]
  ),
  Tap: guide(
    "Tap", "tap",
    "A percussive form in which metal-plated shoes turn footwork into layered rhythm and musical conversation.",
    "Tap developed in the United States through encounters among West African rhythmic practices, Irish step dancing, English clogging and other vernacular traditions. It became prominent in vaudeville, Broadway and film, while rhythm tap preserved improvisation and direct exchange with jazz music.",
    "Classes build weight changes, shuffles, flaps, time steps and short rhythmic phrases. Much of the learning happens by listening, repeating and coordinating increasingly intricate patterns.",
    "Basic tap can be beginner-friendly and may use a barre or chair for balance, but it relies on repeated ankle and foot action while standing. Ask about tempo, footwear, impact and seated percussion alternatives.",
    ratings("high", "low", "medium", "high", "medium", "high"), [SOURCES.tap, SOURCES.istdTap]
  ),
  "Musical Theatre": guide(
    "Musical Theatre", "musical-theatre",
    "Story-led stage dance that combines character, musical timing and choreography drawn from jazz, ballet, tap and popular styles.",
    "Dance has been central to musical theatre from music hall and vaudeville through Broadway and the West End. Choreographers have drawn on many social and concert forms, using movement to advance plot, reveal character and create large-scale ensemble spectacle.",
    "Classes often teach a warm-up followed by repertoire-inspired choreography, with attention to expression, performance quality and learning combinations quickly. Singing is not normally required unless stated.",
    "Beginner sessions can be playful and inclusive, though choreography may involve turns, kicks, kneeling or rapid direction changes. Ask whether movement can be marked, reduced in impact or adapted while seated.",
    ratings("medium", "low", "medium", "high", "medium", "high"), [SOURCES.theatreDance, SOURCES.danceResearch]
  ),

  Improv: guide(
    "Improv", "improv",
    "Movement created in the moment through attention, choice, sensation, space and relationships rather than fixed choreography.",
    "Improvisation has always existed within social and performance traditions, while twentieth-century modern and postmodern dance made it a visible choreographic and training practice. Contemporary improvisers use scores, images, sensory prompts and compositional rules to focus spontaneous movement.",
    "A teacher may offer prompts about timing, body parts, space or imagination, followed by solo, group or reflective exercises. There is usually no single correct shape to reproduce.",
    "It can be highly adaptable because participants choose movement range and pace, although open-ended tasks may feel unfamiliar. Tell the teacher about access needs and ask whether floorwork, touch or partner tasks are optional.",
    ratings("low", "low", "low", "high", "high", "low"), TECHNIQUE_SOURCES
  ),
  "Contact Improv": guide(
    "Contact Improv", "contact-improv",
    "A partner-based improvisational practice exploring shared weight, touch, momentum, rolling and responsive movement.",
    "Contact improvisation emerged in the United States in the early 1970s through experiments led by Steve Paxton and fellow dancers. It combined improvisation with research into gravity, falling, reflexes and non-hierarchical partnering, then spread internationally through jams, classes and peer practice.",
    "Classes may develop listening through touch, safe weight sharing, rolling points of contact and pathways into or out of the floor. Jams are less directed and expect participants to negotiate dances themselves.",
    "The practice can range from gentle to athletic, but touch, unpredictable weight and floor transfers are central in many sessions. Beginners should choose a taught class and discuss consent, mobility and no-lift alternatives with the organiser.",
    ratings("medium", "high", "medium", "medium", "medium", "low"), TECHNIQUE_SOURCES
  ),
  Somatic: guide(
    "Somatic", "somatic",
    "Body-awareness practices that prioritise internal sensation, coordination, ease and exploratory learning over external shapes.",
    "Somatic movement is an umbrella rather than a single lineage. Twentieth-century educators and practitioners developed approaches such as Feldenkrais, Body-Mind Centering and release-based work, which later influenced dance training, rehabilitation and creative practice.",
    "Sessions are often slow and attentive, using guided sensing, small movements, breath, touch or simple developmental patterns. Some classes are floor-based while others work seated or standing.",
    "Many somatic classes are gentle and adaptable, but long periods on the floor or specific touch practices may create barriers. Check the room setup and whether chair-based, standing or no-touch options are available.",
    ratings("medium", "low", "low", "high", "high", "low"), TECHNIQUE_SOURCES
  ),
  Butoh: guide(
    "Butoh", "butoh",
    "An experimental Japanese performance practice using imagery, transformation and intense attention to the body, often at unusual speeds.",
    "Butoh emerged in post-war Japan around the work of Tatsumi Hijikata and Kazuo Ohno. Early performances challenged established Japanese and Western theatrical aesthetics; later artists developed diverse methods, so butoh is better understood as a field of inquiry than one codified technique.",
    "Workshops may use poetic images, slow walking, improvisation, altered states of attention and detailed transformation of posture or texture. Material can be psychologically as well as physically demanding.",
    "Slow pace does not always mean easy: sustained positions, floorwork and emotionally charged imagery may be challenging. Ask whether tasks can be performed seated and whether participants may opt out of touch or intense prompts.",
    ratings("medium", "low", "medium", "medium", "medium", "low"), TECHNIQUE_SOURCES
  ),
  "Ecstatic Dance": guide(
    "Ecstatic Dance", "ecstatic-dance",
    "A loosely facilitated social movement practice centred on free dancing, musical journeys and personal expression.",
    "Ecstatic dance draws on older communal and spiritual uses of dance as well as late twentieth-century conscious-dance communities. Contemporary events vary widely, but commonly frame the dance floor as a sober, non-verbal space for individual and collective exploration.",
    "Events often begin with an arrival or warm-up, build through a DJ-led musical arc and close with stillness or a circle. Choreography is uncommon and partnering is usually optional.",
    "Participants control their own pace and movement, which can support adaptation, though crowded rooms, loud sound and long standing periods may be barriers. Check access, seating and sensory information with the host.",
    ratings("low", "low", "medium", "high", "high", "high"), [SOURCES.danceResearch, SOURCES.unescoHeritage]
  ),
  "5Rhythms": guide(
    "5Rhythms", "5rhythms",
    "A facilitated movement practice following five named energetic qualities: Flowing, Staccato, Chaos, Lyrical and Stillness.",
    "Gabrielle Roth developed 5Rhythms in the United States during the late twentieth century, drawing on her work in dance, theatre and human-potential settings. The trademarked practice is now taught internationally through classes and longer workshops.",
    "Teachers guide a musical wave through the five rhythms, offering verbal prompts rather than fixed steps. Participants interpret each quality in their own movement and may dance alone or in relation to others.",
    "Movement choice is flexible, but sessions can be long, loud and physically or emotionally intense. Ask whether chairs, rest, reduced movement and leaving or re-entering the floor are supported.",
    ratings("low", "low", "medium", "high", "high", "high"), [SOURCES.danceResearch, SOURCES.unescoHeritage]
  ),
  "Yoga/Pilates": guide(
    "Yoga/Pilates", "yoga-pilates",
    "A calendar category covering movement classes that build mobility, strength, breath awareness and controlled coordination.",
    "Yoga encompasses varied South Asian philosophical and physical traditions that have changed through global transmission. Pilates was developed by Joseph Pilates in the early twentieth century as a system of controlled conditioning; modern studios often place both alongside dance training.",
    "Yoga classes may use postures, breath and flowing or held sequences; Pilates commonly uses precise repetitions for trunk support and alignment. The pace ranges from restorative to athletic.",
    "Many teachers offer props and alternatives, but kneeling, lying down, wrist loading and floor transfers are common. Choose a clearly labelled level and confirm chair, prenatal, injury-aware or other adaptations directly.",
    ratings("medium", "low", "low", "high", "high", "low"), [SOURCES.danceResearch, SOURCES.unescoHeritage]
  ),

  "Hip Hop": guide(
    "Hip Hop", "hip-hop",
    "A broad social and performance category rooted in hip-hop culture, groove, freestyle, party dances and individual expression.",
    "Hip-hop culture developed in Black and Latino communities in 1970s New York through interconnected practices including DJing, MCing, graffiti and breaking. Studio ‘hip hop’ now covers varied party, freestyle and choreography practices, so teachers should identify the lineages they draw upon.",
    "Classes often develop bounce, rock, groove, isolations and short combinations, sometimes alongside freestyle circles. Music, timing and personal texture are central even when choreography is set.",
    "Beginner classes can be welcoming, but low levels, quick footwork and impact vary by teacher. Ask whether jumps can be removed and whether grooves can be adapted to a chair or smaller range.",
    ratings("medium", "low", "high", "high", "medium", "high"), STREET_SOURCES
  ),
  House: guide(
    "House", "house",
    "A club dance known for continuous groove, quick footwork, jacking and a fluid relationship with house music.",
    "House dance grew in Black and Latino club communities in cities including Chicago and New York during the 1980s and 1990s. It developed on social dance floors alongside house music, drawing on older club, jazz, Latin and African diasporic movement practices.",
    "Classes commonly practise jacking, skating, stomping, lofting and fast travelling footwork before combining them in phrases or freestyle. Relaxed groove and rhythmic responsiveness matter as much as steps.",
    "The footwork can be cardiovascular and demanding on balance, although groove can be practised with reduced travel. Ask about tempo, breaks and seated or supported rhythm alternatives.",
    ratings("high", "low", "high", "medium", "low", "high"), STREET_SOURCES
  ),
  Commercial: guide(
    "Commercial", "commercial",
    "Performance choreography influenced by music videos, touring shows, pop concerts and multiple studio dance techniques.",
    "Commercial dance is an industry category rather than one historical form. It grew with film, television, advertising and popular-music performance, continually absorbing jazz, hip-hop, club, Latin and other styles according to changing entertainment trends.",
    "Expect a warm-up followed by camera- or stage-facing choreography, with emphasis on clarity, dynamics, confidence and picking up material quickly. Content depends strongly on the teacher and music.",
    "Beginner-labelled classes are the best entry point; general classes may move rapidly and include floorwork or jumps. Ask whether choreography can be marked or adapted without level changes.",
    ratings("medium", "low", "high", "medium", "low", "high"), [SOURCES.hipHop, SOURCES.theatreDance]
  ),
  Heels: guide(
    "Heels", "heels",
    "A performance-focused studio style exploring posture, lines, musicality and confident movement, often in high-heeled shoes.",
    "Heels classes developed through commercial dance, jazz, cabaret and screen performance rather than a single founder or lineage. Contemporary teaching also draws from queer club cultures and many other forms, making attribution and respectful teaching important.",
    "Classes may cover posture, walks, weight placement, turns, floorwork and choreography. Some welcome trainers or bare feet, while specialist sessions teach shoe technique and performance quality.",
    "Heels alter balance and load through the feet, ankles and knees, and floorwork may involve kneeling. Beginners should choose a foundations class, use secure footwear and ask whether flat shoes, standing-only or low-impact options are accepted.",
    ratings("high", "low", "medium", "medium", "low", "high"), [SOURCES.theatreDance, SOURCES.hipHop]
  ),
  Waacking: guide(
    "Waacking", "waacking",
    "A disco-era club form recognised for rapid arm pathways, posing, musical interpretation and expressive individuality.",
    "Waacking developed as ‘punking’ in Black and Latino gay club communities in 1970s Los Angeles. Dancers drew on disco, cinema, comic-book drama and personal expression; later television exposure helped the form travel while its queer origins were sometimes obscured.",
    "Classes work on rhythmic arm rotations, poses, footwork, character and freestyle. Shoulder coordination and hitting musical accents are important, but dancers are encouraged to develop their own presence.",
    "Footwork can be reduced, but repeated fast arm actions may challenge shoulders and stamina. Ask about range-of-motion options and whether material can be practised seated.",
    ratings("high", "low", "high", "medium", "medium", "high"), [SOURCES.waacking, SOURCES.hipHop]
  ),
  Vogue: guide(
    "Vogue", "vogue",
    "A highly expressive form from ballroom culture using poses, lines, hand performance, catwalks, floorwork and competitive categories.",
    "Voguing was created within Black and Latino LGBTQ+ ballroom communities in Harlem and developed through house and ball competition. Different eras and categories—including Old Way, New Way and Vogue Fem—carry distinct techniques and cultural meanings.",
    "Classes may introduce poses, hands, catwalk, duckwalk, spins, dips and freestyle presentation. Not every class teaches every element, and culturally grounded teaching should explain ballroom context.",
    "Some elements require deep knee flexion, wrist loading or rapid floor transitions, while hands and poses can be adapted. Seek foundations teaching and ask explicitly about no-impact, standing or seated options.",
    ratings("high", "low", "high", "medium", "medium", "high"), [SOURCES.vogue, SOURCES.waacking]
  ),
  "Popping/Locking": guide(
    "Popping/Locking", "popping-locking",
    "A combined calendar label for distinct funk styles built around muscular hits, illusion, rhythmic stops and animated groove.",
    "Locking developed in early-1970s Los Angeles around Don Campbell and The Lockers; popping developed in California funk scenes through dancers including Boogaloo Sam and the Electric Boogaloos. They have different foundations despite often being taught together.",
    "Classes isolate foundational grooves, points, locks, pops, waves and character before using combinations or freestyle. Precise timing and contrast between tension and release are central.",
    "Foundations can be practised at low impact and some upper-body material adapts well to sitting. Repetition may tire joints or muscles, so ask about range, tempo and rest options.",
    ratings("high", "low", "medium", "medium", "high", "high"), STREET_SOURCES
  ),
  Krump: guide(
    "Krump", "krump",
    "An intense freestyle form using grounded grooves, chest pops, stomps, jabs and character to communicate powerful emotion.",
    "Krump emerged in Black communities in South Central Los Angeles in the early 2000s, developing from clowning and community dance sessions. Its battles, crews and character systems created a structured culture often misread when only its explosive surface is copied.",
    "Classes usually build foundational grooves and tools before combining them in rounds or freestyle. Control, intention and musical response are valued alongside visible power.",
    "Krump is commonly vigorous and may include forceful steps or large ranges, though intensity can be scaled. Ask whether foundations can be practised without impact or from a supported or seated position.",
    ratings("medium", "low", "high", "medium", "medium", "high"), STREET_SOURCES
  ),
  Dancehall: guide(
    "Dancehall", "dancehall",
    "A Jamaican social dance culture with named steps, grounded groove, musical specificity and strong communal exchange.",
    "Dancehall dance developed in Jamaica alongside dancehall music and sound-system culture, with generations of dancers creating and naming steps. International studio versions should acknowledge living Jamaican creators rather than treating the form as generic commercial choreography.",
    "Classes may drill grooves and named steps, then use choreography, freestyle or social combinations. Weight is often grounded and the movement closely follows lyrics, bass and rhythmic changes.",
    "Beginner foundations are useful because pace, hip action and low positions can be demanding. Ask about reduced squat depth, lower impact and alternatives to any floorwork.",
    ratings("medium", "low", "high", "medium", "medium", "high"), [SOURCES.hipHop, SOURCES.unescoHeritage]
  ),
  "K-pop": guide(
    "K-pop", "k-pop",
    "Choreography-led classes learning routines inspired by Korean popular-music performance and fan dance culture.",
    "K-pop dance is tied to South Korea’s modern idol and music-video industries, which combine influences from hip-hop, jazz, commercial and social dance. Global fan communities have expanded the practice through cover groups, online tutorials and public performances.",
    "Most classes break down a selected chorus or routine, focusing on formation-ready timing, detail and performance. The movement language changes with each artist and choreographer.",
    "Beginner sessions can be sociable, but full-speed choreography may be fast and physically varied. Ask whether movements can be marked, jumps removed and floor levels simplified.",
    ratings("medium", "low", "high", "high", "low", "high"), [SOURCES.hipHop, SOURCES.theatreDance]
  ),

  Salsa: guide(
    "Salsa", "salsa",
    "A family of Afro-Latin partner dances organised around rhythmic stepping, turns, improvisation and social connection.",
    "Salsa crystallised in twentieth-century Caribbean and New York music and dance communities, especially through Cuban and Puerto Rican influences and the wider African diaspora. Different timings and regional styles developed rather than one universally standard form.",
    "Classes usually teach a basic rhythm, partner connection, turns and short combinations before social practice. Partners commonly rotate, and solo footwork known as shines may also appear.",
    "Beginner courses are widely available, but turning, standing and hand connection are typical. Ask about bringing or rotating partners, reduced-turn options, seating and accessible social-dance formats.",
    ratings("medium", "high", "medium", "high", "medium", "high"), SOCIAL_SOURCES
  ),
  Bachata: guide(
    "Bachata", "bachata",
    "A Dominican partner dance with a clear four-count pulse, close musical relationship and several modern social styles.",
    "Bachata developed in the Dominican Republic alongside the music of the same name and was long associated with working-class communities before gaining wider recognition. Dominican social practice, modern or urban bachata, and sensual bachata use different movement priorities.",
    "Classes teach basic timing, weight changes, turns and partner connection; the amount of close hold, body movement or travelling depends on the style. Social sessions often rotate partners.",
    "The basic rhythm is approachable, but turns, close partnering and body isolations may need adaptation. Ask about consent conventions, reduced turns, partner rotation and whether seated participation is possible.",
    ratings("medium", "high", "medium", "high", "medium", "high"), SOCIAL_SOURCES
  ),
  "Ballroom & Latin": guide(
    "Ballroom & Latin", "ballroom-latin",
    "A codified family of partnered dances including waltz, foxtrot, quickstep, cha-cha-cha, rumba and jive.",
    "European court and social dances were formalised through nineteenth- and twentieth-century ballrooms and teaching organisations. The competitive International Standard and Latin categories later codified diverse dances, sometimes reshaping their original social and cultural contexts.",
    "Classes teach posture, timing, foot positions, lead-and-follow connection and figures for one or more dances. Social courses and competition training differ greatly in precision and intensity.",
    "Beginners can progress through clear figures, but sustained standing, turning and partner frame are common. Ask about partner requirements, slower dances, reduced travel and inclusive or wheelchair-dance provision.",
    ratings("high", "high", "medium", "high", "medium", "high"), SOCIAL_SOURCES
  ),
  "Argentine Tango": guide(
    "Argentine Tango", "argentine-tango",
    "An improvised social partner dance built through walking, close listening, musical phrasing and a shared embrace.",
    "Tango developed in the late nineteenth-century Río de la Plata cities of Buenos Aires and Montevideo among African-descended people, European immigrants and criollo communities. Music, poetry and social dance evolved together before tango spread internationally.",
    "Classes develop posture, walking, embrace, leading and following, pivots and navigation around a shared floor. Rather than memorising one routine, dancers learn to improvise within social conventions.",
    "Walking makes foundations approachable, but balance, pivots and close physical communication can present barriers. Ask about consent, open embrace, role choice, reduced turning and adapted tango provision.",
    ratings("high", "high", "low", "medium", "medium", "high"), [SOURCES.tango, SOURCES.tangoAfro]
  ),
  "Lindy Hop/Swing": guide(
    "Lindy Hop/Swing", "lindy-hop-swing",
    "An African American jazz partner dance combining rhythmic bounce, improvisation, social connection and playful momentum.",
    "Lindy Hop developed in Harlem’s Black communities during the late 1920s and 1930s, especially at the Savoy Ballroom. Dancers including Shorty George Snowden, Frankie Manning and Norma Miller shaped a form that travelled through performance and later international revivals.",
    "Classes teach pulse, partner connection, six- and eight-count rhythms, turns and improvised social patterns. Faster classes may introduce Charleston or aerial material, though aerials should be separately taught.",
    "Beginner social classes are common, but bouncing, turns and faster tempos can be tiring. Ask about slower music, reduced rotation, partner changes and supported or seated swing options.",
    ratings("medium", "high", "high", "high", "medium", "high"), [SOURCES.lindy, SOURCES.socialDance]
  ),
  "Kizomba/Semba": guide(
    "Kizomba/Semba", "kizomba-semba",
    "Closely related Angolan social partner dances centred on grounded walking, rhythmic connection and musical dialogue.",
    "Semba is an Angolan music and dance tradition with a longer history; kizomba developed in late twentieth-century Angola alongside new musical production and social styles. Their global spread produced additional forms, including urban kiz, which should not be treated as interchangeable.",
    "Classes focus on walking, weight transfer, embrace, lead-and-follow communication and musical timing. Semba is often more playful and expansive, while kizomba classes may emphasise close, smooth connection.",
    "Low impact does not remove the need for sustained balance or close partnering. Ask about open hold, role choice, partner rotation, breaks and mobility-adapted teaching.",
    ratings("medium", "high", "low", "high", "medium", "high"), [SOURCES.unescoHeritage, SOURCES.socialDance]
  ),
  "Brazilian Zouk": guide(
    "Brazilian Zouk", "brazilian-zouk",
    "A flowing Brazilian partner dance using elastic connection, turns, body movement and expressive interpretation of varied music.",
    "Brazilian zouk developed in Brazil from lambada dancing as musical fashions changed in the 1990s. Teachers and communities created several lineages, expanding the dance through travelling patterns, waves and characteristic head movement while maintaining a social improvisational base.",
    "Classes build timing, connection and turns before introducing body isolations, counterbalance or head movement. Safe technique and clear consent are particularly important for movements involving the neck and spine.",
    "Foundations can be gentle, but balance, rotation and advanced head movement may be challenging. Beginners should avoid forced range and ask about open hold, no-head-movement and reduced-turn options.",
    ratings("high", "high", "medium", "medium", "medium", "high"), SOCIAL_SOURCES
  ),
  Forró: guide(
    "Forró", "forro",
    "A family of Brazilian couple dances with compact travelling steps, rhythmic bounce and a warm social-floor tradition.",
    "Forró names both related music and social dances associated particularly with north-eastern Brazil. It spread through migration and popular festivals, developing regional and later university styles rather than one fixed movement system.",
    "Classes teach a basic pulse, partner hold, turns and movement around the floor, often to accordion-led music. Social connection and relaxed rhythmic continuity are central.",
    "The basic step can be approachable and low impact, though sustained standing, close hold and turning are typical. Ask about open hold, partner rotation, slower music and seated rhythm participation.",
    ratings("medium", "high", "medium", "high", "medium", "high"), SOCIAL_SOURCES
  ),
  "Modern Jive/Ceroc": guide(
    "Modern Jive/Ceroc", "modern-jive-ceroc",
    "An accessible modern partner-dance format using clear lead-and-follow patterns across a wide range of popular music.",
    "Modern jive developed in Britain from post-war jive, swing, rock-and-roll and later French partner-dance influences. Ceroc is a commercial teaching and event network within the broader scene rather than a separate historical folk tradition.",
    "Lessons commonly rotate partners and teach several reusable moves before a freestyle social. Footwork is deliberately simple, placing attention on connection, turns and remembering patterns.",
    "It is designed for beginners, but repeated turns and standing can still be demanding. Ask about partner rotation, reduced turns, slower pacing and whether the venue offers inclusive dance options.",
    ratings("low", "high", "medium", "high", "medium", "high"), SOCIAL_SOURCES
  ),

  "African Contemporary": guide(
    "African Contemporary", "african-contemporary",
    "Contemporary performance practices shaped by artists working across diverse African dance lineages, modern dance and present-day experience.",
    "African contemporary dance is not one technique or national style. Across the continent and diaspora, choreographers have combined local social, ceremonial and theatrical practices with modern and contemporary training, responding to colonial histories, urban life and artistic exchange.",
    "Classes may use grounded weight, spinal articulation, polyrhythm, travelling phrases, improvisation and set choreography. The specific cultural and technical sources should be named by the teacher.",
    "Physical demand varies from gentle exploration to highly athletic movement. Ask which lineage is being taught and whether jumps, deep levels, floorwork or travelling can be adapted.",
    ratings("high", "low", "high", "medium", "medium", "high"), [SOURCES.danceResearch, SOURCES.unescoHeritage]
  ),
  "Afro Fusion/Afrobeats": guide(
    "Afro Fusion/Afrobeats", "afro-fusion-afrobeats",
    "An umbrella studio category combining contemporary African and diasporic social dances with choreography to Afrobeats and related music.",
    "Afro fusion and Afrobeats dance do not describe a single traditional form. They developed through fast-moving urban music and dance scenes across countries including Nigeria and Ghana, global digital circulation, and choreographers combining named social steps with other influences.",
    "Classes often teach grooves, isolations, footwork and a choreographed routine. Responsible teaching identifies the countries, communities and creators connected to particular steps.",
    "The style is usually energetic, with grounded legs and quick changes, but grooves can often be reduced in size. Ask about impact, squat depth and chair-based alternatives.",
    ratings("medium", "low", "high", "high", "medium", "high"), [SOURCES.hipHop, SOURCES.unescoHeritage]
  ),
  Caribbean: guide(
    "Caribbean", "caribbean",
    "A broad calendar category for movement from varied Caribbean social, carnival and popular-dance cultures.",
    "The Caribbean contains many distinct dance histories shaped by Indigenous, African, European and Asian communities, enslavement, resistance, migration and cultural exchange. A class labelled only ‘Caribbean’ may draw on soca, carnival, dancehall or other practices and should name its sources.",
    "Expect rhythmic grooves, hip and torso articulation, travelling steps and communal energy, but the content varies significantly. Check the class description for the island, music and lineage being taught.",
    "Many classes are vigorous and standing-based, though social grooves can be scaled. Ask about impact, heat, noise, floor level and seated alternatives.",
    ratings("medium", "low", "high", "high", "medium", "high"), [SOURCES.unescoHeritage, SOURCES.danceResearch]
  ),

  Bollywood: guide(
    "Bollywood", "bollywood",
    "Screen-inspired Indian dance combining storytelling, musical expression and changing influences from classical, folk and popular forms.",
    "Bollywood dance grew through Hindi-language cinema, where choreography has long mixed Indian classical and regional traditions with cabaret, jazz, disco, hip-hop and global popular styles. Its vocabulary changes with film eras and choreographers rather than following one codified technique.",
    "Classes usually teach expressive gestures, rhythmic footwork and a routine to a film song. Performance, facial expression and ensemble energy are often as important as technical precision.",
    "Beginner classes are commonly welcoming, but jumps, kneeling and fast direction changes vary by routine. Ask whether choreography can be marked, kept standing or adapted to a chair.",
    ratings("medium", "low", "medium", "high", "medium", "high"), SOUTH_ASIAN_SOURCES
  ),
  Bhangra: guide(
    "Bhangra", "bhangra",
    "A buoyant Punjabi dance tradition and modern popular form known for strong rhythm, lifted energy and expansive arm gestures.",
    "Bhangra has roots in Punjabi seasonal and community celebrations and changed substantially through staged competition, migration and popular music. Contemporary classes may mix folk-derived steps with fitness and performance choreography.",
    "Expect bouncing footwork, repeated arm patterns, shoulder action and energetic combinations to a strong dhol-led beat. Classes are often communal and rhythmically direct.",
    "The repeated bounce and raised arms can be cardiovascular and demanding, but steps can be made smaller or seated. Ask about low-impact options and rest intervals.",
    ratings("medium", "low", "high", "high", "medium", "high"), SOUTH_ASIAN_SOURCES
  ),
  Kathak: guide(
    "Kathak", "kathak",
    "A North Indian classical form combining intricate footwork, spins, rhythmic composition, gesture and storytelling.",
    "Kathak’s lineages connect storytelling traditions, devotional practice and the courts of North India, with major gharanas developing distinctive approaches. Colonial and post-independence institutions also shaped how the form is staged and taught today.",
    "Classes practise posture, footwork syllables, turns, hand gestures, rhythmic cycles and expressive storytelling. Progress is cumulative and often supported by close study of North Indian music.",
    "Foundations are structured but repeated stamping and turning require balance and stamina. Ask about supported practice, reduced turns, seated hand and rhythm work, and suitable floor or footwear.",
    ratings("high", "low", "medium", "medium", "medium", "high"), [SOURCES.kathak, SOURCES.indianDance]
  ),
  Bharatanatyam: guide(
    "Bharatanatyam", "bharatanatyam",
    "A South Indian classical form integrating precise geometry, rhythmic footwork, gesture, expression and narrative.",
    "Bharatanatyam developed from performance traditions in Tamil Nadu associated with temples and courts and was reshaped for the modern stage during the twentieth century. Its history includes hereditary artists whose contributions were often marginalised in revival narratives.",
    "Training develops half-seated posture, basic step units, hand gestures, eye focus, rhythmic coordination and expressive interpretation. The vocabulary is codified and usually learned progressively.",
    "Deep knee flexion, stamping and sustained posture make many classes physically demanding. Ask about stance depth, pacing and whether hand gesture, expression or rhythm can be studied seated.",
    ratings("high", "low", "high", "medium", "medium", "high"), [SOURCES.indianDance, SOURCES.kathak]
  ),
  "Other South Asian": guide(
    "Other South Asian", "other-south-asian",
    "A discovery category for South Asian forms not separately listed, including Odissi, Kuchipudi and many regional practices.",
    "South Asia contains numerous classical, folk, social and contemporary dance traditions with distinct languages, communities and histories. This calendar label is intentionally broad and should never be taken as evidence that those forms are interchangeable.",
    "Class structure may range from codified technique and storytelling to celebratory group dance or contemporary choreography. Read the organiser’s description to identify the actual form and its level.",
    "Physical demands cannot be rated reliably across this broad category. Ask the teacher about posture, floorwork, impact, cultural context and specific adaptations before attending.",
    ratings("medium", "low", "medium", "medium", "medium", "high"), SOUTH_ASIAN_SOURCES
  ),

  Flamenco: guide(
    "Flamenco", "flamenco",
    "An Andalusian art bringing together dance, song, guitar, hand-clapping and deeply structured rhythmic cycles.",
    "Flamenco developed in Andalusia through complex exchanges among Gitano, Andalusian, Moorish, Jewish and other communities. Its histories are debated, but Gitano artists have been essential to its transmission and continuing identity.",
    "Classes build posture, arm pathways, footwork, turns, clapping and understanding of compás. Technique and expressive interpretation develop together over sustained study.",
    "Beginners can learn marking and rhythm gradually, but stamping, standing and arm carriage may be tiring. Ask about quieter footwork, chair support and seated compás or upper-body practice.",
    ratings("high", "low", "high", "medium", "medium", "high"), [SOURCES.flamenco, SOURCES.unescoHeritage]
  ),
  Samba: guide(
    "Samba", "samba",
    "A family of Afro-Brazilian music and dance practices ranging from social circles to carnival and stage forms.",
    "Samba developed in Brazil through African diasporic traditions, especially in Bahia, and later urban communities in Rio de Janeiro. Samba de roda, carnival samba and partner forms have related but distinct histories and should not be collapsed into one technique.",
    "Classes may focus on rapid weight changes, bounce, hip action, travelling steps or carnival choreography. Musical responsiveness and sustained rhythmic energy are central.",
    "Many formats are vigorous and balance-intensive, though rhythm and upper-body action can be adapted. Ask about tempo, footwear, impact and seated options.",
    ratings("medium", "low", "high", "high", "medium", "high"), [SOURCES.samba, SOURCES.unescoHeritage]
  ),
  Capoeira: guide(
    "Capoeira", "capoeira",
    "An Afro-Brazilian practice combining game, music, movement, ritual, strategy and community in a circle called the roda.",
    "Capoeira was developed by enslaved Africans and their descendants in Brazil and survived criminalisation and repression before gaining wider recognition. Different schools and lineages preserve distinct rhythms, rituals and movement priorities.",
    "Classes build the ginga, evasions, kicks, floor movements, partner games, songs and instruments. Participants learn how movement and music regulate the roda rather than treating capoeira as acrobatics alone.",
    "The practice can be highly athletic and may load wrists, knees and the floor, although foundations can be scaled. Ask about non-inverted, supported and music-focused participation.",
    ratings("high", "high", "high", "medium", "low", "high"), [SOURCES.capoeira, SOURCES.unescoHeritage]
  ),
  "Belly Dance": guide(
    "Belly Dance", "belly-dance",
    "An umbrella studio term for dances using detailed torso and hip articulation, often drawing on Middle Eastern and North African traditions.",
    "The Western label ‘belly dance’ has covered varied forms including Egyptian raqs sharqi, social dances and theatrical interpretations. Colonial exhibition, cinema and global teaching shaped popular images, so culturally specific naming is more informative where possible.",
    "Classes often isolate hips, chest and abdomen, develop travelling steps and combine them in musical phrases. Props and performance styles vary by lineage.",
    "Much material is low impact and can adapt to sitting, but sustained posture and repeated isolations may still fatigue the body. Ask about chair-based participation and the specific form being taught.",
    ratings("medium", "low", "low", "high", "high", "high"), FOLK_SOURCES
  ),
  Dabke: guide(
    "Dabke", "dabke",
    "A communal Levantine line dance using linked hands, strong stepping, stamps and shared rhythmic momentum.",
    "Dabke is practised across Palestine, Lebanon, Syria, Jordan and neighbouring communities, with regional steps and music. It is danced at weddings, celebrations and cultural events and has also become an expression of identity in diaspora.",
    "Participants learn a repeating step pattern, line connection, directional changes and rhythmic accents, sometimes following a leader. Group energy is more important than solo display.",
    "Basic patterns can welcome beginners, but stamping, hopping and linked-line travel may be demanding. Ask about lighter steps, joining without handhold and seated rhythmic participation.",
    ratings("medium", "medium", "high", "high", "medium", "high"), FOLK_SOURCES
  ),
  "Ceilidh/Scottish Country Dance": guide(
    "Ceilidh/Scottish Country Dance", "ceilidh-scottish-country-dance",
    "Scottish group and couple dancing built from shared figures, travelling patterns and lively traditional music.",
    "Ceilidh dancing belongs to social gatherings with music, song and dance, while Scottish country dance developed a more standardised repertoire of formations and steps. Both continue as participatory traditions rather than only staged heritage.",
    "A caller or teacher explains figures before groups dance them in sets. Expect walking or skipping patterns, hand connection, partner changes and repeated sequences.",
    "Calling makes many events beginner-friendly, but pace, hopping and crowded formations can be demanding. Ask about walking the steps, taking breaks and inclusive set formations.",
    ratings("medium", "high", "medium", "high", "medium", "high"), FOLK_SOURCES
  ),
  "English Country Dance": guide(
    "English Country Dance", "english-country-dance",
    "A social set-dance tradition using walking patterns, figures and partner changes to live or recorded music.",
    "English country dance has documented repertoires reaching back to early modern printed manuals, alongside living local practice. It travelled internationally and has been repeatedly revived, adapted and newly choreographed.",
    "A caller teaches each dance, then couples move through lines, circles or square-like formations. Most sequences repeat, allowing participants to learn while dancing.",
    "Many dances use walking steps and are beginner-friendly, though long sets and turns require stamina and orientation. Ask about slower dances, rest and non-turning alternatives.",
    ratings("low", "high", "low", "high", "high", "high"), [SOURCES.socialDance, SOURCES.folkDance]
  ),
  "Irish Céilí/Set Dance": guide(
    "Irish Céilí/Set Dance", "irish-ceili-set-dance",
    "Irish social group dancing organised in couples and formations, driven by reels, jigs, hornpipes and communal rhythm.",
    "Céilí and set dancing developed through Irish social gatherings, local repertoires and interactions with quadrille formations. Revival movements, competitions and diaspora communities helped sustain and reshape the traditions.",
    "Callers teach figures for couples arranged in lines, circles or square sets. Footwork ranges from walking patterns to lively stepping, depending on the event.",
    "Beginners can follow repeated figures, but speed, hopping and sustained standing vary. Ask whether walking steps, breaks and supported participation are welcome.",
    ratings("medium", "high", "medium", "high", "medium", "high"), FOLK_SOURCES
  ),
  "Contra Dance": guide(
    "Contra Dance", "contra-dance",
    "A North American called social dance in long lines, using repeating figures and partner progression to energetic live music.",
    "Contra dance developed from English country and related European social dances in North America. Community revivals and new choreography expanded the repertoire while preserving live calling and collective participation.",
    "A caller walks everyone through the sequence before the music starts. Couples repeat figures with new neighbours, creating a continuous social flow down the set.",
    "No prior choreography is usually needed, but repeated spinning and long dances can cause fatigue or dizziness. Ask about walking, reduced-turn substitutions and sitting out individual dances.",
    ratings("low", "high", "medium", "high", "medium", "high"), [SOURCES.socialDance, SOURCES.folkDance]
  ),
  "Line Dance": guide(
    "Line Dance", "line-dance",
    "Group dancing in rows without a fixed partner, using repeated step sequences to country, pop and many other musics.",
    "Line dances have many sources, from folk formations and country-western venues to disco and global popular hits. Modern scenes continually create named choreographies that circulate through classes, clubs and online communities.",
    "Teachers demonstrate a sequence in sections, then the group repeats it through changing wall directions. Classes are commonly graded by choreography difficulty.",
    "Beginner routines can be accessible and partner-free, but turns and quick weight changes affect balance. Ask for a front-row position, reduced turns, chair support or seated versions.",
    ratings("medium", "low", "medium", "high", "high", "high"), FOLK_SOURCES
  ),
  "Folk/Traditional": guide(
    "Folk/Traditional", "folk-traditional",
    "A broad discovery category for community dance traditions whose histories, functions and techniques are culturally specific.",
    "Folk and traditional dances are living practices connected to particular communities, celebrations, work, ritual, music and identity. Collection, revival and stage presentation can change them, so the organiser should name the actual tradition and its community context.",
    "Classes may use circles, lines, couples, solo steps, live music or calling. Read the listing carefully because partner expectations and physical demand vary enormously.",
    "No single accessibility rating fits this category. Ask about the exact dance, pace, floor, partner contact, seating and whether movements can be adapted without losing group participation.",
    ratings("medium", "medium", "medium", "medium", "medium", "high"), FOLK_SOURCES
  ),

  "Physical Theatre": guide(
    "Physical Theatre", "physical-theatre",
    "Performance training in which body, space, action and ensemble composition carry as much meaning as spoken text.",
    "Physical theatre is an umbrella for varied twentieth- and twenty-first-century practices influenced by mime, actor training, dance, circus, devising and directors such as Jacques Lecoq. It describes an approach to making performance rather than one technique.",
    "Workshops may use games, character, improvisation, ensemble tasks, objects and devised scenes. Participants are often asked to make creative choices rather than reproduce a fixed dance phrase.",
    "Demand and contact vary widely, from gentle observation to running, lifting or floorwork. Ask about touch, improvisation pressure, sensory environment and adapted roles within ensemble tasks.",
    ratings("medium", "medium", "medium", "high", "medium", "low"), THEATRE_SOURCES
  ),
  "Dance Theatre": guide(
    "Dance Theatre", "dance-theatre",
    "A performance field combining choreography with dramatic image, character, voice, objects or narrative structure.",
    "Dance theatre has multiple lineages, including German Tanztheater and choreographers who challenged boundaries between concert dance and theatre. Contemporary artists use the term broadly for work where movement and theatrical meaning are inseparable.",
    "Classes may combine technical movement, improvisation, text, character and composition. The emphasis is often on communicating an idea rather than perfecting one standard vocabulary.",
    "Because tasks vary, contact the teacher about floorwork, speech, touch and emotional content. Creative roles can sometimes be adapted even when a particular movement phrase is inaccessible.",
    ratings("medium", "low", "medium", "medium", "medium", "low"), THEATRE_SOURCES
  ),
  "Mime/Clown/Mask": guide(
    "Mime/Clown/Mask", "mime-clown-mask",
    "A performance-training category using physical precision, play, character and visual storytelling with little or no text.",
    "European mime, clown and mask training draws on long theatrical and popular-performance histories, while contemporary teachers also work from circus, commedia, devised theatre and global mask traditions. These practices are related but not interchangeable.",
    "Sessions may explore isolation, gesture, comic failure, audience relationship, neutral or character mask, and short improvised scenes. Emotional exposure can feel more challenging than the movement itself.",
    "Many tasks can adapt to different movement ranges, but masks affect vision and clowning can involve falls or fast response. Ask about floorwork, sensory access, facial visibility and alternative ways to perform a task.",
    ratings("medium", "low", "medium", "high", "high", "low"), THEATRE_SOURCES
  ),
  "Pole/Aerial": guide(
    "Pole/Aerial", "pole-aerial",
    "Apparatus-based movement combining strength, technique, flexibility, spins, climbs and performance in the air or on a pole.",
    "Pole and aerial arts have different histories across circus, acrobatics, dance, fitness and performance. Modern studio practice includes many disciplines—such as pole, hoop, silks and trapeze—each with its own equipment and safety progression.",
    "Beginner classes teach grip, conditioning, safe entries and foundational shapes close to the floor before progressing to climbs or inversions. Qualified spotting, equipment checks and staged progression are essential.",
    "These forms place substantial load through grip, shoulders and skin and are not automatically accessible because a class is labelled beginner. Discuss mobility, transfer, weight-bearing and adapted apparatus provision before booking.",
    ratings("high", "low", "high", "medium", "low", "medium"), [SOURCES.theatreDance, SOURCES.danceResearch]
  )
} satisfies Record<GuideableDanceStyle, DanceStyleGuide>;

const GUIDE_LIST = (DANCE_STYLES.filter((style): style is GuideableDanceStyle => style !== "Other"))
  .map((style) => DANCE_STYLE_GUIDES[style]);

const GUIDE_BY_SLUG = new Map(GUIDE_LIST.map((item) => [item.slug, item]));

export function getDanceStyleGuides(): DanceStyleGuide[] {
  return [...GUIDE_LIST];
}

export function getDanceStyleGuideBySlug(slug: string): DanceStyleGuide | undefined {
  return GUIDE_BY_SLUG.get(slug);
}

export function getStyleCalendarHref(style: GuideableDanceStyle): string {
  return `/?style=${encodeURIComponent(style)}`;
}
