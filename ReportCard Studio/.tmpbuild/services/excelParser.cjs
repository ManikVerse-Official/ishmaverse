"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWorkbookFromFile = parseWorkbookFromFile;
exports.parseSheetFromWorkbook = parseSheetFromWorkbook;
exports.parseSheetFromFileByName = parseSheetFromFileByName;
const XLSX = __importStar(require("xlsx"));
const normalization_1 = require("../utils/normalization");
const COMMON_HEADER_TERMS = [
    'name', 'roll', 'serial', 'admission', 'father', 'mother', 'dob', 'class', 'section',
    'english', 'hindi', 'math', 'science', 'social', 'sst', 'computer', 'pt', 'nb', 'se', 'sa2',
    'total', 'percentage', 'attendance', 'position', 'marks', 'grade', 'rank',
];
function parseWorkbookFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result);
                const wb = XLSX.read(data, { type: 'array', cellDates: true, raw: true });
                const sheetNames = wb.SheetNames;
                const activeSheet = sheetNames[0] ?? '';
                const parsed = activeSheet
                    ? parseSheetFromWorkbook(wb, activeSheet)
                    : { headers: [], rows: [], headerRows: 1, dataStartRow: 1 };
                resolve({
                    fileName: file.name,
                    sheetNames,
                    activeSheet,
                    headers: parsed.headers,
                    rows: parsed.rows,
                });
            }
            catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}
function parseSheetFromWorkbook(wb, sheetName) {
    const ws = wb.Sheets[sheetName];
    if (!ws)
        return { headers: [], rows: [], headerRows: 1, dataStartRow: 1 };
    const json = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        blankrows: false,
        defval: '',
        raw: true,
        dateNF: 'yyyy-mm-dd',
    });
    if (!json.length)
        return { headers: [], rows: [], headerRows: 1, dataStartRow: 1 };
    const merges = ws['!merges'] || [];
    const { headerRows, dataStartRow } = detectHeaderRows(json, merges);
    const headers = buildFlattenedHeaders(json, headerRows, merges);
    const rows = [];
    for (let r = dataStartRow; r < json.length; r++) {
        const rawRow = (json[r] ?? []);
        const isEmpty = rawRow.every((c) => String(c ?? '').trim() === '');
        if (isEmpty)
            continue;
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = rawRow[i] ?? '';
        });
        Object.defineProperty(obj, '__rowNumber', {
            value: r + 1,
            enumerable: false,
        });
        Object.defineProperty(obj, '__cells', {
            value: rawRow,
            enumerable: false,
        });
        rows.push(obj);
    }
    return { headers, rows, headerRows, dataStartRow };
}
function detectHeaderRows(json, merges) {
    if (!json.length)
        return { headerRows: 1, dataStartRow: 1 };
    let headerRows = 1;
    const hasMultiRowMerges = merges.some(m => m.e.r > m.s.r && m.e.r - m.s.r <= 3);
    if (hasMultiRowMerges) {
        const maxRowSpan = Math.max(...merges.map(m => m.e.r - m.s.r + 1));
        headerRows = Math.min(maxRowSpan, 4);
        if (headerRows < json.length && checkNextRowsForData(json, headerRows)) {
            return { headerRows, dataStartRow: headerRows };
        }
    }
    for (let row = 0; row < Math.min(json.length, 8); row++) {
        const rowData = json[row];
        if (isEmptyRow(rowData))
            continue;
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
        if (isEmptyRow(rowData))
            continue;
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
    if (!row || row.length === 0)
        return true;
    return row.every(cell => String(cell ?? '').trim() === '');
}
function isLikelyHeaderRow(row) {
    if (!row || row.length === 0)
        return false;
    const textCount = row.filter(cell => {
        const val = String(cell ?? '').trim();
        return val !== '' && isNaN(Number(val));
    }).length;
    const numericCount = row.filter(cell => {
        const val = String(cell ?? '').trim();
        return val !== '' && !isNaN(Number(val));
    }).length;
    const total = textCount + numericCount;
    if (total === 0)
        return false;
    const textRatio = textCount / total;
    const hasCommonHeaderTerms = row.some(cell => {
        const val = (0, normalization_1.normalizeHeader)(String(cell ?? ''));
        return COMMON_HEADER_TERMS.some(term => val.includes(term));
    });
    if (hasCommonHeaderTerms && textRatio > 0.5)
        return true;
    return textRatio > 0.7;
}
function checkNextRowsForData(json, startRow) {
    const rowsToCheck = Math.min(3, json.length - startRow);
    if (rowsToCheck < 1)
        return false;
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
    if (!row || row.length === 0)
        return false;
    const textCount = row.filter(cell => {
        const val = String(cell ?? '').trim();
        return val !== '' && isNaN(Number(val));
    }).length;
    const numericCount = row.filter(cell => {
        const val = String(cell ?? '').trim();
        return val !== '' && !isNaN(Number(val));
    }).length;
    const total = textCount + numericCount;
    if (total === 0)
        return false;
    const numericRatio = numericCount / total;
    const hasMix = textCount > 0 && numericCount > 0;
    const mostlyNumeric = numericRatio >= 0.4;
    const hasHeaderTerms = row.some(cell => {
        const val = (0, normalization_1.normalizeHeader)(String(cell ?? ''));
        return COMMON_HEADER_TERMS.some(term => val === term || val.startsWith(term + ' '));
    });
    if (hasHeaderTerms && numericRatio < 0.3)
        return false;
    return hasMix || mostlyNumeric;
}
function buildFlattenedHeaders(json, headerRows, merges) {
    if (headerRows <= 0 || !json.length)
        return [];
    const headerStructure = [];
    for (let row = 0; row < headerRows; row++) {
        if (row < json.length) {
            const rowData = json[row];
            headerStructure.push(rowData.map(cell => String(cell ?? '').trim()));
        }
        else {
            headerStructure.push([]);
        }
    }
    const lastHeaderRow = headerStructure[headerRows - 1];
    const maxCols = lastHeaderRow.length;
    const headers = [];
    for (let col = 0; col < maxCols; col++) {
        const headerParts = [];
        for (let row = 0; row < headerRows; row++) {
            let cellValue = headerStructure[row][col] || '';
            const merge = merges.find(m => col >= m.s.c && col <= m.e.c &&
                row >= m.s.r && row <= m.e.r);
            if (merge && (row !== merge.s.r || col !== merge.s.c)) {
                if (!cellValue && merge.s.r < headerStructure.length && merge.s.c < (headerStructure[merge.s.r]?.length || 0)) {
                    cellValue = headerStructure[merge.s.r][merge.s.c] || '';
                }
            }
            if (!merge || (row === merge.s.r && col === merge.s.c) || (merge && !headerParts.includes(cellValue) && cellValue)) {
                if (cellValue && !headerParts.includes(cellValue)) {
                    headerParts.push(cellValue);
                }
            }
        }
        if (headerParts.length > 0) {
            const uniqueParts = headerParts.filter((v, i, a) => a.indexOf(v) === i);
            if (uniqueParts.length > 1) {
                headers.push(uniqueParts.join(' | '));
            }
            else {
                headers.push(uniqueParts[0]);
            }
        }
        else {
            headers.push(`Column_${col + 1}`);
        }
    }
    return headers;
}
function parseSheetFromFileByName(file, sheetName) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result);
                const wb = XLSX.read(data, { type: 'array', cellDates: true, raw: true });
                resolve(parseSheetFromWorkbook(wb, sheetName));
            }
            catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}
