import JSZip from 'jszip';
import type { PhotoMap, Student } from '../types';

/**
 * Photo matching engine.
 *
 * A photo is attached to a student only when a *strong* identity signal
 * matches — never because of upload/array order:
 *
 *   1. the exact filename listed in the workbook's photo column;
 *   2. the student's roll / serial number (e.g. "13_EKANJOT.jpg" → roll 13);
 *   3. the admission number;
 *   4. the internal student / row id;
 *   5. the exact normalised student name;
 *   6. the student's name appearing inside the filename.
 *
 * When two students would match the same photo and it cannot be disambiguated
 * by name, the photo is left blank: attaching the wrong child's photograph is
 * never acceptable.
 */

export async function loadPhotoZip(file: File): Promise<PhotoMap> {
  const zip = await JSZip.loadAsync(file);
  const result: PhotoMap = {};
  const imageExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']);

  const entries = Object.values(zip.files).filter((f) => !f.dir);

  for (const entry of entries) {
    const base = entry.name.split(/[\\/]/).pop() ?? '';
    const ext = base.split('.').pop()?.toLowerCase() ?? '';
    if (!imageExts.has(ext)) continue;

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

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return blobToDataUrl(file);
}

/* ── indexing ─────────────────────────────────────────────────────────── */

interface PhotoEntry {
  /** Original file name including extension, when available. */
  fileLabel: string;
  dataUrl: string;
  /** Lower-cased label without extension (used for matching). */
  key: string;
  /** Alphanumeric tokens extracted from the file name. */
  tokens: string[];
}

export interface PhotoIndex {
  entries: PhotoEntry[];
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

/** "13_EKANJOT Singh.jpg" → ["13", "ekanjot", "singh"] */
function tokenize(label: string): string[] {
  return stripExtension(label)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token !== '');
}

function collapse(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function uniquePhotoEntries(photoMap: PhotoMap): PhotoEntry[] {
  if (!photoMap) return [];
  const seen = new Set<string>();
  const entries: PhotoEntry[] = [];

  for (const [fileLabel, dataUrl] of Object.entries(photoMap)) {
    if (!dataUrl) continue;
    /* loadPhotoZip registers several aliases per file; the data URL uniquely
     * identifies the file, so the first (original) alias wins. */
    if (seen.has(dataUrl)) continue;
    seen.add(dataUrl);
    entries.push({
      fileLabel: /\.(jpe?g|png|webp|gif|bmp)$/i.test(fileLabel) ? fileLabel : `${fileLabel}.jpg`,
      dataUrl,
      key: collapse(stripExtension(fileLabel)),
      tokens: tokenize(fileLabel),
    });
  }

  return entries;
}

export function buildPhotoIndex(photoMap: PhotoMap): PhotoIndex {
  return { entries: uniquePhotoEntries(photoMap) };
}

/* ── matching ─────────────────────────────────────────────────────────── */

type PhotoStudent = Pick<Student, 'studentId' | 'rowNumber' | 'rollNo' | 'name'> &
  Partial<Pick<Student, 'admissionNo' | 'photoFilename'>>;

/** Words that carry no identity — they never describe a student. */
const GENERIC_PHOTO_TOKENS = new Set([
  'student',
  'students',
  'photo',
  'photos',
  'pic',
  'pics',
  'picture',
  'image',
  'img',
  'roll',
  'rollno',
  'sr',
  'sno',
  'no',
  'class',
  'section',
  'final',
  'new',
  'scan',
  'copy',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'adm',
  'admission',
  'reg',
  'registration',
  'enroll',
  'enrolment',
  'enrollment',
  'id',
  'code',
]);

/** Identity words carried by a file name ("13_EKANJOT" → ["ekanjot"]). */
function nameTokensOf(entry: PhotoEntry): string[] {
  return entry.tokens.filter(
    (token) => token.length >= 3 && !/^\d+$/.test(token) && !GENERIC_PHOTO_TOKENS.has(token),
  );
}

/** Does the file name mention this student by name? */
function entryNamesStudent(
  entry: PhotoEntry,
  student: PhotoStudent,
  identifier = '',
): boolean {
  const nameTokens = nameTokensOf(entry).filter(
    (token) => !identifier.includes(token),
  );
  if (nameTokens.length === 0) return true;
  const studentTokens = String(student.name ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return nameTokens.every((token) => studentTokens.includes(token));
}

/** Does the file name contain this identifier (roll / admission / id)? */
function entryHasIdentifier(entry: PhotoEntry, value: string): boolean {
  if (!value) return false;
  return (
    entry.key === value ||
    entry.tokens.includes(value) ||
    entry.tokens.join('') === value
  );
}

/** Tier value — lower is stronger. `null` means "no match". */
function matchTier(entry: PhotoEntry, student: PhotoStudent): number | null {
  const roll = collapse(student.rollNo);
  const admission = collapse(student.admissionNo ?? '');
  const id = collapse(student.studentId ?? '');
  const rowId = collapse(`row${student.rowNumber ?? ''}`);
  const name = collapse(student.name);
  const filename = collapse(stripExtension(student.photoFilename ?? ''));

  /* 1. the workbook explicitly names the file */
  if (filename && entry.key === filename) return 1;

  /* 2. roll / serial number — "13_EKANJOT.jpg" only matches an EKANJOT with
   *    roll 13; a same-roll classmate is left blank instead of receiving the
   *    wrong child's photograph. */
  if (roll && entryHasIdentifier(entry, roll)) {
    return entryNamesStudent(entry, student) ? 2 : null;
  }

  /* 3. admission number */
  if (admission && entryHasIdentifier(entry, admission)) {
    return entryNamesStudent(entry, student, admission) ? 3 : null;
  }

  /* 4. internal id */
  if (id && (entry.tokens.includes(id) || entry.key === id)) return 4;
  if (rowId && (entry.tokens.includes(rowId) || entry.key === rowId)) return 4;

  /* 5. exact normalised name (filename is only the student's name) */
  if (name && entry.key === name) return 5;

  /* 6. the name appears inside the filename. Only accept a full token
   *    sequence, so "AN" never matches "ANJALI". */
  if (name && containsNameTokens(entry, student.name)) return 6;

  return null;
}

/** True when every token of the student's name appears, in order, in the file name. */
function containsNameTokens(entry: PhotoEntry, rawName: string): boolean {
  const nameTokens = String(rawName ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (nameTokens.length === 0) return false;

  let cursor = 0;
  for (const token of nameTokens) {
    const next = entry.tokens.indexOf(token, cursor);
    if (next === -1) return false;
    cursor = next + 1;
  }
  return true;
}

/**
 * Resolve the photo for one student inside a pre-built index.
 * Returns undefined (blank placeholder) when the match is missing or ambiguous.
 */
export function resolveStudentPhoto(
  index: PhotoIndex,
  student: PhotoStudent,
): string | undefined {
  let bestTier: number | null = null;
  let best: PhotoEntry[] = [];

  for (const entry of index.entries) {
    const tier = matchTier(entry, student);
    if (tier === null) continue;
    if (bestTier === null || tier < bestTier) {
      bestTier = tier;
      best = [entry];
    } else if (tier === bestTier) {
      best.push(entry);
    }
  }

  if (best.length === 0) return undefined;
  if (best.length === 1) return best[0].dataUrl;

  /* Multiple candidates at the same strength: only accept one that also
   * carries the student's name. Otherwise leave the photo blank rather than
   * risk attaching another child's photograph. */
  const name = collapse(student.name);
  const nameMatch = best.filter(
    (entry) =>
      (name !== '' && entry.key === name) || containsNameTokens(entry, student.name),
  );
  if (nameMatch.length === 1) return nameMatch[0].dataUrl;

  return undefined;
}

/**
 * Resolve photos for a whole batch.
 *
 * A photo is only handed out when exactly one student owns it at the strongest
 * matching tier. If two students would receive the same picture the ambiguous
 * ones are left blank (and reported), because attaching the wrong child's
 * photograph is worse than showing none.
 */
export function resolvePhotosForStudents(
  index: PhotoIndex,
  students: PhotoStudent[],
): { photos: Map<string, string>; ambiguous: string[] } {
  const photos = new Map<string, string>();
  const ambiguous: string[] = [];
  const claims = new Map<string, string[]>(); /* dataUrl → student ids */

  for (const student of students) {
    const photo = resolveStudentPhoto(index, student);
    if (!photo) continue;
    photos.set(student.studentId, photo);
    const owners = claims.get(photo) ?? [];
    owners.push(student.studentId);
    claims.set(photo, owners);
  }

  for (const owners of claims.values()) {
    if (owners.length <= 1) continue;
    /* Same picture for two children — refuse it for both. */
    for (const owner of owners) {
      photos.delete(owner);
      ambiguous.push(owner);
    }
  }

  return { photos, ambiguous };
}

/**
 * Backwards-compatible single-student helper (used where no student list is
 * available). Prefer `buildPhotoIndex` + `resolveStudentPhoto` for batches.
 */
export function resolvePhotoForStudent(
  photoMap: PhotoMap,
  rollNo?: string,
  photoFilename?: string,
  studentName?: string,
): string | undefined {
  if (photoFilename && photoMap[photoFilename]) return photoMap[photoFilename];
  if (photoFilename && photoMap[photoFilename.toLowerCase()]) {
    return photoMap[photoFilename.toLowerCase()];
  }

  const index = buildPhotoIndex(photoMap);
  return resolveStudentPhoto(index, {
    studentId: '',
    rowNumber: 0,
    rollNo: rollNo ?? '',
    name: studentName ?? '',
    photoFilename,
  });
}
