/**
 * Joy's step-by-step guides, per section of the mall.
 *
 * The topics in `joyAssistant.ts` answer "where is it?". This file answers
 * "how do I actually use it?" — the walkthrough Joy runs when someone is
 * standing inside a section and doesn't know what to press next.
 *
 * Language policy matches the rest of Joy: English by default, Hinglish only
 * when the visitor writes in Hinglish, and every line exists in both.
 */

import type { JoyText } from './joyAssistant';

export interface JoyGuideStep {
  title: JoyText;
  detail: JoyText;
}

export interface JoySectionGuide {
  /** Shown when the guide starts. */
  intro: JoyText;
  steps: JoyGuideStep[];
  /** One-tap questions for this section. */
  chips: JoyText[];
}

export const JOY_SECTION_GUIDES: Record<string, JoySectionGuide> = {
  greetings: {
    intro: {
      en: 'Happy to walk you through the Digital Greetings section — card chunna, personalise karna, preview aur payment. Shall we start?',
      hi: 'Digital Greetings section main aapko poora samjha deti hoon — card chunna, personalise karna, preview aur payment. Shuru karein?',
    },
    steps: [
      {
        title: { en: '1. Pick your card', hi: '1. Apna card chuno' },
        detail: {
          en: 'Themes are grouped by occasion — birthday, anniversary, wedding, Diwali, thank-you and more. Har theme par price likha hota hai. Sabse upar ek FREE Welcome Card bhi hai.',
          hi: 'Themes occasion ke hisaab se group hue hain — birthday, anniversary, wedding, Diwali, thank-you waghaira. Har theme par price likha hota hai. Sabse upar ek FREE Welcome Card bhi hai.',
        },
      },
      {
        title: { en: '2. Personalise it', hi: '2. Card personalise karo' },
        detail: {
          en: 'Sender ka naam, receiver ka naam, message, font, colour theme aur background music — sab ek hi screen par set hote hain. Live preview saath-saath update hota rehta hai.',
          hi: 'Sender ka naam, receiver ka naam, message, font, colour theme aur background music — sab ek hi screen par set hote hain. Live preview saath-saath update hota rehta hai.',
        },
      },
      {
        title: { en: '3. Preview before paying', hi: '3. Pay karne se pehle preview dekho' },
        detail: {
          en: 'Preview par tap karo — jaisa dikhega, waisa hi receiver ko milega. Pasand na aaye to bina pay kiye back jaake badal sakte ho.',
          hi: 'Preview par tap karo — jaisa dikhega, waisa hi receiver ko milega. Pasand na aaye to bina pay kiye back jaake badal sakte ho.',
        },
      },
      {
        title: { en: '4. Pay (or use the free card)', hi: '4. Pay karo (ya free card use karo)' },
        detail: {
          en: 'India me Razorpay (UPI, cards, netbanking, wallets); bahar Paypal ya Stripe. Free Welcome Card ke liye payment ki zaroorat hi nahi — ek email se ek free card.',
          hi: 'India me Razorpay (UPI, cards, netbanking, wallets); bahar Paypal ya Stripe. Free Welcome Card ke liye payment ki zaroorat hi nahi — ek email se ek free card.',
        },
      },
      {
        title: { en: '5. Share the link', hi: '5. Link share karo' },
        detail: {
          en: 'Card ban jaane par ek share link milta hai. Card 48 ghante live rehta hai, aur bill + receipt aapke email par chala jaata hai — usi email par manage/delete link bhi hota hai.',
          hi: 'Card ban jaane par ek share link milta hai. Card 48 ghante live rehta hai, aur bill + receipt aapke email par chala jaata hai — usi email par manage/delete link bhi hota hai.',
        },
      },
    ],
    chips: [
      { en: 'How do I use this section?', hi: 'Ye section kaise use karein?' },
      { en: 'Which card is free?', hi: 'Kaunsa card free hai?' },
      { en: 'How much does a card cost?', hi: 'Card ka kitna paisa lagega?' },
    ],
  },

  'reportcard-studio': {
    intro: {
      en: "Let's walk through ReportCard Studio — Excel daalne se lekar print-ready PDF nikalne tak, plus login aur plans. Ready?",
      hi: 'Chalo ReportCard Studio samjhein — Excel daalne se lekar print-ready PDF nikalne tak, aur login aur plans bhi. Ready?',
    },
    steps: [
      {
        title: { en: '1. Sign in (name + email)', hi: '1. Sign in karo (naam + email)' },
        detail: {
          en: 'No password, no OTP — just your name and the email where you want the bill. Your account carries 7 free generations; sign in is required so they can be counted to you.',
          hi: 'Na password, na OTP — bas naam aur woh email jahan bill chahiye. Account par 7 free generations milti hain; sign in isliye zaroori hai taaki wo aapke naam count ho.',
        },
      },
      {
        title: { en: '2. Set up the School Profile', hi: '2. School Profile set karo' },
        detail: {
          en: 'School name, address, academic session, exam term, logo and signatures. Ek hi baar bharna hota hai, phir har card me apne aap aata hai.',
          hi: 'School ka naam, address, academic session, exam term, logo aur signatures. Ek hi baar bharna hota hai, phir har card me apne aap aata hai.',
        },
      },
      {
        title: { en: '3. Import the Excel sheet', hi: '3. Excel sheet import karo' },
        detail: {
          en: 'Keep the first row as headings (Roll, Name, Class) and give every subject its own column — English, Maths, Science, anything. Columns are matched automatically, and any wrong guess can be fixed from a dropdown.',
          hi: 'Pehli row me headings (Roll, Name, Class) aur phir har subject ka column. Columns automatically map ho jaate hain; galat lage to dropdown se badal do.',
        },
      },
      {
        title: { en: '4. Check the preview', hi: '4. Preview check karo' },
        detail: {
          en: 'Report Template me har student ka card dekho. Validation errors (naam missing, duplicate roll, marks range se bahar) wahi dikhte hain — pehle unhe theek karo.',
          hi: 'Report Template me har student ka card dekho. Validation errors (naam missing, duplicate roll, marks range se bahar) wahi dikhte hain — pehle unhe theek karo.',
        },
      },
      {
        title: { en: '5. Generate & download the ZIP', hi: '5. Generate karke ZIP download karo' },
        detail: {
          en: 'Generate Reports par ek click = har student ka PDF + ek ZIP. Ek generation run ek free try kha jaata hai. Fail hue students ki list CSV me export kar sakte ho.',
          hi: 'Generate Reports par ek click = har student ka PDF + ek ZIP. Ek generation run ek free try kha jaata hai. Fail hue students ki list CSV me export kar sakte ho.',
        },
      },
      {
        title: { en: '6. Need unlimited? Subscribe', hi: '6. Unlimited chahiye? Subscribe karo' },
        detail: {
          en: 'Plans: Simple Academic ₹369, Modern School ₹578, Holistic Progress ₹859 — teeno 6 months, unlimited. Activate hone par bill + receipt email par aa jaata hai.',
          hi: 'Plans: Simple Academic ₹369, Modern School ₹578, Holistic Progress ₹859 — teeno 6 months, unlimited. Activate hone par bill + receipt email par aa jaata hai.',
        },
      },
    ],
    chips: [
      { en: 'How do I use ReportCard Studio?', hi: 'ReportCard Studio kaise use karein?' },
      { en: 'How many free tries?', hi: 'Kitni free tries milti hain?' },
      { en: 'Which plan should I take?', hi: 'Kaunsa plan lun?' },
    ],
  },
};

export const getSectionGuide = (sectionId?: string): JoySectionGuide | null =>
  (sectionId && JOY_SECTION_GUIDES[sectionId]) || null;

/* ------------------------------------------------------------------ */
/* Questions & answers                                                */
/* ------------------------------------------------------------------ */

export interface JoyFaqEntry {
  keywords: string[];
  reply: JoyText;
}

export const JOY_FAQ: JoyFaqEntry[] = [
  {
    keywords: ['free card', 'free greeting', 'free', 'muft', 'free me', 'free mein', 'no cost'],
    reply: {
      en: 'FREE Welcome Card 💌 Digital Greetings section ke sabse upar hai. Ek email se ek card bilkul free — koi payment nahi.',
      hi: 'FREE Welcome Card 💌 Digital Greetings section ke sabse upar hai. Ek email se ek card bilkul free — koi payment nahi.',
    },
  },
  {
    keywords: ['payment', 'pay', 'upi', 'razorpay', 'paypal', 'stripe', 'card payment', 'netbanking', 'paise kaise'],
    reply: {
      en: 'India me Razorpay se pay karo (UPI, PhonePe, GPay, cards, netbanking, wallets). Bahar se Paypal ya Stripe. Payment safe gateway par hoti hai — card details hum store nahi karte.',
      hi: 'India me Razorpay se pay karo (UPI, PhonePe, GPay, cards, netbanking, wallets). Bahar se Paypal ya Stripe. Payment safe gateway par hoti hai — card details hum store nahi karte.',
    },
  },
  {
    keywords: ['receipt', 'bill', 'invoice', 'email aayega', 'receipt milegi', 'bill kaha'],
    reply: {
      en: 'Har order par professional bill + receipt email par jaata hai — logo ke saath aur Cost column me actual amount. Free product par cost ₹0.00 dikhta hai; bill hamesha generate hoti hai.',
      hi: 'Har order par professional bill + receipt email par jaata hai — logo ke saath aur Cost column me actual amount. Free product par cost ₹0.00 dikhta hai; bill hamesha banti hai.',
    },
  },
  {
    keywords: ['account', 'sign in', 'signin', 'login', 'register', 'password', 'otp'],
    reply: {
      en: 'Sign in bas naam + email se hota hai — na password, na OTP. Account se hi aapki free tries, plan aur receipts aapse judte hain. ReportCard Studio me generate karne se pehle sign in maanga jaata hai.',
      hi: 'Sign in bas naam + email se hota hai — na password, na OTP. Account se hi aapke free tries, plan aur receipts aapse judte hain. ReportCard Studio me generate karne se pehle sign in maanga jaata hai.',
    },
  },
  {
    keywords: ['plan', 'plans', 'subscription', 'unlimited', 'reportcard plan', 'studio plan'],
    reply: {
      en: 'ReportCard Studio plans: Simple Academic ₹369, Modern School ₹578, Holistic Progress ₹859 — teeno 6 months ke liye unlimited report cards ke saath. Pehle 7 generations free hain.',
      hi: 'ReportCard Studio plans: Simple Academic ₹369, Modern School ₹578, Holistic Progress ₹859 — teeno 6 months ke liye unlimited report cards ke saath. Pehle 7 generations free hain.',
    },
  },
  {
    keywords: ['renew', 'expire', 'expiry', 'expired', 'reminder', 'cancel'],
    reply: {
      en: 'Plan khatam hone se 7 din pehle renewal reminder email aata hai. Renew na karo to expiry par plan apne aap off ho jaata hai — aur bache hue free generations phir bhi use kar sakte ho.',
      hi: 'Plan khatam hone se 7 din pehle renewal reminder email aata hai. Renew na karo to expiry par plan apne aap off ho jaata hai — aur bache hue free generations phir bhi use kar sakte ho.',
    },
  },
  {
    keywords: ['how long', 'kitne din', '48', 'expire card', 'card live', 'validity'],
    reply: {
      en: 'Digital greeting cards 48 ghante live rehte hain. Manage/delete link aapke email par hota hai, to jaldi hataana ho to wahi se kar sakte ho.',
      hi: 'Digital greeting cards 48 ghante live rehte hain. Manage/delete link aapke email par hota hai, to jaldi hataana ho to wahi se kar sakte ho.',
    },
  },
];
