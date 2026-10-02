# ReportCard Studio Phase 1 Completion — Implementation Tasks

## Map to Acceptance Criteria

| AC | Task IDs |
|----|----------|
| AC1-rule (multi-row grouping) | T1, T2 |
| AC2-rule (Sr. no → rollNo) | T2, T3 |
| AC3-rule (DOB not subject) | T3, T4 |
| AC4-rule (Father name not subject) | T3, T4 |
| AC5-rule (Address not subject) | T3, T4 |
| AC6-rule (unique studentIds) | T5 |
| AC7-rule (Mapping Review mandatory) | T6 |
| AC8-rule (marks>max ERROR + row #) | T7 |
| AC9-rule (blank photo fallback) | T8 |
| AC10-rule (batch ZIP + no collide) | T9, T11 |
| AC11-rule (tsc -b) | T13 |
| AC12-rule (lint) | T13 |
| AC13-rule (no console errors) | T12, T13 |
| AC14-rubric (dynamic subjects) | T1, T2, T14 |
| AC15-rubric (Mapping Review UX) | T6 |
| AC16-rubric (report truthfulness) | T10, T11 |
| AC17-rubric (workflow robustness) | T14 |

---

## Task 1: Overhaul `dynamicExcelParser.ts` multi-row header & merge reconstruction

**Status:** pending
**Priority:** high
**Parent AC:** AC1, AC14
**Files to change:**
- `src/services/dynamicExcelParser.ts`
- (may reference) `src/services/excelParser.ts`

### Changes
- Rewrite `detectHeaderRows` so the number of header rows is determined by BOTH (a) vertical merge spans AND (b) pattern scanning: header rows contain mostly text and typical header keywords; the first data row is the row below the last header row where ≥40% of cells are numeric OR the row has a valid student name + ID pattern.
- `buildHeaderStructure` should not skip blank cells that fall inside a merge — they should inherit the merge value.
- `detectColumnGroups` must build subject groups from **multi-row header hierarchy**: a top-level merged cell (ENGLISH) spanning columns C–G becomes a `SubjectGroup` named "ENGLISH" whose `components` are the headers in the row immediately below (PT, NB, SE, SA2, TOTAL).
- Correctly mark the TOTAL component with `isTotal: true` using `isTotalColumn` (contains "total" / "grand total").
- `classifyColumnGroups`: when a column group's text matches student-field synonyms (via the normalization alias map), route it OUT of subjects entirely (don't create a subject group).
- Add the SR. NO / SERIAL detection pattern with ≥0.9 confidence when the column contains 1..N in data rows.
- Add Address, DOB, Father Name, Mother Name, Name, Class, Section, Attendance, Position, Admission, Remarks, Total, Percentage to `detectStudentFields` with strong exclusion priors so they are NEVER returned as subjects.
- In `calculateConfidence`, penalize structures where DOB/Address appear as subject groups (multiply by 0.2 if any personal-info column is misclassified as a subject).

### Test Requirements
- **TR1-rule:** `npm run build` passes after edits.
- **TR2-rule:** When `parseDynamicStructure` is called on a simulated multi-row header, subject-groups count equals the number of parents (e.g. for ENGLISH / HINDI / MATHS each with 5 child components → subjectGroups.length === 3, NOT 15).
- **TR3-rule:** A column with header "D.O.B" and data values like "01/05/2015" is returned in `studentFields` with fieldType `dob`; it does NOT appear in `subjectGroups`.
- **TR4-rubric (0-2, pass≥1):** Grouping quality on 3 synthetic cases (simple single-row / two-row merged / partial merges) scores 0=0 cases, 1=2 cases correct with 1 minor manual tweak, 2=3 fully correct.

---

## Task 2: Fix `excelParser.ts` flattened headers to preserve subject-group context AND keep dynamic parser as primary path

**Status:** pending
**Priority:** high
**Parent AC:** AC1, AC14, AC2
**Files to change:**
- `src/services/excelParser.ts`
- `src/pages/ImportStudents.tsx`

### Changes
- In `buildFlattenedHeaders`, when a multi-row merge parent exists (e.g. ENGLISH over PT), produce flattened headers of the form `ENGLISH | PT` (pipe separator) rather than `ENGLISH - PT` or bare `PT`. This lets downstream code split the subject group from the component.
- In `detectHeaderRows`, when a row is clearly still a header (contains no numeric student roll/name pattern), keep adding header rows up to 4 instead of bailing out.
- `ImportStudents.tsx` handleFile: if `parseDynamicStructure` returns subjectGroups.length === 0 or studentFields.name is missing → run a second pass with the fallback `autoMapColumns` AND surface a warning badge to alert the teacher that the advanced parser failed and they should review mappings carefully.
- Store the detectedStructure object in the app store (the fields already exist in `appStore.ts`; wire them up in handleFile).

### Test Requirements
- **TR1-rule:** `npm run build` passes.
- **TR2-rule:** On the flattened pipe-separated form (`ENGLISH | PT`), the downstream dynamic-mapping engine correctly splits subject-group name from component name WITHOUT relying on the pipe separator alone — it also consults the dynamic structure when available.

---

## Task 3: Student field fuzzy-matching overhaul + non-subject exclusion

**Status:** pending
**Priority:** high
**Parent AC:** AC2, AC3, AC4, AC5, AC14
**Files to change:**
- `src/services/dynamicExcelParser.ts` (`identifyStudentFieldType`, `calculateFieldConfidence`, `looksLikeSubject`, `looksLikeGradeField`)
- `src/utils/normalization.ts` (expand FIELD_ALIASES)
- `src/services/mappingEngine.ts` (`autoMapColumns`, `looksLikeSubjectHeader`)

### Changes
- Expand `FIELD_ALIASES` to include ALL the listed synonyms:
  - rollNo: `sr no`, `sr. no.`, `sr.no`, `s.no`, `s no`, `serial no`, `serial no.`, `sl no`, `sl. no.`, `roll`, `roll no`, `roll number`, `rollno`, `r no`, `rno`, `admission no`, `admission no.`, `adm no`, `admission number`
  - name: `name`, `student name`, `students name`, `student's name`, `student`, `full name`, `studentname`, `s name`, `name of student`
  - fatherName: `father name`, `fathers name`, `father's name`, `father s name`, `father`, `guardian`, `guardian name`, `parent name`, `parent / guardian`, `father's / guardian's name`
  - motherName: `mother name`, `mothers name`, `mother's name`, `mother s name`, `mother`
  - dob: `dob`, `d.o.b`, `d o b`, `date of birth`, `birth date`, `birthday`, `b date`
  - address: `address`, `residential address`, `home address`, `residence`
  - attendance: `attendance`, `attendance %`, `attendance percent`, `attendance percentage`, `days present`, `no of days present`, `working days`
  - position: `position`, `rank`, `class rank`, `overall position`, `overall rank`, `merit position`
- Add Address & Position as legitimate entries in the `FieldKey` union type OR keep them as studentFields entries mapped to `ignore` until the next field-key update — at minimum, they must never be subjects.
- `identifyStudentFieldType`: after the existing aliases, ALSO perform a Jaro-Winkler style fuzzy match or at minimum a substring-of-normalized match so "Father name " (trailing space) / "Father's\nName" (newline) still match.
- `calculateFieldConfidence`:
  - exact normalized match on alias → 0.95–1.00
  - alias is substring of normalized header → 0.75–0.85
  - fuzzy overlap (≥70% bigram match) → 0.60–0.70 (LOW, must surface for manual confirmation)
- `looksLikeSubject`: explicitly REJECT headers that match student-field aliases (including address), overall-field aliases (total, percentage, grand total, %, position, attendance, remarks), and grade-overall indicators.
- `looksLikeGradeField`: keep as secondary classifier, but NOT as exclusion of numeric subjects. A numeric subject should not be demoted to grade field just because it has a short name.

### Test Requirements
- **TR1-rule:** For every alias above (at least 1 representative from each group), `identifyStudentFieldType` returns the correct non-`ignore` fieldType or a dedicated student `ignore` field when appropriate but never classifies it as a subject in `looksLikeSubjectHeader`.
- **TR2-rule:** "Sr. no." maps to `rollNo` with confidence ≥0.85.
- **TR3-rule:** "Father's Name" maps to `fatherName` with confidence ≥0.90; "Fathers Name" maps to `fatherName` with confidence ≥0.85.
- **TR4-rule:** "D.O.B" maps to `dob` with confidence ≥0.90; "Address" maps to a student-identified ignore or student-field (NOT subject) with confidence ≥0.80.

---

## Task 4: Subject classification must strongly EXCLUDE personal-info & overall columns

**Status:** pending
**Priority:** high
**Parent AC:** AC3, AC4, AC5
**Files to change:**
- `src/services/dynamicMappingEngine.ts`
- `src/utils/normalization.ts`

### Changes
- In `convertDetectedStructureToColumnMapping`:
  - First mark all columns that appear in `detected.studentFields` and `detected.overallFields`. These columns are NEVER mapped as `subject` by the auto-mapping even if a fallback loop would re-add them.
  - Add a safety guard: when a column has been classified as a student field with confidence ≥0.80, the generated ColumnMapping MUST match that classification, not a generic subject guess.
- In `createStructureMappingFromDetected`: same guard — don't overwrite a confident student-field entry with a subject.
- Add a helper `isKnownNonSubjectHeader(normalized:string): boolean` in `normalization.ts` that returns true when the header matches any FIELD_ALIAS or the overall field synonyms (total, percentage, %, rank, position, remarks, attendance, grand total, g total). Use it everywhere before treating a column as a subject.

### Test Requirements
- **TR1-rule:** After conversion, DOB / Address / Father Name columns in the generated column mappings are of fieldKey `dob` / `ignore` / `fatherName` respectively and NEVER of fieldKey `subject`.
- **TR2-rule:** Subject count in `summarizeMappings` equals the number of genuine academic columns — not inflated by personal-info columns.

---

## Task 5: Normalized student data with robust unique IDs (buildStudentsFrom*)

**Status:** pending
**Priority:** high
**Parent AC:** AC6
**Files to change:**
- `src/services/normalizationEngine.ts`
- (if fields need updates) `src/types/index.ts`

### Changes
- `buildStudentsFromRows`: keep existing but replace the current `studentId = row-{idx+2}` scheme to include `dataStartRow` when it is available from the workbook metadata (add a `dataStartRow?: number` optional parameter, defaulting to 2 for backward compat).
- `buildStudentsFromDynamicStructure`:
  - If subject components exist, DON'T double count the same marks. If the parent Subject has marks (from the TOTAL component), use those for the `SubjectMark.marks`. Otherwise compute from the present non-total components.
  - Store the exact detected component names as they appear in the Excel; allow the report card to render them dynamically.
  - Store the raw `rawRow` so teachers can inspect it later in the UI.
  - `studentId = row-{dataStartRow + idx}` using the detected structure's `dataStartRow`.
  - Make sure `rollNo` fallbacks are deterministic: use detected roll field value if present; else detected serial no field value; else admission no value; else `String(idx+1)`.
  - Enforce uniqueness: if a `rollNo` collision would occur within `(class, section, rollNo)`, append `#dup-2`, `#dup-3`, etc. to the `studentId` but KEEP the original `rollNo` displayed; log a validation issue.
- (If types need updating) Add to `types/index.ts` a dedicated `StudentInfo` nested shape so the Student object looks cleaner — WITHOUT breaking existing code. Optionally, add backward-compatible getters.

### Test Requirements
- **TR1-rule:** For 50-student file, 50 unique studentIds are produced; none are repeated even if 2 students share a name.
- **TR2-rule:** For 10 rows of data starting at dataStartRow 3, studentIds are `row-3`, `row-4`, … `row-12`.
- **TR3-rule:** If Excel has 10 genuine subjects each with 5 components, each Student.subjects array has 10 `SubjectMark` entries with `hasComponents: true` and 5 components each; flat-subject count in grade is 10, not 50.

---

## Task 6: Build dedicated Mapping Review UI (mandatory step between Mapping & Subjects tabs — OR replace Mapping tab entirely)

**Status:** pending
**Priority:** high
**Parent AC:** AC7, AC15
**Files to change:**
- `src/pages/ImportStudents.tsx`
- (new sub-component if needed — prefer inline to avoid creating unnecessary files)
- `src/services/dynamicMappingEngine.ts` — export `summarizeDetectedStructure` + `getStructureSummaryText` + new helper per-column confidence

### Changes
- In `ImportStudents.tsx`, redesign the `mapping` tab into the dedicated Review UI. When the dynamic structure exists (`useAppStore(s => s.detectedStructure)`), render a FOUR-SECTION layout:
  1. **STUDENT FIELDS** — list each detected Excel column: Excel header, First-row preview, Mapped-to, Confidence badge (High=≥0.85 emerald, Medium=0.70–0.85 amber, Low=<0.70 red), editable dropdown with FieldKey options, ignore option.
  2. **SUBJECTS** — collapsible per subject group: Subject name (editable text input), then its components with component name (editable), max marks editable, is-Total indicator. Row includes Confidence badge.
  3. **GRADE / CO-SCHOLASTIC FIELDS** — list each detected grade area with name editable.
  4. **OVERALL FIELDS** — Total, Percentage, Position, Attendance, Remarks mapped.
- Any unmapped / ignored columns appear at the bottom of section 1 with an "Unmapped" banner so the teacher may assign them.
- Low confidence rows (<0.7) render with amber/red left border and a warning badge. A banner at the top says "N columns have low-confidence auto-detection; please confirm below."
- A "Confirm Mappings" button at the bottom: enabled ONLY after every LOW-confidence row has been touched by the user OR the user clicks a secondary "Acknowledge all low-confidence as-is" checkbox.
- Wire up the store: when mappings are confirmed, write `setStructureMapping(confirmed=true)` and `setColumnMapping(...)` (derived via existing conversion functions).

### Test Requirements
- **TR1-rule:** Uploading a workbook where 1 column (Address) has a medium-confidence match shows the Confidence badge "Medium"; a synthetic test with a weird column name ("Dads_Handle") produces "Low".
- **TR2-rule:** Before Confirm Mappings is pressed, "Continue to Subjects" in the tab navigator is disabled OR a modal prevents skipping.
- **TR3-rubric (0-2, pass≥1):** Heuristic UX review — 0=sections jumbled, hard to understand what is detected; 1=sections present, confidence visible, teacher can override; 2=clean separation with collapsible subject groups and zero confusion about what was auto-detected vs what is editable.

---

## Task 7: Extend validation engine per FR7

**Status:** pending
**Priority:** high
**Parent AC:** AC8
**Files to change:**
- `src/services/validationEngine.ts`
- `src/pages/ImportStudents.tsx` (PreviewTab — if CSV export needs enhancement)

### Changes
- Add new checks in `validateStudents`:
  - duplicate student NAMES with same class+section (same exact full name, different IDs) → WARNING.
  - invalid / malformed DOB: try to parse `s.dob` — if it looks LIKE a date (contains digits + separator) but fails to parse, WARNING. If DOB is completely blank and Excel has the column, no error (optional).
  - AB / Absent / EX / Exempt / Medical — preserved in the status field, but validation MUST NOT ERROR for these statuses (current code skips them correctly via status !== 'present' check). Double-check that no existing code emits "missing marks" when status is AB/EX/Medical.
  - duplicate identifier (rollNo + class + section) → ERROR per collision. When emitting, add row numbers of ALL duplicates.
  - unusual / ambiguous mappings: if the structure mapping has ANY column that user overrode from its auto-detection, emit a WARNING once per workbook to alert teachers to review.
- Every ValidationIssue type must already carry `rowNumber` (1-based Excel row); double-check the PreviewTab displays it.
- Export of errors CSV already exists — extend it to include "Issue Code" column so teachers can easily filter.

### Test Requirements
- **TR1-rule:** A synthetic student with `Maths: {marks: 105, max: 100}` → severity=ERROR, field=`subject.Maths`, rowNumber = student's row (not array index).
- **TR2-rule:** Student DOB value "not-a-date-at-all" → WARNING, severity=warning.
- **TR3-rule:** Student status=absent on a subject → no ERROR about missing marks.
- **TR4-rule:** 2 students with identical class/section AND identical roll number → BOTH get an ERROR "Roll number X … is duplicated."

---

## Task 8: Verify photo system — blank fallback, ZIP matching, never fail

**Status:** pending
**Priority:** medium
**Parent AC:** AC9
**Files to change:**
- `src/services/photoMatcher.ts` (small robustness improvements if any)
- `src/components/report/ReportCardPreview.tsx` (blank photo box visual consistency)
- `src/services/pdfGenerator.ts` (blank photo box consistency with preview)

### Changes
- `resolvePhotoForStudent`: If the returned photoDataUrl is `undefined`, the preview and PDF MUST render a clean placeholder (already done — verify).
- Ensure that in `ReportCardPreview` the blank photo area shows EXACTLY the text "Passport\nSize\nPhoto" or similar; align PDF's drawPlaceholderBox label text.
- In PDF generator `drawTemplate`: wrap the photo addImage in try/catch that FALLS BACK to drawPlaceholderBox (already done). Also wrap the `photoDataUrl === undefined` path to explicitly call drawPlaceholderBox first.
- Verify ZIP path: if a corrupt ZIP is uploaded, `loadPhotoZip` rejects cleanly, `handlePhotoZip` sets fileError, no broken UI state.

### Test Requirements
- **TR1-rule:** Generate a PDF with no photos uploaded — the generated PDF has a rectangular placeholder box for photo; no console errors, no crash.
- **TR2-rule:** Upload a photo ZIP containing `12.jpg`; resolvePhotoForStudent for rollNo `12` returns a non-empty data URL.
- **TR3-rule:** Student with photo mismatch (no entry in photoMap, no filename) → photoDataUrl is `undefined`, preview still renders correctly, PDF still generates successfully.

---

## Task 9: Verify PDF + ZIP batch generation correctness & filename collision safety

**Status:** pending
**Priority:** high
**Parent AC:** AC10
**Files to change:**
- `src/services/bulkGenerator.ts`
- `src/services/pdfGenerator.ts` (`buildPdfFilename`)
- `src/pages/GenerateReports.tsx`

### Changes
- `buildPdfFilename`: already implements `_2` / `_3` suffix — verify the Set is seeded BEFORE the loop (currently correct).
- `generateAllAndZip`: wrap each student in try/catch inside the map function (already done). Also, if a PDF generator throws due to corrupt school logo data URL, catch it there, mark that individual row as FAILED in GenerationResult.error, not the whole batch.
- In `GenerateReports.tsx` onStudentComplete callback — the stale-state bug: `setGen({ results: [...generation.results, res] })` reads `generation.results` (closure) and may lose previous results. Fix by using `setGen(state => ({ results: [...state.results, res] }))` function-update form.
- Results table: ensure fileName column renders truncated names; hover shows full filename via native title attribute.
- For failed rows, the failed CSV download includes row, roll, name, reason.

### Test Requirements
- **TR1-rule:** Two students named "Ankit Kumar" with rollNos 5 and 6 → filenames `5_Ankit_Kumar.pdf` and `6_Ankit_Kumar.pdf` (no collision; because roll differs). If rollNos are same the second appends `_2`.
- **TR2-rule:** Simulate a student-2 failure via throw in a mock — batch still produces ZIP of 9 PDFs when 1/10 fails; results table shows Row of failed student.
- **TR3-rule:** ZIP file is named correctly using class + section OR falls back to `ReportCard_Export.zip` style.

---

## Task 10: Guarantee ReportCardPreview uses real data and mirrors PDF structure 1:1

**Status:** pending
**Priority:** high
**Parent AC:** AC16
**Files to change:**
- `src/components/report/ReportCardPreview.tsx`
- `src/services/pdfGenerator.ts`

### Changes
- Align sections in the HTML preview and PDF so their ORDER and structure is identical: Header → School info → Student info + photo → Scholastic table → Co-scholastic/grade table → Summary → Learning skills → Personality → Co-scholastic → Remarks → Signatures.
- In both, grade-based subjects (MV, GK, Drawing) appear in the "Co-scholastic / Grade areas" table, not in Scholastic numeric marks.
- Ensure the computation engine (`computeTotals`) is used for BOTH preview AND PDF — PDF already uses `computeTotals(student)` at top of drawTemplate; preview already uses it. Keep this.
- If a subject has components, show them in both preview's Components column AND in PDF's Components column. The width of that column should be tuned so a typical 4-component line fits.
- Fix any small UI issues: truncated subject names in small columns should have a title tooltip with full name in preview; PDF text should auto-wrap using splitTextToSize (already does).

### Test Requirements
- **TR1-rule:** Spot check 3 random fields (student name, Maths total, percentage) on a generated PDF of first student vs. the preview — values must match exactly.
- **TR2-rule:** If a subject has 5 components (PT, NB, SE, SA2, TOTAL), preview shows components column with all non-totals; PDF shows them in the corresponding Components column.
- **TR3-rubric (0-2, pass≥1):** Visual side-by-side comparison of PDF screenshot vs preview — 0=obvious layout differences, 1=same structure with minor spacing, 2=practically identical (modulo rendering medium).

---

## Task 11: Ensure Generate Reports page shows real preview + all validation wires + progress tracking

**Status:** pending
**Priority:** high
**Parent AC:** AC10, AC11
**Files to change:**
- `src/pages/GenerateReports.tsx`
- `src/services/bulkGenerator.ts`

### Changes
- In `GenerateReports.tsx`:
  - The sample preview at the bottom currently uses the first chosen student and scales 0.75. Ensure it renders even for a complex multi-component subject structure; verify ReportCardPreview does not throw.
  - `start()` function: use the setState-callback form for `setGen({ results: [...state.results, res] })` (closure bug described in T9).
  - Progress bar: ensure 100% displays when (completed + failed) === total, even if not 100% successful.
  - ZIP download: ensure URL is revoked via setTimeout (already in downloadBlob pattern — apply same there).
  - Add a helpful hint below the preview explaining "This is the exact layout used in the PDFs; use School Profile to customize school info / signatures."
- If validation is null and there are students, run validation ONCE on mount via useEffect (currently in a conditional non-hook render-path; move to useEffect to avoid React warnings).

### Test Requirements
- **TR1-rule:** Navigate to /generate with valid students in store → top progress block shows stats, preview renders at bottom, clicking Generate → progress bar animates to 100%, download button appears with ZIP filename.
- **TR2-rule:** Cancelling mid-run via the Cancel button sets status='error'; no crash.
- **TR3-rule:** React DevTools show no "setState during render" or "missing key" warnings at any step of the Generate Reports flow.

---

## Task 12: Fix all browser console errors across the full workflow

**Status:** pending
**Priority:** high
**Parent AC:** AC13, NFR3
**Files to change:**
- All changed files; focus on pages:
  - `src/pages/ImportStudents.tsx`
  - `src/pages/GenerateReports.tsx`
  - `src/pages/SchoolProfile.tsx`
  - `src/components/report/ReportCardPreview.tsx`
  - `src/store/appStore.ts` (if any)

### Changes
- Run the full workflow manually and note every red console error + every React warning (key warning, setstate during render, non-unique keys, image load failures). Fix each.
- Common suspects to pre-emptively check:
  - `<table>` / `<tr>` children — React keys on the mapping table rows must use unique stable IDs (col index is fine since it's stable per workbook, but ensure it's not an autogenerated string that changes on render).
  - In `ImportStudents.tsx` handleFile: `setWorkbook` then `setColumnMapping` then `setTab('mapping')` — these are fine, but if any useEffect triggers set state twice, check.
  - ReportCardPreview: default lists for MiniSection entries use index as key. That's acceptable because it's a static 6-item list; if we ever make them dynamic we need proper keys.
  - PDF jsPDF warnings about fonts: ignore unless they are errors.
  - photoMatcher blobToDataUrl: ensure FileReader reject path actually rejects with an error.

### Test Requirements
- **TR1-rule:** Open browser DevTools on a clean session. Walk the full workflow (Dashboard → Import → upload testdata_complex_structure.xlsx → review mappings → subjects → photos → preview → generate). After each step, the console must show zero red errors and zero yellow React warnings about keys / state-during-render / missing dependencies.
- **TR2-rule:** GenerateReports page on mount without imported students → shows "No students available" card, zero console errors.

---

## Task 13: TypeScript strict build + lint pass zero, & overall code quality check (unused imports)

**Status:** pending
**Priority:** high
**Parent AC:** AC11, AC12, NFR1, NFR2
**Files to change:**
- Any file flagged by `tsc --noEmit` / `tsc -b`
- Any file with unused imports / variables

### Changes
- Run `npm run build` — fix every TS error.
- Run `npm run lint` (which maps to `tsc --noEmit` per package.json) — fix every warning including unused imports/variables.
- Ensure the user's preference for "no unused imports" is honored.
- If any type becomes stale after adding Address/Position to the student fields, update types/index.ts.

### Test Requirements
- **TR1-rule:** `npm run build` exits with code 0.
- **TR2-rule:** `npm run lint` exits with code 0.

---

## Task 14: End-to-end workflow tests with real repo test files

**Status:** pending
**Priority:** high
**Parent AC:** AC1, AC2, AC17
**Files to change:**
- (scripts may be run, but ideally no code changes — fix any last-minute issues discovered)

### Manual test plan (to be executed)
1. **Test file A: `testdata_complex_structure.xlsx`** — verify multi-row merged subject groups. Expected:
   - subjectGroups count = number of parent merged subjects (not the sum of components).
   - No DOB/Father/Address in subjectGroups.
   - Sr.No maps correctly to rollNo.
   - All students produce PDFs in a ZIP.

2. **Test file B: `testdata_alt_subjects.xlsx`** — verify completely different subject structure still works. Expected:
   - Subject count = actual distinct academic columns.
   - Grade fields classified separately where appropriate.
   - Batch generation completes.

3. **Test file C: `testdata_10_students.xlsx`** — simple structure, verify 10 PDFs in ZIP, filenames unique, no collisions.

4. **Test file D: `testdata_50_students.xlsx`** — stress-test batch size 5; verify progress UI stays responsive.

5. **Edge case tests:**
   - Two students identical full name → unique filenames with roll differentiation.
   - Some rows with `AB` in a subject column → validation passes, PDF shows AB status.
   - Some rows with `EX` → validation passes, PDF shows EX.
   - Very long student name (≥40 chars) → layout doesn't break, PDF wraps text.
   - No photos uploaded → blank photo box, no errors.
   - Photo ZIP uploaded but 2 students unmatched → those 2 blank, others show photos.
   - Different class / section columns → respected in summary + ZIP filename.
   - Different subject counts (e.g. 4 subjects vs 12) → tables render cleanly.

### Test Requirements
- **TR1-rule:** Each of tests 1–5 above completes without any uncaught error or broken UI state.
- **TR2-rule:** `npm run build` and `npm run lint` still pass after all fixes from tests.
- **TR3-rubric (0-2, pass≥1):** Manual workflow subjective score — 0=cannot complete 2+ tests, 1=all tests pass with ≤2 manual tweaks, 2=all tests pass zero manual tweaks required.

---

## Task 15: Prepare final summary of work for the Spec Mode Review section

**Status:** pending
**Priority:** low
**Parent AC:** Review preparation
**Files to change:**
- No source files — produce a completion summary at the end of the Review.

### Content of final summary (to write at end)
- Files changed (clickable list).
- Bugs fixed (bulleted, grouped by FR area).
- Tests actually performed (list the specific test-data filenames + key edge-case scenarios run).
- Remaining limitations (honest, Phase 1 scoped).
- Exact step-by-step manual test instructions for the end user (upload file X → click Mapping → verify → etc → generate → download ZIP → verify contents).

### Test Requirements
- **TR1-rule:** Summary is written with specific file references and counts — no vague statements.
