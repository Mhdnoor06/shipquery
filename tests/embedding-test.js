const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function getEmbedding(text) {
  // Anthropic doesn't have its own embedding model,
  // so we'll use a free one from a different approach.
  // For now, let's use Claude to EXPLAIN the concept with real text.
  // In the real project, we'll use an actual embedding model.

  // But first - let me show you the CONCEPT with a simple demo
  return text;
}

// Instead of actual embeddings (we'll set those up next),
// let's prove the concept: ask Claude which chunk is most relevant
async function findRelevantChunk(question, chunks) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Here are ${chunks.length} text chunks numbered 1-${chunks.length}:

${chunks.map((c, i) => `CHUNK ${i + 1}: ${c.substring(0, 150)}...`).join('\n\n')}

Question: "${question}"

Which chunk number is most relevant? Reply with ONLY the number.`
    }]
  });

  return response.content[0].text;
}

async function main() {
  const { parseDocument } = require('./parser');
  const { chunkText } = require('./chunker');

  const result = await parseDocument('./INV_2606947.pdf', 'INV_2606947.pdf');
  const chunks = chunkText(result.text, 500, 50);

  console.log(`${chunks.length} chunks created\n`);

  // Test with different questions
  const questions = [
    'What is the MBL number?',
    'What is the freight cost?',
    'Who is the seller?'
  ];

  for (const q of questions) {
    const answer = await findRelevantChunk(q, chunks);
    console.log(`Q: "${q}" → Chunk ${answer}`);
  }
}

main();
