import { isKnownNonSubjectHeader, normalizeHeader } from '../src/utils/normalization';
for (const label of [
  'ENVIRONMENTAL EDUCATION AND DISASTER MANAGEMENT',
  'MARKS (50)',
  'GENERAL KNOWLEDGE',
  'ARTIFICIAL INTELLIGENCE',
  'ENVIRONMENTAL STUDIES',
]) {
  console.log(JSON.stringify(label), '->', normalizeHeader(label), '| known non-subject:', isKnownNonSubjectHeader(label));
}
