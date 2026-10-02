/**
 * Report card themes.
 *
 * A theme is pure configuration: a layout kind plus the palette and the
 * sections that are printed. Both the on-screen preview and the PDF renderer
 * read the same definition, so a new theme only needs one entry here (plus a
 * layout renderer if it introduces a brand new structure).
 *
 * The current palette is NOT baked into the application: every coloured
 * surface of the report card comes from the selected theme.
 */

export type ThemeLayout = 'holistic' | 'academic';

export interface ThemePalette {
  /** Header bar / title bar / primary borders. */
  primary: string;
  /** Soft tint used behind section titles and table headers. */
  headerFill: string;
  /** Grand total row highlight. */
  totalFill: string;
  /** Personality development block header. */
  skillsFillWarm: string;
  /** Learning skills block header. */
  skillsFillCool: string;
  /** Co-scholastic block header. */
  coScholasticFill: string;
  /** Overall performance block. */
  overall: string;
  /** Tint behind the overall performance block. */
  overallSoft: string;
  /** Star colour. */
  accent: string;
  /** Body text. */
  text: string;
  /** Secondary text. */
  muted: string;
  /** Table grid lines. */
  line: string;
  /** Page background for the preview shell. */
  surface: string;
}

/**
 * Visual treatment inside a layout family. `classic` is the formal printed
 * marks statement, `modern` is the bold contemporary card. Themes of the same
 * layout share the measurement / fitting engine and only differ in styling, so
 * a new look never risks the zero-overlap guarantees.
 */
export type ThemeVariant = 'classic' | 'modern';

export interface ReportCardTheme {
  id: string;
  name: string;
  description: string;
  /** Title printed in the report card's title bar. */
  title: string;
  layout: ThemeLayout;
  /** Defaults to 'classic'. */
  variant?: ThemeVariant;
  palette: ThemePalette;
  sections: {
    academicTable: boolean;
    /** Per-subject remark column inside the academic table. */
    subjectRemarks: boolean;
    /** Percentage column inside the academic table. */
    subjectPercentage: boolean;
    coScholastic: boolean;
    personality: boolean;
    learningSkills: boolean;
    attendance: boolean;
    overallPerformance: boolean;
    gradingScale: boolean;
    remarks: boolean;
  };
}

const BASE_SECTIONS: ReportCardTheme['sections'] = {
  academicTable: true,
  subjectRemarks: true,
  subjectPercentage: false,
  coScholastic: true,
  personality: true,
  learningSkills: true,
  attendance: true,
  overallPerformance: true,
  gradingScale: true,
  remarks: true,
};

export const REPORT_CARD_THEMES: ReportCardTheme[] = [
  {
    id: 'holistic',
    name: 'Holistic Progress Card',
    description:
      'Scholastic marks, co-scholastic grades, personality & learning skills with stars — the complete holistic card.',
    title: 'HOLISTIC PROGRESS REPORT CARD',
    layout: 'holistic',
    palette: {
      primary: '#1e3a8a',
      headerFill: '#dbeafe',
      totalFill: '#fef9c3',
      skillsFillWarm: '#fef3c7',
      skillsFillCool: '#fee2e2',
      coScholasticFill: '#f3e8ff',
      overall: '#047857',
      overallSoft: '#ecfdf5',
      accent: '#f59e0b',
      text: '#0f172a',
      muted: '#475569',
      line: '#94a3b8',
      surface: '#ffffff',
    },
    sections: { ...BASE_SECTIONS },
  },
  {
    id: 'academic',
    name: 'Simple Academic',
    description:
      'A clean marks-focused card: subject marks, percentage, grade and result. Best when only academic marks are uploaded.',
    title: 'STUDENT REPORT CARD',
    layout: 'academic',
    palette: {
      primary: '#1e40af',
      headerFill: '#eff6ff',
      totalFill: '#f1f5f9',
      skillsFillWarm: '#eff6ff',
      skillsFillCool: '#eff6ff',
      coScholasticFill: '#eff6ff',
      overall: '#0284c7',
      overallSoft: '#f0f9ff',
      accent: '#0284c7',
      text: '#0f172a',
      muted: '#475569',
      line: '#94a3b8',
      surface: '#ffffff',
    },
    sections: {
      ...BASE_SECTIONS,
      subjectPercentage: true,
      coScholastic: false,
      personality: false,
      learningSkills: false,
      gradingScale: true,
    },
  },
  {
    id: 'modern',
    name: 'Modern School',
    description:
      'Bold contemporary card: colour header band, zebra marks table with performance bars and a wide result band.',
    title: 'STUDENT PROGRESS REPORT',
    layout: 'academic',
    variant: 'modern',
    palette: {
      primary: '#4f46e5',
      headerFill: '#eef2ff',
      totalFill: '#eef2ff',
      skillsFillWarm: '#eef2ff',
      skillsFillCool: '#eef2ff',
      coScholasticFill: '#eef2ff',
      overall: '#059669',
      overallSoft: '#ecfdf5',
      accent: '#f59e0b',
      text: '#0f172a',
      muted: '#475569',
      line: '#a5b4fc',
      surface: '#ffffff',
    },
    sections: {
      ...BASE_SECTIONS,
      subjectRemarks: false,
      subjectPercentage: true,
      coScholastic: false,
      personality: false,
      learningSkills: false,
      gradingScale: false,
    },
  },
];

export const DEFAULT_THEME_ID = 'holistic';

export function getTheme(id?: string | null): ReportCardTheme {
  const found = REPORT_CARD_THEMES.find((theme) => theme.id === id);
  return found ?? REPORT_CARD_THEMES.find((theme) => theme.id === DEFAULT_THEME_ID)!;
}

/** "#1e3a8a" → [30, 58, 138] for jsPDF. */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const int = Number.parseInt(full, 16);
  if (!Number.isFinite(int)) return [0, 0, 0];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}
