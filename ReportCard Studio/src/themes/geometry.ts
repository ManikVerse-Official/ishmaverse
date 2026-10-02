/**
 * Holistic report-card geometry, in millimetres.
 *
 * This is the SINGLE source of truth shared by the PDF renderer
 * (`services/pdf/holisticLayout.ts`) and the on-screen preview
 * (`components/report/HolisticReportPreview.tsx`). The preview used to
 * approximate these numbers with CSS fractions, which made it look subtly
 * different from the generated PDF (different column split, different gaps).
 * Both sides now read the exact same values.
 *
 * A4 portrait is 210 × 297mm with an 8mm margin, so the content box is 194mm
 * wide and splits into a 122mm left column, a 4mm gutter and a 68mm right
 * column.
 */

export const A4_W_MM = 210;
export const A4_H_MM = 297;
export const MARGIN_MM = 8;
export const CONTENT_W_MM = A4_W_MM - MARGIN_MM * 2; // 194

/** Left (academic + skills) column width. */
export const LEFT_W_MM = 122;
/** Gutter between the two body columns. */
export const BODY_GAP_MM = 4;
/** Right (co-scholastic / attendance / overall) column width. */
export const RIGHT_W_MM = CONTENT_W_MM - LEFT_W_MM - BODY_GAP_MM; // 68

/** Academic table column ratios — Subject, Max, Obtained, Grade, Remarks. */
export const ACADEMIC_COL_RATIOS = [0.34, 0.14, 0.17, 0.11, 0.24] as const;

/** Fixed bar heights (mm). */
export const TITLE_BAR_H = 7;
export const SECTION_BAR_H = 7;
export const SKILLS_BAR_H = 6.5;
export const ATTENDANCE_BAR_H = 6.5;
export const OVERALL_BAR_H = 6.5;

/** Gap between the two skills boxes. */
export const SKILLS_GAP_MM = 3;
/** Width of the grade cell in the co-scholastic table. */
export const CO_VALUE_W_MM = 13;

/** Header furniture sizes (mm). */
export const LOGO_MM = 20;
export const PHOTO_W_MM = 18;
export const PHOTO_H_MM = 22;
export const SESSION_W_MM = 34;
export const SESSION_LABEL_H_MM = 6;
export const SESSION_VALUE_H_MM = 9;

/** Overall-performance panel: minimum height and the cap it may grow to. */
export const OVERALL_MIN_H_MM = 19.5;
export const OVERALL_MAX_H_MM = 38;

/** Width of the two skills boxes, laid out side by side in the left column. */
export const SKILL_BOX_W_MM = (LEFT_W_MM - SKILLS_GAP_MM) / 2; // 59.5
