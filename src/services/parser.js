const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { ocr } = require('./llm');

async function parseDocument(filePath, originalName) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileName = originalName || path.basename(filePath);
  const extension = path.extname(fileName).toLowerCase();

  if (extension !== '.pdf') {
    throw new Error(`Unsupported file type: ${extension}. Only PDF is supported for now.`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const parsed = await pdfParse(fileBuffer);

  const isScanned = parsed.text.trim().length < 50;

  let text;
  if (isScanned) {
    console.log(`Scanned PDF detected: ${fileName}. Using OCR...`);
    text = await ocr(fileBuffer);
  } else {
    text = parsed.text.trim();
  }

  return {
    text,
    metadata: {
      fileName,
      fileType: extension,
      pages: parsed.numpages,
      textLength: text.length,
      isScanned
    }
  };
}

module.exports = { parseDocument };
