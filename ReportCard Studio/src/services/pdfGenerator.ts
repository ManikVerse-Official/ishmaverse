import jsPDF from 'jspdf';
import type { SchoolProfile, Student } from '../types';
import { getTheme } from '../themes';
import { buildReportCardModel } from './reportCardModel';
import { formatVerificationErrors, verifyReportCardModel } from './reportVerification';
import { renderHolisticLayout } from './pdf/holisticLayout';
import { renderAcademicLayout } from './pdf/academicLayout';
import { A4_H_MM, A4_W_MM, MARGIN_MM } from './pdf/pdfKit';

export interface PdfRenderOptions {
  student: Student;
  school: SchoolProfile;
  photoDataUrl?: string;
  /** Skip the safety verification (only for diagnostics/testing). */
  skipVerification?: boolean;
}

/**
 * Render one report card PDF.
 *
 * The layout comes from the school's selected theme. Before anything is drawn
 * the card model is verified against the student record — if the two disagree
 * (wrong name, wrong marks, bad total/percentage) the PDF is NOT produced, so a
 * wrong report card can never be handed to a parent.
 */
export function generateStudentPdfBlob(opts: PdfRenderOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const { student, school, photoDataUrl } = opts;
      const theme = getTheme(school.reportTheme);
      const model = buildReportCardModel(student, school);

      if (!opts.skipVerification) {
        const verification = verifyReportCardModel(student, model, {
          photoAttached: Boolean(photoDataUrl),
        });
        if (!verification.ok) {
          reject(
            new Error(
              `Report card data check failed for "${student.name}" (Roll ${student.rollNo}): ${formatVerificationErrors(
                verification,
              )}`,
            ),
          );
          return;
        }
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const renderOptions = { doc, model, school, theme, photoDataUrl };
      if (theme.layout === 'academic') {
        renderAcademicLayout(renderOptions);
      } else {
        renderHolisticLayout(renderOptions);
      }

      resolve(doc.output('blob'));
    } catch (e) {
      reject(e);
    }
  });
}

export function sanitizeFilename(s: string): string {
  return String(s || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function buildPdfFilename(
  rollNo: string,
  name: string,
  existingNames: Set<string>,
): string {
  const base = `${sanitizeFilename(rollNo) || 'roll'}_${sanitizeFilename(name) || 'student'}`;
  let candidate = `${base}.pdf`;
  let idx = 2;
  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${base}_${idx}.pdf`;
    idx++;
  }
  existingNames.add(candidate.toLowerCase());
  return candidate;
}

export function buildZipFilename(cls?: string, section?: string): string {
  const c = sanitizeFilename(cls || 'Class');
  const s = sanitizeFilename(section || '');
  if (s) return `Class_${c}${s}_Report_Cards.zip`;
  return `Class_${c}_Report_Cards.zip`;
}

export { A4_W_MM, A4_H_MM, MARGIN_MM };
