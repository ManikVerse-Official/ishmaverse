# ReportCard Studio

Excel In. Professional Report Cards Out.

Upload a school marksheet (Excel/CSV), review what the system detected, preview the
report card, validate the data and download one print-ready A4 PDF per student —
packaged automatically into a single ZIP. Everything runs in the browser; student
data never leaves the device.

## Workflow (admin view)

1. **School Profile** — school name, address, logo, signatures, session, exam term and
   the **Report Card Theme**.
2. **Import Students** — drop the Excel file. Columns, subjects, components and
   grade columns are detected automatically and can be reviewed/overridden.
3. **Photos (optional)** — upload a ZIP of photos. Photos are matched by identity
   (roll no. → admission no. → student id → exact name → filename), never by order.
4. **Preview & Validate** — see every real record, fix anything flagged.
5. **Generate Reports** — one PDF per student + one ZIP.

## Architecture

| Layer | Location |
| --- | --- |
| Excel parsing (dynamic, multi-row headers) | `src/services/dynamicExcelParser.ts`, `excelParser.ts` |
| Column mapping | `src/services/dynamicMappingEngine.ts`, `mappingEngine.ts` |
| Student normalisation | `src/services/normalizationEngine.ts` |
| Calculation (totals, percentage) | `src/services/calculationEngine.ts` |
| Grading engine (configurable bands) | `src/services/gradingEngine.ts` |
| Assessment / stars engine | `src/services/assessmentEngine.ts` |
| Remarks engine | `src/services/remarksEngine.ts` |
| Photo matching engine | `src/services/photoMatcher.ts` |
| Report card model (single source of truth) | `src/services/reportCardModel.ts` |
| Themes / template abstraction | `src/themes/index.ts` |
| PDF generation (per theme layout) | `src/services/pdfGenerator.ts`, `src/services/pdf/*` |
| Pre-print data verification | `src/services/reportVerification.ts` |

Pages contain UI only; all logic lives in the services above.

### Report card themes

`src/themes/index.ts` is the registry. A theme is configuration (layout kind,
palette, which sections are printed) and both the on-screen preview and the PDF
renderer read the same definition, so a new theme needs one entry plus a preview
component/layout function.

Currently registered:

- **Holistic Progress Card** — marks, co-scholastic grades, personality & learning
  skills with stars, attendance, overall performance.
- **Simple Academic** — marks-focused table with percentage, grade and result.
- **Modern School** — compact marks table with a modern palette.

Select the theme in **School Profile → Report Card Theme** (or from the Report
Template screen) and generate.

### Data rules

- Marks, grades and totals come from the uploaded Excel file — they are never
  invented. A subject TOTAL column wins over component columns; components are
  summed only when no TOTAL exists.
- `Percentage = Obtained Grand Total / Maximum Grand Total × 100` using the real
  maximum marks (25/40/50/80/100/… are all supported). An Excel percentage that
  contradicts its own total is ignored and reported.
- Grades are preserved when Excel provides them, otherwise derived from the
  configurable grading bands.
- Remarks are only generated when the workbook has none, and they always reflect
  the student's actual performance and vary between students.
- Stars are computed from real performance (or taken from Excel when supplied),
  so they are never identical for every student.
- Every PDF is verified against the student record before it is written — a card
  whose name, marks, total or percentage does not match is not produced.

## Development

```bash
npm install
npm run dev          # dev server
npm run build        # typecheck + production build (dist/)
npm run preview      # serve the production build
```

## Deployment

The build is a static SPA. Deploy `dist/` to any static host.

- Domain root: `npm run build`
- Sub-folder (e.g. `https://example.com/reportcard/`):
  `VITE_BASE=/reportcard/ npm run build`

PWA assets (`manifest.webmanifest`, `icons/*`, `sw.js`) ship in `public/`, so the
app is installable on Android/iOS home screens and works offline for the shell.

## Tests

```bash
npm test              # regression suite (needs Node >= 18)
npm run test:pipeline # parser/mapping pipeline over the test workbooks
npm run test:preview  # renders every preview card with real data
npm run test:browser  # full browser flow (needs a local server; PW_CHANNEL=chrome uses installed Chrome)
npm run test:data     # regenerate the layout/data stress workbook
```

`npm test` asserts, among other things: mixed maximum marks, Excel totals/grades,
per-student star and remark variation, photo identity matching, and that every
generated PDF stays inside a single A4 page with **no overlapping text** (the
historical "Father's Name over Admission No." regression).
