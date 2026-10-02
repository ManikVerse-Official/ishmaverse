/**
 * Joy's knowledge base for ReportCard Studio.
 *
 * Joy is rule-based (no external model), so her "smarts" live here: a
 * step-by-step guide per screen, a bank of answers for the questions people
 * actually ask, and bilingual copy everywhere. English is the default voice;
 * she switches to Hinglish only when the visitor writes in Hinglish.
 *
 * The Studio runs inside an iframe, so it cannot reuse the mall's Joy — this is
 * the in-Studio guider that knows every screen, button and limit.
 */

export type JoyLang = 'en' | 'hi';

/** Bilingual text, resolved with {@link pick}. */
export interface JoyText {
  en: string;
  hi: string;
}

export const pick = (text: JoyText, lang: JoyLang): string => text[lang];

/** Screens Joy can guide on, keyed by the Studio's own routes. */
export type StudioScreen =
  | 'dashboard'
  | 'school-profile'
  | 'import'
  | 'template'
  | 'generate'
  | 'pricing'
  | 'login';

export const screenFromPath = (pathname: string): StudioScreen => {
  if (pathname.startsWith('/school-profile')) return 'school-profile';
  if (pathname.startsWith('/import')) return 'import';
  if (pathname.startsWith('/template')) return 'template';
  if (pathname.startsWith('/generate')) return 'generate';
  if (pathname.startsWith('/pricing')) return 'pricing';
  if (pathname.startsWith('/login')) return 'login';
  return 'dashboard';
};

export interface GuideStep {
  title: JoyText;
  detail: JoyText;
}

export interface ScreenGuide {
  /** Shown the moment the panel opens on this screen. */
  intro: JoyText;
  /** Ordered steps for the walkthrough. */
  steps: GuideStep[];
  /** One-tap questions relevant to this screen. */
  chips: JoyText[];
}

/* ------------------------------------------------------------------ */
/* Per-screen guides                                                  */
/* ------------------------------------------------------------------ */

export const SCREEN_GUIDES: Record<StudioScreen, ScreenGuide> = {
  dashboard: {
    intro: {
      en: "You're on the Dashboard — this is your home base. It shows how many students are loaded, whether validation passed, and how many free generations you have left. Shall I walk you through the four steps?",
      hi: 'Aap Dashboard par ho — yahi aapka home base hai. Yahan dikhta hai kitne students load hain, validation pass hui ya nahi, aur kitni free generations bachi hain. Chaaron steps samjhaun?',
    },
    steps: [
      {
        title: { en: '1. Set up your School Profile', hi: '1. School Profile set karo' },
        detail: {
          en: 'Open School Profile and fill in the school name, address, academic session, exam term, logo and signatures. You only do this once — every card picks it up automatically afterwards.',
          hi: 'School Profile pe jao — school ka naam, address, academic session, exam term, logo aur signatures daalo. Ye ek hi baar karna hota hai, phir har card me apne aap aata hai.',
        },
      },
      {
        title: { en: '2. Import your Excel sheet', hi: '2. Excel sheet import karo' },
        detail: {
          en: 'Import Students pe apni .xlsx / .xls / .csv file drop karo. Columns automatically name, roll number, parents, attendance aur subjects se map ho jaate hain — kuch bhi hard-coded nahi hai, koi bhi subject add kar sakte ho.',
          hi: 'Import Students pe apni .xlsx / .xls / .csv file drop karo. Columns automatically name, roll number, parents, attendance aur subjects se map ho jaate hain — kuch bhi hard-coded nahi hai, koi bhi subject add kar sakte ho.',
        },
      },
      {
        title: { en: '3. Check the preview & validation', hi: '3. Preview aur validation check karo' },
        detail: {
          en: 'Report Template pe har student ka card dekho. Validation errors (missing name, duplicate roll, out-of-range marks) wahi dikhte hain — pehle unhe theek kar lo.',
          hi: 'Report Template pe har student ka card dekho. Validation errors (naam missing, duplicate roll, marks range se bahar) wahi dikhte hain — pehle unhe theek kar lo.',
        },
      },
      {
        title: { en: '4. Generate and download', hi: '4. Generate karke download karo' },
        detail: {
          en: 'Generate Reports pe ek click me har student ka PDF banta hai aur sab ek ZIP me download ho jate hain. Ek generation run = ek free try.',
          hi: 'Generate Reports pe ek click me har student ka PDF banta hai aur sab ek ZIP me download ho jate hain. Ek generation run = ek free try.',
        },
      },
    ],
    chips: [
      { en: 'What do I do on this page?', hi: 'Is page par kya karna hai?' },
      { en: 'How many free tries do I get?', hi: 'Kitni free tries milti hain?' },
      { en: 'Which theme should I pick?', hi: 'Kaunsa theme chunna chahiye?' },
    ],
  },

  'school-profile': {
    intro: {
      en: "This is School Profile — what you fill in here is printed on every single report card. Everything is saved in your browser, so you only do it once per school/session.",
      hi: 'Ye School Profile hai — yahan jo bharoge wahi har report card par print hoga. Sab kuch aapke browser me save hota hai, isliye ek school/session ke liye ek hi baar bharo.',
    },
    steps: [
      {
        title: { en: 'Fill the basics', hi: 'Basic details bharo' },
        detail: {
          en: 'School name, address, affiliation text, school code and affiliation number. School name is the first thing printed at the top of the card.',
          hi: 'School ka naam, address, affiliation text, school code aur affiliation number. School ka naam card ke sabse upar print hota hai.',
        },
      },
      {
        title: { en: 'Set the session & term', hi: 'Session aur term set karo' },
        detail: {
          en: 'Academic Session (e.g. 2026-27) and Examination / Term (e.g. Periodic Test - I). These appear in the card header and the title bar.',
          hi: 'Academic Session (jaise 2026-27) aur Examination / Term (jaise Periodic Test - I). Ye card ke header aur title bar me aate hain.',
        },
      },
      {
        title: { en: 'Upload logo & signatures', hi: 'Logo aur signatures upload karo' },
        detail: {
          en: 'Logo top-left me, aur teacher / vice-principal / principal ke signature niche signature block me aate hain. Blank chhodne par ek placeholder box print hota hai — error nahi hota.',
          hi: 'Logo top-left me, aur teacher / vice-principal / principal ke signature niche signature block me aate hain. Blank chhodne par ek placeholder box print hota hai — error nahi hota.',
        },
      },
      {
        title: { en: 'Choose your report theme', hi: 'Report theme chuno' },
        detail: {
          en: 'Holistic Progress Card = marks + co-scholastic grades + personality/learning skills with stars. Simple Academic = clean marks-only card. Modern School = bold card with performance bars. Theme yahan se kabhi bhi badal sakte ho.',
          hi: 'Holistic Progress Card = marks + co-scholastic grades + personality/learning skills stars ke saath. Simple Academic = simple marks-only card. Modern School = performance bars wala bold card. Theme yahan se kabhi bhi badal sakte ho.',
        },
      },
    ],
    chips: [
      { en: 'Which theme suits my school?', hi: 'Mere school ke liye kaunsa theme?' },
      { en: 'Do I need signatures?', hi: 'Signature zaroori hain?' },
      { en: 'What is academic session?', hi: 'Academic session kya hota hai?' },
    ],
  },

  import: {
    intro: {
      en: "Import Students is where your Excel becomes report cards. You can upload, auto-map columns, check subjects and match student photos — all on this screen.",
      hi: 'Import Students par aapka Excel report card ban jaata hai. Yahan upload, column auto-mapping, subject check aur student photos match, sab hota hai.',
    },
    steps: [
      {
        title: { en: 'Upload the file', hi: 'File upload karo' },
        detail: {
          en: 'Drop an .xlsx, .xls or .csv file. First row should be your headings (Roll, Name, Class, then one column per subject).',
          hi: '.xlsx, .xls ya .csv file drop karo. Pehli row me headings honi chahiye (Roll, Name, Class, aur phir har subject ka ek column).',
        },
      },
      {
        title: { en: 'Review the column mapping', hi: 'Column mapping check karo' },
        detail: {
          en: 'Joy/Studio auto-detects which column is the name, roll number, class, parents, attendance and which ones are subjects. Kuch galat lage to dropdown se manually badal do.',
          hi: 'Studio khud detect kar leta hai ki kaunsa column name, roll number, class, parents, attendance hai aur kaunse subjects. Kuch galat lage to dropdown se manually badal do.',
        },
      },
      {
        title: { en: 'Confirm the subjects', hi: 'Subjects confirm karo' },
        detail: {
          en: 'Every detected subject is listed — English, Hindi, Maths, Science, GK, IT, anything. Koi subject limit nahi hai; jo column hai wahi card me aayega.',
          hi: 'Har detected subject list hota hai — English, Hindi, Maths, Science, GK, IT, kuch bhi. Subject ki koi limit nahi; jo column hai wahi card me aayega.',
        },
      },
      {
        title: { en: 'Match student photos (optional)', hi: 'Student photos match karo (optional)' },
        detail: {
          en: 'Upload photos named after the roll number or admission number and they are matched by identity — order matters nahi karta. Bina photo ke bhi card ban jaata hai.',
          hi: 'Photos ko roll number ya admission number ke naam se upload karo, wo identity se match ho jaati hain — order se farak nahi padta. Bina photo ke bhi card ban jaata hai.',
        },
      },
      {
        title: { en: 'Check the preview', hi: 'Preview check karo' },
        detail: {
          en: 'Last tab me pehla card render hota hai. Dikh raha ho sahi, to Generate Reports pe jao.',
          hi: 'Aakhri tab me pehla card render hota hai. Agar sahi dikh raha hai to Generate Reports pe jao.',
        },
      },
    ],
    chips: [
      { en: 'What format should my Excel be?', hi: 'Excel ka format kaisa hona chahiye?' },
      { en: 'Marks are mapping wrongly', hi: 'Marks galat map ho rahe hain' },
      { en: 'How do photos get matched?', hi: 'Photos kaise match hoti hain?' },
    ],
  },

  template: {
    intro: {
      en: "Report Template is your preview room. You can flip through every student, switch the theme, and download a single card — but note a single download also counts as one generation.",
      hi: 'Report Template aapka preview room hai. Har student dekh sakte ho, theme badal sakte ho, aur ek card download kar sakte ho — par dhyaan rahe, ek single download bhi ek generation maana jaata hai.',
    },
    steps: [
      {
        title: { en: 'Pick a student', hi: 'Student chuno' },
        detail: {
          en: 'Use the ‹ › arrows or the "Jump to Student" dropdown. Left panel me totals — percentage, overall grade aur result — live dikhte hain.',
          hi: '‹ › arrows ya "Jump to Student" dropdown use karo. Left panel me totals — percentage, overall grade aur result — live dikhte hain.',
        },
      },
      {
        title: { en: 'Try the themes', hi: 'Themes try karo' },
        detail: {
          en: 'Top-right dropdown se theme badal ke dekh lo. Preview aur actual PDF bilkul same layout use karte hain, isliye jo dikh raha hai wahi print hoga.',
          hi: 'Top-right dropdown se theme badal ke dekh lo. Preview aur actual PDF bilkul same layout use karte hain, isliye jo dikh raha hai wahi print hoga.',
        },
      },
      {
        title: { en: 'Fix what looks wrong', hi: 'Jo galat lage theek karo' },
        detail: {
          en: 'Validation cards me is student ke errors dikhte hain. Marks ya remarks galat ho to wapas Import me jakar mapping theek karo.',
          hi: 'Validation cards me is student ke errors dikhte hain. Marks ya remarks galat ho to wapas Import me jakar mapping theek karo.',
        },
      },
      {
        title: { en: 'Then generate them all', hi: 'Phir sab generate karo' },
        detail: {
          en: 'Ek student ke liye "Download This PDF"; poori class ke liye Generate Reports use karo — sabhi cards ek ZIP me aayenge.',
          hi: 'Ek student ke liye "Download This PDF"; poori class ke liye Generate Reports use karo — sabhi cards ek ZIP me aayenge.',
        },
      },
    ],
    chips: [
      { en: 'Preview vs actual PDF?', hi: 'Preview aur actual PDF same hai?' },
      { en: 'How do I change the theme?', hi: 'Theme kaise badlu?' },
      { en: 'Some remarks look wrong', hi: 'Kuch remarks galat lag rahe hain' },
    ],
  },

  generate: {
    intro: {
      en: "Generate Reports is the finish line. One click makes a PDF per student and packs them into a single ZIP. Each run uses one free generation unless you're subscribed.",
      hi: 'Generate Reports aakhri step hai. Ek click me har student ka PDF banta hai aur sab ek ZIP me pack ho jaate hain. Har run ek free generation kha jaata hai, jab tak aap subscribe na karo.',
    },
    steps: [
      {
        title: { en: 'Choose who to include', hi: 'Kisko include karna hai chuno' },
        detail: {
          en: '"Only records with no errors" is safest. "All records" tab use karo jab aap errors ke saath bhi card chaahte ho.',
          hi: '"Only records with no errors" sabse safe hai. "All records" tab tab use karo jab errors ke saath bhi card chahiye.',
        },
      },
      {
        title: { en: 'Hit Generate', hi: 'Generate dabao' },
        detail: {
          en: 'Progress bar live update hota hai — kitne ban gaye, kitne fail hue. Beech me rokna ho to Cancel dabao, jitne ban chuke hain wo safe rehte hain.',
          hi: 'Progress bar live update hota hai — kitne ban gaye, kitne fail hue. Beech me rokna ho to Cancel dabao, jitne ban chuke hain wo safe rehte hain.',
        },
      },
      {
        title: { en: 'Download the ZIP', hi: 'ZIP download karo' },
        detail: {
          en: 'Har PDF ka naam {rollNo}_{name}.pdf hota hai aur ZIP ka naam class/section se banta hai — seedha print karke baant sakte ho.',
          hi: 'Har PDF ka naam {rollNo}_{name}.pdf hota hai aur ZIP ka naam class/section se banta hai — seedha print karke baant sakte ho.',
        },
      },
      {
        title: { en: 'If something failed', hi: 'Kuch fail ho gaya to' },
        detail: {
          en: '"Export Failed CSV" se sirf fail hue students ki list milti hai, unhe theek karke dobara generate kar lo.',
          hi: '"Export Failed CSV" se sirf fail hue students ki list milti hai, unhe theek karke dobara generate kar lo.',
        },
      },
    ],
    chips: [
      { en: 'Generation failed, what now?', hi: 'Generation fail ho gayi, ab kya?' },
      { en: 'How is one try counted?', hi: 'Ek try kaise count hoti hai?' },
      { en: 'How do I get unlimited?', hi: 'Unlimited kaise milega?' },
    ],
  },

  pricing: {
    intro: {
      en: "These are the ReportCard Studio plans. All three run for 6 months and give unlimited report cards — the difference is which report card designs you unlock.",
      hi: 'Ye ReportCard Studio ke plans hain. Teeno 6 months ke hain aur unlimited report cards dete hain — farak sirf ye hai ki kaunse designs milte hain.',
    },
    steps: [
      {
        title: { en: 'Simple Academic · ₹369 / $4.99', hi: 'Simple Academic · ₹369 / $4.99' },
        detail: {
          en: 'Marks-focused card. Best value if you only need subject marks, grades and result. 6 months unlimited.',
          hi: 'Marks-focused card. Agar sirf subject marks, grades aur result chahiye to best value. 6 months unlimited.',
        },
      },
      {
        title: { en: 'Modern School · ₹578 / $6.99', hi: 'Modern School · ₹578 / $6.99' },
        detail: {
          en: 'Everything in Simple plus the bold Modern theme with performance bars. 6 months unlimited.',
          hi: 'Simple ka sab kuch, plus performance bars wala bold Modern theme. 6 months unlimited.',
        },
      },
      {
        title: { en: 'Holistic Progress · ₹859 / $10.99', hi: 'Holistic Progress · ₹859 / $10.99' },
        detail: {
          en: 'Recommended. Marks + co-scholastic grades + personality & learning skills with stars. All future themes included. 6 months unlimited.',
          hi: 'Recommended. Marks + co-scholastic grades + personality & learning skills stars ke saath. Aage ke sab themes included. 6 months unlimited.',
        },
      },
      {
        title: { en: 'Subscribe in two clicks', hi: 'Do click me subscribe' },
        detail: {
          en: '"Subscribe" dabao → sign in (naam + email) → plan activate aur bill aapke email par aa jaata hai. Receipt bhi wahi se milti hai.',
          hi: '"Subscribe" dabao → sign in (naam + email) → plan activate, aur bill aapke email par aa jaata hai. Receipt bhi wahin se milti hai.',
        },
      },
    ],
    chips: [
      { en: 'Which plan should I pick?', hi: 'Kaunsa plan lun?' },
      { en: 'Will I get a receipt?', hi: 'Receipt milegi?' },
      { en: 'Can I try before paying?', hi: 'Bina pay kiye try kar sakta hoon?' },
    ],
  },

  login: {
    intro: {
      en: "This is the sign-in screen. An account is what ties your free generations, your plan and your bills to you — that's why generating asks you to sign in first.",
      hi: 'Ye sign-in screen hai. Account se hi aapki free generations, plan aur bills aapse jud jaate hain — isliye generate karne se pehle sign in maanga jaata hai.',
    },
    steps: [
      {
        title: { en: 'Sign in with name + email', hi: 'Naam + email se sign in karo' },
        detail: {
          en: 'No password, no OTP. Bas naam aur woh email daalo jahan bill aur renewals chahiye. Ye email hi aapki identity hai.',
          hi: 'Na password, na OTP. Bas naam aur woh email daalo jahan bill aur renewals chahiye. Ye email hi aapki identity hai.',
        },
      },
      {
        title: { en: 'Check your allowance', hi: 'Apna allowance dekho' },
        detail: {
          en: 'Sign in karne ke baad screen par dikhta hai aapke paas kitni free generations bachi hain, ya plan kab tak active hai.',
          hi: 'Sign in karne ke baad screen par dikhta hai kitni free generations bachi hain, ya plan kab tak active hai.',
        },
      },
      {
        title: { en: 'Subscribe when ready', hi: 'Ready ho to subscribe karo' },
        detail: {
          en: 'Aap bina pay kiye free tries use kar sakte ho. Jab lage ki unlimited chahiye, tab plan chuno aur subscribe karo.',
          hi: 'Aap bina pay kiye free tries use kar sakte ho. Jab unlimited chahiye lage, tab plan chuno aur subscribe karo.',
        },
      },
      {
        title: { en: 'Your bill and renewals', hi: 'Bill aur renewals' },
        detail: {
          en: 'Plan activate hone par bill email aata hai. Plan khatam hone se 7 din pehle renewal reminder aayega, aur renew na karne par plan apne aap off ho jaayega.',
          hi: 'Plan activate hone par bill email aata hai. Plan khatam hone se 7 din pehle renewal reminder aayega, aur renew na karne par plan apne aap off ho jaayega.',
        },
      },
    ],
    chips: [
      { en: 'Why do I need to sign in?', hi: 'Sign in kyun zaroori hai?' },
      { en: 'Is my data safe?', hi: 'Mera data safe hai?' },
      { en: 'How much does it cost?', hi: 'Kitna kharcha aayega?' },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Questions & answers                                                */
/* ------------------------------------------------------------------ */

export interface FaqEntry {
  keywords: string[];
  reply: JoyText;
}

const FAQ: FaqEntry[] = [
  {
    keywords: [
      'free', 'free try', 'free tries', 'free generation', 'free generations', 'how many free',
      'trial', 'try', 'try before', 'before paying', 'kitni free', 'kitne free', 'muft',
      'free me', 'free mein', 'bina pay',
    ],
    reply: {
      en: 'You get 7 free report-card generations on your account. Sign in, generate, aur counter apne aap kam hota jaayega. After 7, subscribe for unlimited.',
      hi: 'Aapke account par 7 free report-card generations milti hain. Sign in karo, generate karo, aur counter apne aap kam hota jaayega. 7 ke baad unlimited ke liye subscribe karo.',
    },
  },
  {
    keywords: [
      'price', 'pricing', 'cost', 'rate', 'kitna', 'kitne', 'paisa', 'paise', 'plan', 'plans',
      'subscription', 'charge', 'fees',
    ],
    reply: {
      en: 'Plans: Simple Academic ₹369, Modern School ₹578, Holistic Progress ₹859 — each for 6 months, unlimited report cards. First 7 generations free.',
      hi: 'Plans: Simple Academic ₹369, Modern School ₹578, Holistic Progress ₹859 — teeno 6 months ke, unlimited report cards. Pehli 7 generations free.',
    },
  },
  {
    keywords: ['receipt', 'bill', 'invoice', 'refund', 'receipt kaha', 'bill kaha', 'gst'],
    reply: {
      en: 'Har order par professional bill + receipt aapke email par jaata hai (logo ke saath, Cost column me actual amount). Chahe order free ho ya admin comp ho — receipt hamesha generate hoti hai, free product par cost ₹0.00 dikhta hai.',
      hi: 'Har order par professional bill + receipt aapke email par jaata hai (logo ke saath, Cost column me actual amount). Order free ho ya admin comp — receipt hamesha banti hai, free product par cost ₹0.00 dikhta hai.',
    },
  },
  {
    keywords: ['excel', 'xlsx', 'xls', 'csv', 'format', 'upload', 'sheet', 'columns', 'column'],
    reply: {
      en: 'Excel format: pehli row me headings rakho — Roll, Name, Class, Section, aur phir har subject ka apna column (English, Maths, Science…). Koi bhi subject add kar sakte ho, koi limit nahi. .xlsx / .xls / .csv teeno chalte hain.',
      hi: 'Excel format: pehli row me headings rakho — Roll, Name, Class, Section, aur phir har subject ka apna column (English, Maths, Science…). Koi bhi subject add kar sakte ho, koi limit nahi. .xlsx / .xls / .csv teeno chalte hain.',
    },
  },
  {
    keywords: ['holistic', 'academic', 'modern', 'theme', 'themes', 'design', 'layout', 'look'],
    reply: {
      en: 'Holistic Progress Card = marks + co-scholastic grades + personality/learning skills with stars (most complete). Simple Academic = clean marks-only card. Modern School = bold card with performance bars. Koi bhi theme School Profile ya Report Template se badal sakte ho.',
      hi: 'Holistic Progress Card = marks + co-scholastic grades + personality/learning skills stars ke saath (sabse complete). Simple Academic = simple marks-only card. Modern School = performance bars wala bold card. Koi bhi theme School Profile ya Report Template se badal sakte ho.',
    },
  },
  {
    keywords: ['photo', 'photos', 'picture', 'image', 'images', 'photo kaise', 'photo match'],
    reply: {
      en: 'Photos name se match hoti hain — roll number ya admission number file ka naam rakho (e.g. 01.jpg ya ADM-2019-1043.jpg). Order se farak nahi padta. Photo na ho to placeholder box chhap jaata hai, card phir bhi ban jaata hai.',
      hi: 'Photos naam se match hoti hain — file ka naam roll number ya admission number rakho (jaise 01.jpg ya ADM-2019-1043.jpg). Order se farak nahi padta. Photo na ho to placeholder box chhap jaata hai, card phir bhi ban jaata hai.',
    },
  },
  {
    keywords: ['pdf', 'zip', 'download', 'print', 'a4', 'printable'],
    reply: {
      en: 'Output: har student ka ek A4 print-ready PDF, aur poori class ka ek ZIP. Generate Reports par ek click me sab ban jaata hai aur "Download …zip" button se milta hai.',
      hi: 'Output: har student ka ek A4 print-ready PDF, aur poori class ka ek ZIP. Generate Reports par ek click me sab ban jaata hai aur "Download …zip" button se milta hai.',
    },
  },
  {
    keywords: ['marks', 'grade', 'grades', 'grading', 'percentage', 'result', 'promoted', 'fail'],
    reply: {
      en: 'Marks se grade, percentage, overall grade aur result (PROMOTED / NEEDS IMPROVEMENT) apne aap nikalte hain. Grading scale card me hi printed hota hai — A1 (91-100), A2 (81-90), B1 (71-80), B2 (61-70), C (51-60), D (0-50).',
      hi: 'Marks se grade, percentage, overall grade aur result (PROMOTED / NEEDS IMPROVEMENT) apne aap nikalte hain. Grading scale card me hi printed hota hai — A1 (91-100), A2 (81-90), B1 (71-80), B2 (61-70), C (51-60), D (0-50).',
    },
  },
  {
    keywords: ['safe', 'privacy', 'data', 'upload kaha', 'server', 'secure', 'leak'],
    reply: {
      en: 'Aapka Excel aur student data browser me hi process hota hai — student data kahin upload nahi hota. Sirf aapka naam/email aur free-try counter server par jaata hai, wo bhi sirf limits ke liye.',
      hi: 'Aapka Excel aur student data browser me hi process hota hai — student data kahin upload nahi hota. Sirf aapka naam/email aur free-try counter server par jaata hai, wo bhi sirf limits ke liye.',
    },
  },
  {
    keywords: ['sign in', 'login', 'account', 'signin', 'register', 'password', 'otp'],
    reply: {
      en: 'Sign in bas naam + email se hota hai — na password, na OTP. Account se hi aapki free tries, plan aur receipts judte hain, isliye generate karne se pehle sign in maanga jaata hai.',
      hi: 'Sign in bas naam + email se hota hai — na password, na OTP. Account se hi aapke free tries, plan aur receipts judte hain, isliye generate karne se pehle sign in maanga jaata hai.',
    },
  },
  {
    keywords: ['renew', 'expire', 'expiry', 'expired', 'reminder', 'warning', 'cancel plan'],
    reply: {
      en: 'Plan khatam hone se 7 din pehle renewal reminder email aata hai. Renew na karo to expiry par plan apne aap off ho jaata hai — aur bache hue free generations phir bhi use kar sakte ho. Jab chaho renew ya upgrade kar sakte ho.',
      hi: 'Plan khatam hone se 7 din pehle renewal reminder email aata hai. Renew na karo to expiry par plan apne aap off ho jaata hai — aur bache hue free generations phir bhi use kar sakte ho. Jab chaho renew ya upgrade kar sakte ho.',
    },
  },
  {
    keywords: ['admin', 'owner', 'unlimited', 'unlimited free', 'unlimited kaise', 'unlimited milega', 'how do i get unlimited'],
    reply: {
      en: 'Unlimited comes with any plan — Simple ₹369, Modern ₹578 or Holistic ₹859, each 6 months. Owner/admin accounts (recognised by email or office IP) get unlimited free access automatically, without any plan.',
      hi: 'Unlimited kisi bhi plan ke saath milta hai — Simple ₹369, Modern ₹578 ya Holistic ₹859, teeno 6 months. Owner/admin accounts (email ya office IP se pehchane gaye) ko bina plan ke bhi unlimited free access milta hai.',
    },
  },
  {
    keywords: ['signature', 'signatures', 'sign', 'principal sign', 'teacher sign', 'stamp'],
    reply: {
      en: 'Signatures are optional. Upload teacher / vice-principal / principal signature images and a stamp in School Profile and they print in the signature block. Blank chhodne par ek placeholder rehta hai — card phir bhi ban jaata hai.',
      hi: 'Signatures optional hain. School Profile me teacher / vice-principal / principal ke signature aur stamp upload karo, wo signature block me print ho jaate hain. Blank chhodne par placeholder rehta hai — card phir bhi ban jaata hai.',
    },
  },
  {
    keywords: ['session', 'academic session', 'term', 'examination', 'exam', 'periodic test'],
    reply: {
      en: 'Academic Session (e.g. 2026-27) and Examination / Term (e.g. Periodic Test - I) are set in School Profile. They print in the card header and title bar, so bharo ek hi baar aur sab cards me aa jaayega.',
      hi: 'Academic Session (jaise 2026-27) aur Examination / Term (jaise Periodic Test - I) School Profile me set hote hain. Wo card ke header aur title bar me print hote hain, isliye ek hi baar bharo.',
    },
  },
  {
    keywords: ['remarks', 'remark', 'teacher remarks', 'principal remarks', 'comment'],
    reply: {
      en: 'Teacher’s and Principal’s remarks are generated from the student’s own result — strengths, weak subjects and attendance. Agar aapka Excel me apna remark column hai to wahi use hoga. Remarks galat lage to Import me column mapping check karo.',
      hi: 'Teacher’s aur Principal’s remarks student ke result se ban jaate hain — strengths, weak subjects aur attendance ke hisaab se. Agar aapke Excel me apna remark column hai to wahi use hota hai. Galat lage to Import me column mapping check karo.',
    },
  },
  {
    keywords: ['validate', 'validation', 'error', 'errors', 'fail', 'failed', 'wrong', 'issue', 'issues'],
    reply: {
      en: 'Validation catches missing names, duplicate roll numbers, marks outside the 0–max range and unreadable cells. Errors wale students ko default me skip kiya jaata hai — Generate me “All records” choose karke unhe bhi include kar sakte ho, ya Import me fix kar lo.',
      hi: 'Validation missing name, duplicate roll number, marks 0–max se bahar aur unreadable cells pakadta hai. Errors wale students default me skip ho jaate hain — Generate me “All records” choose karke include kar sakte ho, ya Import me fix kar lo.',
    },
  },
];

/* ------------------------------------------------------------------ */
/* Matching                                                           */
/* ------------------------------------------------------------------ */

const normalize = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^\w\s+.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toRegexes = (words: string[]): RegExp[] =>
  words.map((word) => new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i'));

const anyMatch = (text: string, regexes: RegExp[]): boolean => regexes.some((re) => re.test(text));

/** Markers that indicate romanised Hindi (Hinglish). */
const HINGLISH_MARKERS = [
  'kya', 'kaise', 'kaisa', 'kaisi', 'kaha', 'kahan', 'nahi', 'nahin', 'mujhe', 'mera', 'meri',
  'aap', 'aapko', 'chahiye', 'karo', 'kro', 'karna', 'krna', 'kholo', 'batao', 'bata', 'hai',
  'hain', 'kaun', 'kon', 'kis', 'mein', 'konsi', 'kaunsi', 'chalega', 'hoga', 'kabu', 'kaun',
  'kitna', 'kitne', 'paisa', 'paise', 'dedo', 'banao', 'banana', 'bana', 'dekhna', 'kaam',
];
const HINGLISH_RE = toRegexes(HINGLISH_MARKERS);

/** Detects Hinglish. English is the default, so no marker means English. */
export const detectJoyLanguage = (raw: string): JoyLang =>
  anyMatch(normalize(raw), HINGLISH_RE) ? 'hi' : 'en';

/** "how do I use this / guide me / steps" intent. */
const GUIDE_RE = toRegexes([
  'how do i', 'how to', 'how can i', 'guide', 'guide me', 'walk me', 'walkthrough', 'steps',
  'step by step', 'help', 'help me', 'stuck', 'confused', 'what do i do', 'what to do',
  'next', 'start', 'begin', 'teach me', 'explain', 'show me how', 'process', 'workflow',
  'kaise', 'kaisa', 'kese', 'batao', 'bata do', 'samjhao', 'samjao', 'madad', 'help karo',
  'kya karu', 'kya karna', 'kaise kare', 'kaise karu', 'kaise banau', 'kaise banaun',
  'kaise use', 'use kaise', 'chalana', 'chalana kaise', 'shuru',
]);

const FAQ_REGEXES = FAQ.map((entry) => toRegexes(entry.keywords));

export interface StudioAnswer {
  reply: string;
  /** Present when the answer is a screen walkthrough. */
  guide?: { steps: GuideStep[]; index: number };
  /** One-tap follow-up questions. */
  chips: JoyText[];
}

/**
 * Answers a visitor's message for the screen they are on.
 *
 * Resolution order: an FAQ hit (specific), then a guide request for the current
 * screen, then the screen's own intro. Everything is bilingual and nothing is
 * invented — only what the Studio actually does.
 */
export const resolveStudioQuery = (
  raw: string,
  routeKey: StudioScreen,
  lang: JoyLang,
): StudioAnswer | null => {
  const text = normalize(raw);
  if (!text) return null;

  const guide = SCREEN_GUIDES[routeKey];

  // 1) A specific question (free tries, price, excel format, …).
  for (let index = 0; index < FAQ.length; index += 1) {
    if (anyMatch(text, FAQ_REGEXES[index])) {
      return { reply: pick(FAQ[index].reply, lang), chips: guide.chips };
    }
  }

  // 2) "How do I use this?" → the step-by-step walkthrough for this screen.
  if (anyMatch(text, GUIDE_RE)) {
    return {
      reply: `${pick(guide.intro, lang)}\n\n${pick(
        { en: `Step 1 of ${guide.steps.length}:`, hi: `Step 1 of ${guide.steps.length}:` },
        lang,
      )} ${pick(guide.steps[0].title, lang)}`,
      guide: { steps: guide.steps, index: 0 },
      chips: guide.chips,
    };
  }

  return null;
};

/** The reply Joy gives when nothing matched — still points at the current screen. */
export const studioFallback = (routeKey: StudioScreen, lang: JoyLang): string =>
  pick(
    {
      en: `I can explain this screen, the whole 4-step workflow, pricing, free tries or billing. ${pick(
        SCREEN_GUIDES[routeKey].intro,
        'en',
      )}`,
      hi: `Main aapko ye screen, poora 4-step workflow, pricing, free tries ya billing samjha sakti hoon. ${pick(
        SCREEN_GUIDES[routeKey].intro,
        'hi',
      )}`,
    },
    lang,
  );

export const studioWelcome = (lang: JoyLang): string =>
  pick(
    {
      en: "Hi, I'm Joy 👋 I'm right here inside ReportCard Studio. Ask me anything — how to use a screen, which theme fits, how the free tries work, or how billing/receipts happen.",
      hi: 'Namaste, main Joy hoon 👋 Main ReportCard Studio ke andar hi hoon. Kuch bhi poocho — screen kaise use karni hai, kaunsa theme sahi hai, free tries kaise kaam karti hain, ya billing/receipt kaise hoti hai.',
    },
    lang,
  );
