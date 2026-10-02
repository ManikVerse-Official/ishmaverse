"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computePercentage = computePercentage;
exports.gradeFromMarksPercent = gradeFromMarksPercent;
exports.gradeFromMarksOutOf = gradeFromMarksOutOf;
exports.summarizeComponents = summarizeComponents;
exports.summarizeSubjects = summarizeSubjects;
exports.statusLabel = statusLabel;
exports.computeTotals = computeTotals;
function computePercentage(total, max) {
    if (max <= 0)
        return null;
    return Math.round((total / max) * 10000) / 100;
}
function gradeFromMarksPercent(pct) {
    if (pct === null)
        return '—';
    if (pct >= 95)
        return 'A+';
    if (pct >= 90)
        return 'A';
    if (pct >= 80)
        return 'B+';
    if (pct >= 70)
        return 'B';
    if (pct >= 60)
        return 'C+';
    if (pct >= 50)
        return 'C';
    if (pct >= 33)
        return 'D';
    return 'F';
}
function gradeFromMarksOutOf(marks, max) {
    if (marks === null || max <= 0)
        return '—';
    return gradeFromMarksPercent((marks / max) * 100);
}
function summarizeComponents(components) {
    return components.map((c) => ({
        name: c.name,
        marks: c.marks,
        maxMarks: c.maxMarks,
        status: c.status,
        grade: c.status === 'present' && c.marks !== null
            ? gradeFromMarksOutOf(c.marks, c.maxMarks)
            : statusLabel(c.status),
        isTotal: c.isTotal,
    }));
}
function summarizeSubjects(student) {
    return student.subjects.map((s) => {
        const components = s.hasComponents && s.components
            ? summarizeComponents(s.components)
            : undefined;
        return {
            name: s.name,
            marks: s.marks,
            maxMarks: s.maxMarks,
            status: s.status,
            grade: s.status === 'present' && s.marks !== null
                ? gradeFromMarksOutOf(s.marks, s.maxMarks)
                : statusLabel(s.status),
            components,
        };
    });
}
function statusLabel(status) {
    switch (status) {
        case 'absent':
            return 'AB';
        case 'exempt':
            return 'EX';
        case 'medical':
            return 'Medical';
        default:
            return '—';
    }
}
function computeTotals(student) {
    const graded = summarizeSubjects(student);
    let total = 0;
    let max = 0;
    let present = 0;
    for (const s of student.subjects) {
        // Skip grade fields (maxMarks = 0)
        if (s.maxMarks === 0)
            continue;
        if (s.status === 'present' && s.marks !== null) {
            total += s.marks;
            max += s.maxMarks;
            present++;
        }
        // Also include component marks for subjects with components
        if (s.hasComponents && s.components) {
            for (const comp of s.components) {
                if (comp.status === 'present' && comp.marks !== null && !comp.isTotal) {
                    // Don't double-count if subject already has total
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
        gradedSubjects: graded,
    };
}
