"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAllAndZip = generateAllAndZip;
exports.downloadBlob = downloadBlob;
const jszip_1 = __importDefault(require("jszip"));
const pdfGenerator_1 = require("./pdfGenerator");
const photoMatcher_1 = require("./photoMatcher");
async function generateAllAndZip(opts) {
    const { students, school, photoMap, batchSize = 5, onProgress, onStudentComplete, signal, } = opts;
    const zip = new jszip_1.default();
    const usedNames = new Set();
    const results = [];
    let completed = 0;
    let failed = 0;
    for (let i = 0; i < students.length; i += batchSize) {
        if (signal?.aborted) {
            throw new Error('Generation cancelled by user');
        }
        const batch = students.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch.map(async (stu) => {
            if (signal?.aborted)
                throw new Error('Cancelled');
            const photo = (0, photoMatcher_1.resolvePhotoForStudent)(photoMap, stu.rollNo, stu.photoFilename, stu.name);
            const blob = await (0, pdfGenerator_1.generateStudentPdfBlob)({
                student: stu,
                school,
                photoDataUrl: photo,
            });
            const fileName = (0, pdfGenerator_1.buildPdfFilename)(stu.rollNo, stu.name, usedNames);
            return { student: stu, blob, fileName };
        }));
        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                const { student, blob, fileName } = result.value;
                zip.file(fileName, blob);
                const res = {
                    studentId: student.studentId,
                    rollNo: student.rollNo,
                    name: student.name,
                    rowNumber: student.rowNumber,
                    success: true,
                    fileName,
                };
                results.push(res);
                onStudentComplete?.(res);
                completed++;
            }
            else {
                const idx = batchResults.indexOf(result);
                const student = batch[idx];
                const res = {
                    studentId: student.studentId,
                    rollNo: student.rollNo,
                    name: student.name,
                    rowNumber: student.rowNumber,
                    success: false,
                    error: result.reason?.message || 'Unknown error',
                };
                results.push(res);
                onStudentComplete?.(res);
                failed++;
            }
        }
        onProgress?.({
            completed,
            failed,
            total: students.length,
            current: batch[batch.length - 1],
        });
    }
    const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });
    const someStudent = students[0];
    const filename = (0, pdfGenerator_1.buildZipFilename)(someStudent?.class, someStudent?.section);
    return { blob: zipBlob, filename, results };
}
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
