"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARGIN_MM = exports.A4_H_MM = exports.A4_W_MM = void 0;
exports.generateStudentPdfBlob = generateStudentPdfBlob;
exports.sanitizeFilename = sanitizeFilename;
exports.buildPdfFilename = buildPdfFilename;
exports.buildZipFilename = buildZipFilename;
const jspdf_1 = __importDefault(require("jspdf"));
const calculationEngine_1 = require("./calculationEngine");
const A4_W_MM = 210;
exports.A4_W_MM = A4_W_MM;
const A4_H_MM = 297;
exports.A4_H_MM = A4_H_MM;
const MARGIN_MM = 12;
exports.MARGIN_MM = MARGIN_MM;
function mm(mm) {
    return mm;
}
function drawTemplate(doc, opts) {
    const { student, school, photoDataUrl } = opts;
    const totals = (0, calculationEngine_1.computeTotals)(student);
    const contentW = A4_W_MM - MARGIN_MM * 2;
    let y = MARGIN_MM;
    doc.setFillColor(8, 108, 179);
    doc.rect(0, 0, A4_W_MM, 12, 'F');
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 12, A4_W_MM, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(8, 108, 179);
    const schoolName = school.schoolName || 'School Name';
    const schoolNameLines = doc.splitTextToSize(schoolName, contentW - 38);
    doc.text(schoolNameLines, MARGIN_MM + 32, y + 10, {});
    if (school.logoDataUrl) {
        try {
            doc.addImage(school.logoDataUrl, 'PNG', MARGIN_MM, y, 26, 26, undefined, 'FAST');
        }
        catch {
            drawPlaceholderBox(doc, MARGIN_MM, y, 26, 26, 'Logo');
        }
    }
    else {
        drawPlaceholderBox(doc, MARGIN_MM, y, 26, 26, 'Logo');
    }
    y += 30;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const addr = school.address || '';
    if (addr) {
        const lines = doc.splitTextToSize(addr, contentW);
        doc.text(lines, MARGIN_MM, y);
        y += (lines.length || 1) * 4.5 + 2;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    const title = 'PROGRESS REPORT CARD';
    doc.text(title, A4_W_MM / 2 - doc.getTextWidth(title) / 2, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const sessionTerm = `${school.academicSession ? 'Academic Session: ' + school.academicSession : ''}${school.examTerm ? '   |   Examination: ' + school.examTerm : ''}`;
    if (sessionTerm.trim()) {
        const sw = doc.getTextWidth(sessionTerm);
        doc.setTextColor(71, 85, 105);
        doc.text(sessionTerm, A4_W_MM / 2 - sw / 2, y);
    }
    y += 7;
    drawHr(doc, y);
    y += 5;
    const photoBoxX = A4_W_MM - MARGIN_MM - 30;
    const photoBoxY = y;
    if (photoDataUrl) {
        try {
            doc.addImage(photoDataUrl, 'PNG', photoBoxX, photoBoxY, 30, 36, undefined, 'FAST');
        }
        catch {
            drawPlaceholderBox(doc, photoBoxX, photoBoxY, 30, 36, 'Photo');
        }
    }
    else {
        drawPlaceholderBox(doc, photoBoxX, photoBoxY, 30, 36, 'Photo');
    }
    doc.setDrawColor(100, 116, 139);
    doc.rect(photoBoxX, photoBoxY, 30, 36, 'S');
    const infoBoxW = contentW - 34;
    drawInfoRow(doc, 'Student Name:', student.name || '—', MARGIN_MM, y, infoBoxW);
    y += 6;
    drawInfoRow(doc, 'Roll No.:', student.rollNo || '—', MARGIN_MM, y, infoBoxW);
    y += 6;
    drawInfoRow(doc, 'Class / Section:', `${student.class ?? '—'}${student.section ? '  —  ' + student.section : ''}`, MARGIN_MM, y, infoBoxW);
    y += 6;
    drawInfoRow(doc, "Father's Name:", student.fatherName || '—', MARGIN_MM, y, infoBoxW);
    y += 6;
    drawInfoRow(doc, "Mother's Name:", student.motherName || '—', MARGIN_MM, y, infoBoxW);
    y += 6;
    drawInfoRow(doc, 'Date of Birth:', student.dob || '—', MARGIN_MM, y, infoBoxW);
    y += 6;
    drawInfoRow(doc, 'Attendance:', student.attendance || '—', MARGIN_MM, y, infoBoxW);
    y += 6;
    y = Math.max(y, photoBoxY + 36) + 6;
    drawHr(doc, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('SCHOLASTIC AREAS', MARGIN_MM, y);
    y += 5;
    const tableStartY = y;
    drawScholasticTable(doc, totals.gradedSubjects, MARGIN_MM, y, contentW);
    const tableEndY = y + (totals.gradedSubjects.length + 2) * 8;
    y = tableEndY + 2;
    // Draw grade fields if present
    if (student.gradeFields && student.gradeFields.length > 0) {
        drawGradeFields(doc, student.gradeFields, MARGIN_MM, y, contentW);
        y += 12;
    }
    const summaryW = contentW;
    drawSummary(doc, totals, MARGIN_MM, y, summaryW);
    y += 16;
    drawHr(doc, y);
    y += 5;
    drawSection(doc, 'LEARNING SKILLS', buildDefaultLearning(student.learningSkills), MARGIN_MM, y, contentW);
    y += 33;
    drawSection(doc, 'PERSONALITY DEVELOPMENT', buildDefaultPersonality(student.personalityDev), MARGIN_MM, y, contentW);
    y += 33;
    drawSection(doc, 'CO-SCHOLASTIC AREAS', buildDefaultCoScholastic(student.coScholastic), MARGIN_MM, y, contentW);
    y += 33;
    drawHr(doc, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("Class Teacher's Remarks:", MARGIN_MM, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const remarks = student.teacherRemarks ||
        school.teacherName
        ? ''
        : 'Keep up the good work and continue to participate actively.';
    const remLines = doc.splitTextToSize(remarks || '..................................................................................................................................', contentW);
    doc.text(remLines, MARGIN_MM, y);
    y += (remLines.length || 1) * 4.5 + 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("Principal's Remarks:", MARGIN_MM, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const prem = student.principalRemarks ||
        school.principalName
        ? ''
        : 'Wishing the student all the best for the future endeavours.';
    const premLines = doc.splitTextToSize(prem || '..................................................................................................................................', contentW);
    doc.text(premLines, MARGIN_MM, y);
    y += (premLines.length || 1) * 4.5 + 6;
    const sigY = A4_H_MM - MARGIN_MM - 24;
    drawSignBlock(doc, school.teacherSignDataUrl, 'Class Teacher', school.teacherName, MARGIN_MM, sigY, 55);
    drawSignBlock(doc, school.stampDataUrl, undefined, undefined, A4_W_MM / 2 - 27.5, sigY, 55, true);
    drawSignBlock(doc, school.principalSignDataUrl, 'Principal', school.principalName, A4_W_MM - MARGIN_MM - 55, sigY, 55);
    doc.setDrawColor(8, 108, 179);
    doc.setLineWidth(0.5);
    doc.rect(MARGIN_MM - 3, MARGIN_MM - 3, contentW + 6, A4_H_MM - (MARGIN_MM - 3) * 2, 'S');
    doc.setLineWidth(0.2);
}
function drawPlaceholderBox(doc, x, y, w, h, label) {
    doc.setDrawColor(148, 163, 184);
    doc.setFillColor(248, 250, 252);
    doc.rect(x, y, w, h, 'DF');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const tw = doc.getTextWidth(label);
    doc.text(label, x + w / 2 - tw / 2, y + h / 2 + 1.2);
    doc.setTextColor(0);
}
function drawHr(doc, y) {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_MM, y, A4_W_MM - MARGIN_MM, y);
    doc.setLineWidth(0.2);
}
function drawInfoRow(doc, label, value, x, y, w) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(label, x, y);
    const labelW = doc.getTextWidth(label) + 2;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const available = w - labelW;
    const safeValue = String(value || '—');
    const lines = doc.splitTextToSize(safeValue, available);
    doc.text(lines, x + labelW, y);
}
function drawScholasticTable(doc, subjects, x, y, w) {
    const hasComponents = subjects.some(s => s.components && s.components.length > 0);
    const colW = hasComponents
        ? [w * 0.35, w * 0.14, w * 0.14, w * 0.12, w * 0.12, w * 0.13]
        : [w * 0.4, w * 0.16, w * 0.16, w * 0.14, w * 0.14];
    const headerY = y;
    doc.setFillColor(238, 246, 255);
    doc.rect(x, headerY, w, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const headers = hasComponents
        ? ['Subject', 'Marks', 'Max', 'Grade', 'Status', 'Components']
        : ['Subject', 'Marks', 'Max', 'Grade', 'Status'];
    let cx = x + 2;
    headers.forEach((h, i) => {
        doc.text(h, cx, headerY + 4.8);
        cx += colW[i];
    });
    let ry = headerY + 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    for (const s of subjects) {
        doc.setDrawColor(226, 232, 240);
        doc.line(x, ry, x + w, ry);
        let cx2 = x + 2;
        const lines = doc.splitTextToSize(s.name, colW[0] - 3);
        doc.text(lines, cx2, ry + 4.3);
        cx2 += colW[0];
        const marksStr = s.status === 'present' ? (s.marks !== null ? String(s.marks) : '—') : '—';
        doc.text(marksStr, cx2, ry + 4.3);
        cx2 += colW[1];
        doc.text(String(s.maxMarks), cx2, ry + 4.3);
        cx2 += colW[2];
        doc.text(s.grade, cx2, ry + 4.3);
        cx2 += colW[3];
        const st = s.status === 'absent'
            ? 'AB'
            : s.status === 'exempt'
                ? 'EX'
                : s.status === 'medical'
                    ? 'Med'
                    : 'Present';
        doc.text(st, cx2, ry + 4.3);
        cx2 += colW[4];
        if (hasComponents) {
            if (s.components && s.components.length > 0) {
                const compText = s.components
                    .filter(c => !c.isTotal)
                    .map(c => `${c.name}:${c.marks ?? '—'}`)
                    .join(', ')
                    .substring(0, 25);
                doc.text(compText || '—', cx2, ry + 4.3);
            }
            else {
                doc.text('—', cx2, ry + 4.3);
            }
        }
        ry += 8;
    }
    doc.setDrawColor(203, 213, 225);
    doc.rect(x, headerY, w, ry - headerY, 'S');
}
function drawGradeFields(doc, gradeFields, x, y, w) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('CO-SCHOLASTIC / GRADE AREAS', x, y);
    y += 5;
    doc.setFillColor(241, 245, 249);
    doc.rect(x, y, w, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const headers = ['Area', 'Grade'];
    const colW = [w * 0.7, w * 0.3];
    let cx = x + 2;
    headers.forEach((h, i) => {
        doc.text(h, cx, y + 4.8);
        cx += colW[i];
    });
    let ry = y + 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    for (const gf of gradeFields) {
        doc.setDrawColor(226, 232, 240);
        doc.line(x, ry, x + w, ry);
        let cx2 = x + 2;
        doc.text(gf.name, cx2, ry + 4.3);
        cx2 += colW[0];
        doc.text(gf.value || '—', cx2, ry + 4.3);
        ry += 8;
    }
    doc.setDrawColor(203, 213, 225);
    doc.rect(x, y, w, ry - y, 'S');
}
function drawSummary(doc, totals, x, y, w) {
    doc.setFillColor(241, 245, 249);
    doc.rect(x, y, w, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const pctStr = totals.percentage !== null ? `${totals.percentage}%` : '—';
    const items = [
        ['Grand Total', `${totals.totalMarks} / ${totals.totalMax || '—'}`],
        ['Percentage', pctStr],
        ['Overall Grade', totals.overallGrade],
        ['Result', totals.percentage !== null ? (totals.passed ? 'PROMOTED' : 'NEEDS IMPROVEMENT') : '—'],
    ];
    const col = w / items.length;
    items.forEach((it, i) => {
        const cx = x + col * i + 3;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(8);
        doc.text(it[0], cx, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(8, 108, 179);
        doc.text(it[1], cx, y + 11);
    });
    doc.setTextColor(15, 23, 42);
}
function drawSection(doc, title, items, x, y, w) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(title, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const colW = w / 3;
    items.forEach((it, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const ix = x + col * colW;
        const iy = y + 5 + row * 6.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(`${it[0]}: `, ix, iy);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(it[1], ix + doc.getTextWidth(`${it[0]}: `), iy);
    });
}
function drawSignBlock(doc, imageDataUrl, role, name, x, y, w, isStamp = false) {
    const lineY = y + 18;
    doc.setDrawColor(100, 116, 139);
    doc.line(x, lineY, x + w, lineY);
    if (imageDataUrl) {
        try {
            const imgW = isStamp ? 32 : 36;
            const imgH = isStamp ? 32 : 14;
            doc.addImage(imageDataUrl, 'PNG', x + w / 2 - imgW / 2, lineY - 4 - imgH, imgW, imgH, undefined, 'FAST');
        }
        catch {
            // ignore
        }
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const nameText = name || (isStamp ? '' : 'Signature');
    if (nameText) {
        const nw = doc.getTextWidth(nameText);
        doc.text(nameText, x + w / 2 - nw / 2, lineY + 5);
    }
    if (role) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        const rw = doc.getTextWidth(role);
        doc.text(role, x + w / 2 - rw / 2, lineY + 10);
    }
}
function buildDefaultLearning(custom) {
    const def = [
        ['Listening', 'A'],
        ['Speaking', 'A'],
        ['Reading', 'A'],
        ['Writing', 'B+'],
        ['Thinking', 'A'],
        ['Creativity', 'B+'],
    ];
    if (!custom)
        return def;
    return Object.entries(custom).map(([k, v]) => [k, v]).concat(def.slice(Object.keys(custom).length));
}
function buildDefaultPersonality(custom) {
    const def = [
        ['Confidence', 'A'],
        ['Discipline', 'A'],
        ['Honesty', 'A'],
        ['Cooperation', 'A'],
        ['Responsibility', 'B+'],
        ['Punctuality', 'A'],
    ];
    if (!custom)
        return def;
    return Object.entries(custom).map(([k, v]) => [k, v]).concat(def.slice(Object.keys(custom).length));
}
function buildDefaultCoScholastic(custom) {
    const def = [
        ['Art & Craft', 'B+'],
        ['Music', 'A'],
        ['Physical Ed.', 'A'],
        ['Work Education', 'A'],
        ['Yoga', 'B+'],
        ['General Aw.', 'A'],
    ];
    if (!custom)
        return def;
    return Object.entries(custom).map(([k, v]) => [k, v]).concat(def.slice(Object.keys(custom).length));
}
function generateStudentPdfBlob(opts) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new jspdf_1.default({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true,
            });
            drawTemplate(doc, opts);
            const blob = doc.output('blob');
            resolve(blob);
        }
        catch (e) {
            reject(e);
        }
    });
}
function sanitizeFilename(s) {
    return String(s || '')
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}
function buildPdfFilename(rollNo, name, existingNames) {
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
function buildZipFilename(cls, section) {
    const c = sanitizeFilename(cls || 'Class');
    const s = sanitizeFilename(section || '');
    if (s)
        return `Class_${c}${s}_Report_Cards.zip`;
    return `Class_${c}_Report_Cards.zip`;
}
