import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jspdf = require('jspdf');

export default jspdf.jsPDF;
