// scripts/pipeline-test.ts
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

// src/services/excelParser.ts
import * as XLSX from "xlsx";

// src/utils/normalization.ts
function normalizeHeader(input) {
  return input.toLowerCase().trim().replace(/[._\-/\\]/g, " ").replace(/['''`"]/g, "").replace(/\s+/g, " ").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s*\[.*?\]\s*/g, " ").replace(/[.,:;]/g, " ").replace(/\s+/g, " ").trim();
}
var FIELD_ALIASES = [
  {
    field: "name",
    aliases: [
      "name",
      "student name",
      "students name",
      "student s name",
      "student",
      "full name",
      "studentname",
      "s name",
      "name of student",
      "student s name"
    ]
  },
  {
    field: "rollNo",
    aliases: [
      "sr no",
      "srno",
      "s no",
      "sno",
      "serial no",
      "serial number",
      "sl no",
      "roll",
      "roll no",
      "roll number",
      "rollno",
      "r no",
      "rno"
    ]
  },
  {
    field: "admissionNo",
    aliases: [
      "admission no",
      "admission number",
      "adm no",
      "admission",
      "registration no",
      "registration number",
      "reg no",
      "enrollment no",
      "enrollment number",
      "scholar no",
      "scholar number"
    ]
  },
  {
    field: "class",
    aliases: ["class", "standard", "std", "grade", "klass", "cls"]
  },
  {
    field: "section",
    aliases: ["section", "sec", "division", "div"]
  },
  {
    field: "fatherName",
    aliases: [
      "father name",
      "father",
      "fathers name",
      "father s name",
      "fathername",
      "f name",
      "guardian",
      "guardian name",
      "parent name",
      "parent"
    ]
  },
  {
    field: "motherName",
    aliases: [
      "mother name",
      "mother",
      "mothers name",
      "mother s name",
      "mothername",
      "m name"
    ]
  },
  {
    field: "dob",
    aliases: [
      "dob",
      "d o b",
      "date of birth",
      "birth date",
      "birthday",
      "date of birth",
      "birthdate"
    ]
  },
  {
    field: "attendance",
    aliases: [
      "attendance",
      "attendance %",
      "attendance percent",
      "attendance percentage"
    ]
  },
  {
    field: "workingDays",
    aliases: [
      "total working days",
      "working days",
      "working day",
      "total days",
      "no of working days"
    ]
  },
  {
    field: "daysPresent",
    aliases: [
      "days present",
      "present days",
      "days attended",
      "no of days present"
    ]
  },
  {
    field: "photoFilename",
    aliases: [
      "photo",
      "photo filename",
      "photo name",
      "image",
      "image filename",
      "photograph",
      "pic",
      "picture"
    ]
  },
  {
    field: "teacherRemarks",
    aliases: [
      "teacher remarks",
      "remarks",
      "class teacher remarks",
      "comments",
      "teacher comment",
      "class teacher comments"
    ]
  },
  {
    field: "principalRemarks",
    aliases: [
      "principal remarks",
      "headmaster remarks",
      "principal comment",
      "headmaster comment"
    ]
  },
  {
    field: "address",
    aliases: [
      "address",
      "residential address",
      "permanent address",
      "home address",
      "city",
      "location"
    ]
  },
  {
    field: "position",
    aliases: [
      "position",
      "rank",
      "class rank",
      "overall rank",
      "standing"
    ]
  }
];
var OVERALL_FIELD_SYNONYMS = [
  "total",
  "grand total",
  "overall total",
  "percentage",
  "percent",
  "position",
  "rank",
  "attendance",
  "days present",
  "remarks",
  "comment"
];
function isKnownNonSubjectHeader(header) {
  const norm = normalizeHeader(header);
  if (!norm) return false;
  const matchesAlias = FIELD_ALIASES.some(
    (fa) => fa.aliases.some((a) => {
      const normAlias = normalizeHeader(a);
      return norm === normAlias || norm.includes(normAlias);
    })
  );
  if (matchesAlias) return true;
  for (const syn of OVERALL_FIELD_SYNONYMS) {
    const normSyn = normalizeHeader(syn);
    if (norm === normSyn || norm.includes(normSyn)) {
      return true;
    }
  }
  if (/^(obtained|marks|score|grade)$/.test(norm)) return true;
  if (norm.includes("max") || norm.includes("total")) return true;
  return false;
}
var SUBJECT_NAME_VARIANTS = {
  maths: "Mathematics",
  math: "Mathematics",
  mathematics: "Mathematics",
  "maths em": "Mathematics",
  sci: "Science",
  science: "Science",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  english: "English",
  eng: "English",
  hindi: "Hindi",
  "hindi em": "Hindi",
  urdu: "Urdu",
  sanskrit: "Sanskrit",
  sans: "Sanskrit",
  punjabi: "Punjabi",
  gujarati: "Gujarati",
  marathi: "Marathi",
  tamil: "Tamil",
  telugu: "Telugu",
  bengali: "Bengali",
  kannada: "Kannada",
  malayalam: "Malayalam",
  sst: "Social Science",
  "social science": "Social Science",
  social: "Social Science",
  "social studies": "Social Science",
  history: "History",
  geography: "Geography",
  civics: "Civics",
  economics: "Economics",
  evs: "EVS",
  "environmental studies": "EVS",
  "environmental science": "EVS",
  gk: "GK",
  "general knowledge": "GK",
  computer: "Computer",
  "computer science": "Computer",
  cs: "Computer",
  it: "IT",
  "information technology": "IT",
  drawing: "Drawing",
  art: "Art",
  "value education": "Value Education",
  "moral science": "Moral Science",
  "physical education": "Physical Education",
  pe: "Physical Education",
  sport: "Sports",
  sports: "Sports",
  music: "Music",
  dance: "Dance",
  yoga: "Yoga",
  "third language": "Third Language",
  "second language": "Second Language"
};
function canonicalizeSubjectName(raw) {
  const norm = normalizeHeader(raw);
  if (SUBJECT_NAME_VARIANTS[norm]) return SUBJECT_NAME_VARIANTS[norm];
  return norm.replace(/\b\w/g, (c) => c.toUpperCase());
}
function looksLikeSubjectHeader(header) {
  const norm = normalizeHeader(header);
  if (!norm) return false;
  if (norm.length > 60) return false;
  if (isKnownNonSubjectHeader(header)) return false;
  const isCoreField = FIELD_ALIASES.some(
    (fa) => fa.aliases.some((a) => norm === a || norm.startsWith(a + " "))
  );
  if (isCoreField) return false;
  return true;
}

// src/services/excelParser.ts
var COMMON_HEADER_TERMS = [
  "name",
  "roll",
  "serial",
  "admission",
  "father",
  "mother",
  "dob",
  "class",
  "section",
  "english",
  "hindi",
  "math",
  "science",
  "social",
  "sst",
  "computer",
  "pt",
  "nb",
  "se",
  "sa2",
  "total",
  "percentage",
  "attendance",
  "position",
  "marks",
  "grade",
  "rank"
];
function parseWorkbookFromFile(file) {
  return new Promise((resolve2, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result);
        const wb = XLSX.read(data, { type: "array", cellDates: true, raw: true });
        const sheetNames = wb.SheetNames;
        const activeSheet = sheetNames[0] ?? "";
        const parsed = activeSheet ? parseSheetFromWorkbook(wb, activeSheet) : { headers: [], rows: [], headerRows: 1, dataStartRow: 1 };
        resolve2({
          fileName: file.name,
          sheetNames,
          activeSheet,
          headers: parsed.headers,
          rows: parsed.rows
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
function parseSheetFromWorkbook(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return { headers: [], rows: [], headerRows: 1, dataStartRow: 1 };
  const json = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: true,
    dateNF: "yyyy-mm-dd"
  });
  if (!json.length) return { headers: [], rows: [], headerRows: 1, dataStartRow: 1 };
  const merges = ws["!merges"] || [];
  const { headerRows, dataStartRow } = detectHeaderRows(json, merges);
  const headers = buildFlattenedHeaders(json, headerRows, merges);
  const rows = [];
  for (let r = dataStartRow; r < json.length; r++) {
    const rawRow = json[r] ?? [];
    const isEmpty = rawRow.every((c) => String(c ?? "").trim() === "");
    if (isEmpty) continue;
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = rawRow[i] ?? "";
    });
    Object.defineProperty(obj, "__rowNumber", {
      value: r + 1,
      enumerable: false
    });
    Object.defineProperty(obj, "__cells", {
      value: rawRow,
      enumerable: false
    });
    rows.push(obj);
  }
  return { headers, rows, headerRows, dataStartRow };
}
function detectHeaderRows(json, merges) {
  if (!json.length) return { headerRows: 1, dataStartRow: 1 };
  let headerRows = 1;
  const hasMultiRowMerges = merges.some((m) => m.e.r > m.s.r && m.e.r - m.s.r <= 3);
  if (hasMultiRowMerges) {
    const maxRowSpan = Math.max(...merges.map((m) => m.e.r - m.s.r + 1));
    headerRows = Math.min(maxRowSpan, 4);
    if (headerRows < json.length && checkNextRowsForData(json, headerRows)) {
      return { headerRows, dataStartRow: headerRows };
    }
  }
  for (let row = 0; row < Math.min(json.length, 8); row++) {
    const rowData = json[row];
    if (isEmptyRow(rowData)) continue;
    if (row < 4 && isLikelyHeaderRow(rowData)) {
      const nextRowIdx = row + 1;
      if (nextRowIdx < json.length) {
        if (checkNextRowsForData(json, nextRowIdx)) {
          headerRows = Math.max(headerRows, nextRowIdx);
        }
      }
    }
  }
  headerRows = Math.min(headerRows, 4);
  for (let row = 0; row < Math.min(json.length, 6); row++) {
    const rowData = json[row];
    if (isEmptyRow(rowData)) continue;
    if (isLikelyDataRow(rowData)) {
      const candidate = row;
      if (candidate > 0 && checkNextRowsForData(json, candidate)) {
        headerRows = Math.min(headerRows, candidate);
        break;
      }
    }
  }
  let dataStartRow = headerRows;
  if (dataStartRow < json.length && checkNextRowsForData(json, dataStartRow)) {
    return { headerRows, dataStartRow };
  }
  for (let row = headerRows; row < Math.min(json.length, headerRows + 4); row++) {
    if (checkNextRowsForData(json, row)) {
      dataStartRow = row;
      break;
    }
  }
  dataStartRow = Math.max(dataStartRow, headerRows);
  return { headerRows, dataStartRow };
}
function isEmptyRow(row) {
  if (!row || row.length === 0) return true;
  return row.every((cell) => String(cell ?? "").trim() === "");
}
function isLikelyHeaderRow(row) {
  if (!row || row.length === 0) return false;
  const textCount = row.filter((cell) => {
    const val = String(cell ?? "").trim();
    return val !== "" && isNaN(Number(val));
  }).length;
  const numericCount = row.filter((cell) => {
    const val = String(cell ?? "").trim();
    return val !== "" && !isNaN(Number(val));
  }).length;
  const total = textCount + numericCount;
  if (total === 0) return false;
  const textRatio = textCount / total;
  const hasCommonHeaderTerms = row.some((cell) => {
    const val = normalizeHeader(String(cell ?? ""));
    return COMMON_HEADER_TERMS.some((term) => val.includes(term));
  });
  if (hasCommonHeaderTerms && textRatio > 0.5) return true;
  return textRatio > 0.7;
}
function checkNextRowsForData(json, startRow) {
  const rowsToCheck = Math.min(3, json.length - startRow);
  if (rowsToCheck < 1) return false;
  let dataRowCount = 0;
  for (let i = 0; i < rowsToCheck; i++) {
    const row = json[startRow + i];
    if (isLikelyDataRow(row)) {
      dataRowCount++;
    }
  }
  return dataRowCount >= Math.min(2, rowsToCheck);
}
function isLikelyDataRow(row) {
  if (!row || row.length === 0) return false;
  const textCount = row.filter((cell) => {
    const val = String(cell ?? "").trim();
    return val !== "" && isNaN(Number(val));
  }).length;
  const numericCount = row.filter((cell) => {
    const val = String(cell ?? "").trim();
    return val !== "" && !isNaN(Number(val));
  }).length;
  const total = textCount + numericCount;
  if (total === 0) return false;
  const numericRatio = numericCount / total;
  const hasMix = textCount > 0 && numericCount > 0;
  const mostlyNumeric = numericRatio >= 0.4;
  const hasHeaderTerms = row.some((cell) => {
    const val = normalizeHeader(String(cell ?? ""));
    return COMMON_HEADER_TERMS.some((term) => val === term || val.startsWith(term + " "));
  });
  if (hasHeaderTerms && numericRatio < 0.3) return false;
  return hasMix || mostlyNumeric;
}
function buildFlattenedHeaders(json, headerRows, merges) {
  if (headerRows <= 0 || !json.length) return [];
  const headerStructure = [];
  for (let row = 0; row < headerRows; row++) {
    if (row < json.length) {
      const rowData = json[row];
      headerStructure.push(rowData.map((cell) => String(cell ?? "").trim()));
    } else {
      headerStructure.push([]);
    }
  }
  const lastHeaderRow = headerStructure[headerRows - 1];
  const maxCols = lastHeaderRow.length;
  const titleRows = /* @__PURE__ */ new Set();
  for (let row = 0; row < headerRows; row++) {
    if (isTitleLikeHeaderRow(headerStructure[row], maxCols)) {
      titleRows.add(row);
    }
  }
  const headers = [];
  for (let col = 0; col < maxCols; col++) {
    const headerParts = [];
    for (let row = 0; row < headerRows; row++) {
      if (titleRows.has(row)) continue;
      let cellValue = headerStructure[row][col] || "";
      const merge = merges.find(
        (m) => col >= m.s.c && col <= m.e.c && row >= m.s.r && row <= m.e.r
      );
      if (merge && (row !== merge.s.r || col !== merge.s.c)) {
        if (!cellValue && merge.s.r < headerStructure.length && merge.s.c < (headerStructure[merge.s.r]?.length || 0)) {
          cellValue = headerStructure[merge.s.r][merge.s.c] || "";
        }
      }
      if (!merge || row === merge.s.r && col === merge.s.c || merge && !headerParts.includes(cellValue) && cellValue) {
        if (cellValue && !headerParts.includes(cellValue)) {
          headerParts.push(cellValue);
        }
      }
    }
    if (headerParts.length > 0) {
      const uniqueParts = headerParts.filter((v, i, a) => a.indexOf(v) === i);
      if (uniqueParts.length > 1) {
        headers.push(uniqueParts.join(" | "));
      } else {
        headers.push(uniqueParts[0]);
      }
    } else {
      headers.push(`Column_${col + 1}`);
    }
  }
  return headers;
}
function isTitleLikeHeaderRow(row, maxCols) {
  if (maxCols <= 3) return false;
  const distinct = /* @__PURE__ */ new Set();
  for (const cell of row ?? []) {
    const value = String(cell ?? "").trim();
    if (value) distinct.add(value);
  }
  if (distinct.size === 0) return false;
  if (distinct.size === 1) return true;
  if (distinct.size > 2) return false;
  return /(school|class|grade|std|standard|session|term|exam|report|result)/i.test(
    [...distinct].join(" ")
  );
}

// src/services/dynamicExcelParser.ts
import * as XLSX2 from "xlsx";
var COMMON_HEADER_TERMS2 = [
  "name",
  "roll",
  "serial",
  "sr",
  "admission",
  "father",
  "mother",
  "dob",
  "birth",
  "class",
  "section",
  "address",
  "english",
  "hindi",
  "math",
  "mathematics",
  "science",
  "sci",
  "social",
  "sst",
  "computer",
  "pt",
  "nb",
  "se",
  "sa",
  "sa1",
  "sa2",
  "total",
  "percentage",
  "attendance",
  "position",
  "marks",
  "grade",
  "rank",
  "physics",
  "chemistry",
  "biology",
  "history",
  "geography",
  "civics",
  "economics",
  "sanskrit",
  "urdu",
  "punjabi",
  "marathi",
  "tamil",
  "telugu",
  "bengali",
  "kannada",
  "malayalam",
  "gujarati",
  "art",
  "music",
  "sports",
  "yoga",
  "gk",
  "evs",
  "drawing"
];
var NON_SUBJECT_WORDS = [
  "student",
  "students",
  "name",
  "father",
  "mother",
  "dob",
  "dateofbirth",
  "birth",
  "address",
  "house",
  "roll",
  "serial",
  "sr",
  "sno",
  "admission",
  "class",
  "section",
  "photo",
  "photograph",
  "image",
  "remarks",
  "remark",
  "comment",
  "comments",
  "attendance",
  "present",
  "workingdays",
  "position",
  "rank",
  "percentage",
  "percent",
  "grandtotal",
  "overalltotal"
];
var SUBJECT_INDICATORS = [
  "english",
  "hindi",
  "math",
  "mathematics",
  "science",
  "sci",
  "social",
  "sst",
  "computer",
  "physics",
  "chemistry",
  "biology",
  "economics",
  "history",
  "geography",
  "civics",
  "sanskrit",
  "french",
  "german",
  "spanish",
  "urdu",
  "punjabi",
  "marathi",
  "tamil",
  "telugu",
  "bengali",
  "kannada",
  "malayalam",
  "gujarati",
  "evs",
  "environmentalstudies"
];
var GRADE_SUBJECT_INDICATORS = [
  "gk",
  "general knowledge",
  "art",
  "drawing",
  "draw",
  "music",
  "physical education",
  "pe",
  "sports",
  "yoga",
  "moral",
  "moral values",
  "mv",
  "moral value",
  "value education",
  "work education",
  "art education",
  "computer literacy",
  "discipline"
];
var COMPONENT_TERMS = [
  "pt",
  "periodic test",
  "unit test",
  "ut",
  "assignment",
  "activity",
  "notebook",
  "nb",
  "classwork",
  "cw",
  "homework",
  "hw",
  "project",
  "internal",
  "term",
  "exam",
  "theory",
  "practical",
  "oral",
  "viva",
  "written",
  "half yearly",
  "annual",
  "final",
  "sa",
  "fa"
];
function parseDynamicStructure(file, requestedSheetName) {
  return new Promise((resolve2, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(reader.error ?? new Error("File read failed"));
    };
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (!(result instanceof ArrayBuffer)) {
          reject(new Error("Invalid workbook data"));
          return;
        }
        const data = new Uint8Array(result);
        const workbook = XLSX2.read(data, {
          type: "array",
          cellDates: true,
          raw: true
        });
        const sheetName = requestedSheetName && workbook.SheetNames.includes(requestedSheetName) ? requestedSheetName : workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error("No worksheet found in workbook"));
          return;
        }
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet || !worksheet["!ref"]) {
          reject(new Error("Worksheet is empty"));
          return;
        }
        resolve2(analyzeSheetStructure(worksheet, sheetName));
      } catch (error) {
        reject(
          error instanceof Error ? error : new Error("Unable to parse Excel workbook")
        );
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
function analyzeSheetStructure(ws, sheetName) {
  const range = XLSX2.utils.decode_range(ws["!ref"] || "A1");
  const mergedCells = extractMergedCells(ws);
  const layout = detectHeaderLayout(
    ws,
    range,
    mergedCells
  );
  const effectiveHeaders = buildEffectiveColumnHeaders(
    ws,
    range,
    layout,
    mergedCells
  );
  const classifications = classifyColumns(
    ws,
    range,
    effectiveHeaders,
    layout.dataStartRow
  );
  const { inferredClass, inferredSection, schoolName } = inferWorkbookContext(
    ws,
    range,
    mergedCells,
    layout,
    effectiveHeaders,
    sheetName
  );
  const studentFields = classifications.filter((item) => item.studentField).map((item) => ({
    excelColumn: item.col,
    excelHeader: item.header.path,
    fieldType: item.studentField,
    confidence: item.studentConfidence
  }));
  const overallFields = classifications.filter(
    (item) => item.overallField && !item.studentField
  ).map((item) => ({
    name: item.header.path,
    col: item.col,
    fieldType: item.overallField,
    confidence: calculateOverallFieldConfidence(
      item.header.leaf,
      item.overallField
    )
  }));
  const { subjectGroups, gradeFields } = buildSubjectGroups(classifications);
  const confidence = calculateConfidence(
    studentFields,
    subjectGroups,
    gradeFields,
    overallFields
  );
  return {
    studentFields,
    subjectGroups,
    gradeFields,
    overallFields,
    headerRows: layout.headerRows,
    dataStartRow: layout.dataStartRow,
    confidence,
    headerStartRow: layout.headerStartRow,
    titleRows: layout.titleRows,
    inferredClass,
    inferredSection,
    schoolName
  };
}
function extractMergedCells(ws) {
  const merges = ws["!merges"] || [];
  return merges.map((merge) => {
    const startRow = merge.s.r;
    const endRow = merge.e.r;
    const startCol = merge.s.c;
    const endCol = merge.e.c;
    const cellRef = XLSX2.utils.encode_cell({
      r: startRow,
      c: startCol
    });
    const cell = ws[cellRef];
    return {
      startRow,
      endRow,
      startCol,
      endCol,
      value: cell ? String(cell.v ?? "").trim() : ""
    };
  });
}
function findMergeAtPosition(mergedCells, row, col) {
  return mergedCells.find(
    (merge) => row >= merge.startRow && row <= merge.endRow && col >= merge.startCol && col <= merge.endCol
  );
}
function getCellText(ws, row, col) {
  const cellRef = XLSX2.utils.encode_cell({ r: row, c: col });
  const cell = ws[cellRef];
  if (!cell) return "";
  return String(cell.v ?? "").trim();
}
function rowDistinctCells(ws, range, row, mergedCells) {
  const values = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const merge = findMergeAtPosition(mergedCells, row, col);
    if (merge && !(row === merge.startRow && col === merge.startCol)) {
      continue;
    }
    let text = getCellText(ws, row, col);
    if (!text && merge) text = merge.value;
    text = text.trim();
    if (text) values.push(text);
  }
  return values;
}
function rowStats(ws, range, row, mergedCells) {
  const values = rowDistinctCells(ws, range, row, mergedCells);
  let numeric = 0;
  let text = 0;
  for (const value of values) {
    if (Number.isFinite(Number(value))) numeric++;
    else text++;
  }
  return { nonEmpty: values.length, numeric, text };
}
function isTitleRow(ws, range, mergedCells, row) {
  const width = range.e.c - range.s.c + 1;
  if (width <= 3) return false;
  const values = rowDistinctCells(ws, range, row, mergedCells);
  if (values.length === 0) return false;
  if (values.length === 1) return true;
  if (values.length > 2) return false;
  const joined = values.join(" ");
  return /(school|class|grade|std|standard|session|term|exam|report|result)/i.test(
    joined
  );
}
function detectHeaderLayout(ws, range, mergedCells) {
  const firstRow = range.s.r;
  const maxScan = Math.min(range.e.r, firstRow + 40);
  let dataStartRow = -1;
  for (let row = firstRow; row <= maxScan; row++) {
    const stats = rowStats(ws, range, row, mergedCells);
    if (stats.nonEmpty === 0) continue;
    if (isTitleRow(ws, range, mergedCells, row)) continue;
    if (stats.nonEmpty < 3 || stats.numeric < 1) continue;
    const numericRatio = stats.numeric / stats.nonEmpty;
    if (numericRatio < 0.15) continue;
    let confirms = 0;
    for (let k = 1; k <= 2; k++) {
      const next = rowStats(ws, range, row + k, mergedCells);
      if (next.nonEmpty >= 2 && next.numeric >= 1 && !isTitleRow(ws, range, mergedCells, row + k)) {
        confirms++;
      }
    }
    if (confirms >= 1 || row === maxScan) {
      dataStartRow = row;
      break;
    }
  }
  if (dataStartRow < 0) {
    for (let row = firstRow; row <= maxScan; row++) {
      if (isTitleRow(ws, range, mergedCells, row)) continue;
      const stats = rowStats(ws, range, row, mergedCells);
      if (stats.nonEmpty < 3) continue;
      if (rowLooksLikeHeader(ws, range, mergedCells, row)) continue;
      let confirms = 0;
      for (let k = 1; k <= 2; k++) {
        const next = rowStats(ws, range, row + k, mergedCells);
        if (next.nonEmpty >= 3 && !rowLooksLikeHeader(ws, range, mergedCells, row + k)) {
          confirms++;
        }
      }
      if (confirms >= 1) {
        dataStartRow = row;
        break;
      }
    }
  }
  if (dataStartRow < 0) dataStartRow = firstRow + 1;
  const headerEndRow = Math.max(firstRow, dataStartRow - 1);
  const titleRows = [];
  for (let row = firstRow; row <= headerEndRow; row++) {
    if (isTitleRow(ws, range, mergedCells, row)) {
      titleRows.push(row);
    }
  }
  return {
    headerRows: headerEndRow - firstRow + 1,
    headerStartRow: firstRow,
    headerEndRow,
    dataStartRow: headerEndRow + 1,
    titleRows
  };
}
function rowLooksLikeHeader(ws, range, mergedCells, row) {
  const values = rowDistinctCells(ws, range, row, mergedCells);
  return values.some((value) => {
    const normalized = safeNormalize(value);
    if (!normalized) return false;
    return COMMON_HEADER_TERMS2.some((term) => {
      const token = safeNormalize(term);
      if (!token) return false;
      return normalized === token || token.length >= 4 && normalized.includes(token);
    });
  });
}
function inferClassAndSection(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return {};
  const result = {};
  const classMatch = raw.match(
    /(?:\bclass\b|\bstd\b\.?|\bstandard\b|\bgrade\b)\s*[:\-]?\s*([0-9]{1,2}\s*(?:st|nd|rd|th)?|\b[IVXLCDM]{1,5}\b)/i
  ) ?? null;
  if (classMatch) {
    result.class = normalizeClassValue(classMatch[1]);
  } else {
    const ordinal = raw.match(/\b([0-9]{1,2}(?:st|nd|rd|th))\b/i);
    if (ordinal && raw.length <= 30) {
      result.class = ordinal[1].toLowerCase();
    }
  }
  const sectionMatch = raw.match(
    /\bsection\b\s*[:\-]?\s*([A-Za-z0-9]{1,3})\b/i
  ) ?? raw.match(
    /(?:\bclass\b|\bstd\b\.?|\bstandard\b|\bgrade\b)\s*[:\-]?\s*[0-9]{1,2}(?:\s*(?:st|nd|rd|th))?\s*[-– ]\s*([A-Za-z])\b/i
  );
  if (sectionMatch) {
    result.section = sectionMatch[1].toUpperCase();
  }
  return result;
}
function normalizeClassValue(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}
function inferWorkbookContext(ws, range, mergedCells, layout, headers, sheetName) {
  const candidates = [];
  if (sheetName) candidates.push(sheetName);
  for (const row of layout.titleRows) {
    for (const value of rowDistinctCells(ws, range, row, mergedCells)) {
      candidates.push(value);
    }
  }
  for (const header of headers) {
    if (header.path) candidates.push(header.path);
  }
  let inferredClass;
  let inferredSection;
  for (const candidate of candidates) {
    const parsed = inferClassAndSection(candidate);
    if (!inferredClass && parsed.class) inferredClass = parsed.class;
    if (!inferredSection && parsed.section) inferredSection = parsed.section;
    if (inferredClass && inferredSection) break;
  }
  let schoolName;
  for (const row of layout.titleRows) {
    for (const value of rowDistinctCells(ws, range, row, mergedCells)) {
      const cleaned = value.replace(
        /[\s(\[-]*(?:class|grade|std\.?|standard)\s*[:\-]?\s*[^)\]]*[)\]]?/gi,
        " "
      ).replace(/\s+/g, " ").trim();
      const candidate = cleaned || value.trim();
      if (candidate.length > (schoolName?.length ?? 0)) {
        schoolName = candidate;
      }
    }
  }
  return { inferredClass, inferredSection, schoolName };
}
function buildEffectiveColumnHeaders(ws, range, layout, mergedCells) {
  const result = [];
  const headerRowIndices = [];
  for (let row = layout.headerStartRow; row <= layout.headerEndRow; row++) {
    if (!layout.titleRows.includes(row)) {
      headerRowIndices.push(row);
    }
  }
  if (headerRowIndices.length === 0) {
    headerRowIndices.push(layout.headerEndRow);
  }
  for (let col = range.s.c; col <= range.e.c; col++) {
    const labels = [];
    for (const row of headerRowIndices) {
      let text = getCellText(
        ws,
        row,
        col
      );
      if (!text) {
        const merge = findMergeAtPosition(
          mergedCells,
          row,
          col
        );
        if (merge) {
          text = merge.value;
        }
      }
      text = cleanHeaderText(text);
      if (!text) continue;
      if (labels.length === 0 || safeNormalize(
        labels[labels.length - 1]
      ) !== safeNormalize(text)) {
        labels.push(text);
      }
    }
    const leaf = labels[labels.length - 1] || `Column ${convertColumnToLetter(col)}`;
    const path = labels.join(" | ");
    result.push({
      col,
      labels,
      leaf,
      path,
      normalizedPath: safeNormalize(path),
      normalizedLeaf: safeNormalize(leaf)
    });
  }
  return result;
}
function cleanHeaderText(value) {
  return value.replace(/\s+/g, " ").replace(/\|+/g, " | ").trim();
}
function safeNormalize(value) {
  try {
    const normalized = normalizeHeader(value);
    return normalized.replace(/[^a-z0-9%]+/gi, "").toLowerCase();
  } catch {
    return value.toLowerCase().replace(/[^a-z0-9%]+/g, "");
  }
}
function classifyColumns(ws, range, headers, dataStartRow) {
  return headers.map((header) => {
    const studentResult = identifyStudentField(
      header
    );
    const overallField = identifyOverallFieldFromPath(
      header
    );
    const numericRatio = calculateColumnNumericRatio(
      ws,
      range,
      header.col,
      dataStartRow
    );
    const isStudentField = studentResult.fieldType !== "ignore";
    const subject = !isStudentField && !overallField && isAcademicColumn(header, numericRatio) && (numericRatio >= 0.15 || hasMarksLikeHeader(header));
    const grade = !isStudentField && !overallField && !subject && isGradeColumn(header);
    return {
      col: header.col,
      header,
      studentField: isStudentField ? studentResult.fieldType : null,
      studentConfidence: studentResult.confidence,
      overallField: overallField?.fieldType ?? null,
      subject,
      grade,
      numericRatio
    };
  });
}
function identifyStudentField(header) {
  const labels = header.labels;
  if (labels.some(
    (label) => isDobHeader(label)
  )) {
    return {
      fieldType: "dob",
      confidence: 0.99
    };
  }
  if (labels.some(
    (label) => isFatherHeader(label)
  )) {
    return {
      fieldType: "fatherName",
      confidence: 0.99
    };
  }
  if (labels.some(
    (label) => isMotherHeader(label)
  )) {
    return {
      fieldType: "motherName",
      confidence: 0.99
    };
  }
  if (labels.some(
    (label) => isAddressHeader(label)
  )) {
    return {
      fieldType: "address",
      confidence: 0.99
    };
  }
  if (labels.some(
    (label) => isRollHeader(label)
  )) {
    return {
      fieldType: "rollNo",
      confidence: 0.99
    };
  }
  if (labels.some(
    (label) => isStudentNameHeader(label)
  )) {
    return {
      fieldType: "name",
      confidence: 0.99
    };
  }
  const candidates = [];
  for (const fa of FIELD_ALIASES) {
    for (const aliasRaw of fa.aliases) {
      const alias = safeNormalize(aliasRaw);
      if (!alias) continue;
      for (const label of labels) {
        const normalized = safeNormalize(label);
        if (!normalized) continue;
        if (normalized === alias) {
          candidates.push({
            field: mapAliasFieldToFieldType(
              fa.field
            ),
            confidence: 0.94
          });
        }
      }
    }
  }
  const safeCandidate = candidates.filter(
    (candidate) => candidate.field !== "ignore" && candidate.field !== "address" && candidate.field !== "position"
  ).sort(
    (a, b) => b.confidence - a.confidence
  )[0];
  if (safeCandidate) {
    return {
      fieldType: safeCandidate.field,
      confidence: safeCandidate.confidence
    };
  }
  return {
    fieldType: "ignore",
    confidence: 0
  };
}
function isRollHeader(text) {
  const norm = safeNormalize(text);
  return norm === "srno" || norm === "sno" || norm === "serialno" || norm === "serialnumber" || norm === "rollno" || norm === "rollnumber" || norm === "studentrollno" || norm === "studentrollnumber" || norm.includes("rollno") || norm.includes("rollnumber");
}
function isStudentNameHeader(text) {
  const norm = safeNormalize(text);
  return norm === "name" || norm === "studentname" || norm === "studentsname" || norm === "nameofstudent" || norm === "studentfullname";
}
function isFatherHeader(text) {
  const norm = safeNormalize(text);
  return norm === "fathername" || norm === "fathersname" || norm === "father" || norm === "parentfathername";
}
function isMotherHeader(text) {
  const norm = safeNormalize(text);
  return norm === "mothername" || norm === "mothersname" || norm === "mother";
}
function isDobHeader(text) {
  const norm = safeNormalize(text);
  return norm === "dob" || norm === "dateofbirth" || norm === "birthdate" || norm === "datebirth";
}
function isAddressHeader(text) {
  const norm = safeNormalize(text);
  return norm === "address" || norm === "studentaddress" || norm === "residentialaddress" || norm === "homeaddress";
}
function labelMatchesSubject(text) {
  const norm = safeNormalize(text);
  if (!norm) return false;
  if (GRADE_SUBJECT_INDICATORS.some(
    (indicator) => safeNormalize(indicator) === norm
  )) {
    return false;
  }
  return SUBJECT_INDICATORS.some((indicator) => {
    const token = safeNormalize(indicator);
    if (!token) return false;
    if (norm === token) return true;
    return token.length >= 4 && norm.includes(token);
  });
}
function labelMatchesGrade(text) {
  const norm = safeNormalize(text);
  if (!norm) return false;
  return GRADE_SUBJECT_INDICATORS.some((indicator) => {
    const token = safeNormalize(indicator);
    return token.length > 1 && token === norm;
  });
}
function isAcademicColumn(header, numericRatio = 0) {
  const labels = header.labels ?? [];
  if (labels.some((label) => labelMatchesSubject(label))) {
    return true;
  }
  if (labels.some((label) => labelMatchesGrade(label)) && numericRatio < 0.6) {
    return false;
  }
  if (labels.some(
    (label) => isForbiddenSubjectLabel(label)
  )) {
    return false;
  }
  if (numericRatio >= 0.5) {
    if (labels.length > 1) return true;
    if (!isGenericHeaderLabel(header.leaf) && !isComponentLabel(header.leaf)) {
      return true;
    }
  }
  return false;
}
function isGradeColumn(header) {
  const labels = header.labels ?? [];
  const normalizedLabels = labels.map(safeNormalize);
  const path = safeNormalize(header.path);
  const leaf = safeNormalize(header.leaf);
  const gradeMatch = GRADE_SUBJECT_INDICATORS.some((indicator) => {
    const token = safeNormalize(indicator);
    if (token.length <= 1) return false;
    if (leaf === token) return true;
    if (normalizedLabels.some((label) => label === token)) return true;
    return token.length >= 6 && path.includes(token);
  });
  if (!gradeMatch) return false;
  return !labels.some(
    (label) => isDobHeader(label) || isFatherHeader(label) || isMotherHeader(label) || isAddressHeader(label) || isStudentNameHeader(label) || isRollHeader(label)
  );
}
function isForbiddenSubjectLabel(text) {
  const norm = safeNormalize(text);
  if (!norm) return true;
  if (NON_SUBJECT_WORDS.some(
    (word) => norm === safeNormalize(word)
  )) {
    return true;
  }
  if (isKnownNonSubjectHeader(text)) {
    return true;
  }
  if (isDobHeader(text) || isFatherHeader(text) || isMotherHeader(text) || isAddressHeader(text) || isStudentNameHeader(text) || isRollHeader(text)) {
    return true;
  }
  return false;
}
function hasMarksLikeHeader(header) {
  const path = safeNormalize(
    header.path
  );
  return path.includes("marks") || path.includes("total") || path.includes("max") || path.includes("obtained") || path.includes("score");
}
function buildSubjectGroups(classifications) {
  const subjectGroups = [];
  const gradeFields = [];
  for (const item of classifications) {
    if (item.grade && !item.studentField && !item.overallField) {
      gradeFields.push({
        name: item.header.path,
        col: item.col,
        confidence: 0.92
      });
    }
  }
  const subjectColumns = classifications.filter(
    (item) => item.subject && !item.studentField && !item.overallField && !item.grade
  );
  let current = null;
  for (const item of subjectColumns) {
    const subjectName = getSubjectName(item.header, item.numericRatio);
    if (!subjectName) continue;
    const sameGroup = current && normalizeGroupName(
      current.name
    ) === normalizeGroupName(
      subjectName
    ) && item.col === current.endCol + 1;
    if (!sameGroup) {
      if (current) {
        subjectGroups.push(
          createSubjectGroup(
            current.name,
            current.startCol,
            current.endCol,
            current.columns
          )
        );
      }
      current = {
        name: subjectName,
        startCol: item.col,
        endCol: item.col,
        columns: [item]
      };
    } else {
      current.endCol = item.col;
      current.columns.push(item);
    }
  }
  if (current) {
    subjectGroups.push(
      createSubjectGroup(
        current.name,
        current.startCol,
        current.endCol,
        current.columns
      )
    );
  }
  return {
    subjectGroups,
    gradeFields
  };
}
function getSubjectName(header, numericRatio = 0) {
  for (const label of header.labels) {
    if (labelMatchesSubject(label)) {
      return cleanSubjectName(label);
    }
  }
  if (numericRatio >= 0.15 && header.labels.length > 1) {
    const candidates = header.labels.map((label) => cleanSubjectName(label)).filter(Boolean).filter((label) => !isGenericHeaderLabel(label)).filter((label) => !isComponentLabel(label)).filter((label) => !isForbiddenSubjectLabel(label));
    if (candidates.length > 0) {
      return candidates[candidates.length - 1];
    }
  }
  if (numericRatio >= 0.15 && header.labels.length === 1 && !isGenericHeaderLabel(header.leaf) && !isComponentLabel(header.leaf) && !isForbiddenSubjectLabel(header.leaf)) {
    return cleanSubjectName(header.leaf);
  }
  return null;
}
function isComponentLabel(text) {
  const normalized = safeNormalize(text);
  if (!normalized) return true;
  return COMPONENT_TERMS.some((term) => {
    const termNormalized = safeNormalize(term);
    return normalized === termNormalized || normalized.includes(termNormalized);
  });
}
function isGenericHeaderLabel(text) {
  const normalized = safeNormalize(text);
  if (!normalized) return true;
  const generic = [
    "school",
    "schoolname",
    "publicschool",
    "schoolcode",
    "academic",
    "academicsession",
    "session",
    "term",
    "finalterm",
    "annual",
    "examination",
    "exam",
    "result",
    "reportcard",
    "marksheet",
    "class",
    "section",
    "subject",
    "subjects",
    "student",
    "students"
  ];
  if (generic.includes(normalized)) return true;
  if (normalized.includes("publicschool") || normalized.includes("school") && normalized.length > 8) {
    return true;
  }
  return false;
}
function cleanSubjectName(value) {
  return value.replace(
    /\s*\((?:max|marks?|out of)[^)]*\)/gi,
    ""
  ).replace(
    /\s*\[[^\]]*\]/g,
    ""
  ).trim();
}
function normalizeGroupName(value) {
  return safeNormalize(
    cleanSubjectName(value)
  );
}
function createSubjectGroup(name, startCol, endCol, columns) {
  const components = [];
  let hasTotal = false;
  for (const item of columns) {
    const isTotal = isTotalColumn(
      item.header.leaf
    );
    if (isTotal) {
      hasTotal = true;
    }
    components.push({
      name: getComponentName(
        item.header
      ),
      col: item.col,
      maxMarks: extractMaxMarks(
        item.header.path
      ),
      isTotal
    });
  }
  return {
    name,
    startCol,
    endCol,
    components,
    hasTotal,
    confidence: calculateSubjectGroupConfidence(
      columns
    )
  };
}
function getComponentName(header) {
  if (header.labels.length <= 1) {
    return header.leaf;
  }
  const subjectIndex = header.labels.findIndex(
    (label) => labelMatchesSubject(label)
  );
  if (subjectIndex >= 0 && subjectIndex < header.labels.length - 1) {
    return header.labels.slice(subjectIndex + 1).join(" | ");
  }
  return header.leaf;
}
function calculateSubjectGroupConfidence(columns) {
  if (!columns.length) return 0;
  const numericAverage = columns.reduce(
    (sum, item) => sum + item.numericRatio,
    0
  ) / columns.length;
  const numericBonus = Math.min(
    numericAverage,
    1
  ) * 0.08;
  return Math.min(
    0.98,
    0.88 + numericBonus
  );
}
function identifyOverallFieldFromPath(header) {
  if (header.labels.some(
    (label) => isForbiddenStudentOverallLabel(label)
  )) {
    return null;
  }
  const pathNorm = safeNormalize(header.path);
  const rawLeaf = String(header.leaf ?? "").trim();
  const leafNorm = rawLeaf === "%" ? "%" : safeNormalize(rawLeaf);
  if (leafNorm === "%" || leafNorm === "percent" || leafNorm === "percentage" || pathNorm.endsWith("%") || pathNorm.endsWith("percent") || pathNorm.endsWith("percentage")) {
    return {
      fieldType: "percentage",
      confidence: 0.98
    };
  }
  const explicitOverallTotal = leafNorm === "grandtotal" || leafNorm === "overalltotal" || leafNorm === "finaltotal" || pathNorm.endsWith("grandtotal") || pathNorm.endsWith("overalltotal") || pathNorm.endsWith("finaltotal");
  const hasAcademicParent = header.labels.some(
    (label) => SUBJECT_INDICATORS.some(
      (indicator) => safeNormalize(label).includes(safeNormalize(indicator))
    )
  );
  const hasGradeParent = header.labels.some(
    (label) => GRADE_SUBJECT_INDICATORS.some(
      (indicator) => safeNormalize(label).includes(safeNormalize(indicator))
    )
  );
  const standaloneTotal = leafNorm === "total" && !hasAcademicParent && !hasGradeParent;
  if (explicitOverallTotal || standaloneTotal) {
    return {
      fieldType: "total",
      confidence: 0.98
    };
  }
  if (leafNorm.includes("position") || leafNorm.includes("rank") || leafNorm.includes("merit") || pathNorm.endsWith("position") || pathNorm.endsWith("rank") || pathNorm.endsWith("merit")) {
    return {
      fieldType: "position",
      confidence: 0.94
    };
  }
  if (leafNorm.includes("attendance") || leafNorm.includes("dayspresent") || leafNorm.includes("workingdays") || pathNorm.endsWith("attendance") || pathNorm.endsWith("dayspresent") || pathNorm.endsWith("workingdays")) {
    return {
      fieldType: "attendance",
      confidence: 0.94
    };
  }
  if (leafNorm.includes("remarks") || leafNorm.includes("remark") || leafNorm.includes("comment")) {
    return {
      fieldType: "remarks",
      confidence: 0.94
    };
  }
  return null;
}
function isForbiddenStudentOverallLabel(text) {
  return isDobHeader(text) || isFatherHeader(text) || isMotherHeader(text) || isAddressHeader(text) || isStudentNameHeader(text) || isRollHeader(text);
}
function calculateOverallFieldConfidence(header, fieldType) {
  const norm = safeNormalize(
    header
  );
  const exactPatterns = {
    total: [
      "grandtotal",
      "overalltotal"
    ],
    percentage: [
      "percentage",
      "percent"
    ],
    position: [
      "position",
      "rank",
      "merit"
    ],
    attendance: [
      "attendance",
      "dayspresent",
      "workingdays"
    ],
    remarks: [
      "remarks",
      "remark",
      "comment",
      "comments"
    ]
  };
  if (exactPatterns[fieldType].some(
    (pattern) => norm === safeNormalize(pattern)
  )) {
    return 0.97;
  }
  return 0.82;
}
function calculateColumnNumericRatio(ws, range, col, dataStartRow) {
  let total = 0;
  let numeric = 0;
  const endRow = Math.min(
    range.e.r,
    dataStartRow + 15
  );
  for (let row = dataStartRow; row <= endRow; row++) {
    const text = getCellText(
      ws,
      row,
      col
    );
    if (!text) continue;
    total++;
    if (Number.isFinite(Number(text))) {
      numeric++;
    }
  }
  return total > 0 ? numeric / total : 0;
}
function isTotalColumn(text) {
  const norm = safeNormalize(text);
  return norm === "total" || norm === "subtotal" || norm === "grandtotal" || norm === "overalltotal" || norm.endsWith("total");
}
function extractMaxMarks(text) {
  const bracket = text.match(
    /\(\s*(\d+(?:\.\d+)?)\s*\)/
  ) || text.match(
    /\[\s*(\d+(?:\.\d+)?)\s*\]/
  );
  if (bracket) {
    return Number(bracket[1]);
  }
  const maxMatch = text.match(
    /max(?:imum)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i
  );
  if (maxMatch) {
    return Number(maxMatch[1]);
  }
  const outOfMatch = text.match(
    /out\s*of\s*(\d+(?:\.\d+)?)/i
  );
  if (outOfMatch) {
    return Number(outOfMatch[1]);
  }
  return void 0;
}
function calculateConfidence(studentFields, subjectGroups, gradeFields, overallFields) {
  const hasName = studentFields.some(
    (field) => field.fieldType === "name"
  );
  const hasRoll = studentFields.some(
    (field) => field.fieldType === "rollNo"
  );
  const hasDob = studentFields.some(
    (field) => field.fieldType === "dob"
  );
  const hasFather = studentFields.some(
    (field) => field.fieldType === "fatherName"
  );
  let score = 0.35;
  if (hasName) score += 0.18;
  if (hasRoll) score += 0.15;
  if (hasDob) score += 0.08;
  if (hasFather) score += 0.08;
  if (subjectGroups.length > 0) {
    score += Math.min(
      subjectGroups.length * 0.025,
      0.12
    );
  }
  if (gradeFields.length > 0) {
    score += 0.03;
  }
  if (overallFields.length > 0) {
    score += 0.03;
  }
  return Math.min(
    0.99,
    Math.max(0, score)
  );
}
function mapAliasFieldToFieldType(aliasField) {
  const mapping = {
    name: "name",
    rollNo: "rollNo",
    admissionNo: "admissionNo",
    class: "class",
    section: "section",
    fatherName: "fatherName",
    motherName: "motherName",
    dob: "dob",
    address: "address",
    attendance: "attendance",
    workingDays: "workingDays",
    daysPresent: "daysPresent",
    position: "position",
    photoFilename: "photo",
    teacherRemarks: "remarks",
    principalRemarks: "remarks"
  };
  return mapping[aliasField] || "ignore";
}
function convertColumnToLetter(col) {
  let letter = "";
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode(
      temp % 26 + 65
    ) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// src/services/dynamicMappingEngine.ts
var PROTECTED_FIELD_TYPES = /* @__PURE__ */ new Set([
  "rollNo",
  "admissionNo",
  "name",
  "fatherName",
  "motherName",
  "dob",
  "class",
  "section",
  "attendance",
  "workingDays",
  "daysPresent",
  "photo",
  "remarks",
  "position",
  "address"
]);
function getProtectedColumns(detected) {
  const protectedCols = /* @__PURE__ */ new Set();
  if (!detected) {
    return protectedCols;
  }
  for (const field of detected.studentFields ?? []) {
    if (Number.isInteger(field.excelColumn) && field.confidence >= 0.7 && PROTECTED_FIELD_TYPES.has(field.fieldType)) {
      protectedCols.add(field.excelColumn);
    }
  }
  return protectedCols;
}
function mapFieldTypeToFieldKey(fieldType) {
  const mapping = {
    rollNo: "rollNo",
    admissionNo: "admissionNo",
    name: "name",
    fatherName: "fatherName",
    motherName: "motherName",
    dob: "dob",
    class: "class",
    section: "section",
    attendance: "attendance",
    workingDays: "workingDays",
    daysPresent: "daysPresent",
    photo: "photoFilename",
    remarks: "teacherRemarks",
    address: "address",
    // These are not student fields in the generated report mapping.
    position: "ignore",
    total: "ignore",
    percentage: "ignore",
    ignore: "ignore"
  };
  return mapping[fieldType] ?? null;
}
function getStudentFieldAt(detected, excelCol) {
  return detected?.studentFields?.find(
    (field) => field.excelColumn === excelCol
  );
}
function getOverallFieldAt(detected, excelCol) {
  return detected?.overallFields?.find(
    (field) => field.col === excelCol
  );
}
function buildSubjectName(groupName, _componentName) {
  const group = String(groupName ?? "").replace(/\s+/g, " ").trim();
  return group || "Subject";
}
function makeStudentMapping(header, fieldType, excelCol) {
  const fieldKey = mapFieldTypeToFieldKey(fieldType);
  return {
    columnName: header,
    fieldKey: fieldKey ?? "ignore",
    excelColumn: excelCol
    // Store column index for stability
  };
}
function makeOverallMapping(header, fieldType, excelCol) {
  const baseMapping = {
    columnName: header,
    excelColumn: excelCol
    // Store column index for stability
  };
  switch (fieldType) {
    case "attendance":
      return {
        ...baseMapping,
        fieldKey: "attendance"
      };
    case "remarks":
      return {
        ...baseMapping,
        fieldKey: "teacherRemarks"
      };
    case "total":
      return {
        ...baseMapping,
        fieldKey: "overallField",
        overallFieldType: "total"
      };
    case "percentage":
      return {
        ...baseMapping,
        fieldKey: "overallField",
        overallFieldType: "percentage"
      };
    case "position":
      return {
        ...baseMapping,
        fieldKey: "overallField",
        overallFieldType: "position"
      };
    case "address":
      return {
        ...baseMapping,
        fieldKey: "address"
      };
    default:
      return {
        ...baseMapping,
        fieldKey: "ignore"
      };
  }
}
function convertDetectedStructureToColumnMapping(detected, existingHeaders) {
  const mappings = [];
  const protectedCols = getProtectedColumns(detected);
  const studentFieldsByCol = /* @__PURE__ */ new Map();
  const overallFieldsByCol = /* @__PURE__ */ new Map();
  for (const field of detected.studentFields ?? []) {
    studentFieldsByCol.set(field.excelColumn, field);
  }
  for (const field of detected.overallFields ?? []) {
    overallFieldsByCol.set(field.col, field);
  }
  const subjectComponentsByCol = /* @__PURE__ */ new Map();
  for (const subjectGroup of detected.subjectGroups ?? []) {
    for (const component of subjectGroup.components ?? []) {
      subjectComponentsByCol.set(component.col, {
        groupName: subjectGroup.name,
        componentName: component.name,
        maxMarks: component.maxMarks,
        isTotal: component.isTotal
      });
    }
  }
  const gradeFieldsByCol = /* @__PURE__ */ new Map();
  for (const gradeField of detected.gradeFields ?? []) {
    gradeFieldsByCol.set(gradeField.col, {
      name: gradeField.name
    });
  }
  for (let col = 0; col < existingHeaders.length; col++) {
    const header = String(
      existingHeaders[col] ?? `Column_${col + 1}`
    ).trim();
    const studentField = studentFieldsByCol.get(col);
    const overallField = overallFieldsByCol.get(col);
    const subjectComponent = subjectComponentsByCol.get(col);
    const gradeField = gradeFieldsByCol.get(col);
    if (studentField) {
      mappings.push(
        makeStudentMapping(
          header,
          studentField.fieldType,
          col
        )
      );
      continue;
    }
    if (protectedCols.has(col)) {
      mappings.push({
        columnName: header,
        fieldKey: "ignore",
        excelColumn: col
      });
      continue;
    }
    if (subjectComponent) {
      const subjectName = buildSubjectName(
        subjectComponent.groupName,
        subjectComponent.componentName
      );
      const detectedMaxMarks = typeof subjectComponent.maxMarks === "number" ? subjectComponent.maxMarks : void 0;
      const mapping = {
        columnName: header,
        fieldKey: "subject",
        subjectName,
        excelColumn: col
        // Store column index for stability
      };
      if (detectedMaxMarks !== void 0 && Number.isFinite(detectedMaxMarks)) {
        mapping.maxMarks = detectedMaxMarks;
      }
      mappings.push(mapping);
      continue;
    }
    if (gradeField) {
      mappings.push({
        columnName: header,
        fieldKey: "gradeField",
        subjectName: gradeField.name,
        maxMarks: 0,
        excelColumn: col
      });
      continue;
    }
    if (overallField) {
      mappings.push(
        makeOverallMapping(
          header,
          overallField.fieldType,
          col
        )
      );
      continue;
    }
    mappings.push({
      columnName: header,
      fieldKey: "ignore",
      excelColumn: col
    });
  }
  return mappings;
}
function createStructureMappingFromDetected(detected) {
  const customMappings = {};
  const protectedCols = getProtectedColumns(detected);
  for (const field of detected.studentFields ?? []) {
    customMappings[field.excelColumn] = {
      type: "studentField",
      mappedTo: field.fieldType
    };
  }
  for (const subjectGroup of detected.subjectGroups ?? []) {
    for (const component of subjectGroup.components ?? []) {
      const col = component.col;
      if (protectedCols.has(col)) {
        const studentField = getStudentFieldAt(
          detected,
          col
        );
        const overallField = getOverallFieldAt(
          detected,
          col
        );
        if (studentField) {
          customMappings[col] = {
            type: "studentField",
            mappedTo: studentField.fieldType
          };
          continue;
        }
        if (overallField) {
          customMappings[col] = {
            type: "overallField",
            mappedTo: overallField.fieldType
          };
          continue;
        }
        customMappings[col] = {
          type: "ignore"
        };
        continue;
      }
      customMappings[col] = {
        type: "subject",
        mappedTo: buildSubjectName(
          subjectGroup.name,
          component.name
        )
      };
    }
  }
  for (const gradeField of detected.gradeFields ?? []) {
    const col = gradeField.col;
    if (protectedCols.has(col)) {
      const studentField = getStudentFieldAt(
        detected,
        col
      );
      const overallField = getOverallFieldAt(
        detected,
        col
      );
      if (studentField) {
        customMappings[col] = {
          type: "studentField",
          mappedTo: studentField.fieldType
        };
        continue;
      }
      if (overallField) {
        customMappings[col] = {
          type: "overallField",
          mappedTo: overallField.fieldType
        };
        continue;
      }
      customMappings[col] = {
        type: "ignore"
      };
      continue;
    }
    customMappings[col] = {
      type: "gradeField",
      mappedTo: gradeField.name
    };
  }
  for (const overallField of detected.overallFields ?? []) {
    customMappings[overallField.col] = {
      type: "overallField",
      mappedTo: overallField.fieldType
    };
  }
  return {
    detected,
    confirmed: false,
    customMappings
  };
}

// src/services/mappingEngine.ts
var NON_SUBJECT_TERMS = [
  "total",
  "grand total",
  "overall total",
  "percentage",
  "percent",
  "percentile",
  "position",
  "rank",
  "result",
  "average",
  "avg",
  "aggregate",
  "overall",
  "remarks",
  "remark",
  "attendance",
  "present",
  "absent",
  "grade",
  "status"
];
var COMPONENT_TERMS2 = [
  "pt",
  "periodic test",
  "periodic assessment",
  "pa",
  "class test",
  "ct",
  "nb",
  "notebook",
  "notebook submission",
  "activity",
  "activities",
  "assignment",
  "project",
  "oral",
  "written",
  "practical",
  "theory",
  "internal",
  "external",
  "exam",
  "examination",
  "term",
  "sa",
  "sa1",
  "sa2",
  "fa",
  "ut",
  "unit test",
  "assessment",
  "test",
  "total"
];
function mapAliasToFieldKey(aliasField) {
  const mapping = {
    name: "name",
    rollNo: "rollNo",
    admissionNo: "admissionNo",
    class: "class",
    section: "section",
    fatherName: "fatherName",
    motherName: "motherName",
    dob: "dob",
    attendance: "attendance",
    workingDays: "workingDays",
    daysPresent: "daysPresent",
    photoFilename: "photoFilename",
    teacherRemarks: "teacherRemarks",
    principalRemarks: "principalRemarks",
    address: "address",
    position: "position"
  };
  return mapping[aliasField] ?? null;
}
function isOverallOrResultColumn(header) {
  const normalized = normalizeHeader(header);
  if (!normalized) return false;
  if (normalized === "total" || normalized === "grand total" || normalized === "overall total" || normalized === "percentage" || normalized === "percent" || normalized === "position" || normalized === "rank") {
    return true;
  }
  const parts = normalized.split(/\s*\|\s*/).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (last === "total" || last === "marks" || last === "max marks" || last === "maximum marks") {
      return false;
    }
  }
  return NON_SUBJECT_TERMS.some((term) => {
    if (normalized === term) return true;
    return normalized.startsWith(`${term} `);
  });
}
function looksLikeComponentHeader(header) {
  const normalized = normalizeHeader(header);
  if (!normalized) return false;
  const parts = normalized.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return false;
  const lastPart = parts[parts.length - 1];
  return COMPONENT_TERMS2.some(
    (term) => lastPart === term || lastPart.startsWith(`${term} `) || lastPart.startsWith(`${term}-`) || lastPart.startsWith(`${term}:`)
  );
}
function inferSubjectName(header) {
  const parts = header.split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return canonicalizeSubjectName(header);
  }
  if (parts.length >= 3) {
    const candidate = parts[parts.length - 2];
    if (candidate && !isStructuralPart(candidate) && !isComponentPart(candidate)) {
      return canonicalizeSubjectName(candidate);
    }
  }
  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    if (isComponentPart(last) || isStructuralPart(last)) {
      return canonicalizeSubjectName(first);
    }
    return canonicalizeSubjectName(first);
  }
  return canonicalizeSubjectName(parts[0]);
}
function isStructuralPart(value) {
  const normalized = normalizeHeader(value);
  return NON_SUBJECT_TERMS.some(
    (term) => normalized === term || normalized.startsWith(`${term} `) || normalized.startsWith(`${term}:`)
  );
}
function isComponentPart(value) {
  const normalized = normalizeHeader(value);
  return COMPONENT_TERMS2.some(
    (term) => normalized === term || normalized.startsWith(`${term} `) || normalized.startsWith(`${term}-`) || normalized.startsWith(`${term}:`)
  );
}
function inferMaxMarks(column, normalized) {
  const bracketMatch = column.match(/\(\s*(\d+(?:\.\d+)?)\s*\)/) ?? column.match(/\[\s*(\d+(?:\.\d+)?)\s*\]/);
  if (bracketMatch) {
    const value = Number(bracketMatch[1]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  const maxMatch = normalized.match(
    /(?:^|\s)(?:max|max marks|maximum|maximum marks)\s*[:\-]?\s*(\d+(?:\.\d+)?)/
  );
  if (maxMatch) {
    const value = Number(maxMatch[1]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  const trailingMatch = normalized.match(/(?:^|\s)(\d{1,3})\s*$/);
  if (trailingMatch) {
    const value = Number(trailingMatch[1]);
    if (Number.isFinite(value) && value > 0 && value <= 1e3) {
      return value;
    }
  }
  return 100;
}
function findCoreField(column, assignedFields) {
  const normalized = normalizeHeader(column);
  if (!normalized) return null;
  for (const aliasGroup of FIELD_ALIASES) {
    const field = mapAliasToFieldKey(aliasGroup.field);
    if (!field) continue;
    if (assignedFields.has(field)) continue;
    const aliases = aliasGroup.aliases.map((alias) => normalizeHeader(alias)).filter(Boolean);
    if (aliases.some((alias) => alias === normalized)) {
      return field;
    }
    if (aliases.some(
      (alias) => normalized.startsWith(`${alias} `) || normalized.startsWith(`${alias}:`) || normalized.startsWith(`${alias}-`)
    )) {
      return field;
    }
    if (aliases.some(
      (alias) => alias.length >= 4 && (normalized.includes(` ${alias} `) || normalized.startsWith(`${alias} `) || normalized.endsWith(` ${alias}`))
    )) {
      return field;
    }
  }
  return null;
}
function shouldMapAsSubject(column) {
  const normalized = normalizeHeader(column);
  if (!normalized) return false;
  if (isKnownNonSubjectHeader(column)) {
    return false;
  }
  if (isOverallOrResultColumn(column)) {
    return false;
  }
  if (looksLikeComponentHeader(column)) {
    return true;
  }
  if (looksLikeSubjectHeader(column)) {
    return true;
  }
  return false;
}
function autoMapColumns(headers) {
  const mapping = [];
  const assignedFields = /* @__PURE__ */ new Set();
  for (const column of headers) {
    const columnName = String(column ?? "").trim();
    if (!columnName) {
      mapping.push({
        columnName,
        fieldKey: "ignore"
      });
      continue;
    }
    const coreField = findCoreField(columnName, assignedFields);
    if (coreField) {
      mapping.push({
        columnName,
        fieldKey: coreField
      });
      assignedFields.add(coreField);
      continue;
    }
    if (isOverallOrResultColumn(columnName)) {
      mapping.push({
        columnName,
        fieldKey: "ignore"
      });
      continue;
    }
    if (shouldMapAsSubject(columnName)) {
      const normalized = normalizeHeader(columnName);
      const subjectName = inferSubjectName(columnName);
      mapping.push({
        columnName,
        fieldKey: "subject",
        subjectName: subjectName || canonicalizeSubjectName(columnName),
        maxMarks: inferMaxMarks(columnName, normalized)
      });
      continue;
    }
    mapping.push({
      columnName,
      fieldKey: "ignore"
    });
  }
  return mapping;
}

// src/services/normalizationEngine.ts
var ABSENT_VALUES = ["ab", "absent", "a"];
var EXEMPT_VALUES = ["ex", "exempt", "exmp"];
var MEDICAL_VALUES = ["medical", "med", "md"];
function parseCellValue(v) {
  if (v === null || v === void 0) return "";
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(v).trim();
}
function parseSubjectCell(v) {
  const raw = parseCellValue(v);
  if (raw === "") {
    return { status: "present", marks: null, rawValue: raw };
  }
  const lower = raw.toLowerCase();
  if (ABSENT_VALUES.includes(lower)) {
    return { status: "absent", marks: null, rawValue: raw };
  }
  if (EXEMPT_VALUES.includes(lower)) {
    return { status: "exempt", marks: null, rawValue: raw };
  }
  if (MEDICAL_VALUES.includes(lower)) {
    return { status: "medical", marks: null, rawValue: raw };
  }
  const cleaned = raw.replace(/,/g, "");
  const slashIndex = cleaned.indexOf("/");
  if (slashIndex >= 0) {
    const first = cleaned.slice(0, slashIndex).trim();
    const num = Number(first);
    if (Number.isFinite(num)) {
      return { status: "present", marks: num, rawValue: raw };
    }
  }
  const directNum = Number(cleaned);
  if (Number.isFinite(directNum)) {
    return { status: "present", marks: directNum, rawValue: raw };
  }
  const sepRegex = /[\/·•|:\-\s_]+/g;
  const tokens = cleaned.split(sepRegex).map((t) => t.trim()).filter((t) => t !== "" && !/^[a-zA-Z]+$/.test(t));
  for (const token of tokens) {
    const n = Number(token);
    if (Number.isFinite(n)) {
      return { status: "present", marks: n, rawValue: raw };
    }
  }
  const numericMatch = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (numericMatch) {
    const n = Number(numericMatch[0]);
    if (Number.isFinite(n)) {
      return { status: "present", marks: n, rawValue: raw };
    }
  }
  return { status: "present", marks: null, rawValue: raw };
}
function parseGradeCell(v) {
  const raw = parseCellValue(v);
  return {
    value: raw,
    rawValue: raw
  };
}
function getOriginalRowNumber(row, fallback) {
  const value = row.__rowNumber;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function getCellByColumn(row, col, fallbackHeader) {
  const cells = row.__cells;
  if (typeof col === "number" && Array.isArray(cells) && col >= 0) {
    return cells[col] ?? "";
  }
  return row[fallbackHeader];
}
function getMappedCell(row, mapping) {
  return getCellByColumn(
    row,
    mapping.excelColumn,
    mapping.columnName
  );
}
function normalizeCellForComparison(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}
function isHeaderLikeStudentValue(value) {
  const normalized = normalizeCellForComparison(value);
  return [
    "name",
    "student",
    "studentname",
    "studentsname",
    "nameofstudent",
    "roll",
    "rollno",
    "rollnumber",
    "srno",
    "sno",
    "serialno",
    "total",
    "grandtotal",
    "subtotal",
    "percentage",
    "percent",
    "average",
    "result",
    "signature"
  ].includes(normalized);
}
function isTotalLikeHeader(text) {
  const normalized = normalizeCellForComparison(text);
  return normalized === "total" || normalized === "subtotal" || normalized === "grandtotal" || normalized === "overalltotal" || normalized.endsWith("total");
}
function deriveComponentName(header, subjectName) {
  const parts = String(header ?? "").split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? String(header ?? "");
  const rest = parts.filter(
    (part) => normalizeCellForComparison(part) !== normalizeCellForComparison(subjectName)
  );
  return rest.length ? rest[rest.length - 1] : parts[parts.length - 1];
}
function isPlausibleStudentRow(row, detected, existingHeaders, nameColOverride, rollColOverride) {
  const studentFields = detected?.studentFields ?? [];
  const nameCol = nameColOverride ?? studentFields.find((field) => field.fieldType === "name")?.excelColumn;
  const rollCol = rollColOverride ?? studentFields.find((field) => field.fieldType === "rollNo")?.excelColumn;
  const readCell = (col) => {
    if (typeof col !== "number" || col < 0) return "";
    return parseCellValue(
      getCellByColumn(
        row,
        col,
        existingHeaders[col] || `Column_${col + 1}`
      )
    );
  };
  const name = readCell(nameCol);
  const roll = readCell(rollCol);
  if (!name && !roll) return false;
  if (name && isHeaderLikeStudentValue(name) || roll && isHeaderLikeStudentValue(roll)) {
    return false;
  }
  return true;
}
function sumPresentMarks(components) {
  let sum = 0;
  let found = false;
  for (const component of components) {
    if (component.status === "present" && typeof component.marks === "number" && Number.isFinite(component.marks)) {
      sum += component.marks;
      found = true;
    }
  }
  return found ? sum : null;
}
function lastNumericMarks(components) {
  for (let i = components.length - 1; i >= 0; i--) {
    const component = components[i];
    if (typeof component.marks === "number" && Number.isFinite(component.marks)) {
      return component.marks;
    }
  }
  return null;
}
function resolveSubjectMaxMarks(subjectGroup, components, authoritativeTotalMaxMarks) {
  if (typeof authoritativeTotalMaxMarks === "number" && Number.isFinite(authoritativeTotalMaxMarks) && authoritativeTotalMaxMarks > 0) {
    return authoritativeTotalMaxMarks;
  }
  const totalComponent = subjectGroup?.components?.find(
    (component) => component.isTotal
  );
  if (totalComponent && typeof totalComponent.maxMarks === "number" && Number.isFinite(totalComponent.maxMarks)) {
    return totalComponent.maxMarks;
  }
  const explicitComponentMax = (subjectGroup?.components ?? []).filter((component) => !component.isTotal).reduce((sum, component) => {
    return typeof component.maxMarks === "number" && Number.isFinite(component.maxMarks) ? sum + component.maxMarks : sum;
  }, 0);
  if (subjectGroup?.hasTotal || totalComponent) {
    return explicitComponentMax > 0 ? explicitComponentMax : 100;
  }
  if (explicitComponentMax > 0) {
    return explicitComponentMax;
  }
  return 100;
}
function resolveAttendance(fields, overallAttendance) {
  if (overallAttendance && String(overallAttendance).trim()) {
    return overallAttendance;
  }
  if (fields.attendance && String(fields.attendance).trim()) {
    return fields.attendance;
  }
  const toNumber = (value) => {
    const match = String(value ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  };
  const present = toNumber(fields.daysPresent);
  const working = toNumber(fields.workingDays);
  if (Number.isFinite(present) && Number.isFinite(working) && working > 0) {
    const pct = Math.round(present / working * 1e3) / 10;
    return `${pct}%`;
  }
  return void 0;
}
function mapDetectedFieldToStudentField(fieldType) {
  const mapping = {
    photo: "photoFilename",
    remarks: "teacherRemarks"
  };
  return mapping[fieldType] ?? fieldType;
}
function buildStudentsFromRows(rows, mapping, defaults) {
  const subjectMappings = mapping.filter((m) => m.fieldKey === "subject");
  const gradeFieldMappings = mapping.filter((m) => m.fieldKey === "gradeField");
  const overallFieldMappings = mapping.filter((m) => m.fieldKey === "overallField");
  return rows.map((row, idx) => {
    const rowNumber = getOriginalRowNumber(row, idx + 2);
    const studentId = `row-${rowNumber}`;
    const fields = {};
    for (const m of mapping) {
      if (m.fieldKey === "subject" || m.fieldKey === "gradeField" || m.fieldKey === "overallField" || m.fieldKey === "ignore") continue;
      fields[m.fieldKey] = parseCellValue(getMappedCell(row, m));
    }
    const subjects = subjectMappings.map((m) => {
      const parsed = parseSubjectCell(getMappedCell(row, m));
      return {
        name: m.subjectName || m.columnName,
        maxMarks: m.maxMarks ?? 100,
        ...parsed,
        hasComponents: false,
        components: void 0
      };
    });
    const gradeFields = gradeFieldMappings.map((m) => {
      const parsed = parseGradeCell(getMappedCell(row, m));
      return {
        name: m.subjectName || m.columnName,
        value: parsed.value,
        rawValue: parsed.rawValue
      };
    });
    const overall = {};
    for (const m of overallFieldMappings) {
      const raw = getMappedCell(row, m);
      if (m.overallFieldType === "total") {
        const parsed = parseSubjectCell(raw);
        if (parsed.marks !== null) overall.total = parsed.marks;
      } else if (m.overallFieldType === "percentage") {
        const parsed = parseSubjectCell(raw);
        if (parsed.marks !== null) overall.percentage = parsed.marks;
      } else if (m.overallFieldType === "position") {
        const value = parseCellValue(raw);
        if (value) overall.position = value;
      } else if (m.overallFieldType === "attendance") {
        const value = parseCellValue(raw);
        if (value) overall.attendance = value;
      } else if (m.overallFieldType === "remarks") {
        const value = parseCellValue(raw);
        if (value) overall.remarks = value;
      }
    }
    if (fields.attendance) {
      overall.attendance = fields.attendance;
    }
    if (fields.teacherRemarks) {
      overall.remarks = fields.teacherRemarks;
    }
    const cls = fields.class || defaults.defaultClass || defaults.inferredClass || "";
    const sec = fields.section || defaults.defaultSection || defaults.inferredSection || "";
    return {
      studentId,
      rowNumber,
      rollNo: fields.rollNo || String(idx + 1),
      admissionNo: fields.admissionNo || void 0,
      class: cls || void 0,
      section: sec || void 0,
      name: fields.name,
      fatherName: fields.fatherName || void 0,
      motherName: fields.motherName || void 0,
      dob: fields.dob || void 0,
      address: fields.address || void 0,
      attendance: resolveAttendance(fields, overall.attendance),
      workingDays: fields.workingDays || void 0,
      daysPresent: fields.daysPresent || void 0,
      photoFilename: fields.photoFilename || void 0,
      subjects,
      gradeFields: gradeFields.length > 0 ? gradeFields : void 0,
      overall: Object.keys(overall).length > 0 ? overall : void 0,
      teacherRemarks: fields.teacherRemarks || void 0,
      principalRemarks: fields.principalRemarks || void 0,
      rawRow: row
    };
  });
}
function buildStudentsFromDynamicStructure(rows, detectedStructure, structureMapping, defaults, existingHeaders, columnMappings = []) {
  const detected = structureMapping?.detected ?? detectedStructure ?? {};
  const hasAuthoritative = columnMappings.length > 0;
  const byCol = /* @__PURE__ */ new Map();
  columnMappings.forEach((mapping, index) => {
    const col = mapping.excelColumn ?? index;
    byCol.set(col, mapping);
  });
  const authAt = (col) => byCol.get(col);
  const headerAt = (col) => existingHeaders[col] ?? `Column_${col + 1}`;
  const dataStartRowNumber = typeof detected.dataStartRow === "number" ? detected.dataStartRow + 1 : 1;
  const resolveColumn = (fieldKey) => {
    const fromMapping = columnMappings.find(
      (m) => m.fieldKey === fieldKey
    );
    if (fromMapping && typeof fromMapping.excelColumn === "number") {
      return fromMapping.excelColumn;
    }
    const fromDetected = detected.studentFields?.find(
      (field) => field.fieldType === fieldKey
    );
    return fromDetected?.excelColumn;
  };
  const nameCol = resolveColumn("name");
  const rollCol = resolveColumn("rollNo");
  return rows.filter((row) => {
    const rowNumber = getOriginalRowNumber(row, 0);
    if (rowNumber && rowNumber < dataStartRowNumber) {
      return false;
    }
    return isPlausibleStudentRow(
      row,
      detected,
      existingHeaders,
      nameCol,
      rollCol
    );
  }).map((row, idx) => {
    const rowNumber = getOriginalRowNumber(row, idx + 2);
    const studentId = `row-${rowNumber}`;
    const fields = {};
    for (const mapping of columnMappings) {
      const key = mapping.fieldKey;
      if (!key || key === "subject" || key === "gradeField" || key === "overallField" || key === "ignore") {
        continue;
      }
      const col = mapping.excelColumn;
      if (typeof col !== "number" || col < 0) continue;
      fields[key] = parseCellValue(
        getCellByColumn(row, col, headerAt(col))
      );
    }
    if (Array.isArray(detected.studentFields)) {
      for (const field of detected.studentFields) {
        const col = field.excelColumn;
        const fieldType = field.fieldType;
        if (!Number.isInteger(col) || col < 0 || !fieldType || fieldType === "ignore" || fieldType === "total" || fieldType === "percentage" || fieldType === "position") {
          continue;
        }
        const key = mapDetectedFieldToStudentField(fieldType);
        if (hasAuthoritative && byCol.has(col)) continue;
        if (fields[key] && String(fields[key]).trim() !== "") continue;
        fields[key] = parseCellValue(
          getCellByColumn(row, col, headerAt(col))
        );
      }
    }
    const subjects = [];
    const coveredCols = /* @__PURE__ */ new Set();
    const buildSubject = (groupName, components, group, options) => {
      const totalComponent = components.find((c) => c.isTotal);
      const numericTotal = totalComponent && totalComponent.status === "present" && typeof totalComponent.marks === "number" ? totalComponent.marks : null;
      let finalMarks;
      if (totalComponent) {
        finalMarks = totalComponent.status === "present" ? numericTotal ?? sumPresentMarks(components) : null;
      } else {
        finalMarks = sumPresentMarks(components) ?? lastNumericMarks(components);
      }
      let status;
      if (totalComponent) {
        status = totalComponent.status;
      } else {
        const nonPresent = components.find((c) => c.status !== "present");
        status = nonPresent ? nonPresent.status : "present";
      }
      const totalCol = options?.totalCol;
      const authMax = typeof totalCol === "number" ? authAt(totalCol)?.maxMarks : void 0;
      const explicitMax = options?.explicitMax;
      const finalMaxMarks = typeof explicitMax === "number" && Number.isFinite(explicitMax) && explicitMax > 0 ? explicitMax : typeof authMax === "number" && Number.isFinite(authMax) && authMax > 0 ? authMax : resolveSubjectMaxMarks(group, components, void 0);
      const hasComponents = components.length > 1;
      subjects.push({
        name: groupName,
        marks: finalMarks,
        maxMarks: finalMaxMarks,
        status,
        rawValue: finalMarks !== null && finalMarks !== void 0 ? String(finalMarks) : void 0,
        hasComponents,
        components: hasComponents ? components : void 0
      });
    };
    for (const group of detected.subjectGroups ?? []) {
      const groupComponents = group.components ?? [];
      const activeComponents = groupComponents.filter((component) => {
        if (!hasAuthoritative) return true;
        const auth = authAt(component.col);
        return !!auth && auth.fieldKey === "subject";
      });
      if (activeComponents.length === 0) continue;
      const authName = activeComponents.map((component) => authAt(component.col)?.subjectName).find((name) => name && name.trim());
      const groupName = (authName || group.name || "").trim() || group.name;
      const components = activeComponents.map(
        (component) => {
          const auth = authAt(component.col);
          const parsed = parseSubjectCell(
            getCellByColumn(row, component.col, headerAt(component.col))
          );
          coveredCols.add(component.col);
          return {
            name: component.name,
            marks: parsed.marks,
            maxMarks: auth?.maxMarks ?? component.maxMarks ?? 100,
            status: parsed.status,
            rawValue: parsed.rawValue,
            isTotal: !!component.isTotal
          };
        }
      );
      const totalCol = activeComponents.find(
        (component) => component.isTotal
      )?.col;
      buildSubject(groupName, components, group, { totalCol });
    }
    const standalone = /* @__PURE__ */ new Map();
    for (const mapping of columnMappings) {
      if (mapping.fieldKey !== "subject") continue;
      const col = mapping.excelColumn;
      if (typeof col !== "number" || col < 0) continue;
      if (coveredCols.has(col)) continue;
      const name = (mapping.subjectName || mapping.columnName).trim();
      if (!name) continue;
      const list = standalone.get(name) ?? [];
      list.push(mapping);
      standalone.set(name, list);
    }
    for (const [name, mappingsForName] of standalone) {
      const components = mappingsForName.map((mapping) => {
        const col = mapping.excelColumn;
        const header = headerAt(col);
        const parsed = parseSubjectCell(
          getCellByColumn(row, col, header)
        );
        coveredCols.add(col);
        return {
          name: deriveComponentName(header, name),
          marks: parsed.marks,
          maxMarks: mapping.maxMarks ?? 100,
          status: parsed.status,
          rawValue: parsed.rawValue,
          isTotal: isTotalLikeHeader(header)
        };
      });
      const existing = subjects.find((s) => s.name === name);
      if (existing) {
        const merged = [...existing.components ?? [], ...components];
        existing.components = merged;
        existing.hasComponents = merged.length > 1;
        const totalComponent = merged.find((c) => c.isTotal);
        existing.marks = totalComponent ? totalComponent.marks : sumPresentMarks(merged) ?? lastNumericMarks(merged);
        existing.status = totalComponent ? totalComponent.status : merged.find((c) => c.status !== "present")?.status ?? "present";
      } else {
        const totalIdx = components.findIndex((c) => c.isTotal);
        const totalCol = totalIdx >= 0 ? mappingsForName[totalIdx]?.excelColumn : void 0;
        const explicitMax = (totalIdx >= 0 ? mappingsForName[totalIdx]?.maxMarks : void 0) ?? mappingsForName[0]?.maxMarks;
        buildSubject(
          name,
          components,
          { components, hasTotal: false },
          { totalCol, explicitMax }
        );
      }
    }
    const gradeFields = [];
    const gradeCovered = /* @__PURE__ */ new Set();
    for (const gradeField of detected.gradeFields ?? []) {
      const auth = authAt(gradeField.col);
      if (hasAuthoritative) {
        if (!auth || auth.fieldKey !== "gradeField") continue;
      }
      gradeCovered.add(gradeField.col);
      const parsed = parseGradeCell(
        getCellByColumn(row, gradeField.col, headerAt(gradeField.col))
      );
      gradeFields.push({
        name: auth?.subjectName || gradeField.name,
        value: parsed.value,
        rawValue: parsed.rawValue
      });
    }
    for (const mapping of columnMappings) {
      if (mapping.fieldKey !== "gradeField") continue;
      const col = mapping.excelColumn;
      if (typeof col !== "number" || col < 0 || gradeCovered.has(col)) {
        continue;
      }
      gradeCovered.add(col);
      const parsed = parseGradeCell(
        getCellByColumn(row, col, headerAt(col))
      );
      gradeFields.push({
        name: mapping.subjectName || mapping.columnName,
        value: parsed.value,
        rawValue: parsed.rawValue
      });
    }
    const overall = {};
    const recordOverall = (fieldType, value) => {
      if (!fieldType) return;
      if (fieldType === "total") {
        const parsed = parseSubjectCell(value);
        if (parsed.marks !== null) overall.total = parsed.marks;
      } else if (fieldType === "percentage") {
        const parsed = parseSubjectCell(value);
        if (parsed.marks !== null) overall.percentage = parsed.marks;
      } else if (fieldType === "position") {
        const text = parseCellValue(value);
        if (text) overall.position = text;
      } else if (fieldType === "attendance") {
        const text = parseCellValue(value);
        if (text) overall.attendance = text;
      } else if (fieldType === "remarks") {
        const text = parseCellValue(value);
        if (text) overall.remarks = text;
      }
    };
    for (const overallField of detected.overallFields ?? []) {
      const auth = authAt(overallField.col);
      if (hasAuthoritative) {
        if (!auth || auth.fieldKey !== "overallField") continue;
      }
      recordOverall(
        auth?.overallFieldType ?? overallField.fieldType,
        getCellByColumn(row, overallField.col, headerAt(overallField.col))
      );
    }
    for (const mapping of columnMappings) {
      if (mapping.fieldKey !== "overallField") continue;
      const col = mapping.excelColumn;
      if (typeof col !== "number" || col < 0) continue;
      recordOverall(
        mapping.overallFieldType,
        getCellByColumn(row, col, headerAt(col))
      );
    }
    const cls = fields.class || defaults.defaultClass || defaults.inferredClass || "";
    const sec = fields.section || defaults.defaultSection || defaults.inferredSection || "";
    return {
      studentId,
      rowNumber,
      rollNo: fields.rollNo || String(idx + 1),
      admissionNo: fields.admissionNo || void 0,
      class: cls || void 0,
      section: sec || void 0,
      name: fields.name,
      fatherName: fields.fatherName || void 0,
      motherName: fields.motherName || void 0,
      dob: fields.dob || void 0,
      address: fields.address || void 0,
      attendance: resolveAttendance(fields, overall.attendance),
      workingDays: fields.workingDays || void 0,
      daysPresent: fields.daysPresent || void 0,
      photoFilename: fields.photoFilename || void 0,
      subjects,
      gradeFields: gradeFields.length > 0 ? gradeFields : void 0,
      overall: Object.keys(overall).length > 0 ? overall : void 0,
      teacherRemarks: overall.remarks || fields.teacherRemarks || void 0,
      principalRemarks: fields.principalRemarks || void 0,
      rawRow: row
    };
  });
}

// src/services/validationEngine.ts
function validateStudents(students) {
  const issues = [];
  const rollSeen = /* @__PURE__ */ new Map();
  for (const s of students) {
    const ctx = {
      studentId: s.studentId,
      rowNumber: s.rowNumber
    };
    if (!s.name || !s.name.trim()) {
      issues.push({
        ...ctx,
        severity: "error",
        type: "missing_name",
        message: "Student name is missing.",
        field: "name"
      });
    }
    if (!s.rollNo || !String(s.rollNo).trim()) {
      issues.push({
        ...ctx,
        severity: "error",
        type: "missing_roll",
        message: "Roll number is missing.",
        field: "rollNo"
      });
    } else {
      const key = `${s.class ?? ""}__${s.section ?? ""}__${String(s.rollNo).trim()}`;
      const existing = rollSeen.get(key) ?? [];
      existing.push(s.studentId);
      rollSeen.set(key, existing);
    }
    if (!s.class || !String(s.class).trim()) {
      issues.push({
        ...ctx,
        severity: "warning",
        type: "missing_class",
        message: "Class is missing; default value will be used.",
        field: "class"
      });
    }
    for (const sub of s.subjects) {
      if (sub.status === "present") {
        if (sub.marks === null) {
          issues.push({
            ...ctx,
            severity: "error",
            type: "missing_marks",
            message: `${sub.name} marks missing.`,
            field: `subject.${sub.name}`
          });
        } else if (sub.marks < 0) {
          issues.push({
            ...ctx,
            severity: "error",
            type: "invalid_marks_negative",
            message: `${sub.name} marks ${sub.marks} are negative.`,
            field: `subject.${sub.name}`
          });
        } else if (sub.marks > sub.maxMarks) {
          issues.push({
            ...ctx,
            severity: "error",
            type: "marks_exceed_max",
            message: `${sub.name} marks ${sub.marks} exceed maximum ${sub.maxMarks}.`,
            field: `subject.${sub.name}`
          });
        }
      }
    }
    if (s.attendance) {
      const a = String(s.attendance).replace("%", "").trim();
      const n = Number(a);
      if (a !== "" && (!Number.isFinite(n) || n < 0 || n > 100)) {
        issues.push({
          ...ctx,
          severity: "warning",
          type: "invalid_attendance",
          message: `Attendance "${s.attendance}" is malformed.`,
          field: "attendance"
        });
      }
    }
  }
  for (const [key, ids] of rollSeen.entries()) {
    if (ids.length > 1) {
      const [cls, sec, roll] = key.split("__");
      for (const id of ids) {
        const st = students.find((x) => x.studentId === id);
        if (!st) continue;
        issues.push({
          studentId: st.studentId,
          rowNumber: st.rowNumber,
          severity: "error",
          type: "duplicate_roll",
          message: `Roll number ${roll}${cls ? ` in Class ${cls}` : ""}${sec ? ` - Section ${sec}` : ""} is duplicated.`,
          field: "rollNo"
        });
      }
    }
  }
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.length - errorCount;
  return {
    isValid: errorCount === 0,
    issues,
    errorCount,
    warningCount
  };
}

// scripts/jspdf-shim.mjs
import { createRequire } from "node:module";
var require2 = createRequire(import.meta.url);
var jspdf = require2("jspdf");
var jspdf_shim_default = jspdf.jsPDF;

// src/services/calculationEngine.ts
function computePercentage(total, max) {
  if (max <= 0) return null;
  return Math.round(total / max * 1e4) / 100;
}
function gradeFromMarksPercent(pct) {
  if (pct === null) return "\u2014";
  if (pct >= 91) return "A1";
  if (pct >= 81) return "A2";
  if (pct >= 71) return "B1";
  if (pct >= 61) return "B2";
  if (pct >= 51) return "C";
  return "D";
}
function remarkFromPercent(pct) {
  if (pct === null) return "\u2014";
  if (pct >= 91) return "Excellent";
  if (pct >= 81) return "Very Good";
  if (pct >= 71) return "Good";
  if (pct >= 61) return "Satisfactory";
  if (pct >= 51) return "Average";
  return "Needs Improvement";
}
function overallPerformanceLabel(pct) {
  if (pct === null) return "\u2014";
  if (pct >= 91) return "EXCELLENT";
  if (pct >= 81) return "VERY GOOD";
  if (pct >= 71) return "GOOD";
  if (pct >= 61) return "SATISFACTORY";
  if (pct >= 51) return "FAIR";
  return "NEEDS IMPROVEMENT";
}
function gradeFromMarksOutOf(marks, max) {
  if (marks === null || max <= 0) return "\u2014";
  return gradeFromMarksPercent(marks / max * 100);
}
function summarizeComponents(components) {
  return components.map((c) => ({
    name: c.name,
    marks: c.marks,
    maxMarks: c.maxMarks,
    status: c.status,
    grade: c.status === "present" && c.marks !== null ? gradeFromMarksOutOf(c.marks, c.maxMarks) : statusLabel(c.status),
    isTotal: c.isTotal
  }));
}
function summarizeSubjects(student) {
  return student.subjects.map((s) => {
    const components = s.hasComponents && s.components ? summarizeComponents(s.components) : void 0;
    const pct = s.status === "present" && s.marks !== null && s.maxMarks > 0 ? s.marks / s.maxMarks * 100 : null;
    return {
      name: s.name,
      marks: s.marks,
      maxMarks: s.maxMarks,
      status: s.status,
      grade: s.status === "present" && s.marks !== null ? gradeFromMarksPercent(pct) : statusLabel(s.status),
      remark: s.status === "present" && s.marks !== null ? remarkFromPercent(pct) : statusLabel(s.status),
      components
    };
  });
}
function statusLabel(status) {
  switch (status) {
    case "absent":
      return "AB";
    case "exempt":
      return "EX";
    case "medical":
      return "Medical";
    default:
      return "\u2014";
  }
}
function computeTotals(student) {
  const graded = summarizeSubjects(student);
  let total = 0;
  let max = 0;
  let present = 0;
  for (const s of student.subjects) {
    if (s.maxMarks === 0) continue;
    if (s.status === "present" && s.marks !== null) {
      total += s.marks;
      max += s.maxMarks;
      present++;
    }
    if (s.hasComponents && s.components) {
      for (const comp of s.components) {
        if (comp.status === "present" && comp.marks !== null && !comp.isTotal) {
          if (s.marks === null) {
            total += comp.marks;
            max += comp.maxMarks;
          }
        }
      }
    }
  }
  const pct = computePercentage(total, max);
  return {
    totalMarks: total,
    totalMax: max,
    percentage: pct,
    overallGrade: gradeFromMarksPercent(pct),
    passed: pct !== null ? pct >= 33 : false,
    presentSubjects: present,
    gradedSubjects: graded
  };
}

// src/services/reportCardModel.ts
var DEFAULT_GRADE_SCALE = "A1 (91-100)    A2 (81-90)    B1 (71-80)    B2 (61-70)    C (51-60)    D (Below 50)";
var DEFAULT_LEARNING = [
  ["Understanding", "A"],
  ["Application", "A"],
  ["Analytical Thinking", "B+"],
  ["Creativity", "B+"],
  ["Independence", "A"]
];
var DEFAULT_PERSONALITY = [
  ["Confidence", "A"],
  ["Communication Skills", "A"],
  ["Leadership Qualities", "B+"],
  ["Emotional Balance", "B+"],
  ["Attitude", "A"]
];
var DEFAULT_CO_SCHOLASTIC = [
  ["Work Education", "A"],
  ["Art Education", "A"],
  ["Health & Physical Education", "A"],
  ["Discipline", "A"],
  ["Value Education", "A"],
  ["Life Skills", "A"]
];
var DEFAULT_TEACHER_REMARKS = "The student is a consistent learner and participates actively in class activities. Continue working on time management to achieve even better results.";
var DEFAULT_PRINCIPAL_REMARKS = "Keep up the good work. With continued effort the student can achieve greater heights.";
function starsFromGrade(value) {
  const norm = String(value ?? "").trim().toUpperCase();
  if (!norm) return 0;
  if (norm.startsWith("A+")) return 5;
  if (norm.startsWith("A1")) return 5;
  if (norm.startsWith("A2")) return 5;
  if (norm.startsWith("A")) return 5;
  if (norm.startsWith("B+")) return 4;
  if (norm.startsWith("B1")) return 4;
  if (norm.startsWith("B2")) return 3;
  if (norm.startsWith("B")) return 3;
  if (norm.startsWith("C")) return 2;
  if (norm.startsWith("D")) return 1;
  return 0;
}
function toStars(entries) {
  return entries.map(([name, value]) => ({
    name,
    value,
    stars: starsFromGrade(value)
  }));
}
function studentSkillsToStars(custom, fallback) {
  if (custom && Object.keys(custom).length > 0) {
    return Object.entries(custom).map(([name, value]) => ({
      name,
      value,
      stars: starsFromGrade(value)
    }));
  }
  return toStars(fallback);
}
function coScholasticRows(gradeFields) {
  if (gradeFields && gradeFields.length > 0) {
    return gradeFields.map((gf) => ({
      name: gf.name,
      value: gf.value,
      stars: starsFromGrade(gf.value)
    }));
  }
  return toStars(DEFAULT_CO_SCHOLASTIC);
}
function buildReportCardModel(student, school) {
  const totals = computeTotals(student);
  const academic = totals.gradedSubjects.map(
    (s) => ({
      name: s.name,
      maxMarks: s.maxMarks || "\u2014",
      marks: s.status === "present" ? s.marks !== null ? s.marks : "\u2014" : s.status.toUpperCase(),
      grade: s.grade,
      remark: s.remark
    })
  );
  academic.push({
    name: "GRAND TOTAL",
    maxMarks: totals.totalMax || "\u2014",
    marks: totals.totalMarks,
    grade: totals.percentage !== null ? totals.overallGrade : "\u2014",
    remark: totalRemark(totals.percentage),
    isGrandTotal: true
  });
  const classSection = [student.class, student.section].filter((part) => part && String(part).trim()).join(" - ");
  const percentage = student.overall?.percentage !== void 0 && student.overall?.percentage !== null && String(student.overall.percentage).trim() !== "" ? student.overall.percentage : totals.percentage;
  const performancePct = typeof percentage === "number" ? percentage : Number(String(percentage ?? "").replace(/[^0-9.]/g, ""));
  return {
    header: {
      schoolName: school.schoolName,
      address: school.address,
      affiliationText: school.affiliationText || "",
      schoolCode: school.schoolCode || "",
      affiliationNo: school.affiliationNo || "",
      academicSession: school.academicSession,
      logoDataUrl: school.logoDataUrl,
      tagline: school.tagline || ""
    },
    infoLeft: [
      { label: "Student's Name", value: student.name },
      { label: "Father's Name", value: student.fatherName || "" },
      { label: "Mother's Name", value: student.motherName || "" },
      { label: "Class & Section", value: classSection },
      { label: "Roll No.", value: student.rollNo }
    ],
    infoRight: [
      { label: "Date of Birth", value: student.dob || "" },
      { label: "Admission No.", value: student.admissionNo || "" },
      { label: "Attendance", value: student.attendance || "" },
      { label: "Examination", value: school.examTerm || "" },
      { label: "Date of Issue", value: school.dateOfIssue || "" }
    ],
    academic,
    gradeScale: school.gradingScale || DEFAULT_GRADE_SCALE,
    coScholastic: coScholasticRows(student.gradeFields),
    personality: studentSkillsToStars(student.personalityDev, DEFAULT_PERSONALITY),
    learning: studentSkillsToStars(student.learningSkills, DEFAULT_LEARNING),
    attendance: {
      workingDays: student.workingDays || "",
      present: student.daysPresent || "",
      percentage: student.attendance || ""
    },
    overallPerformance: Number.isFinite(performancePct) ? overallPerformanceLabel(performancePct) : totals.overallGrade,
    teacherRemarks: student.teacherRemarks || DEFAULT_TEACHER_REMARKS,
    principalRemarks: student.principalRemarks || DEFAULT_PRINCIPAL_REMARKS,
    signatures: {
      teacherName: school.teacherName,
      checkedByName: school.checkedByName || "",
      principalName: school.principalName
    }
  };
}
function totalRemark(pct) {
  if (pct === null) return "\u2014";
  if (pct >= 91) return "Excellent";
  if (pct >= 81) return "Very Good";
  if (pct >= 71) return "Good";
  if (pct >= 61) return "Satisfactory";
  if (pct >= 51) return "Average";
  return "Needs Improvement";
}

// src/services/pdfGenerator.ts
var A4_W_MM = 210;
var A4_H_MM = 297;
var MARGIN_MM = 8;
var CONTENT_W = A4_W_MM - MARGIN_MM * 2;
var RIGHT_X = 134;
var RIGHT_W = A4_W_MM - MARGIN_MM - RIGHT_X;
var LEFT_W = RIGHT_X - MARGIN_MM - 4;
var NAVY = [30, 58, 138];
var INK = [15, 23, 42];
var MUTED = [71, 85, 105];
var LINE = [148, 163, 184];
function drawTemplate(doc, opts) {
  const { student, school } = opts;
  const model = buildReportCardModel(student, school);
  const { header } = model;
  const headerTop = MARGIN_MM;
  const logoSize = 20;
  if (header.logoDataUrl) {
    try {
      doc.addImage(header.logoDataUrl, "PNG", MARGIN_MM, headerTop, logoSize, logoSize, void 0, "FAST");
    } catch {
      drawBox(doc, MARGIN_MM, headerTop, logoSize, logoSize, "Logo");
    }
  } else {
    drawBox(doc, MARGIN_MM, headerTop, logoSize, logoSize, "Logo");
  }
  if (header.tagline) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...MUTED);
    const tag = doc.splitTextToSize(header.tagline.toUpperCase(), logoSize + 6);
    doc.text(tag, MARGIN_MM + (logoSize + 6) / 2, headerTop + logoSize + 3, { align: "center" });
  }
  const sessionW = 34;
  const sessionX = A4_W_MM - MARGIN_MM - sessionW;
  const textCenterX = MARGIN_MM + logoSize + 3 + (sessionX - MARGIN_MM - logoSize - 3) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...NAVY);
  const nameLines = doc.splitTextToSize(header.schoolName || "School Name", sessionX - (MARGIN_MM + logoSize + 6) - 2);
  doc.text(nameLines, textCenterX, headerTop + 6, { align: "center" });
  let headerY = headerTop + 6 + (nameLines.length - 1) * 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  if (header.address) {
    const addrLines = doc.splitTextToSize(header.address, sessionX - MARGIN_MM - logoSize - 6);
    doc.text(addrLines, textCenterX, headerY + 5, { align: "center" });
    headerY += (addrLines.length - 1) * 4;
  }
  const affiliation = [
    header.affiliationText,
    header.schoolCode ? `SCHOOL CODE: ${header.schoolCode}` : "",
    header.affiliationNo ? `AFFILIATION NO.: ${header.affiliationNo}` : ""
  ].filter(Boolean).join(" | ");
  if (affiliation) {
    doc.setFontSize(7.5);
    const affLines = doc.splitTextToSize(affiliation, sessionX - MARGIN_MM - logoSize - 6);
    doc.text(affLines, textCenterX, headerY + 9, { align: "center" });
    headerY += (affLines.length - 1) * 4;
  }
  doc.setFillColor(...NAVY);
  doc.rect(sessionX, headerTop, sessionW, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("ACADEMIC SESSION", sessionX + sessionW / 2, headerTop + 4, { align: "center" });
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(sessionX, headerTop + 6, sessionW, 9, "S");
  doc.setTextColor(...INK);
  doc.setFontSize(11);
  doc.text(header.academicSession || "\u2014", sessionX + sessionW / 2, headerTop + 12.5, { align: "center" });
  let y = Math.max(headerTop + logoSize + 4, headerY + 13) + 2;
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN_MM, y, CONTENT_W, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("HOLISTIC PROGRESS REPORT CARD", A4_W_MM / 2, y + 4.8, { align: "center" });
  y += 9;
  const infoTop = y;
  const infoH = 30;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_MM, infoTop, CONTENT_W, infoH, "S");
  drawInfoColumn(doc, model.infoLeft, MARGIN_MM + 2, infoTop + 5);
  drawInfoColumn(doc, model.infoRight, RIGHT_X - 60, infoTop + 5);
  y = infoTop + infoH + 3;
  const bodyTop = y;
  const footerReserve = 6;
  const sigReserve = 24;
  const remarksH = 22;
  const bodyBottomLimit = A4_H_MM - MARGIN_MM - footerReserve - sigReserve - 10 - remarksH - 4;
  const avail = Math.max(60, bodyBottomLimit - bodyTop);
  const academicRows = Math.max(model.academic.length, 1);
  const skillsRows = Math.max(model.personality.length, model.learning.length, 1);
  const coRows = Math.max(model.coScholastic.length, 1);
  const leftFixed = 7 + 7 + 5 + 6.5 + 2;
  const rightFixed = 7 + 6.5 + 3 * 5 + 2 + 19.5;
  const leftRowH = (avail - leftFixed) / (academicRows + skillsRows);
  const rightRowH = (avail - rightFixed) / coRows;
  const rowH = Math.max(4, Math.min(6.8, leftRowH, rightRowH));
  const academicBottom = drawAcademicTable(doc, model.academic, MARGIN_MM, bodyTop, LEFT_W, rowH);
  const coBottom = drawCoScholastic(doc, model.coScholastic, RIGHT_X, bodyTop, RIGHT_W, rowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...INK);
  doc.text("GRADING SCALE:", MARGIN_MM, academicBottom + 3.5);
  doc.setFont("helvetica", "normal");
  doc.text(model.gradeScale, MARGIN_MM + 24, academicBottom + 3.5);
  let leftY = academicBottom + 7;
  let rightY = coBottom + 3;
  const skillW = (LEFT_W - 3) / 2;
  const personalityBottom = drawSkillBox(
    doc,
    "PERSONALITY DEVELOPMENT",
    model.personality,
    MARGIN_MM,
    leftY,
    skillW,
    [254, 243, 199],
    rowH
  );
  drawSkillBox(doc, "LEARNING SKILLS", model.learning, MARGIN_MM + skillW + 3, leftY, skillW, [254, 226, 226], rowH);
  leftY = personalityBottom;
  rightY = drawAttendance(doc, model.attendance, RIGHT_X, rightY, RIGHT_W);
  const overallBottom = drawOverall(doc, model.overallPerformance, RIGHT_X, rightY + 2, RIGHT_W);
  y = Math.max(leftY, overallBottom) + 3;
  const remarksTop = Math.min(y, bodyBottomLimit);
  doc.setDrawColor(...LINE);
  doc.rect(MARGIN_MM, remarksTop, CONTENT_W, remarksH, "S");
  doc.setDrawColor(...LINE);
  doc.line(A4_W_MM / 2, remarksTop, A4_W_MM / 2, remarksTop + remarksH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text("TEACHER'S REMARKS", MARGIN_MM + 2, remarksTop + 4);
  doc.text("PRINCIPAL'S REMARKS", A4_W_MM / 2 + 2, remarksTop + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const tLines = doc.splitTextToSize(model.teacherRemarks, CONTENT_W / 2 - 6);
  doc.text(tLines.slice(0, 4), MARGIN_MM + 2, remarksTop + 8.5);
  const pLines = doc.splitTextToSize(model.principalRemarks, CONTENT_W / 2 - 6);
  doc.text(pLines.slice(0, 4), A4_W_MM / 2 + 2, remarksTop + 8.5);
  y = remarksTop + remarksH + 8;
  const sigY = Math.min(y, A4_H_MM - MARGIN_MM - 30);
  const third = CONTENT_W / 3;
  drawSignBlock(doc, school.teacherSignDataUrl, "CLASS TEACHER", model.signatures.teacherName, MARGIN_MM, sigY, third - 2);
  drawSignBlock(
    doc,
    school.checkedBySignDataUrl,
    "CHECKED BY (VICE PRINCIPAL)",
    model.signatures.checkedByName,
    MARGIN_MM + third,
    sigY,
    third - 2
  );
  drawSignBlock(
    doc,
    school.principalSignDataUrl,
    "PRINCIPAL",
    model.signatures.principalName,
    MARGIN_MM + third * 2,
    sigY,
    third - 2,
    school.stampDataUrl
  );
  const footerY = A4_H_MM - MARGIN_MM - 6;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN_MM, footerY, CONTENT_W, 6, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(
    "This Report Card reflects the holistic development of the child and is a shared responsibility of the school and parents.",
    A4_W_MM / 2,
    footerY + 3.8,
    { align: "center" }
  );
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.rect(MARGIN_MM - 2, MARGIN_MM - 2, CONTENT_W + 4, A4_H_MM - (MARGIN_MM - 2) * 2, "S");
  doc.setLineWidth(0.2);
}
function drawInfoColumn(doc, items, x, top) {
  let ry = top;
  for (const item of items) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(`${item.label}`, x, ry);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(":", x + 34, ry);
    const value = item.value || "\u2014";
    const lines = doc.splitTextToSize(value, 62);
    doc.text(lines[0], x + 36, ry);
    ry += 5.4;
  }
}
function drawAcademicTable(doc, rows, x, top, w, rowH) {
  const cols = [w * 0.34, w * 0.14, w * 0.17, w * 0.11, w * 0.24];
  let y = top;
  doc.setFillColor(219, 234, 254);
  doc.rect(x, y, w, 7, "F");
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, 7, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text("ACADEMIC PERFORMANCE", x + w / 2, y + 4.8, { align: "center" });
  y += 7;
  const headers = ["Subject", "Max. Marks", "Marks Obt.", "Grade", "Remarks"];
  doc.setFontSize(7.5);
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, w, 7, "F");
  let cx = x;
  headers.forEach((h, i) => {
    doc.rect(cx, y, cols[i], 7, "S");
    doc.text(h, i === 0 || i === 4 ? cx + 1.5 : cx + cols[i] / 2, y + 4.6, {
      align: i === 0 || i === 4 ? "left" : "center"
    });
    cx += cols[i];
  });
  y += 7;
  doc.setFont("helvetica", "normal");
  for (const row of rows) {
    const h = rowH;
    if (row.isGrandTotal) {
      doc.setFillColor(254, 249, 195);
      doc.rect(x, y, w, h, "F");
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.setTextColor(...INK);
    let ccx = x;
    const cells = [
      String(row.name),
      String(row.maxMarks),
      String(row.marks),
      String(row.grade),
      String(row.remark)
    ];
    cells.forEach((cell, i) => {
      doc.rect(ccx, y, cols[i], h, "S");
      const text = doc.splitTextToSize(cell, cols[i] - 3)[0];
      doc.text(text, i === 0 || i === 4 ? ccx + 1.5 : ccx + cols[i] / 2, y + h / 2 + 1.4, {
        align: i === 0 || i === 4 ? "left" : "center"
      });
      ccx += cols[i];
    });
    y += h;
  }
  return y;
}
function drawCoScholastic(doc, rows, x, top, w, rowH) {
  let y = top;
  doc.setFillColor(243, 232, 255);
  doc.rect(x, y, w, 7, "F");
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, 7, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text("CO-SCHOLASTIC AREAS (GRADES)", x + w / 2, y + 4.8, { align: "center" });
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  rows.forEach((row) => {
    const h = rowH;
    doc.rect(x, y, w, h, "S");
    doc.line(x + w - 12, y, x + w - 12, y + h);
    const name = doc.splitTextToSize(String(row.name).toUpperCase(), w - 15)[0];
    doc.setTextColor(...INK);
    doc.text(name, x + 1.5, y + h / 2 + 1.3);
    doc.setFont("helvetica", "bold");
    doc.text(String(row.value || "\u2014"), x + w - 6, y + h / 2 + 1.3, { align: "center" });
    doc.setFont("helvetica", "normal");
    y += h;
  });
  return y;
}
function drawSkillBox(doc, title, rows, x, top, w, headerFill, rowH) {
  let y = top;
  doc.setFillColor(...headerFill);
  doc.rect(x, y, w, 6.5, "F");
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, 6.5, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...INK);
  doc.text(title, x + w / 2, y + 4.4, { align: "center" });
  y += 6.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  rows.forEach((row) => {
    const h = rowH;
    doc.rect(x, y, w, h, "S");
    const name = doc.splitTextToSize(String(row.name).toUpperCase(), w - 24)[0];
    doc.setTextColor(...INK);
    doc.text(name, x + 1.5, y + h / 2 + 1.2);
    drawStars(doc, x + w - 19, y + h / 2, row.stars ?? 0);
    y += h;
  });
  return y;
}
function drawStars(doc, x, cy, filled) {
  const r = 1.3;
  for (let i = 0; i < 5; i++) {
    const cx = x + i * 3.4;
    drawStar(doc, cx, cy, r, i < filled);
  }
}
function drawStar(doc, cx, cy, r, filled) {
  const inner = r * 0.42;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const rad = i % 2 === 0 ? r : inner;
    pts.push([cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad]);
  }
  const deltas = [];
  for (let i = 1; i < pts.length; i++) {
    deltas.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  }
  deltas.push([pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]]);
  doc.setLineWidth(0.15);
  if (filled) {
    doc.setFillColor(245, 158, 11);
    doc.setDrawColor(245, 158, 11);
    doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], "F", false);
  } else {
    doc.setDrawColor(203, 213, 225);
    doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], "S", false);
  }
}
function drawAttendance(doc, attendance, x, top, w) {
  let y = top;
  doc.setFillColor(219, 234, 254);
  doc.rect(x, y, w, 6.5, "F");
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, 6.5, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text("ATTENDANCE", x + w / 2, y + 4.4, { align: "center" });
  y += 6.5;
  const rows = [
    ["Total Working Days", attendance.workingDays],
    ["Days Present", attendance.present],
    ["Attendance Percentage", attendance.percentage]
  ];
  doc.setFontSize(7.5);
  rows.forEach(([label, value]) => {
    const h = 6;
    doc.rect(x, y, w, h, "S");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(label, x + 1.5, y + 4.1);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(String(value || "\u2014"), x + w - 2, y + 4.1, { align: "right" });
    y += h;
  });
  return y;
}
function drawOverall(doc, label, x, top, w) {
  doc.setFillColor(4, 120, 87);
  doc.rect(x, top, w, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("OVERALL PERFORMANCE", x + w / 2, top + 4.4, { align: "center" });
  doc.setFillColor(236, 253, 245);
  doc.rect(x, top + 6.5, w, 13, "F");
  doc.setDrawColor(4, 120, 87);
  doc.rect(x, top, w, 19.5, "S");
  doc.setTextColor(6, 95, 70);
  doc.setFontSize(13);
  doc.text(label, x + w / 2, top + 15, { align: "center" });
  return top + 19.5;
}
function drawSignBlock(doc, image, role, name, x, y, w, stamp) {
  const lineY = y + 14;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(x, lineY, x + w, lineY);
  if (image) {
    try {
      doc.addImage(image, "PNG", x + w / 2 - 14, lineY - 13, 28, 12, void 0, "FAST");
    } catch {
    }
  }
  if (stamp) {
    try {
      doc.addImage(stamp, "PNG", x + w - 20, lineY - 24, 20, 20, void 0, "FAST");
    } catch {
    }
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  const nameText = name || "";
  if (nameText) {
    const nw = doc.getTextWidth(nameText);
    doc.text(nameText, x + w / 2 - nw / 2, lineY + 4.5);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  const roleLines = doc.splitTextToSize(role, w);
  doc.text(roleLines[0], x + w / 2, lineY + 8.5, { align: "center" });
}
function drawBox(doc, x, y, w, h, label) {
  doc.setDrawColor(...LINE);
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, w, h, "DF");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(label, x + w / 2, y + h / 2 + 1, { align: "center" });
  doc.setTextColor(0, 0, 0);
}
function generateStudentPdfBlob(opts) {
  return new Promise((resolve2, reject) => {
    try {
      const doc = new jspdf_shim_default({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });
      drawTemplate(doc, opts);
      const blob = doc.output("blob");
      resolve2(blob);
    } catch (e) {
      reject(e);
    }
  });
}

// scripts/pipeline-test.ts
globalThis.FileReader = class FileReader2 {
  result;
  error;
  onload;
  onerror;
  readAsArrayBuffer(file) {
    Promise.resolve(file.arrayBuffer()).then((ab) => {
      this.result = ab;
      if (this.onload) this.onload({ target: this });
    }).catch((e) => {
      this.error = e;
      if (this.onerror) this.onerror(e);
    });
  }
};
function fileFromPath(p) {
  const buf = readFileSync(p);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return {
    name: basename(p),
    arrayBuffer: () => Promise.resolve(ab)
  };
}
async function run(file) {
  console.log("\n########## " + file + " ##########");
  const f = fileFromPath(resolve(process.cwd(), file));
  const wbData = await parseWorkbookFromFile(f);
  console.log("headers:", JSON.stringify(wbData.headers));
  console.log("rows:", wbData.rows.length);
  const detected = await parseDynamicStructure(f);
  console.log(
    "detected:",
    JSON.stringify(
      {
        headerRows: detected.headerRows,
        dataStartRow: detected.dataStartRow,
        confidence: detected.confidence,
        studentFields: detected.studentFields,
        subjectGroups: detected.subjectGroups,
        gradeFields: detected.gradeFields,
        overallFields: detected.overallFields
      },
      null,
      1
    )
  );
  const hasName = detected.studentFields.some((x) => x.fieldType === "name");
  const hasSubjects = detected.subjectGroups.length > 0;
  const effectiveDefaults = {
    defaultClass: "",
    defaultSection: "",
    inferredClass: detected.inferredClass,
    inferredSection: detected.inferredSection
  };
  console.log("inferred:", JSON.stringify({
    inferredClass: detected.inferredClass,
    inferredSection: detected.inferredSection,
    schoolName: detected.schoolName,
    titleRows: detected.titleRows
  }));
  let students;
  if (!hasName || !hasSubjects) {
    console.log("!! fallback path used (autoMapColumns)");
    const mapping = autoMapColumns(wbData.headers);
    students = buildStudentsFromRows(wbData.rows, mapping, effectiveDefaults);
  } else {
    const mappings = convertDetectedStructureToColumnMapping(detected, wbData.headers);
    const structureMapping = createStructureMappingFromDetected(detected);
    students = buildStudentsFromDynamicStructure(
      wbData.rows,
      structureMapping.detected,
      structureMapping,
      effectiveDefaults,
      wbData.headers,
      mappings
    );
  }
  console.log("students built:", students.length);
  const first = students[0];
  console.log(
    "first student:",
    JSON.stringify(
      {
        name: first?.name,
        rollNo: first?.rollNo,
        class: first?.class,
        section: first?.section,
        subjects: first?.subjects?.map((s) => ({ name: s.name, marks: s.marks, max: s.maxMarks })),
        gradeFields: first?.gradeFields,
        overall: first?.overall
      },
      null,
      1
    )
  );
  const v = validateStudents(students);
  console.log("validation: valid=" + v.isValid + " errors=" + v.errorCount + " warnings=" + v.warningCount);
  console.log("issue samples:", JSON.stringify(v.issues.slice(0, 12), null, 1));
  const missing = students.filter((s) => s.subjects.every((sub) => sub.marks === null)).length;
  console.log("students with ALL subject marks missing: " + missing + "/" + students.length);
  if (process.env.PDF_SMOKE === "1" && students[0]) {
    const blob = await generateStudentPdfBlob({
      student: students[0],
      school: {
        schoolName: detected.schoolName || "Test Public School",
        address: "Village Test, City (State)",
        affiliationText: "AFFILIATED TO C.B.S.E., NEW DELHI",
        schoolCode: "41627",
        affiliationNo: "531651",
        principalName: "Principal Name",
        teacherName: "Class Teacher",
        checkedByName: "Vice Principal",
        academicSession: "2025-26",
        examTerm: "Periodic Test - I",
        dateOfIssue: "14-08-2026"
      }
    });
    const bytes = Buffer.from(await blob.arrayBuffer());
    const text = bytes.toString("latin1");
    const countMatch = text.match(/\/Count\s+(\d+)/);
    console.log(
      "pdf smoke bytes=" + blob.size + " pages=" + (countMatch ? countMatch[1] : "?")
    );
    const { inflateSync } = await import("node:zlib");
    let content = "";
    const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m;
    while (m = re.exec(text)) {
      try {
        content += inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
      } catch {
      }
    }
    const drawn = Array.from(content.matchAll(/\(([^()]*)\)\s*Tj/g)).map((x) => x[1]);
    const joined = drawn.join("\n");
    const lines = drawn.length;
    console.log("pdf text runs=" + lines);
    const missing2 = [students[0].name, ...students[0].subjects.map((s) => s.name)].filter(
      (needle) => needle && !joined.includes(String(needle))
    );
    console.log("pdf missing expected strings:", JSON.stringify(missing2));
    const opCounts = /* @__PURE__ */ new Map();
    for (const op of content.matchAll(/\b(Tm|Td|TD|cm)\b/g)) {
      opCounts.set(op[1], (opCounts.get(op[1]) ?? 0) + 1);
    }
    console.log("pdf position ops:", JSON.stringify(Array.from(opCounts.entries())));
    const toMmFromTop = (pt) => (841.89 - pt) / 72 * 25.4;
    const drew = Array.from(content.matchAll(/([\d.-]+) ([\d.-]+) (Tm|Td|TD)/g)).map((x) => toMmFromTop(Number(x[2]))).filter((n) => Number.isFinite(n));
    if (drew.length) {
      const top = Math.min(...drew);
      const bottom = Math.max(...drew);
      console.log(
        "pdf drawn area = " + top.toFixed(1) + "mm .. " + bottom.toFixed(1) + "mm from top (sheet 297mm)"
      );
      console.log(
        "pdf content stays on page:",
        top >= 0 && bottom <= 297 ? "YES" : "NO (outside 0..297mm)"
      );
    }
  }
}
(async () => {
  const files = process.argv.slice(2);
  const targets = files.length ? files : ["testdata_10_students.xlsx", "testdata_alt_subjects.xlsx", "testdata_complex_structure.xlsx"];
  for (const file of targets) {
    await run(file);
  }
})().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exit(1);
});
