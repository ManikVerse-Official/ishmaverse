"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAppStore = void 0;
const zustand_1 = require("zustand");
const DEFAULT_SCHOOL = {
    schoolName: '',
    address: '',
    principalName: '',
    teacherName: '',
    academicSession: '',
    examTerm: '',
};
const SCHOOL_STORAGE_KEY = 'rcs:schoolProfile';
function loadSchoolProfile() {
    try {
        const raw = localStorage.getItem(SCHOOL_STORAGE_KEY);
        if (!raw)
            return DEFAULT_SCHOOL;
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SCHOOL, ...parsed };
    }
    catch {
        return DEFAULT_SCHOOL;
    }
}
const initialGen = {
    total: 0,
    completed: 0,
    failed: 0,
    results: [],
    status: 'idle',
};
exports.useAppStore = (0, zustand_1.create)((set, get) => ({
    schoolProfile: loadSchoolProfile(),
    workbook: null,
    columnMapping: [],
    defaultClass: '',
    defaultSection: '',
    students: [],
    validation: null,
    photoMap: {},
    generation: initialGen,
    detectedStructure: null,
    structureMapping: null,
    setSchoolProfile: (p) => set(() => {
        const next = { ...get().schoolProfile, ...p };
        try {
            localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(next));
        }
        catch {
            // ignore quota
        }
        return { schoolProfile: next };
    }),
    setWorkbook: (w) => set({ workbook: w, validation: null }),
    setActiveSheet: (name) => set((s) => s.workbook ? { workbook: { ...s.workbook, activeSheet: name } } : s),
    setColumnMapping: (m) => set({ columnMapping: m }),
    setDefaultClass: (c) => set({ defaultClass: c }),
    setDefaultSection: (s) => set({ defaultSection: s }),
    setStudents: (s) => set({ students: s, validation: null }),
    setValidation: (v) => set({ validation: v }),
    updateStudent: (id, patch) => set((s) => ({
        students: s.students.map((st) => st.studentId === id ? { ...st, ...patch } : st),
    })),
    setPhotoMap: (m) => set({ photoMap: m }),
    resetGeneration: () => set({ generation: initialGen }),
    setGenerationProgress: (p) => set((s) => ({
        generation: { ...s.generation, ...p },
    })),
    setDetectedStructure: (s) => set({ detectedStructure: s }),
    setStructureMapping: (m) => set({ structureMapping: m }),
    resetWorkflow: () => set({
        workbook: null,
        columnMapping: [],
        students: [],
        validation: null,
        photoMap: {},
        generation: initialGen,
        detectedStructure: null,
        structureMapping: null,
    }),
}));
