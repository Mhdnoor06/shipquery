const { parseDocument } = require('./parser');
const { chunkText } = require('./chunker');

async function main() {
  const { pipeline } = await import('@xenova/transformers');

  console.log('Loading model...');
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  // Step 1: Parse and chunk the document
  const result = await parseDocument('./INV_2606947.pdf', 'INV_2606947.pdf');
  const chunks = chunkText(result.text, 500, 50);
  console.log(`${chunks.length} chunks created\n`);

  // Step 2: Embed all chunks (this would normally be done ONCE and stored in DB)
  async function embed(text) {
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  console.log('Embedding chunks...');
  const chunkEmbeddings = [];
  for (const chunk of chunks) {
    chunkEmbeddings.push(await embed(chunk));
  }

  // Step 3: User asks a question — embed it and find the closest chunk
  function cosineSimilarity(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }

  function findRelevantChunks(questionEmbedding, topN = 2) {
    const scores = chunkEmbeddings.map((emb, i) => ({
      chunkIndex: i,
      score: cosineSimilarity(questionEmbedding, emb)
    }));
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topN);
  }

  // Test with real questions
  const questions = [
    'What is the MBL number?',
    'How much is the freight cost?',
    'Who is the seller of this shipment?'
  ];

  for (const q of questions) {
    const qEmbedding = await embed(q);
    const results = findRelevantChunks(qEmbedding, 2);

    console.log(`\nQ: "${q}"`);
    results.forEach(r => {
      console.log(`  → Chunk ${r.chunkIndex + 1} (score: ${r.score.toFixed(4)}): "${chunks[r.chunkIndex].substring(0, 80)}..."`);
    });
  }
}

main();
