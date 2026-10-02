import type { SchoolProfile, Student } from '../../types';
import { getTheme } from '../../themes';
import HolisticReportPreview from './HolisticReportPreview';
import AcademicReportPreview from './AcademicReportPreview';

interface Props {
  student: Student;
  school: SchoolProfile;
  photoDataUrl?: string;
  /** Override the theme from the school profile (used by the theme picker). */
  themeId?: string;
}

/**
 * Theme dispatcher. The report card layout itself lives in the theme module
 * (src/themes) plus one preview component per layout kind, so adding a new
 * theme never requires touching the pages.
 */
export default function ReportCardPreview({ student, school, photoDataUrl, themeId }: Props) {
  const theme = getTheme(themeId ?? school.reportTheme);

  if (theme.layout === 'academic') {
    return (
      <AcademicReportPreview
        student={student}
        school={school}
        photoDataUrl={photoDataUrl}
        theme={theme}
      />
    );
  }

  return (
    <HolisticReportPreview
      student={student}
      school={school}
      photoDataUrl={photoDataUrl}
      theme={theme}
    />
  );
}
