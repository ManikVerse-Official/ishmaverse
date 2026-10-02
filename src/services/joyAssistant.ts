/**
 * Joy's local knowledge base.
 *
 * Joy is a rule-based assistant (no external LLM), so "smartness" comes from
 * this file: it maps what a visitor types — English or Hinglish — to a section
 * of Ishmaverse, decides whether they are asking *where* something is or asking
 * to be *taken there*, and answers in the right language.
 *
 * Language policy: English is the default. Joy only switches to Hinglish when
 * the visitor actually writes in Hinglish. Every reply therefore exists in both
 * languages. Joy is female, so Hinglish replies use feminine verb forms.
 *
 * Every section of the mall lives in `src/data/sections.ts`; the routes here
 * mirror the app's real routes so a match can navigate straight to it.
 */

import {
  JOY_FAQ,
  type JoyFaqEntry,
  type JoyGuideStep,
  type JoySectionGuide,
  getSectionGuide,
} from './joySectionGuides';

export type JoyLang = 'en' | 'hi';
export type { JoyGuideStep, JoySectionGuide };
export { getSectionGuide };

/** Bilingual text, resolved with {@link pick}. */
export interface JoyText {
  en: string;
  hi: string;
}

export const pick = (text: JoyText, lang: JoyLang): string => text[lang];

export interface JoyTopic {
  id: string;
  /** In-app route for this section/thing. */
  route: string;
  emoji: string;
  name: string;
  available: boolean;
  /** Trigger words/phrases (English + Hindi/Hinglish, lower-case). */
  keywords: string[];
  /** Short "where it is + what it does" answer. */
  reply: JoyText;
  /** Label for the tap-to-open button under the reply. */
  actionLabel: JoyText;
}

const sectionsRoute = (id: string) => `/section/${id}`;

/** Where the in-app founder page lives. */
export const FOUNDER_ROUTE = '/founder';

/** Every section a visitor can be pointed to, plus a couple of info areas. */
export const JOY_TOPICS: JoyTopic[] = [
  {
    id: 'greetings',
    route: sectionsRoute('greetings'),
    emoji: '💌',
    name: 'Digital Greetings',
    available: true,
    keywords: [
      'greeting', 'greetings', 'greeting card', 'greeting cards', 'e card', 'ecard', 'e-card',
      'card', 'cards', 'wish', 'wishes', 'wishing', 'birthday', 'bday', 'b day', 'anniversary',
      'wedding', 'marriage', 'shaadi', 'shadi', 'diwali', 'deepavali', 'holi', 'christmas', 'xmas',
      'new year', 'valentine', 'romantic', 'love', 'thank you', 'thankyou', 'thanks', 'congrats',
      'congratulations', 'farewell', 'baby shower', 'get well', 'rakhi', 'raksha bandhan',
      'mubarak', 'shubhkamna', 'badhai', 'badhaai', 'khushkhabri', 'card banana', 'card banan',
      'card bnana', 'card banao', 'greeting banana', 'greeting bhej', 'wish bhej', 'wish banao',
      'card kaise bana', 'card kaise banaye', 'greeting kaha', 'card kaha', 'greeting card kaha',
      'happy birthday card', 'invitation', 'invite',
    ],
    reply: {
      en: 'Digital Greetings 💌 live in the “Digital Greetings” section of the mall. There you will find animated cards for birthdays, anniversaries, weddings, Diwali, Christmas, thank-yous and more — and a FREE Welcome Card sits right at the top. Would you like me to take you there?',
      hi: 'Digital Greetings 💌 mall ke “Digital Greetings” section me hai. Birthday, anniversary, wedding, Diwali, Christmas aur thank-you — sab ke animated cards milte hain, aur sabse upar ek FREE Welcome Card bhi hai. Main aapko wahan le chalti hoon?',
    },
    actionLabel: { en: 'Open Digital Greetings', hi: 'Digital Greetings kholo' },
  },
  {
    id: 'reportcard-studio',
    route: sectionsRoute('reportcard-studio'),
    emoji: '📊',
    name: 'ReportCard Studio',
    available: true,
    keywords: [
      'report card', 'report-card', 'reportcard', 'report cards', 'report', 'reports', 'marksheet',
      'mark sheet', 'marks card', 'result', 'results', 'school', 'schools', 'student', 'students',
      'teacher', 'teachers', 'excel', 'xls', 'xlsx', 'csv', 'pdf', 'holistic', 'academic', 'grade',
      'grades', 'cbse', 'term report', 'class result', 'report banao', 'report banana', 'report bnana',
      'marksheet banao', 'marksheet banana', 'result banao', 'result banana', 'result card',
      'student report', 'school report', 'report card maker', 'report card generator', 'padhai',
      'pariksha', 'imtihan', 'report kaha', 'report card kaha', 'marksheet kaha',
    ],
    reply: {
      en: 'ReportCard Studio 📊 is in the “ReportCard Studio” section. Upload an Excel sheet, map the columns and download print-ready report cards — holistic or academic — as PDFs. The first 7 generations are free. Shall I take you there?',
      hi: 'ReportCard Studio 📊 “ReportCard Studio” section me hai. Excel sheet upload karo, columns map karo aur holistic ya academic report cards PDF me download karo. Pehli 7 generations free hain. Main aapko wahan le chalti hoon?',
    },
    actionLabel: { en: 'Open ReportCard Studio', hi: 'ReportCard Studio kholo' },
  },
  {
    id: 'free-card',
    route: sectionsRoute('greetings'),
    emoji: '🎁',
    name: 'Free Welcome Card',
    available: true,
    keywords: [
      'free', 'free card', 'free greeting', 'free me', 'free mein', 'muft', 'muft card',
      'welcome card', 'free kaise', 'free wishing', 'free wish', 'no cost card',
    ],
    reply: {
      en: 'The FREE Welcome Card 💌 is pinned at the very top of the “Digital Greetings” section. It is marked FREE — one free card per email. Would you like me to open it for you?',
      hi: 'FREE Welcome Card 💌 “Digital Greetings” section me sabse upar hai. Us par FREE likha hai — ek email se ek card bilkul free. Main aapko wahan le chalti hoon?',
    },
    actionLabel: { en: 'Open the free card', hi: 'Free card kholo' },
  },
  {
    id: 'ui-themes',
    route: sectionsRoute('ui-themes'),
    emoji: '🎨',
    name: 'UI Themes & Scripts',
    available: false,
    keywords: [
      'ui', 'ui theme', 'ui themes', 'theme', 'themes', 'figma', 'figma kit', 'template',
      'templates', 'web layout', 'layout', 'mockup', 'mockups', 'design', 'design kit',
      'website theme', 'ui kit', 'ui kaha', 'theme kaha',
    ],
    reply: {
      en: 'UI Themes & Scripts 🎨 is a section of the mall for Figma kits, web layouts and mockups. It is not live yet (“Coming soon”), but I can show you the section page.',
      hi: 'UI Themes & Scripts 🎨 mall ka ek section hai — Figma kits, web layouts aur mockups ke liye. Abhi ye live nahi hai (“Coming soon”), par main aapko uska page dikha sakti hoon.',
    },
    actionLabel: { en: 'Show UI Themes section', hi: 'UI Themes dikhao' },
  },
  {
    id: 'tech-ai',
    route: sectionsRoute('tech-ai'),
    emoji: '🤖',
    name: 'Tech & AI',
    available: false,
    keywords: [
      'tech', 'ai', 'a.i', 'artificial intelligence', 'autocad', 'auto cad', 'script', 'scripts',
      'automation', 'automatic', 'wiring', 'electric', 'diagram', 'machine learning', 'ml',
      'tech kaha', 'ai kaha',
    ],
    reply: {
      en: 'Tech & AI 🤖 is the section for AutoCAD scripts, wiring assistants and automation tools. It is still “Coming soon”, but I can show you the section page.',
      hi: 'Tech & AI 🤖 section me AutoCAD scripts, wiring assistants aur automation tools honge. Abhi “Coming soon” hai, par main aapko us section par le chal sakti hoon.',
    },
    actionLabel: { en: 'Show Tech & AI section', hi: 'Tech & AI dikhao' },
  },
  {
    id: 'education',
    route: sectionsRoute('education'),
    emoji: '📚',
    name: 'Education',
    available: false,
    keywords: [
      'education', 'notes', 'note', 'sample paper', 'question bank', 'study', 'study material',
      'padhai', 'padai', 'syllabus', 'exam', 'education kaha', 'notes kaha',
    ],
    reply: {
      en: 'Education 📚 will hold notes, sample papers and question banks. It is not live yet (“Coming soon”) — I can take you to the section page.',
      hi: 'Education 📚 section me notes, sample papers aur question banks aayenge. Abhi “Coming soon” hai — main aapko us section ka page dikha sakti hoon.',
    },
    actionLabel: { en: 'Show Education section', hi: 'Education dikhao' },
  },
  {
    id: 'originals',
    route: sectionsRoute('originals'),
    emoji: '✨',
    name: 'Originals',
    available: false,
    keywords: [
      'original', 'originals', 'artwork', 'wallpaper', 'wallpapers', 'print', 'print on demand',
      'poster', 'posters', 'art', 'painting', 'originals kaha',
    ],
    reply: {
      en: 'Originals ✨ is where premium artwork, wallpapers and print-on-demand products will live. It is “Coming soon” for now, but I can take you there.',
      hi: 'Originals ✨ section me premium artwork, wallpapers aur print-on-demand products honge. Filhaal “Coming soon” hai, par main aapko wahan le chal sakti hoon.',
    },
    actionLabel: { en: 'Show Originals section', hi: 'Originals dikhao' },
  },
  {
    id: 'fx-studios',
    route: sectionsRoute('fx-studios'),
    emoji: '🎬',
    name: 'FX / Studios',
    available: false,
    keywords: [
      'fx', 'vfx', 'video', 'videos', 'effect', 'effects', 'transition', 'transitions', 'premiere',
      'premiere pro', 'editing', 'video edit', 'video effect', 'animation pack', 'fx kaha',
    ],
    reply: {
      en: 'FX / Studios 🎬 will offer video effects, transitions and Premiere packs. It is “Coming soon” — I can show you the section.',
      hi: 'FX / Studios 🎬 section me video effects, transitions aur Premiere packs honge. Abhi “Coming soon” hai — main aapko us section par le chal sakti hoon.',
    },
    actionLabel: { en: 'Show FX / Studios section', hi: 'FX / Studios dikhao' },
  },
  {
    id: 'comics',
    route: sectionsRoute('comics'),
    emoji: '📖',
    name: 'Comics',
    available: false,
    keywords: ['comic', 'comics', 'graphic novel', 'manga', 'story', 'stories', 'series', 'comic book', 'comics kaha'],
    reply: {
      en: 'Comics 📖 will carry graphic novels and ongoing series. It is “Coming soon” for now — I can take you to the section.',
      hi: 'Comics 📖 section me graphic novels aur ongoing series aayengi. Filhaal “Coming soon” hai — main aapko wahan le chal sakti hoon.',
    },
    actionLabel: { en: 'Show Comics section', hi: 'Comics dikhao' },
  },
];

/* ------------------------------------------------------------------ */
/* Founder                                                            */
/* ------------------------------------------------------------------ */

/**
 * The founder intro asks a question, so the caller waits for the answer before
 * navigating. Joy never invents details — just the name and the offer.
 */
export const FOUNDER_INTRO: JoyText = {
  en: 'Ishmaverse is founded by Manik. Would you like to see his profile?',
  hi: 'Ishmaverse ke founder Manik hain. Unka profile dekhna chahenge?',
};

export const FOUNDER_YES: JoyText = {
  en: 'Great — opening Manik’s profile now.',
  hi: 'Bilkul — main Manik ka profile khol rahi hoon.',
};

export const FOUNDER_NO: JoyText = {
  en: 'No problem. How can I help you?',
  hi: 'Koi baat nahi. Main aur kaise madad kar sakti hoon?',
};

export const FOUNDER_VIEW_LABEL: JoyText = {
  en: 'See Manik’s profile',
  hi: 'Manik ka profile dekho',
};

/* ------------------------------------------------------------------ */
/* Phrase banks                                                       */
/* ------------------------------------------------------------------ */

/** Words that mean "take me there". */
const OPEN_WORDS = [
  'open', 'open it', 'open karo', 'open kar do', 'kholo', 'khol do', 'khol', 'le chalo', 'le chal',
  'le jao', 'lejao', 'le jana', 'le chaliye', 'chalo', 'chal', 'navigate', 'go to', 'take me',
  'dikhao', 'dikha do', 'dikha', 'dikhaiye', 'show me', 'show', 'jao', 'jana', 'pahuncha do',
  'bhej do', 'open kr', 'open kar',
];

/** Words that mean "where is it". */
const WHERE_WORDS = [
  'where', 'where is', 'where are', 'kaha', 'kahan', 'kahaan', 'konsi', 'kaunsi', 'kis section',
  'which section', 'location', 'find', 'dhoondo', 'dhundo', 'kahan hai', 'kaha hai',
];

/** Pricing / cost words. */
const PRICING_WORDS = [
  'price', 'prices', 'pricing', 'cost', 'costs', 'rate', 'rates', 'charges', 'charge', 'kitna',
  'kitne', 'kitna paisa', 'paisa', 'paise', 'rupees', 'rupaye', 'amount', 'fee', 'fees',
  'subscription', 'plan', 'plans', 'package', 'mehnga', 'sasta',
];

/** "What can you do / what is this site" words. */
const HELP_WORDS = [
  'help', 'madad', 'what can you do', 'kya kar sakte', 'kya kar sakti', 'sections', 'section',
  'mall', 'what is this', 'kya hai', 'about', 'ishmaverse kya', 'kya kya hai', 'list',
];

/** Founder / ownership words. */
const FOUNDER_WORDS = [
  'founder', 'co founder', 'co-founder', 'owner', 'creator', 'who made this',
  'who made', 'who owns', 'who built', 'who is behind', 'team behind', 'manik', 'manik dey',
  'portfolio', 'malik', 'kiski website', 'kisne banaya', 'kisne banai', 'kisne bnaya',
  'kaun banaya', 'kon banaya', 'kiska hai', 'owner kaun', 'founder kaun', 'boss',
];

/** Clear "yes" answers. */
const YES_WORDS = [
  'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'yes please', 'go ahead', 'please do',
  'haan', 'ha', 'haa', 'hn', 'han', 'haanji', 'bilkul', 'zaroor', 'dikhao', 'dikhaiye',
  'kholo', 'le chalo', 'le chaliye', 'show me', 'open it',
];

/** Clear "no" answers. */
const NO_WORDS = [
  'no', 'nope', 'nah', 'nahi', 'nahin', 'nai', 'na', 'not now', 'later', 'baad me', 'baad mein',
  'abhi nahi', 'no thanks', 'no thank you', 'skip', 'rehne do', 'chhodo', 'chodo', 'nahi chahiye',
];

/** Markers that strongly indicate romanised Hindi (Hinglish). */
const HINGLISH_MARKERS = [
  'kya', 'kaise', 'kaisa', 'kaisi', 'kaha', 'kahan', 'kahaan', 'nahi', 'nahin', 'mujhe', 'mera',
  'meri', 'tum', 'aap', 'aapko', 'aapka', 'aapki', 'chahiye', 'karo', 'kro', 'krna', 'karna',
  'kholo', 'khol', 'bolo', 'bol', 'yaar', 'bhai', 'kaun', 'kon', 'kisne', 'kis', 'mein', 'bohot',
  'bahut', 'theek', 'thik', 'dikhao', 'dikhaiye', 'dikha', 'batao', 'bata', 'jaldi', 'matlab',
  'wala', 'waala', 'kyun', 'kyu', 'konsi', 'kaunsi', 'chalo', 'chal', 'dedo', 'sakta', 'sakti',
  'haan', 'haa', 'hn', 'hai', 'hain', 'kitna', 'kitne', 'paisa', 'paise', 'rupaye', 'zaroor',
  'bilkul', 'accha', 'acha', 'haanji', 'lelo', 'chalega', 'hoga', 'hogi', 'kaunsi', 'wahan',
  'yahan', 'dekhna', 'bana', 'banaya', 'banao', 'hoja',
];

/* ------------------------------------------------------------------ */
/* Localised built-in replies                                         */
/* ------------------------------------------------------------------ */

const PRICING_REPLY: JoyText = {
  en: 'Pricing 💰 — Digital Greetings cards start at ₹47 within India (from $2 elsewhere), and there is a FREE Welcome Card as well. ReportCard Studio plans are ₹369 / ₹578 / ₹859 (6 months each), with the first 7 report generations free. Which one would you like the exact price for?',
  hi: 'Pricing 💰 — Digital Greetings ke animated cards ₹47 se shuru hote hain (India; bahar ke liye $2+), aur ek FREE Welcome Card bhi hai. ReportCard Studio ke plans ₹369 / ₹578 / ₹859 (6 months) hain, pehli 7 report generations free. Kis cheez ka exact price chahiye?',
};

const HELP_REPLY: JoyText = {
  en: 'I’m Joy, the assistant here at Ishmaverse. Two sections are live right now: 💌 Digital Greetings (animated cards, plus a FREE welcome card) and 📊 ReportCard Studio (Excel in, report cards out). The rest are coming soon. Just tell me what you’re looking for and I’ll take you straight there.',
  hi: 'Main Joy hoon, Ishmaverse ki assistant. Abhi do sections live hain: 💌 Digital Greetings (animated cards + ek FREE welcome card) aur 📊 ReportCard Studio (Excel se report cards). Baaki coming soon hain. Aap jo dhoondh rahe ho bata dijiye, main seedha wahan le chalti hoon.',
};

const FALLBACK_REPLY: JoyText = {
  en: 'I can help you find any section of Ishmaverse, check prices, or take you to the founder’s profile. What would you like?',
  hi: 'Main aapko Ishmaverse ka koi bhi section dhundhne me, price batane me, ya founder ke profile tak le jaane me madad kar sakti hoon. Aap kya chahenge?',
};

export const getFallback = (lang: JoyLang): string => pick(FALLBACK_REPLY, lang);

/* ------------------------------------------------------------------ */
/* Matching                                                           */
/* ------------------------------------------------------------------ */

/** Lower-cases, strips punctuation and collapses whitespace. */
const normalize = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^\w\s+.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whole-word matcher. Word boundaries stop short keywords from matching inside
 * unrelated words ("ai" in "mail", "ui" in "build", "art" in "start").
 */
const toRegexes = (words: string[]): RegExp[] =>
  words.map((word) => new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i'));

const anyMatch = (text: string, regexes: RegExp[]): boolean => regexes.some((re) => re.test(text));

const OPEN_RE = toRegexes(OPEN_WORDS);
const WHERE_RE = toRegexes(WHERE_WORDS);
const PRICING_RE = toRegexes(PRICING_WORDS);
const HELP_RE = toRegexes(HELP_WORDS);
const FOUNDER_RE = toRegexes(FOUNDER_WORDS);
const YES_RE = toRegexes(YES_WORDS);
const NO_RE = toRegexes(NO_WORDS);
const HINGLISH_RE = toRegexes(HINGLISH_MARKERS);
const TOPIC_REGEXES = new Map<string, RegExp[]>(
  JOY_TOPICS.map((topic) => [topic.id, toRegexes(topic.keywords)]),
);

/** "show me how to use this" — a walkthrough request rather than a lookup. */
const GUIDE_WORDS = [
  'how do i', 'how to', 'how can i', 'how do you', 'guide', 'guide me', 'walk me',
  'walkthrough', 'walk through', 'steps', 'step by step', 'help me', 'i am stuck', 'stuck',
  'confused', 'what do i do', 'what to do', 'teach me', 'explain', 'show me how', 'tutorial',
  'kaise', 'kaisa', 'kese', 'kaise kare', 'kaise karu', 'kaise use', 'use kaise', 'samjhao',
  'samjao', 'samjha do', 'batao kaise', 'madad karo', 'kya karu', 'kya karna', 'shuru kaise',
];

const GUIDE_RE = toRegexes(GUIDE_WORDS);
const FAQ_MATCHERS = JOY_FAQ.map((entry: JoyFaqEntry) => toRegexes(entry.keywords));

/** True when the message is asking to be taught how to use something. */
export const isGuideQuery = (raw: string): boolean => {
  const text = normalize(raw);
  return text.length > 0 && anyMatch(text, GUIDE_RE);
};

/**
 * The walkthrough for the section the visitor is currently standing in.
 * Returns null when there is no guided section (e.g. the home page).
 */
export const resolveJoyGuide = (
  raw: string,
  lang: JoyLang,
  sectionId?: string,
): { reply: string; steps: JoyGuideStep[] } | null => {
  if (!isGuideQuery(raw)) return null;
  const guide = getSectionGuide(sectionId);
  if (!guide) return null;
  return {
    reply: `${pick(guide.intro, lang)}\n\n${lang === 'hi' ? 'Step' : 'Step'} 1 of ${
      guide.steps.length
    }: ${pick(guide.steps[0].title, lang)}`,
    steps: guide.steps,
  };
};

/** One-tap questions shown for the current section (empty on the home page). */
export const getSectionChips = (sectionId?: string): JoyText[] =>
  getSectionGuide(sectionId)?.chips ?? [];

/** Answers a product question (free card, payment, receipt, plans, …). */
export const resolveJoyFaq = (raw: string, lang: JoyLang): string | null => {
  const text = normalize(raw);
  if (!text) return null;
  const index = FAQ_MATCHERS.findIndex((matchers) => anyMatch(text, matchers));
  return index >= 0 ? pick(JOY_FAQ[index].reply, lang) : null;
};

/**
 * Detects whether a message is written in Hinglish. English is the default, so
 * anything without a Hindi marker stays English.
 */
export const detectJoyLanguage = (raw: string): JoyLang =>
  anyMatch(normalize(raw), HINGLISH_RE) ? 'hi' : 'en';

/** True when the visitor is asking about the founder / owner. */
export const isFounderQuery = (raw: string): boolean => {
  const text = normalize(raw);
  return text.length > 0 && anyMatch(text, FOUNDER_RE);
};

/** Reads a short yes/no answer (used by the founder confirmation step). */
export const parseConfirmation = (raw: string): 'yes' | 'no' | null => {
  const text = normalize(raw);
  if (!text) return null;
  if (anyMatch(text, NO_RE)) return 'no';
  if (anyMatch(text, YES_RE)) return 'yes';
  return null;
};

/** Longest keyword that the text actually contains (multi-word matches win). */
const matchTopic = (text: string): JoyTopic | null => {
  let best: JoyTopic | null = null;
  let bestLen = 0;
  for (const topic of JOY_TOPICS) {
    for (const re of TOPIC_REGEXES.get(topic.id) ?? []) {
      const match = text.match(re);
      if (match && match[0].length > bestLen) {
        best = topic;
        bestLen = match[0].length;
      }
    }
  }
  return best;
};

export type JoyResolution =
  | {
      kind: 'section';
      topic: JoyTopic;
      /** True when the user clearly asked to be taken there. */
      navigate: boolean;
      reply: string;
      actionLabel: string;
    }
  | { kind: 'pricing'; reply: string }
  | { kind: 'help'; reply: string };

/**
 * Resolves a visitor's message into an answer + an optional navigation target.
 * `lang` controls which language the reply is written in (default English).
 * Returns `null` when the message is unrelated (the caller then falls back).
 */
export const resolveJoyQuery = (raw: string, lang: JoyLang = 'en'): JoyResolution | null => {
  const text = normalize(raw);
  if (!text) return null;

  const topic = matchTopic(text);
  const wantsOpen = anyMatch(text, OPEN_RE);
  const wantsWhere = anyMatch(text, WHERE_RE);
  const wantsPrice = anyMatch(text, PRICING_RE);

  if (topic) {
    const base = pick(topic.reply, lang);
    const reply = wantsPrice
      ? `${base}\n\n${pick(
          {
            en: 'For reference: cards start at ₹47 and ReportCard plans at ₹369, with the first 7 generations free.',
            hi: 'Reference ke liye: cards ₹47 se aur ReportCard plans ₹369 se, pehli 7 generations free.',
          },
          lang,
        )}`
      : base;

    return {
      kind: 'section',
      topic,
      navigate: wantsOpen,
      reply,
      actionLabel: pick(topic.actionLabel, lang),
    };
  }

  /*
   * No destination matched, so treat it as a question and answer it: free
   * card, payment methods, receipts/bills, sign-in, plans, renewals, card
   * lifetime. These are the things people actually get stuck on.
   */
  const faq = resolveJoyFaq(raw, lang);
  if (faq) return { kind: 'help', reply: faq };

  if (wantsPrice) return { kind: 'pricing', reply: pick(PRICING_REPLY, lang) };
  if (anyMatch(text, HELP_RE) || (wantsWhere && wantsOpen)) {
    return { kind: 'help', reply: pick(HELP_REPLY, lang) };
  }

  return null;
};
