const { parseDocument } = require('./parser');

async function main() {
  // Test with both files
  const files = ['./INV_2606947.pdf', './157-08290251 CNEE.PDF'];

  for (const file of files) {
    console.log(`\n=== Parsing: ${file} ===`);
    const result = await parseDocument(file);

    console.log('Metadata:', result.metadata);
    console.log('Text preview:', result.text.substring(0, 200));
    console.log('---');
  }
}

main();
