const { parseDocument } = require('./parser');
const { chunkText } = require('./chunker');

async function main() {
  const result = await parseDocument('./INV_2606947.pdf', 'INV_2606947.pdf');

  const chunks = chunkText(result.text, 500, 50);

  console.log(`Document: ${result.metadata.fileName}`);
  console.log(`Total text length: ${result.metadata.textLength} characters`);
  console.log(`Number of chunks: ${chunks.length}`);
  console.log('---');

  chunks.forEach((chunk, i) => {
    console.log(`\n=== CHUNK ${i + 1} (${chunk.length} chars) ===`);
    console.log(chunk);
  });
}

main();
