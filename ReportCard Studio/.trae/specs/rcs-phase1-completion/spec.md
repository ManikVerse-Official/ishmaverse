# ReportCard Studio Phase 1 Completion — Specification

## Problem

The existing ReportCard Studio has a partially built architecture (parsers, mapping engines, normalization, PDF generation, ZIP batching) but the Excel parsing + intelligent mapping layer does not correctly handle real-world school workbooks. Specifically:

- "Sr. no." / serial-number columns are not reliably detected.
- "D.O.B", "Father's Name", "Address" and similar personal columns are often misclassified as Subject Marks or flattened subject headers.
- Multi-row headers with merged grouped subject headers (e.g. ENGLISH row over PT | NB | SE | SA2 | TOTAL columns) are not hierarchically grouped, producing 5 flat "subjects" instead of 1 subject with 5 components.
- The number of detected subjects is inflated or wrong.
- Browser console errors appear during the workflow.
- There is no dedicated, mandatory "Review & Confirm Mapping" interface with confidence indicators and editable per-column overrides.
- Validation coverage is incomplete (duplicate names, invalid dates, AB/EX/Medical, row-number pinpointing).
- The internal data model must remain truly dynamic — no hard-coded schools, classes, sections, subjects, or Excel formats.

## Users

- School teachers / administrators uploading real Excel marksheets and producing printable A4 report cards.
- No backend / server / auth in Phase 1 — everything is client-side in the browser.

## Goals

1. ANY real school Excel workbook → intelligent, correct parsing and mapping (or clear, editable suggestions).
2. Teacher can review every mapping before generation; low-confidence mappings are never silently applied.
3. Imported data normalizes into a clean internal JSON structure with unique per-student IDs so duplicate names never collide.
4. Validation step catches all common data errors, pinpoints exact Excel row numbers, and allows the rest of the batch to continue.
5. Photos are optional. Missing photos never block generation; blank photo box appears instead.
6. School Profile (name, address, logo, session, term, signatures, stamp) is fully CRUD, previewable, and persists only locally.
7. Real report-card preview uses real imported data (not a placeholder) and exactly matches the final PDF structure.
8. Batch generation produces one PDF per student + one ZIP containing all PDFs, with progress tracking and failed-row reporting.
9. All TypeScript builds pass, no browser console errors, no lint warnings.
10. End-to-end workflow verified against the real acceptance-test workbook and an alternative subject-structure workbook.

## Non-Goals

- Supabase, authentication, or server uploads for Phase 1.
- Permanent PDF storage / cloud archiving.
- Mobile-optimized print layout beyond clean A4.
- Custom template builders / drag-and-drop reports in Phase 1.
- Automatic photo OCR / face recognition.

---

## Functional Requirements

### FR1. Excel Parsing & Structure Detection

- FR1.1 Parse any .xlsx / .xls / .csv workbook using the xlsx library; preserve raw cell values and merged-cell ranges.
- FR1.2 Correctly detect header rows count and the data-start row using heuristics that consider:
  - merged cell row-spans,
  - transition from text-heavy rows to mixed text+numeric rows (student data),
  - typical header terms vs. typical data patterns.
- FR1.3 Multi-row / merged headers must build a hierarchical header tree, not flatten everything.
- FR1.4 Merged grouped subject headers (e.g. parent "ENGLISH" over child columns "PT | NB | SE | SA2 | TOTAL") must be reconstructed as ONE subject group with 5 components.
- FR1.5 Blank cells inside merged header regions are treated as sharing their parent merge's value.
- FR1.6 Student data rows must NEVER be interpreted as headers.
- FR1.7 Standalone (unmerged) columns remain standalone.
- FR1.8 "5th class final term 2025-26.xlsx" (the primary acceptance workbook) must parse with correct header detection and student row count.

### FR2. Student Information Field Detection

- FR2.1 Detect all common student-information columns via normalized fuzzy header matching:
  - Serial No. synonyms: Sr. no., Sr No, Serial No, S.No, Sl. No., Roll No, Roll, Admission No, etc.
  - Name synonyms: Name, Student's Name, Students Name, Student Name, Full Name.
  - Father Name synonyms: Father's Name, Fathers Name, Father Name, Guardian Name, Parent Name.
  - Mother Name synonyms: Mother's Name, Mothers Name, Mother Name.
  - DOB synonyms: D.O.B, DOB, Date of Birth, Birth Date, Birthday.
  - Address, Class, Section, Attendance, Position / Rank, Admission No.
  - Photo / Photo Filename / Image filename.
- FR2.2 Every detected field carries a numeric confidence score 0.0–1.0.
- FR2.3 Ambiguous / low-confidence (<0.7) matches are NOT silently applied. They surface for manual confirmation.
- FR2.4 Personal-information columns (Address, Father/Mother Name, DOB, Name, Roll/Serial, Class, Section, Attendance, Position, Admission No) are NEVER classified as subject marks unless the user explicitly overrides.

### FR3. Subject & Component Detection

- FR3.1 Only genuine academic / assessment columns are classified as subjects or subject components.
- FR3.2 The list of prohibited-from-subject classifications includes (per workbook-level heuristics): DOB, Address, Father/Mother/Student Name, Roll/Serial/Admission No, Class, Section, Attendance, Position, Total, Percentage, Grand Total. This list must never be the *only* classifier, but it provides a strong exclusion prior.
- FR3.3 Subject groups carry: name, start column, end column, component list, has-total flag, confidence.
- FR3.4 Components carry: name, column, optional max-marks (inferred from brackets like (50) or "max: 50" patterns), is-total flag.
- FR3.5 Numeric subjects, grade-based (A/B/C) subjects, and mixed structures all work.
- FR3.6 No hard-coded subject name list; any set of school subjects (completely different curriculum) must classify dynamically.
- FR3.7 Grade fields (MV, GK, Drawing, etc.) are a separate category from numeric subjects but still render as co-scholastic areas.

### FR4. Overall / Computed Field Detection

- FR4.1 Detect workbook-level overall columns: Grand Total, Total, Percentage, %, Rank, Position, Remarks, Attendance.
- FR4.2 These fields route to `Student.overall` and must not double-count in subject totals.

### FR5. Mandatory Mapping Review UI

- FR5.1 A dedicated interface (tab/step) before generation clearly lists every detected Excel column as one of:
  - STUDENT FIELDS (Name, Roll, DOB, Father, Mother, Address, Class, Section, Attendance, Photo, etc.)
  - SUBJECTS with component breakdown under a subject parent
  - GRADE / CO-SCHOLASTIC FIELDS
  - OVERALL FIELDS (Total, %, Position, Remarks…)
- FR5.2 Each mapping row shows:
  - original Excel header(s),
  - first-data-row preview,
  - detected target type + name,
  - confidence badge (High / Medium / Low),
  - editable dropdown to change type,
  - ability to Ignore a column,
  - ability to rename a subject / component when appropriate.
- FR5.3 Teacher must explicitly confirm mappings before moving forward.
- FR5.4 When confidence < 0.7 a visual warning badge is shown; the teacher cannot silently proceed past at least one low-confidence item without acknowledging.

### FR6. Normalized Internal Data Model

- FR6.1 Each imported student receives a unique internal `studentId` of the form `row-{dataStartRow + idx}` so duplicate names never collide.
- FR6.2 Internal normalized shape (conceptual; extend keys dynamically from FR2–FR4, do not hard-code):
  ```
  {
    studentId, rowNumber, rawRow,
    student: { name, rollNo, admissionNo?, dob?, fatherName?, motherName?, address?, class?, section?, attendance?, photoFilename? },
    overall: { total?, percentage?, position?, remarks?, attendance? },
    subjects: [ { name, components:[{name,marks,maxMarks,status,isTotal}], total?, maxTotal? } ],
    gradeFields: [ { name, value } ],
    learningSkills?: Record, personalityDev?: Record, coScholastic?: Record,
    teacherRemarks?, principalRemarks?
  }
  ```
- FR6.3 No data from one student's row is ever merged into another.

### FR7. Validation Engine

- FR7.1 Validation is a dedicated step before generation and produces a pass/fail report per-student.
- FR7.2 Checks implemented:
  - missing student name (ERROR)
  - missing identifier (roll / serial / admission) — ERROR unless default provided and acknowledged
  - duplicate identifier within class+section — ERROR with list of duplicate row numbers
  - duplicate student names (same exact name) — WARNING unless identifier is different
  - marks < 0 — ERROR
  - marks > maxMarks for that column — ERROR
  - non-numeric marks when status should be "present" — ERROR unless AB/EX/Medical
  - invalid / malformed date in DOB — WARNING (allow non-DATE strings, but flag clearly malformed Excel dates)
  - AB / Absent — OK; excluded from totals, preserved as status
  - EX / Exempt — OK; excluded from totals
  - Medical / Med — OK; excluded from totals
  - blank optional values — WARNING only for optional recommended fields
  - unusual / ambiguous mappings (low-confidence user-confirmed) — WARNING
- FR7.3 Every issue records the Excel row number, studentId, field, severity, and human message.
- FR7.4 Valid records continue generation even if some records fail; failed records are listed in the failed CSV download with reasons.
- FR7.5 Validation exposes counts (errors / warnings) and a CSV export of all issues.

### FR8. Photo System

- FR8.1 Photos are strictly optional.
- FR8.2 Mode A — Excel contains a Photo Filename column + user uploads a ZIP of photos. Matching order:
  1. exact photo filename,
  2. roll number with .jpg/.jpeg/.png extension (and without),
  3. slugified student name.
- FR8.3 Mode B — No photos provided. Report cards render a blank "Passport Size Photo" placeholder rectangle suitable for later pasting after printing.
- FR8.4 Missing a specific student's photo NEVER aborts generation of that student's PDF.

### FR9. Report Card Template (Holistic HOLISTIC PROGRESS REPORT CARD)

- FR9.1 A4 portrait, print-ready. All sections render without overlap or clipping.
- FR9.2 Dynamically populated areas (from real data — never hard-coded sample school info):
  - School logo / placeholder
  - School name & address
  - affiliation / school code (if supplied in future extensions — structure must not break when added; Phase 1 fields are in the current SchoolProfile type)
  - Academic session
  - Examination / term
  - Student name, DOB, Roll/Serial, Admission (if present), Class, Section
  - Parent / Guardian details (Father / Mother)
  - Academic performance table with DYNAMIC subjects and DYNAMIC subject components (components shown inline or in a column depending on count)
  - Dynamic grade / co-scholastic area table
  - Grading scale (grades from the calculation engine used)
  - Personality / Learning skills blocks (default 6 each if not supplied in data)
  - Attendance
  - Overall performance summary (Grand Total / Percentage / Overall Grade / Result)
  - Teacher remarks
  - Principal remarks
  - Teacher signature placeholder / image + name
  - Principal signature placeholder / image + name
  - School stamp placeholder / image
  - Optional student photo or blank photo box
- FR9.3 The ReportCardPreview HTML component and the jsPDF PDF template use EXACTLY the same section structure, data flow, and computation engine so the preview is truthful.
- FR9.4 All school info comes purely from the SchoolProfile store; nothing in the templates hard-codes any school name, address, principal, teacher, or exam term.

### FR10. School Profile

- FR10.1 School-profile fields: schoolName, address, logoDataUrl (optional), principalName, principalSignDataUrl (optional), teacherName, teacherSignDataUrl (optional), stampDataUrl (optional), academicSession, examTerm.
- FR10.2 Actions: Save / Preview / Replace / Remove (for each image) / Reset / Clear.
- FR10.3 Persisted only in browser localStorage under key `rcs:schoolProfile`.
- FR10.4 Reset restores the empty default.
- FR10.5 School Profile page shows a live checklist of filled vs. missing fields; images show click-to-replace, click-to-remove controls.

### FR11. Report Preview (Mandatory)

- FR11.1 Before batch PDF generation, the Generate Reports page shows a real rendered report card using the first valid student's actual imported data, actual school profile, actual detected subjects/components.
- FR11.2 The preview is NOT a placeholder / empty card.
- FR11.3 If data is wrong, the teacher can navigate back to Import Students (mapping / subjects tabs) to correct it. The store state is preserved across navigation within the same SPA session.

### FR12. PDF Generation

- FR12.1 A4, portrait, jsPDF-generated with no clipping, correct page bounds.
- FR12.2 For one student: one PDF containing correct marks, correct identity, correct school info, signatures/stamp/logo if present, photo if present, all dynamic subjects and components, all dynamic grades.
- FR12.3 Filename format `{RollOrStudentID}_{StudentName}.pdf` with illegal-chars sanitized.
- FR12.4 Duplicate names never overwrite: append `_2`, `_3`, etc. until unique.
- FR12.5 Missing photos → blank placeholder, never a broken image.

### FR13. Batch Generation + ZIP

- FR13.1 One click (Generate X Reports) produces N individual PDFs + packages all into a single ZIP.
- FR13.2 Batch size default 5, chunked Promises so 50–100 reports do not freeze the browser.
- FR13.3 Live progress UI shows: total students, completed count, failed count, progress bar %, current student name/roll.
- FR13.4 Cancel button available while running.
- FR13.5 Final result shows a results table per student: row, roll, name, output filename, Pass / Fail badge with tooltip reason on fail.
- FR13.6 ZIP download button appears on success.
- FR13.7 Failed students are downloadable as a CSV: Row, Roll, Name, Reason.
- FR13.8 ZIP filename: `Class_{class}{section}_Report_Cards.zip` or `ReportCard_Export.zip` if class is missing.

### FR14. Privacy / Temporary Data

- FR14.1 No network uploads of student data; entire workflow client-side.
- FR14.2 Imported student data (workbook, students array, photoMap) is cleared when the user clicks "Start Over" (resetWorkflow).
- FR14.3 Generated PDFs are kept only as JS Blob URLs for download during the session; they are never stored to localStorage or IndexedDB by Phase 1 code.
- FR14.4 School profile can persist locally; clearable.

---

## Non-Functional Requirements

- NFR1. TypeScript strict build (`tsc -b`) passes with zero errors.
- NFR2. `npm run lint` passes with zero warnings.
- NFR3. No browser console errors (red) or React key warnings at any workflow step.
- NFR4. Usable on a modern desktop Chrome/Edge.
- NFR5. Generate 50 reports ≤ ~60 seconds on a typical laptop; UI remains responsive via chunking.
- NFR6. Never hard-code specific subject names inside parsers / classifiers as the *only* subject detection path; hard-coded lists (if any) are fallbacks and must coexist with a generic heuristic that works for new subjects.

---

## Constraints & Dependencies

- Existing working pages (Dashboard, School Profile, Import Students, Report Template, Generate Reports) MUST NOT break. Navigation structure and routes remain identical.
- Keep the existing design system (`card`, `btn-*`, `badge-*`, `table`, `input`, `label` utilities in `index.css` / Tailwind).
- Continue using: `xlsx`, `zustand`, `jspdf`, `jszip`, `html2canvas`, `lucide-react`, `react-router-dom`, `clsx`.
- Phase 1 only — no Supabase, no auth, no payment.
- The file `5th class final term 2025-26.xlsx` (when provided / uploaded by user into the workflow) is the primary acceptance test; the repo also contains `testdata_*.xlsx` files as secondary tests.

## Assumptions

- The user can supply the primary acceptance workbook `5th class final term 2025-26.xlsx` via the upload UI.
- Alternative test workbooks are already present in the repo: `testdata_10_students.xlsx`, `testdata_50_students.xlsx`, `testdata_alt_subjects.xlsx`, `testdata_complex_structure.xlsx`.
- The existing holistic report-card visual direction (navy header, clean sections, signature blocks) is kept; only data-binding bugs / dynamic layout issues are fixed.

## Open Questions

None material; all decisions are encoded in the requirements above. If an edge case is not explicitly listed, the default is: "surface it to the teacher as a low-confidence warning for manual override, never silently assume."

---

## Acceptance Criteria

### Rule ACs

- **AC1-rule**: Given `testdata_complex_structure.xlsx` (multi-row merged subject headers), the detected subject-group count exactly equals the number of parent subject groups, NOT the sum of flat child components.
- **AC2-rule**: For the primary workbook, "Sr. no." / "S.No" / "Sr No" column is classified as `rollNo` with confidence ≥0.85.
- **AC3-rule**: Columns with header "D.O.B", "DOB", "Date of Birth" are classified as student-field `dob` and NEVER as a subject or subject component.
- **AC4-rule**: "Father's Name", "Fathers Name", "Father Name" classified as `fatherName` and NEVER as a subject.
- **AC5-rule**: "Address" classified as personal-info ignore (or a student field if mapped) and NEVER as a subject.
- **AC6-rule**: If 5 student name + 7 roll fields map into 12 rows, each Student object has a unique `studentId` and no row data is merged across students.
- **AC7-rule**: Mapping Review UI must render for any uploaded workbook before the validation step allows generation.
- **AC8-rule**: Validation flags marks > maxMarks with severity ERROR and includes the 1-based Excel row number.
- **AC9-rule**: Uploading no photo ZIP still produces 1 PDF per valid student; the PDF photo area shows a blank placeholder rectangle, not a broken image.
- **AC10-rule**: Batch generation of N students yields exactly N entries in the results list (Pass or Fail) and exactly N files inside the ZIP minus the failed ones; filenames never collide even if two students share the same name.
- **AC11-rule**: `npm run build` exits 0.
- **AC12-rule**: `npm run lint` exits 0.
- **AC13-rule**: Running end-to-end with the primary acceptance workbook produces zero uncaught exceptions in the browser console at every step (Upload → Mapping → Subjects → Photos → Preview → Generate).

### Rubric ACs

- **AC14-rubric Dynamic Subject Coverage (Scale 0–2, pass ≥1)**: Classifier correctly groups 100% of known subject patterns (0) ; correctly groups >70% with minor manual adjustments (1) ; correctly groups ≥95% fully automatic on both test workbooks (2).
- **AC15-rubric Mapping Review UX Clarity (Scale 0–2, pass ≥1)**: Confidence badge is present but layout is confusing (0) ; teacher can tell at a glance what is High/Medium/Low confidence and override via dropdown (1) ; every mapping row has a clear 1-click override + ignore + rename where appropriate, low-confidence rows are visually separated or warned (2).
- **AC16-rubric Holistic Report Truthfulness (Scale 0–2, pass ≥1)**: Preview and PDF differ in several fields (0) ; Preview and PDF agree on identity, marks, totals, grades, school info with only cosmetic differences (1) ; Identical section layout, identical computed numbers, no detectable discrepancy (2).
- **AC17-rubric Workflow Robustness (Scale 0–2, pass ≥1)**: Breaks on at least one test data file (0) ; works on all provided test files with one manual mapping override each (1) ; works on all provided test files + a synthetic "different curriculum" file with zero overrides needed (2).
