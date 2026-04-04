const fs = require('fs');
const pdfParse = require('pdf-parse');

async function parsePDF(filePath) {
  // Step 1: Read the raw PDF file (binary data, not readable)
  const fileBuffer = fs.readFileSync(filePath);

  // Step 2: pdf-parse extracts the text from the binary
  const parsed = await pdfParse(fileBuffer);

  // Step 3: Let's see what we get back
  console.log('=== METADATA ===');
  console.log('Pages:', parsed.numpages);
  console.log('');
  console.log('=== EXTRACTED TEXT (first 500 chars) ===');
  console.log(parsed.text.substring(0, 500));
  console.log('');
  console.log('=== FULL TEXT LENGTH ===');
  console.log(parsed.text.length, 'characters');
}

// Test with your tax invoice
parsePDF('./INV_2606947.pdf');
console.log('\n\n========== SECOND FILE ==========\n');
parsePDF('./157-08290251 CNEE.PDF');
