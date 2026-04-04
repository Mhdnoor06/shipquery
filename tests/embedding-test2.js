async function main() {
  // This import loads a local embedding model (first run downloads ~30MB)
  const { pipeline } = await import('@xenova/transformers');

  console.log('Loading embedding model (first time takes a minute)...');
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  // Let's embed 3 texts and see the actual numbers
  const texts = [
    'MBL number 157-08290251',
    'What is the bill of lading number?',
    'birthday cake with chocolate frosting'
  ];

  const embeddings = [];
  for (const text of texts) {
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    embeddings.push(Array.from(output.data));
  }

  // Show first 5 numbers of each embedding
  console.log('\n=== ACTUAL EMBEDDING NUMBERS (first 5 of 384) ===');
  texts.forEach((text, i) => {
    console.log(`"${text}"`);
    console.log(`  → [${embeddings[i].slice(0, 5).map(n => n.toFixed(4)).join(', ')}, ...]`);
    console.log('');
  });

  // Now calculate similarity between them
  function cosineSimilarity(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot; // vectors are already normalized, so dot product = cosine similarity
  }

  console.log('=== SIMILARITY SCORES (1.0 = identical, 0.0 = unrelated) ===');
  console.log(`"MBL number" vs "bill of lading number" = ${cosineSimilarity(embeddings[0], embeddings[1]).toFixed(4)}`);
  console.log(`"MBL number" vs "birthday cake"         = ${cosineSimilarity(embeddings[0], embeddings[2]).toFixed(4)}`);
  console.log(`"bill of lading" vs "birthday cake"     = ${cosineSimilarity(embeddings[1], embeddings[2]).toFixed(4)}`);
}

main();
