"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPhotoZip = loadPhotoZip;
exports.blobToDataUrl = blobToDataUrl;
exports.fileToDataUrl = fileToDataUrl;
exports.resolvePhotoForStudent = resolvePhotoForStudent;
const jszip_1 = __importDefault(require("jszip"));
async function loadPhotoZip(file) {
    const zip = await jszip_1.default.loadAsync(file);
    const result = {};
    const imageExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']);
    const entries = Object.values(zip.files).filter((f) => !f.dir);
    for (const entry of entries) {
        const base = entry.name.split(/[\\/]/).pop() ?? '';
        const ext = base.split('.').pop()?.toLowerCase() ?? '';
        if (!imageExts.has(ext))
            continue;
        const blob = await entry.async('blob');
        const dataUrl = await blobToDataUrl(blob);
        result[base] = dataUrl;
        result[base.toLowerCase()] = dataUrl;
        const nameNoExt = base.replace(/\.[^.]+$/, '');
        result[nameNoExt] = dataUrl;
        result[nameNoExt.toLowerCase()] = dataUrl;
    }
    return result;
}
function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}
function fileToDataUrl(file) {
    return blobToDataUrl(file);
}
function resolvePhotoForStudent(photoMap, rollNo, photoFilename, studentName) {
    if (photoFilename && photoMap[photoFilename])
        return photoMap[photoFilename];
    if (photoFilename && photoMap[photoFilename.toLowerCase()])
        return photoMap[photoFilename.toLowerCase()];
    if (rollNo) {
        const candidates = [
            `${rollNo}`,
            `${rollNo}.jpg`,
            `${rollNo}.jpeg`,
            `${rollNo}.png`,
        ];
        for (const c of candidates) {
            if (photoMap[c])
                return photoMap[c];
            if (photoMap[c.toLowerCase()])
                return photoMap[c.toLowerCase()];
        }
    }
    if (studentName) {
        const slug = studentName
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
        if (photoMap[slug])
            return photoMap[slug];
    }
    return undefined;
}
